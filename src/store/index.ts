import { watch, onBeforeUnmount, onMounted } from "vue";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";
import {
  aspectId,
  cardScale,
  selectedTemplateId,
  title,
  subtitle,
  content,
  watermark,
  showWatermark,
  showSubtitle,
  background,
  textColor,
  textAlignment,
  contentTextAlignment,
  contentFontSizePx,
  accent,
  radius,
  padding,
  bgTab,
  activeGradientNode,
  gradientAngle,
  bgImageUrl,
  bgImageName,
  bgImageSizeText,
  bgOpacityPercent,
  errorMessage,
  previewFrameRef,
  previewSize,
  aiProvider,
  customAiBaseUrl,
  aiBaseUrl,
  aiModel,
  aiApiKey,
  isCustomAiProvider,
  aiTestMessage,
  aiTestStatus,
  isMobile,
  isSettingsCollapsed,
  isAiChatCollapsed,
  sectionMode,
  cardSections,
  splitContents,
  exportResolutionId,
  activeCardIndex,
} from "./state";
import { templates, aiProviderOptions, exportResolutionPresets } from "./config";
import { syncAiProviderSettings } from "./ai";
import { normalizeBaseUrl } from "./utils";
import { initSplit } from "./split";
import { initFonts } from "./fonts";
import { initPresets } from "./presets";
import { clearStickers, initStickers } from "./stickers";
import type { TemplateId, AiProviderId, ExportResolutionId } from "./types";

export * from "./types";
export * from "./config";
export * from "./state";
export * from "./utils";
export * from "./background";
export * from "./styles";
export * from "./ai";
export * from "./sections";
export * from "./selection";
export * from "./export";
export * from "./mdColumns";
export * from "./fonts";
export * from "./stickers";
export * from "./presets";

export function resetCardToInitialState() {
  selectedTemplateId.value = "A";
  aspectId.value = "3:4";
  cardScale.value = 1;

  title.value = "把文字做成光";
  subtitle.value = "可导出 PNG";
  content.value = "输入文字、选择模板、上传图片，然后一键下载。";
  watermark.value = "— 光语 —";
  showWatermark.value = true;
  showSubtitle.value = true;
  sectionMode.value = false;
  cardSections.value = [];
  activeCardIndex.value = 0;
  splitContents.value = [content.value];

  const template = templates.find((item) => item.id === "A") ?? templates[0];
  background.value = template.defaultBackground;
  textColor.value = template.defaultText;
  textAlignment.value = template.alignment;
  contentTextAlignment.value = template.alignment === "center" ? "center" : "left";
  contentFontSizePx.value = 18;
  accent.value = template.defaultAccent;
  radius.value = template.defaultRadius;
  padding.value = template.defaultPadding;

  bgTab.value = template.backgroundMode === "gradient" ? "gradient" : "solid";
  activeGradientNode.value = "background";
  gradientAngle.value = 135;
  bgImageUrl.value = null;
  bgImageName.value = null;
  bgImageSizeText.value = null;
  bgOpacityPercent.value = 60;
  errorMessage.value = null;
  clearStickers();
}

