/**
 * AuraCard「AI 整理」标准（与原版 AuraCard-master 对齐）。
 *
 * 所有国内/国外 Provider（DeepSeek / DashScope·Qwen / OpenAI / OpenRouter / custom）
 * 必须走同一套：system prompt → 模型原文 → parseCardFromText → 字段裁剪写入。
 * 禁止为某个 Provider 另写整理 prompt 或解析规则。
 */
import {
  title,
  subtitle,
  content,
  watermark,
  isChatLoading,
  chatError,
  aiOrganizeDraft,
  isAiOrganizeDraftOpen,
  chatMessages,
} from "./state";
import { newId } from "./utils";

/** 原版 system prompt（一字不改） */
export const CARD_ORGANIZE_SYSTEM_PROMPT =
  "你是内容编辑助手。请将用户提供的文字整理成图文内容格式。如果内容较长，请尽量保留原始正文细节，只需生成合适的标题、副标题和水印。输出格式必须为：\n标题：...\n副标题：...\n正文：...\n水印：...";

/** 原版字段上限 */
export const CARD_ORGANIZE_LIMITS = {
  title: 32,
  subtitle: 40,
  watermark: 24,
  localTitle: 24,
  localSubtitle: 28,
} as const;

export type OrganizeChatCaller = (
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) => Promise<string>;

export type ParsedCardFields = {
  t?: string;
  sub?: string;
  body?: string;
  wm?: string;
};

/** 构造整理用 messages：system + 用户原文（无额外包装） */
export function buildOrganizeMessages(source: string) {
  return [
    { role: "system" as const, content: CARD_ORGANIZE_SYSTEM_PROMPT },
    { role: "user" as const, content: source },
  ];
}

/**
 * 仅去除整段 markdown 代码围栏（部分模型会包一层 ```），
 * 不改变「标题/副标题/正文/水印」解析标准本身。
 */
export function unwrapOrganizeResponseFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:[\w-]*)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/);
  return fenced?.[1]?.trim() || trimmed;
}

/** 原版正则：标题 / 副标题 / 正文 / 水印（全角或半角冒号） */
export function parseCardFromText(text: string): ParsedCardFields {
  const normalized = unwrapOrganizeResponseFence(text);
  const t = normalized.match(/标题[:：]\s*(.+)/)?.[1]?.trim();
  const sub = normalized.match(/副标题[:：]\s*(.+)/)?.[1]?.trim();
  const body = normalized
    .match(/正文[:：]\s*([\s\S]+?)(?=\n水印[:：]|$)/)?.[1]
    ?.trim();
  const wm = normalized.match(/水印[:：]\s*(.+)/)?.[1]?.trim();
  return { t, sub, body, wm };
}

/** 将解析结果格式化为可编辑草稿文本 */
export function formatOrganizedDraft(
  parsed: ParsedCardFields,
  rawSummary: string,
  sourceFallback: string,
) {
  const normalized = unwrapOrganizeResponseFence(rawSummary);
  if (/标题[:：]/.test(normalized) && /正文[:：]/.test(normalized)) {
    return normalized;
  }
  const t = parsed.t || title.value || "标题";
  const sub = parsed.sub || subtitle.value || "";
  const body = parsed.body || sourceFallback;
  const wm = parsed.wm || watermark.value || "";
  return [
    `标题：${t}`,
    `副标题：${sub}`,
    `正文：${body}`,
    `水印：${wm}`,
  ].join("\n");
}

/** 将解析结果写入卡片状态（原版 caps + fallback） */
export function applyOrganizedCardFields(
  parsed: ParsedCardFields,
  sourceFallback: string,
) {
  title.value = (parsed.t || title.value).slice(0, CARD_ORGANIZE_LIMITS.title);
  subtitle.value = (parsed.sub || subtitle.value).slice(
    0,
    CARD_ORGANIZE_LIMITS.subtitle,
  );
  // 长正文不过度裁剪，交由 splitContents 高度拆分
  content.value = parsed.body || sourceFallback;
  watermark.value = (parsed.wm || watermark.value).slice(
    0,
    CARD_ORGANIZE_LIMITS.watermark,
  );
}

export function openAiOrganizeDraft(draft: string) {
  aiOrganizeDraft.value = draft;
  isAiOrganizeDraftOpen.value = true;
}

export function closeAiOrganizeDraft() {
  isAiOrganizeDraftOpen.value = false;
}

/** 将当前草稿应用到卡片（不再调用 AI） */
export async function applyAiOrganizeDraft(draftText?: string) {
  const raw = (draftText ?? aiOrganizeDraft.value).trim();
  if (!raw) return;
  const { clearSectionMode } = await import("./sections");
  clearSectionMode();
  const parsed = parseCardFromText(raw);
  applyOrganizedCardFields(parsed, raw);
  isAiOrganizeDraftOpen.value = false;
}

export async function copyAiOrganizeDraft() {
  const text = aiOrganizeDraft.value;
  if (!text.trim()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** AI 失败时的本地启发式（原版 localSummarizeToCard） */
export function localSummarizeToCard(raw: string) {
  const text = raw.trim().replace(/\n{3,}/g, "\n\n");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const t = (lines[0] || "一张卡片").slice(0, CARD_ORGANIZE_LIMITS.localTitle);
  const sub = (lines[1] || "AI 总结").slice(
    0,
    CARD_ORGANIZE_LIMITS.localSubtitle,
  );
  const bodyLines = lines.slice(2);
  const body = bodyLines.length ? bodyLines.join("\n") : text;
  title.value = t;
  subtitle.value = sub;
  content.value = body;
  watermark.value = "— AI";
}

function setChatError(message: string) {
  chatError.value = message;
  window.setTimeout(() => {
    if (chatError.value === message) chatError.value = null;
  }, 3500);
}

/**
 * 统一「AI 整理」入口：任意 Provider 只要注入同一 callChat，即共用原版标准。
 * 成功后打开可编辑草稿面板；需用户点「一键排版」才写入卡片。
 */
export async function runAiOrganize(
  rawContent: string,
  callChat: OrganizeChatCaller,
) {
  const source = rawContent.trim();
  if (!source) return;

  isChatLoading.value = true;
  chatError.value = null;
  try {
    const summary = await callChat(buildOrganizeMessages(source));
    const parsed = parseCardFromText(summary);
    const draft = formatOrganizedDraft(parsed, summary, source);
    openAiOrganizeDraft(draft);
    chatMessages.value = [
      ...chatMessages.value,
      {
        id: newId(),
        role: "assistant",
        content: `已整理完成，可在草稿中修改后点「一键排版」。\n\n${draft}`,
        createdAt: Date.now(),
      },
    ];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "整理失败";
    setChatError(msg);
    // 失败时用本地启发式生成草稿，仍可编辑后再排版
    const text = source.trim().replace(/\n{3,}/g, "\n\n");
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const draft = formatOrganizedDraft(
      {
        t: (lines[0] || "一张卡片").slice(0, CARD_ORGANIZE_LIMITS.localTitle),
        sub: (lines[1] || "AI 总结").slice(0, CARD_ORGANIZE_LIMITS.localSubtitle),
        body: lines.length > 2 ? lines.slice(2).join("\n") : text,
        wm: "— AI",
      },
      "",
      source,
    );
    openAiOrganizeDraft(draft);
  } finally {
    isChatLoading.value = false;
  }
}
