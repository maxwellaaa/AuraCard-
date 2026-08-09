import {
  chatMessages,
  chatInput,
  isChatLoading,
  chatError,
  aiApiKey,
  aiBaseUrl,
  aiModel,
  aiProvider,
  customAiBaseUrl,
  isTestingAiConnection,
  aiTestMessage,
  aiTestStatus,
  selectedAiProvider,
  selectedAiModel,
} from "./state";
import { request, RequestError } from "../request";
import { chatEndpoint, normalizeBaseUrl, newId } from "./utils";
import type { ChatMessage, AiProviderId } from "./types";
import { aiProviderOptions } from "./config";
import { applyTitleSegmentedCards } from "./sections";
import { runAiOrganize } from "./aiOrganize";

export {
  CARD_ORGANIZE_SYSTEM_PROMPT,
  CARD_ORGANIZE_LIMITS,
  applyOrganizedCardFields,
  applyAiOrganizeDraft,
  buildOrganizeMessages,
  closeAiOrganizeDraft,
  copyAiOrganizeDraft,
  formatOrganizedDraft,
  localSummarizeToCard,
  openAiOrganizeDraft,
  parseCardFromText,
  runAiOrganize,
  unwrapOrganizeResponseFence,
} from "./aiOrganize";

const IMAGE_TERMINAL_FAILURE_STATUS = new Set([
  "FAILED",
  "CANCELED",
  "CANCELLED",
]);

const IMAGE_POLL_MAX_ATTEMPTS = 40;
const IMAGE_POLL_INTERVAL_MS = 1500;

// 模块级 AbortController：同一时刻只保留一个活跃的图片轮询，
// 发起新生成或手动取消时旧的轮询会被 abort，避免内存泄漏。
let imagePollController: AbortController | null = null;

/** 取消正在进行的图片轮询（页面离开 / 重新生成时调用） */
export function cancelImagePoll() {
  if (imagePollController) {
    imagePollController.abort();
    imagePollController = null;
  }
}

type CreateImageTaskResponse = {
  taskId?: string | null;
  message?: string | null;
};

type ImageTaskResponse = {
  status?: string | null;
  message?: string | null;
  imageUrl?: string | null;
};

function isImageGenerationModel() {
  return selectedAiModel.value?.kind === "image";
}

async function createImageTask(prompt: string) {
  const data = await request<
    CreateImageTaskResponse & { status?: string; imageUrl?: string }
  >("/ai/images/generate", {
    method: "POST",
    data: {
      prompt,
      model: isImageGenerationModel() ? aiModel.value.trim() : undefined,
      size: "768*1024",
    },
    timeoutMs: 30000,
  });

  if (data.status === "SUCCEEDED" && data.imageUrl) {
    return { taskId: data.taskId || "sync", imageUrl: data.imageUrl };
  }

  if (!data.taskId) {
    throw new Error(data.message || "图片任务创建失败，请稍后重试。");
  }

  return { taskId: data.taskId };
}

async function pollImageResult(taskId: string) {
  if (taskId === "sync") {
    throw new Error("同步任务未返回图片地址");
  }

  // 取消上一次未完成的轮询，确保同一时刻只有一个活跃轮询
  cancelImagePoll();

  const controller = new AbortController();
  imagePollController = controller;

  try {
    for (let attempt = 0; attempt < IMAGE_POLL_MAX_ATTEMPTS; attempt += 1) {
      if (controller.signal.aborted) {
        throw new DOMException("图片轮询已取消", "AbortError");
      }

      const data = await request<ImageTaskResponse>(
        `/ai/images/tasks/${encodeURIComponent(taskId)}`,
        { timeoutMs: 30000, signal: controller.signal },
      );
      const status = (data.status || "").toUpperCase();

      if (status === "SUCCEEDED") {
        const imageUrl = data.imageUrl;
        if (!imageUrl) throw new Error("图片生成成功，但未返回图片地址。");
        return imageUrl;
      }

      if (IMAGE_TERMINAL_FAILURE_STATUS.has(status)) {
        throw new Error(data.message || "图片生成失败，请稍后重试。");
      }

      // 等待期间也响应取消信号，避免离开页面后仍空等 1.5s
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(resolve, IMAGE_POLL_INTERVAL_MS);
        controller.signal.addEventListener(
          "abort",
          () => {
            window.clearTimeout(timer);
            reject(new DOMException("图片轮询已取消", "AbortError"));
          },
          { once: true },
        );
      });
    }

    throw new Error("图片生成超时，请稍后重试。");
  } finally {
    if (imagePollController === controller) {
      imagePollController = null;
    }
  }
}

