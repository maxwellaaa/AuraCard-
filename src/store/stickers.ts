import { ref, computed } from "vue";

/** 在线贴纸分类（开源 Unicode / SVG，非 Canva CDN） */
export type StickerCategoryId =
  | "emoji"
  | "lines"
  | "cute"
  | "stickers"
  | "solid3d"
  | "icons"
  | "text"
  | "people"
  | "animals";

/** @deprecated 旧分段；映射到新分类后仍可读 */
export type StickerCategory = "emoji" | "shape" | "label" | "decor";

export type StickerPackItem = {
  id: string;
  label: string;
  category: StickerCategoryId;
  /** emoji 字符或简短文字 */
  content: string;
  kind: "emoji" | "text" | "svg";
  /** 内联 SVG path（kind=svg） */
  svgPath?: string;
  svgViewBox?: string;
  /** 线条类 SVG 用描边而非填充 */
  svgStroke?: boolean;
  color?: string;
  /** 搜索关键词 */
  tags?: string[];
};

export type StickerCategoryMeta = {
  id: StickerCategoryId;
  label: string;
};

export type PlacedSticker = {
  id: string;
  packId: string;
  content: string;
  kind: "emoji" | "text" | "svg";
  svgPath?: string;
  svgViewBox?: string;
  svgStroke?: boolean;
  color: string;
  /** 相对卡片宽高的百分比 0–100 */
  x: number;
  y: number;
  /** 字号/尺寸 px */
  size: number;
  rotate: number;
  opacity: number;
};

export const STICKER_CATEGORIES: StickerCategoryMeta[] = [
  { id: "emoji", label: "表情" },
  { id: "lines", label: "线条" },
  { id: "cute", label: "可爱" },
  { id: "stickers", label: "贴纸" },
  { id: "solid3d", label: "3D立体" },
  { id: "icons", label: "图标" },
  { id: "text", label: "文字设计" },
  { id: "people", label: "人物" },
  { id: "animals", label: "动物" },
];

