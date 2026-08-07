import { ref, watch } from "vue";

export type OnlineFont = {
  id: string;
  label: string;
  family: string;
  /** Google Fonts CSS2 family 参数，如 Noto+Serif+SC:wght@400;700 */
  google?: string;
  /** 自定义 @font-face / stylesheet URL */
  cssUrl?: string;
  category: "sans" | "serif" | "display" | "handwriting" | "mono";
};

const BUILTIN_FONTS: OnlineFont[] = [
  {
    id: "system",
    label: "系统默认",
    family: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
    category: "sans",
  },
  {
    id: "inter",
    label: "Inter",
    family: '"Inter", system-ui, sans-serif',
    google: "Inter:wght@400;600;700;800",
    category: "sans",
  },
  {
    id: "noto-sans-sc",
    label: "思源黑体",
    family: '"Noto Sans SC", "PingFang SC", sans-serif',
    google: "Noto+Sans+SC:wght@400;500;700",
    category: "sans",
  },
  {
    id: "noto-serif-sc",
    label: "思源宋体",
    family: '"Noto Serif SC", "Songti SC", serif',
    google: "Noto+Serif+SC:wght@400;600;700;900",
    category: "serif",
  },
  {
    id: "zcool-xiaowei",
    label: "站酷小薇",
    family: '"ZCOOL XiaoWei", serif',
    google: "ZCOOL+XiaoWei",
    category: "serif",
  },
  {
    id: "zcool-kuaile",
    label: "站酷快乐体",
    family: '"ZCOOL KuaiLe", sans-serif',
    google: "ZCOOL+KuaiLe",
    category: "display",
  },
  {
    id: "zcool-qingke",
    label: "站酷庆科黄油体",
    family: '"ZCOOL QingKe HuangYou", sans-serif',
    google: "ZCOOL+QingKe+HuangYou",
    category: "display",
  },
  {
    id: "ma-shan",
    label: "马善政毛笔",
    family: '"Ma Shan Zheng", cursive',
    google: "Ma+Shan+Zheng",
    category: "handwriting",
  },
  {
    id: "long-cang",
    label: "龙藏体",
    family: '"Long Cang", cursive',
    google: "Long+Cang",
    category: "handwriting",
  },
  {
    id: "liu-jian",
    label: "刘建毛草",
    family: '"Liu Jian Mao Cao", cursive',
    google: "Liu+Jian+Mao+Cao",
    category: "handwriting",
  },
  {
    id: "zhi-mang",
    label: "芝麻行",
    family: '"Zhi Mang Xing", cursive',
    google: "Zhi+Mang+Xing",
    category: "handwriting",
  },
  {
    id: "jetbrains",
    label: "JetBrains Mono",
    family: '"JetBrains Mono", monospace',
    google: "JetBrains+Mono:wght@400;500;700",
    category: "mono",
  },
];

const STORAGE_KEY = "auracard.fonts.catalog";
const SELECTED_KEY = "auracard.fonts.selectedId";
const LINK_ATTR = "data-auracard-font";

export const onlineFonts = ref<OnlineFont[]>([...BUILTIN_FONTS]);
export const selectedFontId = ref("system");
export const fontsUpdateMessage = ref("");
export const isUpdatingFonts = ref(false);

export const selectedFont = () =>
  onlineFonts.value.find((f) => f.id === selectedFontId.value) ??
  onlineFonts.value[0];

export function cardFontFamilyCss() {
  return selectedFont()?.family || BUILTIN_FONTS[0].family;
}

function ensureStylesheet(href: string, id: string) {
  const existing = document.querySelector(`link[${LINK_ATTR}="${id}"]`);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute(LINK_ATTR, id);
  document.head.appendChild(link);
}

export function loadFontStylesheet(font: OnlineFont) {
  if (font.cssUrl) {
    ensureStylesheet(font.cssUrl, font.id);
    return;
  }
  if (font.google) {
    const href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
    ensureStylesheet(href, font.id);
  }
}

export function applySelectedFont() {
  const font = selectedFont();
  if (!font) return;
  loadFontStylesheet(font);
}

export function setSelectedFontId(id: string) {
  if (!onlineFonts.value.some((f) => f.id === id)) return;
  selectedFontId.value = id;
  applySelectedFont();
}

function mergeFonts(base: OnlineFont[], incoming: OnlineFont[]) {
  const map = new Map<string, OnlineFont>();
  for (const f of base) map.set(f.id, f);
  for (const f of incoming) {
    if (!f?.id || !f.family || !f.label) continue;
    map.set(f.id, {
      id: f.id,
      label: f.label,
      family: f.family,
      google: f.google,
      cssUrl: f.cssUrl,
      category: f.category || "sans",
    });
  }
  return Array.from(map.values());
}

/** 从本地 public 清单或远程 URL 手动更新字体列表 */
export async function updateOnlineFonts(sourceUrl?: string) {
  isUpdatingFonts.value = true;
  fontsUpdateMessage.value = "";
  try {
    const url = (sourceUrl || "/fonts-catalog.json").trim();
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { fonts?: OnlineFont[]; updatedAt?: string };
    const list = Array.isArray(data?.fonts) ? data.fonts : Array.isArray(data) ? (data as OnlineFont[]) : [];
    if (!list.length) throw new Error("清单为空");
    onlineFonts.value = mergeFonts(BUILTIN_FONTS, list);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fonts: onlineFonts.value, updatedAt: data.updatedAt || new Date().toISOString() }),
    );
    applySelectedFont();
    fontsUpdateMessage.value = `已更新 ${list.length} 条字体`;
  } catch (err) {
    fontsUpdateMessage.value = `更新失败：${err instanceof Error ? err.message : "未知错误"}（仍可用内置字体）`;
  } finally {
    isUpdatingFonts.value = false;
  }
}

export function addCustomFont(input: {
  label: string;
  family: string;
  cssUrl?: string;
  google?: string;
}) {
  const id = `custom-${Date.now()}`;
  const font: OnlineFont = {
    id,
    label: input.label.trim() || "自定义字体",
    family: input.family.trim(),
    cssUrl: input.cssUrl?.trim() || undefined,
    google: input.google?.trim() || undefined,
    category: "display",
  };
  if (!font.family) return null;
  onlineFonts.value = [...onlineFonts.value, font];
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ fonts: onlineFonts.value, updatedAt: new Date().toISOString() }),
  );
  setSelectedFontId(id);
  return font;
}

export function initFonts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { fonts?: OnlineFont[] };
      if (Array.isArray(parsed.fonts) && parsed.fonts.length) {
        onlineFonts.value = mergeFonts(BUILTIN_FONTS, parsed.fonts);
      }
    }
  } catch {
    // ignore
  }
  const savedId = localStorage.getItem(SELECTED_KEY);
  if (savedId && onlineFonts.value.some((f) => f.id === savedId)) {
    selectedFontId.value = savedId;
  }
  applySelectedFont();
  watch(selectedFontId, (id) => {
    localStorage.setItem(SELECTED_KEY, id);
    applySelectedFont();
  });
}