export async function generateAiImageUrl(prompt: string) {
  try {
    const result = await createImageTask(prompt);
    if (result.imageUrl) {
      return result.imageUrl;
    }
    return await pollImageResult(result.taskId);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("图片生成已取消。");
    }
    throw e;
  }
}

export async function testAiImageConnection() {
  await createImageTask("极简高级感封面背景，无文字，柔和渐变，留白充足");
}
export function syncAiProviderSettings(
  providerId: AiProviderId,
  keepCurrentModel = false,
) {
  const provider = aiProviderOptions.find((item) => item.id === providerId);
  if (!provider) return;

  if (providerId === "custom") {
    aiBaseUrl.value = normalizeBaseUrl(customAiBaseUrl.value);
    if (!keepCurrentModel && !aiModel.value.trim())
      aiModel.value = "gpt-4o-mini";
    return;
  }

  aiBaseUrl.value = provider.baseUrl;
  if (
    !keepCurrentModel ||
    !provider.models.some(
      (model) => model.value === aiModel.value && model.kind !== "image",
    )
  ) {
    aiModel.value =
      provider.models.find((model) => model.kind !== "image")?.value || "";
  }
}

export function setChatError(message: string) {
  chatError.value = message;
  window.setTimeout(() => {
    if (chatError.value === message) chatError.value = null;
  }, 3500);
}

export function setAiTestFeedback(
  status: "success" | "error",
  message: string,
) {
  aiTestStatus.value = status;
  aiTestMessage.value = message;
}

/** 开发环境经 Vite 代理，避免浏览器直连官方 API 的 CORS 限制 */
function resolveBrowserChatBaseUrl() {
  const provider = aiProvider.value;
  if (provider === "deepseek") return "/deepseek-proxy";
  if (provider === "openai") return "/openai-proxy";
  if (provider === "openrouter") return "/openrouter-proxy";
  if (provider === "qwen") return "/dashscope-proxy/compatible-mode/v1";
  if (provider === "custom") {
    return normalizeBaseUrl(customAiBaseUrl.value || aiBaseUrl.value);
  }
  return normalizeBaseUrl(aiBaseUrl.value || selectedAiProvider.value.baseUrl);
}

async function callOpenAiCompatibleChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  apiKey: string,
) {
  const model =
    (!isImageGenerationModel() && aiModel.value.trim()
      ? aiModel.value.trim()
      : "") ||
    selectedAiProvider.value.models.find((m) => m.kind !== "image")?.value ||
    "deepseek-chat";

  const endpoint = chatEndpoint(resolveBrowserChatBaseUrl());
  if (!endpoint) {
    throw new Error("请先配置有效的 API 地址。");
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
      message?: string;
      choices?: Array<{
        message?: {
          content?: string | Array<{ type?: string; text?: string }>;
          reasoning_content?: string;
        };
      }>;
    } | null;

    if (!response.ok) {
      const detail =
        payload?.error?.message ||
        payload?.message ||
        `请求失败（${response.status}）`;
      throw new RequestError(detail, { status: response.status });
    }

    const message = payload?.choices?.[0]?.message;
    const rawContent = message?.content;
    let text = "";
    if (typeof rawContent === "string") {
      text = rawContent.trim();
    } else if (Array.isArray(rawContent)) {
      text = rawContent
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .join("")
        .trim();
    }
    // deepseek-reasoner 等可能把正文放在 reasoning_content
    if (!text && typeof message?.reasoning_content === "string") {
      text = message.reasoning_content.trim();
    }
    if (!text) throw new Error("AI 返回为空。");
    return text;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("请求超时，请稍后重试。");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function callAiChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) {
  const apiKey = aiApiKey.value.trim();
  if (apiKey) {
    return callOpenAiCompatibleChat(messages, apiKey);
  }

  const model =
    !isImageGenerationModel() && aiModel.value.trim()
      ? aiModel.value.trim()
      : undefined;

  try {
    const data = await request<{
      content?: Record<string, unknown> | string | null;
    }>("/ai/chat", {
      method: "POST",
      data: {
        model,
        messages,
      },
      timeoutMs: 60000,
    });

    const content =
      typeof data?.content === "string"
        ? data.content
        : JSON.stringify(data?.content ?? "");
    if (typeof content !== "string" || !content.trim())
      throw new Error("AI 返回为空。");
    return content.trim();
  } catch (error) {
    if (
      error instanceof Error &&
      /网络连接失败|Failed to fetch|ECONNREFUSED|请求失败（5\d\d）/.test(
        error.message,
      )
    ) {
      throw new Error("后端未启动且未填写 API Key。请在设置中填入 DeepSeek Key。");
    }
    throw error;
  }
}