const CATEGORY_LABEL = Object.fromEntries(
  STICKER_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<StickerCategoryId, string>;

/** 内置开源风格素材（Unicode emoji + 简易 SVG path） */
export const BUILTIN_STICKER_PACK: StickerPackItem[] = [
  // 表情（专用 emoji 分类）
  { id: "em-grin", label: "大笑", category: "emoji", content: "😀", kind: "emoji", tags: ["笑", "表情"] },
  { id: "em-joy", label: "笑哭", category: "emoji", content: "😂", kind: "emoji", tags: ["笑", "表情"] },
  { id: "em-love", label: "花痴", category: "emoji", content: "😍", kind: "emoji", tags: ["爱", "表情"] },
  { id: "em-hearts", label: "喜爱", category: "emoji", content: "🥰", kind: "emoji", tags: ["爱心", "表情"] },
  { id: "em-star", label: "星星眼", category: "emoji", content: "🤩", kind: "emoji", tags: ["惊喜", "表情"] },
  { id: "em-kiss", label: "飞吻", category: "emoji", content: "😘", kind: "emoji", tags: ["吻", "表情"] },
  { id: "em-wink", label: "眨眼", category: "emoji", content: "😉", kind: "emoji", tags: ["俏皮", "表情"] },
  { id: "em-blush", label: "害羞", category: "emoji", content: "😊", kind: "emoji", tags: ["微笑", "表情"] },
  { id: "em-think", label: "思考", category: "emoji", content: "🤔", kind: "emoji", tags: ["想", "表情"] },
  { id: "em-cool", label: "酷", category: "emoji", content: "😎", kind: "emoji", tags: ["墨镜", "表情"] },
  { id: "em-party", label: "派对", category: "emoji", content: "🥳", kind: "emoji", tags: ["庆祝", "表情"] },
  { id: "em-hug", label: "抱抱", category: "emoji", content: "🤗", kind: "emoji", tags: ["拥抱", "表情"] },
  { id: "em-salute", label: "敬礼", category: "emoji", content: "🫡", kind: "emoji", tags: ["致敬", "表情"] },
  { id: "em-wow", label: "惊叹", category: "emoji", content: "😮", kind: "emoji", tags: ["惊讶", "表情"] },
  { id: "em-shock", label: "惊恐", category: "emoji", content: "😱", kind: "emoji", tags: ["害怕", "表情"] },
  { id: "em-cry", label: "大哭", category: "emoji", content: "😭", kind: "emoji", tags: ["哭", "表情"] },
  { id: "em-angry", label: "生气", category: "emoji", content: "😤", kind: "emoji", tags: ["怒", "表情"] },
  { id: "em-sleepy", label: "睡觉", category: "emoji", content: "😴", kind: "emoji", tags: ["困", "表情"] },
  { id: "em-explode", label: "爆炸头", category: "emoji", content: "🤯", kind: "emoji", tags: ["震惊", "表情"] },
  { id: "em-melt", label: "融化", category: "emoji", content: "🫠", kind: "emoji", tags: ["无语", "表情"] },
  { id: "em-angel", label: "天使", category: "emoji", content: "😇", kind: "emoji", tags: ["乖", "表情"] },
  { id: "em-up", label: "点赞", category: "emoji", content: "👍", kind: "emoji", tags: ["赞", "手势"] },
  { id: "em-clap", label: "鼓掌", category: "emoji", content: "👏", kind: "emoji", tags: ["掌声", "手势"] },
  { id: "em-pray", label: "拜托", category: "emoji", content: "🙏", kind: "emoji", tags: ["感谢", "手势"] },
  { id: "em-ok", label: "OK手势", category: "emoji", content: "👌", kind: "emoji", tags: ["好", "手势"] },
  { id: "em-flex", label: "加油", category: "emoji", content: "💪", kind: "emoji", tags: ["力量", "手势"] },
  { id: "em-fire", label: "火焰", category: "emoji", content: "🔥", kind: "emoji", tags: ["热", "表情"] },
  { id: "em-100", label: "满分", category: "emoji", content: "💯", kind: "emoji", tags: ["100", "表情"] },

  // 线条
  { id: "ln-arrow-r", label: "右箭头", category: "lines", content: "→", kind: "text", color: "#0ea5e9", tags: ["箭头", "线"] },
  { id: "ln-arrow-l", label: "左箭头", category: "lines", content: "←", kind: "text", color: "#0ea5e9", tags: ["箭头"] },
  { id: "ln-arrow-u", label: "上箭头", category: "lines", content: "↑", kind: "text", color: "#0ea5e9", tags: ["箭头"] },
  { id: "ln-arrow-d", label: "下箭头", category: "lines", content: "↓", kind: "text", color: "#0ea5e9", tags: ["箭头"] },
  { id: "ln-dash", label: "虚线", category: "lines", content: "┄┄┄", kind: "text", color: "#64748b", tags: ["分割线"] },
  { id: "ln-wave", label: "波浪线", category: "lines", content: "〰〰", kind: "text", color: "#8b5cf6", tags: ["装饰线"] },
  {
    id: "ln-chevron",
    label: "折线",
    category: "lines",
    content: "",
    kind: "svg",
    svgViewBox: "0 0 24 24",
    svgPath: "M4 8l8 8 8-8",
    svgStroke: true,
    color: "#334155",
    tags: ["折线", "chevron"],
  },
  {
    id: "ln-curve",
    label: "弧线",
    category: "lines",
    content: "",
    kind: "svg",
    svgViewBox: "0 0 24 24",
    svgPath: "M3 17c4-10 14-10 18 0",
    svgStroke: true,
    color: "#f59e0b",
    tags: ["弧", "曲线"],
  },

  // 可爱
  { id: "cu-star", label: "星星", category: "cute", content: "⭐", kind: "emoji", tags: ["星", "可爱"] },
  { id: "cu-spark", label: "火花", category: "cute", content: "✨", kind: "emoji", tags: ["闪"] },
  { id: "cu-heart", label: "爱心", category: "cute", content: "❤️", kind: "emoji", tags: ["心"] },
  { id: "cu-blush", label: "害羞", category: "cute", content: "😊", kind: "emoji", tags: ["表情"] },
  { id: "cu-party", label: "庆祝", category: "cute", content: "🎉", kind: "emoji", tags: ["派对"] },
  { id: "cu-rainbow", label: "彩虹", category: "cute", content: "🌈", kind: "emoji", tags: ["色彩"] },
  { id: "cu-flower", label: "花朵", category: "cute", content: "🌸", kind: "emoji", tags: ["花"] },
  { id: "cu-ribbon", label: "丝带", category: "cute", content: "🎀", kind: "emoji", tags: ["蝴蝶结"] },

  // 贴纸
  { id: "st-ok", label: "OK", category: "stickers", content: "👍", kind: "emoji", tags: ["点赞"] },
  { id: "st-clap", label: "鼓掌", category: "stickers", content: "👏", kind: "emoji", tags: ["掌声"] },
  { id: "st-fire", label: "火焰", category: "stickers", content: "🔥", kind: "emoji", tags: ["热"] },
  { id: "st-idea", label: "灵感", category: "stickers", content: "💡", kind: "emoji", tags: ["灯泡"] },
  { id: "st-pin", label: "图钉", category: "stickers", content: "📌", kind: "emoji", tags: ["标记"] },
  { id: "st-cam", label: "相机", category: "stickers", content: "📷", kind: "emoji", tags: ["拍照"] },
  { id: "st-bang", label: "感叹", category: "stickers", content: "❗", kind: "emoji", tags: ["强调"] },
  { id: "st-check", label: "勾选", category: "stickers", content: "✓", kind: "text", color: "#10b981", tags: ["完成"] },

  // 3D立体（emoji 立体观感，非商业 3D 模型）
  { id: "d3-gem", label: "宝石", category: "solid3d", content: "💎", kind: "emoji", tags: ["立体", "宝石"] },
  { id: "d3-ball", label: "水晶球", category: "solid3d", content: "🔮", kind: "emoji", tags: ["立体"] },
  { id: "d3-cube", label: "骰子", category: "solid3d", content: "🎲", kind: "emoji", tags: ["立方"] },
  { id: "d3-orb", label: "台球", category: "solid3d", content: "🎱", kind: "emoji", tags: ["球"] },
  { id: "d3-moon", label: "月亮", category: "solid3d", content: "🌙", kind: "emoji", tags: ["月"] },
  { id: "d3-sun", label: "太阳", category: "solid3d", content: "☀️", kind: "emoji", tags: ["日"] },
  { id: "d3-rocket", label: "火箭", category: "solid3d", content: "🚀", kind: "emoji", tags: ["发射"] },
  { id: "d3-trophy", label: "奖杯", category: "solid3d", content: "🏆", kind: "emoji", tags: ["成就"] },

  // 图标（简易 SVG）
  {
    id: "ic-heart",
    label: "心形",
    category: "icons",
    content: "",
    kind: "svg",
    svgViewBox: "0 0 24 24",
    svgPath:
      "M12 21s-6.7-4.35-9.33-7.4C.5 11.2.7 7.9 3.2 6.1 5.1 4.7 7.6 5 9 6.5L12 9.7l3-3.2C16.4 5 18.9 4.7 20.8 6.1c2.5 1.8 2.7 5.1.53 7.5C18.7 16.65 12 21 12 21z",
    color: "#fb7185",
    tags: ["心", "图标"],
  },
  {
    id: "ic-star",
    label: "五角星",
    category: "icons",
    content: "",
    kind: "svg",
    svgViewBox: "0 0 24 24",
    svgPath: "M12 2l2.9 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 7.1-1L12 2z",
    color: "#f59e0b",
    tags: ["星", "图标"],
  },
  {
    id: "ic-check",
    label: "对勾",
    category: "icons",
    content: "",
    kind: "svg",
    svgViewBox: "0 0 24 24",
    svgPath: "M5 13l4 4L19 7",
    svgStroke: true,
    color: "#10b981",
    tags: ["完成", "勾"],
  },
  {
    id: "ic-circle",
    label: "圆点",
    category: "icons",
    content: "●",
    kind: "text",
    color: "#f59e0b",
    tags: ["圆", "点"],
  },
  {
    id: "ic-tri",
    label: "三角",
    category: "icons",
    content: "▲",
    kind: "text",
    color: "#06b6d4",
    tags: ["三角"],
  },
  {
    id: "ic-sq",
    label: "方块",
    category: "icons",
    content: "■",
    kind: "text",
    color: "#8b5cf6",
    tags: ["方"],
  },
  {
    id: "ic-bolt",
    label: "闪电",
    category: "icons",
    content: "",
    kind: "svg",
    svgViewBox: "0 0 24 24",
    svgPath: "M13 2L4 14h7l-1 8 10-14h-7l1-6z",
    color: "#eab308",
    tags: ["电", "快"],
  },
  {
    id: "ic-bookmark",
    label: "书签",
    category: "icons",
    content: "",
    kind: "svg",
    svgViewBox: "0 0 24 24",
    svgPath: "M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z",
    color: "#6366f1",
    tags: ["收藏"],
  },

  // 文字设计
  { id: "tx-hot", label: "HOT", category: "text", content: "HOT", kind: "text", color: "#ef4444", tags: ["标签", "热门"] },
  { id: "tx-new", label: "NEW", category: "text", content: "NEW", kind: "text", color: "#2563eb", tags: ["标签", "新品"] },
  { id: "tx-tip", label: "TIP", category: "text", content: "TIP", kind: "text", color: "#059669", tags: ["提示"] },
  { id: "tx-must", label: "必看", category: "text", content: "必看", kind: "text", color: "#db2777", tags: ["中文"] },
  { id: "tx-save", label: "收藏", category: "text", content: "收藏", kind: "text", color: "#7c3aed", tags: ["中文"] },
  { id: "tx-sale", label: "SALE", category: "text", content: "SALE", kind: "text", color: "#ea580c", tags: ["促销"] },
  { id: "tx-free", label: "FREE", category: "text", content: "FREE", kind: "text", color: "#0891b2", tags: ["免费"] },
  { id: "tx-vip", label: "VIP", category: "text", content: "VIP", kind: "text", color: "#ca8a04", tags: ["会员"] },

  // 人物
  { id: "pe-wave", label: "挥手", category: "people", content: "👋", kind: "emoji", tags: ["人", "手"] },
  { id: "pe-think", label: "思考", category: "people", content: "🤔", kind: "emoji", tags: ["表情"] },
  { id: "pe-cool", label: "酷", category: "people", content: "😎", kind: "emoji", tags: ["墨镜"] },
  { id: "pe-work", label: "办公", category: "people", content: "🧑‍💻", kind: "emoji", tags: ["工作"] },
  { id: "pe-artist", label: "画家", category: "people", content: "🧑‍🎨", kind: "emoji", tags: ["创作"] },
  { id: "pe-teacher", label: "老师", category: "people", content: "🧑‍🏫", kind: "emoji", tags: ["教学"] },
  { id: "pe-runner", label: "跑步", category: "people", content: "🏃", kind: "emoji", tags: ["运动"] },
  { id: "pe-yoga", label: "瑜伽", category: "people", content: "🧘", kind: "emoji", tags: ["放松"] },

  // 动物
  { id: "an-cat", label: "猫", category: "animals", content: "🐱", kind: "emoji", tags: ["喵"] },
  { id: "an-dog", label: "狗", category: "animals", content: "🐶", kind: "emoji", tags: ["汪"] },
  { id: "an-rabbit", label: "兔", category: "animals", content: "🐰", kind: "emoji", tags: ["兔子"] },
  { id: "an-bear", label: "熊", category: "animals", content: "🐻", kind: "emoji", tags: ["熊"] },
  { id: "an-fox", label: "狐", category: "animals", content: "🦊", kind: "emoji", tags: ["狐狸"] },
  { id: "an-panda", label: "熊猫", category: "animals", content: "🐼", kind: "emoji", tags: ["国宝"] },
  { id: "an-bird", label: "鸟", category: "animals", content: "🐦", kind: "emoji", tags: ["飞"] },
  { id: "an-fish", label: "鱼", category: "animals", content: "🐟", kind: "emoji", tags: ["水"] },
];

/** 兼容旧 id → 新包（预设/已放置贴纸仍可用） */
const LEGACY_ALIASES: Record<string, string> = {
  "e-star": "cu-star",
  "e-spark": "cu-spark",
  "e-fire": "st-fire",
  "e-heart": "cu-heart",
  "e-ok": "st-ok",
  "e-clap": "st-clap",
  "e-idea": "st-idea",
  "e-party": "cu-party",
  "e-cam": "st-cam",
  "e-pin": "st-pin",
  "e-sun": "d3-sun",
  "e-moon": "d3-moon",
  "l-hot": "tx-hot",
  "l-new": "tx-new",
  "l-tip": "tx-tip",
  "l-must": "tx-must",
  "l-save": "tx-save",
  "s-circle": "ic-circle",
  "s-tri": "ic-tri",
  "s-sq": "ic-sq",
  "s-heart": "ic-heart",
  "d-arrow": "ln-arrow-r",
  "d-check": "st-check",
  "d-bang": "st-bang",
  "d-ribbon": "cu-ribbon",
};

export const STICKER_PACK = BUILTIN_STICKER_PACK;

const STORAGE_KEY = "auracard.stickers.catalog";

export const stickerPack = ref<StickerPackItem[]>([...BUILTIN_STICKER_PACK]);
/** 浏览态：null=分类行首页；否则=某分类「查看全部」 */
export const stickerBrowseCategory = ref<StickerCategoryId | null>(null);
export const stickerSearchQuery = ref("");
/** 兼容旧 LeftPanel 分段（映射到新分类） */
export const stickerCategory = ref<StickerCategory | StickerCategoryId | "all">("all");
export const placedStickers = ref<PlacedSticker[]>([]);
export const selectedStickerId = ref<string | null>(null);
export const stickersUpdateMessage = ref("");
export const isUpdatingStickers = ref(false);

const OLD_TO_NEW: Record<StickerCategory, StickerCategoryId> = {
  emoji: "emoji",
  label: "text",
  shape: "icons",
  decor: "stickers",
};

function normalizeItem(raw: Partial<StickerPackItem> & { id?: string }): StickerPackItem | null {
  if (!raw?.id || !raw.label) return null;
  const category = (raw.category as StickerCategoryId) || "stickers";
  if (!CATEGORY_LABEL[category]) return null;
  const kind = raw.kind === "svg" || raw.kind === "text" || raw.kind === "emoji" ? raw.kind : "emoji";
  return {
    id: raw.id,
    label: raw.label,
    category,
    content: raw.content ?? "",
    kind,
    svgPath: raw.svgPath,
    svgViewBox: raw.svgViewBox || "0 0 24 24",
    svgStroke: Boolean(raw.svgStroke),
    color: raw.color,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === "string") : undefined,
  };
}