export function initStore() {
  // 全局一次性初始化 marked（避免每个 CardPreview 实例重复注册）
  marked.use(
    markedHighlight({
      langPrefix: "hljs language-",
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
      },
    }),
  );
  // GFM 表格 / 对齐默认开启；breaks 便于换行
  marked.use({
    gfm: true,
    breaks: true,
  });

  initSplit();
  initFonts();
  initStickers();
  initPresets();

  // 移动端窗口尺寸监听
  const onResize = () => {
    isMobile.value = window.innerWidth < 768;
  };
  window.addEventListener("resize", onResize);
  onBeforeUnmount(() => window.removeEventListener("resize", onResize));

  // 移动端下强制展开面板（折叠无意义）
  watch(isMobile, (mobile) => {
    if (mobile) {
      isSettingsCollapsed.value = false;
      isAiChatCollapsed.value = false;
    }
  });

  // 切换比例时保留 cardScale，仅宽高比变化；重置/预设可改缩放

  watch(
    () => selectedTemplateId.value,
    (id: TemplateId) => {
      const t = templates.find((x) => x.id === id);
      if (!t) return;
      background.value = t.defaultBackground;
      textColor.value = t.defaultText;
      textAlignment.value = t.alignment;
      contentTextAlignment.value = t.alignment === "center" ? "center" : "left";
      accent.value = t.defaultAccent;
      radius.value = t.defaultRadius;
      padding.value = t.defaultPadding;

      if (t.backgroundMode === "gradient") {
        bgTab.value = "gradient";
      } else {
        bgTab.value = "solid";
      }
    },
  );

  let ro: ResizeObserver | null = null;

  watch(
    () => previewFrameRef.value,
    (el) => {
      if (ro) {
        ro.disconnect();
        ro = null;
      }
      if (!el) return;
      ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        previewSize.value = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
      });
      ro.observe(el);
    },
  );

  onBeforeUnmount(() => {
    if (ro) {
      ro.disconnect();
      ro = null;
    }
  });

  // We no longer observe stageSize to avoid ResizeObserver loop scroll bugs

  onMounted(() => {
    const savedProvider = localStorage.getItem(
      "ai.provider",
    ) as AiProviderId | null;
    const hasSavedProvider = aiProviderOptions.some(
      (item) => item.id === savedProvider,
    );
    aiProvider.value =
      hasSavedProvider && savedProvider ? savedProvider : "deepseek";
    customAiBaseUrl.value =
      localStorage.getItem("ai.customBaseUrl") || "https://api.openai.com";
    aiBaseUrl.value = localStorage.getItem("ai.baseUrl") || "";
    aiModel.value = localStorage.getItem("ai.model") || "";
    // 无 card-server 时走浏览器端 Key + Vite 代理；有 Key 才持久化到本机
    aiApiKey.value =
      localStorage.getItem("ai.apiKey") ||
      String(import.meta.env.VITE_DEEPSEEK_API_KEY || "").trim();

    const savedExportResolution = localStorage.getItem(
      "export.resolution",
    ) as ExportResolutionId | null;
    if (
      savedExportResolution &&
      exportResolutionPresets.some((item) => item.id === savedExportResolution)
    ) {
      exportResolutionId.value = savedExportResolution;
    }

    const savedFontSize = Number(localStorage.getItem("card.contentFontSizePx"));
    if (Number.isFinite(savedFontSize) && savedFontSize >= 12 && savedFontSize <= 32) {
      contentFontSizePx.value = Math.round(savedFontSize);
    }

    const savedContentAlign = localStorage.getItem("card.contentTextAlignment");
    if (
      savedContentAlign === "left" ||
      savedContentAlign === "center" ||
      savedContentAlign === "right"
    ) {
      contentTextAlignment.value = savedContentAlign;
    }

    const savedScale = Number(localStorage.getItem("card.cardScale"));
    if (Number.isFinite(savedScale)) {
      cardScale.value = Math.min(1.55, Math.max(0.7, Math.round(savedScale * 100) / 100));
    }

    syncAiProviderSettings(aiProvider.value, true);
  });

  watch(
    () => cardScale.value,
    (v: number) => localStorage.setItem("card.cardScale", String(v)),
  );

  watch(
    () => exportResolutionId.value,
    (v: ExportResolutionId) => localStorage.setItem("export.resolution", v),
  );

  watch(
    () => contentFontSizePx.value,
    (v: number) => localStorage.setItem("card.contentFontSizePx", String(v)),
  );

  watch(
    () => contentTextAlignment.value,
    (v: "left" | "center" | "right") =>
      localStorage.setItem("card.contentTextAlignment", v),
  );

  watch(
    () => aiProvider.value,
    (v: AiProviderId) => {
      syncAiProviderSettings(v);
      aiTestMessage.value = "";
      aiTestStatus.value = "";
      localStorage.setItem("ai.provider", v);
    },
  );

  watch(
    () => aiApiKey.value,
    (v: string) => {
      const key = v.trim();
      if (key) localStorage.setItem("ai.apiKey", key);
      else localStorage.removeItem("ai.apiKey");
    },
  );

  watch(
    () => customAiBaseUrl.value,
    (v: string) => {
      localStorage.setItem("ai.customBaseUrl", v || "");
      if (isCustomAiProvider.value) aiBaseUrl.value = normalizeBaseUrl(v);
    },
  );

  watch(
    () => aiBaseUrl.value,
    (v: string) => localStorage.setItem("ai.baseUrl", v || ""),
  );

  watch(
    () => aiModel.value,
    (v: string) => localStorage.setItem("ai.model", v || ""),
  );
}