export async function sendChat() {
  const text = chatInput.value.trim();
  if (!text || isChatLoading.value) return;
  chatError.value = null;
  chatInput.value = "";

  chatMessages.value.push({
    id: newId(),
    role: "user",
    content: text,
    createdAt: Date.now(),
  });
  isChatLoading.value = true;
  try {
    const assistantText = await callAiChat(
      chatMessages.value.map((m: ChatMessage) => ({
        role: m.role,
        content: m.content,
      })),
    );
    chatMessages.value.push({
      id: newId(),
      role: "assistant",
      content: assistantText,
      createdAt: Date.now(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "请求失败";
    setChatError(msg);
  } finally {
    isChatLoading.value = false;
  }
}

export async function testAiConnection() {
  if (isTestingAiConnection.value) return;

  aiTestMessage.value = "";
  aiTestStatus.value = "";

  if (isImageGenerationModel() && !aiModel.value.trim()) {
    setAiTestFeedback("error", "请先选择 AI 模型");
    return;
  }
  isTestingAiConnection.value = true;
  try {
    if (isImageGenerationModel()) {
      await testAiImageConnection();
      setAiTestFeedback(
        "success",
        `${selectedAiProvider.value.name} 图片模型连接成功`,
      );
    } else {
      await callAiChat([{ role: "user", content: "请仅回复：连接成功" }]);
      setAiTestFeedback("success", `${selectedAiProvider.value.name} 连接成功`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "连接失败";
    setAiTestFeedback("error", msg);
  } finally {
    isTestingAiConnection.value = false;
  }
}

/**
 * 「AI 整理」：所有 provider（DeepSeek / Qwen / OpenAI / OpenRouter / custom）
 * 一律经 callAiChat → runAiOrganize（原版 system prompt + parseCardFromText + 字段上限）。
 * 与「直接排版」(layoutContentAsCards) 分离；成功后退出 sectionMode，交由 split.ts 高度分页。
 */
export async function aiSummarizeMessage(rawContent: string) {
  await runAiOrganize(rawContent, callAiChat);
}

export async function aiSummarizeLastAssistant() {
  const last = [...chatMessages.value]
    .reverse()
    .find((m) => m.role === "assistant");
  if (!last) return;
  await aiSummarizeMessage(last.content);
}

export function buildCardsFromChatMessage(rawContent: string) {
  const source = rawContent.trim();
  if (!source) return;
  chatError.value = null;
  try {
    applyTitleSegmentedCards(source);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "分段失败";
    setChatError(msg);
  }
}

/** 直接按原文排版成卡片（不过 AI 重写），保留标题/正文结构解析 */
export function layoutContentAsCards(rawContent: string) {
  buildCardsFromChatMessage(rawContent);
}

export function clearChat() {
  chatMessages.value = chatMessages.value.slice(0, 1);
  chatError.value = null;
  chatInput.value = "";
}