function mergePack(base: StickerPackItem[], incoming: StickerPackItem[]) {
  const map = new Map<string, StickerPackItem>();
  for (const s of base) map.set(s.id, s);
  for (const s of incoming) {
    const n = normalizeItem(s);
    if (n) map.set(n.id, n);
  }
  return Array.from(map.values());
}

function resolvePackId(packId: string) {
  return LEGACY_ALIASES[packId] || packId;
}

function findPackItem(packId: string) {
  const id = resolvePackId(packId);
  return stickerPack.value.find((s) => s.id === id) || BUILTIN_STICKER_PACK.find((s) => s.id === id);
}

function matchesQuery(item: StickerPackItem, q: string) {
  if (!q) return true;
  const hay = [
    item.label,
    item.content,
    CATEGORY_LABEL[item.category],
    ...(item.tags || []),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export const filteredStickerPack = computed(() => {
  const q = stickerSearchQuery.value.trim().toLowerCase();
  let list = stickerPack.value;
  const browse = stickerBrowseCategory.value;
  if (browse) {
    list = list.filter((s) => s.category === browse);
  } else {
    const cat = stickerCategory.value;
    if (cat && cat !== "all") {
      const mapped = (OLD_TO_NEW as Record<string, StickerCategoryId>)[cat] || (cat as StickerCategoryId);
      if (CATEGORY_LABEL[mapped]) {
        list = list.filter((s) => s.category === mapped);
      }
    }
  }
  if (q) list = list.filter((s) => matchesQuery(s, q));
  return list;
});

/** 首页：按分类分组（搜索时扁平结果由 UI 用 filteredStickerPack） */
export const stickerCategoryRows = computed(() => {
  const q = stickerSearchQuery.value.trim().toLowerCase();
  return STICKER_CATEGORIES.map((meta) => {
    let items = stickerPack.value.filter((s) => s.category === meta.id);
    if (q) items = items.filter((s) => matchesQuery(s, q));
    return { ...meta, items };
  }).filter((row) => row.items.length > 0);
});

export const isStickerSearchActive = computed(() => stickerSearchQuery.value.trim().length > 0);

function newId() {
  return `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function setStickerSearchQuery(q: string) {
  stickerSearchQuery.value = q;
}

export function openStickerCategory(id: StickerCategoryId | null) {
  stickerBrowseCategory.value = id;
  if (id) stickerCategory.value = id;
  else stickerCategory.value = "all";
}

/** 左侧分段：全部 / 各分类 */
export function setStickerCategory(id: StickerCategoryId | "all") {
  stickerCategory.value = id;
  stickerBrowseCategory.value = id === "all" ? null : id;
}

export function addStickerFromPack(packId: string) {
  const pack = findPackItem(packId);
  if (!pack) return;
  const count = placedStickers.value.length;
  const sticker: PlacedSticker = {
    id: newId(),
    packId: pack.id,
    content: pack.content,
    kind: pack.kind,
    svgPath: pack.svgPath,
    svgViewBox: pack.svgViewBox,
    svgStroke: pack.svgStroke,
    color: pack.color || "#111827",
    x: 18 + (count % 4) * 16,
    y: 22 + Math.floor(count / 4) * 14,
    size: pack.kind === "emoji" ? 42 : pack.kind === "text" ? 28 : 48,
    rotate: 0,
    opacity: 1,
  };
  placedStickers.value = [...placedStickers.value, sticker];
  selectedStickerId.value = sticker.id;
}

export function selectSticker(id: string | null) {
  selectedStickerId.value = id;
}

export function updatePlacedSticker(
  id: string,
  patch: Partial<Pick<PlacedSticker, "x" | "y" | "size" | "rotate" | "opacity" | "color">>,
) {
  placedStickers.value = placedStickers.value.map((s) =>
    s.id === id ? { ...s, ...patch } : s,
  );
}

export function removePlacedSticker(id: string) {
  placedStickers.value = placedStickers.value.filter((s) => s.id !== id);
  if (selectedStickerId.value === id) selectedStickerId.value = null;
}

export function clearStickers() {
  placedStickers.value = [];
  selectedStickerId.value = null;
}

export function setPlacedStickers(list: PlacedSticker[]) {
  placedStickers.value = Array.isArray(list) ? list.map((s) => ({ ...s })) : [];
  selectedStickerId.value = null;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (el.closest('[contenteditable="true"], [contenteditable="plaintext-only"], input, textarea, select')) {
    return true;
  }
  return false;
}

function onStickerHotkey(e: KeyboardEvent) {
  if (!selectedStickerId.value) return;
  if (e.isComposing) return;
  if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) return;

  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    removePlacedSticker(selectedStickerId.value);
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    selectSticker(null);
  }
}

let stickerHotkeysBound = false;

function bindStickerHotkeys() {
  if (stickerHotkeysBound || typeof window === "undefined") return;
  window.addEventListener("keydown", onStickerHotkey);
  stickerHotkeysBound = true;
}

/** 从 public 清单或远程 URL 更新素材（开源/CC0 清单，勿指向 Canva CDN） */
export async function updateOnlineStickers(sourceUrl?: string) {
  isUpdatingStickers.value = true;
  stickersUpdateMessage.value = "";
  try {
    const url = (sourceUrl || "/stickers-catalog.json").trim();
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      stickers?: StickerPackItem[];
      items?: StickerPackItem[];
      updatedAt?: string;
      licenseNote?: string;
    };
    const listRaw = Array.isArray(data?.stickers)
      ? data.stickers
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? (data as StickerPackItem[])
          : [];
    const list = listRaw.map(normalizeItem).filter(Boolean) as StickerPackItem[];
    if (!list.length) throw new Error("清单为空");
    stickerPack.value = mergePack(BUILTIN_STICKER_PACK, list);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        stickers: stickerPack.value,
        updatedAt: data.updatedAt || new Date().toISOString(),
        licenseNote: data.licenseNote,
      }),
    );
    stickersUpdateMessage.value = `已更新 ${list.length} 条素材`;
  } catch (err) {
    stickersUpdateMessage.value = `更新失败：${err instanceof Error ? err.message : "未知错误"}（仍可用内置素材）`;
  } finally {
    isUpdatingStickers.value = false;
  }
}

export function initStickers() {
  bindStickerHotkeys();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { stickers?: StickerPackItem[] };
      if (Array.isArray(parsed.stickers) && parsed.stickers.length) {
        stickerPack.value = mergePack(BUILTIN_STICKER_PACK, parsed.stickers);
      }
    }
  } catch {
    // ignore
  }
  // 后台刷新本地清单（失败/成功均静默，避免打扰）
  void updateOnlineStickers().then(() => {
    stickersUpdateMessage.value = "";
  });
}
