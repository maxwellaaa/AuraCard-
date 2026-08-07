import { ref } from "vue";
import { sanitizeCardHtml } from "./utils";
import {
  activeCardIndex,
  content,
  sectionMode,
  splitContents,
} from "./state";
import { updateSectionField } from "./sections";

export type InlineSelectionField = "title" | "subtitle" | "body";

export const inlineSelection = ref<{
  active: boolean;
  cardIndex: number;
  field: InlineSelectionField | null;
}>({
  active: false,
  cardIndex: -1,
  field: null,
});

/** 点击左侧控件时浏览器会清空选区，用克隆 Range 记住上次有效选区 */
let savedRange: Range | null = null;
/** 正在操作左侧字号/颜色时，忽略正文 blur 退出编辑 */
export const suppressBodyBlur = ref(false);
let suppressBlurTimer: ReturnType<typeof setTimeout> | null = null;

function armSuppressBodyBlur() {
  suppressBodyBlur.value = true;
  if (suppressBlurTimer) clearTimeout(suppressBlurTimer);
  suppressBlurTimer = setTimeout(() => {
    suppressBodyBlur.value = false;
    suppressBlurTimer = null;
  }, 400);
}

function nodeInRoot(node: Node | null, root: HTMLElement | null) {
  if (!node || !root) return false;
  const el = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  return !!(el && root.contains(el));
}

function selectionInside(root: HTMLElement | null) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !root) return false;
  return nodeInRoot(sel.getRangeAt(0).commonAncestorContainer, root);
}

function rangeStillValid(range: Range | null, root: HTMLElement | null) {
  if (!range || !root) return false;
  try {
    if (range.collapsed) return false;
    return nodeInRoot(range.commonAncestorContainer, root);
  } catch {
    return false;
  }
}

function getFieldRoot(
  cardIndex: number,
  field: InlineSelectionField | null,
): HTMLElement | null {
  if (cardIndex < 0 || !field) return null;
  if (field === "body") return getEditableBodyEl(cardIndex);
  if (field === "title") return getEditableTitleEl(cardIndex);
  return document.getElementById(`edit-subtitle-${cardIndex}`);
}

export function clearInlineSelection() {
  inlineSelection.value = { active: false, cardIndex: -1, field: null };
  savedRange = null;
}

export function trackInlineSelection(
  cardIndex: number,
  field: InlineSelectionField,
  root: HTMLElement | null,
) {
  if (!selectionInside(root)) {
    if (
      inlineSelection.value.cardIndex === cardIndex &&
      inlineSelection.value.field === field
    ) {
      // 焦点可能刚移到左侧控件：保留已保存选区，不要立刻清掉
      if (savedRange && rangeStillValid(savedRange, root)) return;
      clearInlineSelection();
    }
    return;
  }
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  try {
    savedRange = sel.getRangeAt(0).cloneRange();
  } catch {
    savedRange = null;
  }
  inlineSelection.value = { active: true, cardIndex, field };
  activeCardIndex.value = cardIndex;
}

/** 点击字号/颜色控件前调用，先克隆选区；按钮需 preventDefault 以免抢焦点 */
export function preserveInlineSelection(e?: Event) {
  armSuppressBodyBlur();
  const { cardIndex, field, active } = inlineSelection.value;
  if (active) {
    const root = getFieldRoot(cardIndex, field);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed && selectionInside(root)) {
      try {
        savedRange = sel.getRangeAt(0).cloneRange();
      } catch {
        // ignore
      }
    }
  }

  const target = e?.target as HTMLElement | null;
  if (!target || !e || !("preventDefault" in e)) return;
  // range/color/text 需要默认行为；按钮禁止抢焦点以保住选区高亮
  if (target.closest("button")) {
    e.preventDefault();
  }
}

function restoreWorkingRange(): Range | null {
  const { cardIndex, field, active } = inlineSelection.value;
  if (!active) return null;
  const root = getFieldRoot(cardIndex, field);
  if (!root) return null;

  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed && selectionInside(root)) {
    try {
      savedRange = sel.getRangeAt(0).cloneRange();
      return sel.getRangeAt(0);
    } catch {
      // fall through
    }
  }

  if (!rangeStillValid(savedRange, root) || !savedRange || !sel) return null;

  try {
    root.focus();
    sel.removeAllRanges();
    sel.addRange(savedRange);
    return savedRange;
  } catch {
    return null;
  }
}

function applyStylesToEl(
  el: HTMLElement,
  styles: Partial<CSSStyleDeclaration>,
) {
  if (styles.fontSize) el.style.fontSize = String(styles.fontSize);
  if (styles.color) el.style.color = String(styles.color);
  if (styles.fontWeight) el.style.fontWeight = String(styles.fontWeight);
  if (styles.textAlign) {
    el.style.textAlign = String(styles.textAlign);
    el.style.display = "block";
    el.style.width = "100%";
  }
}

function wrapRangeWithCss(
  range: Range,
  styles: Partial<CSSStyleDeclaration>,
  /** 对齐需块级容器；纯字号/颜色用 span */
  asBlock = false,
): boolean {
  const wrapper = document.createElement(asBlock ? "div" : "span");
  applyStylesToEl(wrapper, styles);

  try {
    range.surroundContents(wrapper);
  } catch {
    try {
      const frag = range.extractContents();
      wrapper.appendChild(frag);
      range.insertNode(wrapper);
    } catch {
      return false;
    }
  }

  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    const next = document.createRange();
    next.selectNodeContents(wrapper);
    sel.addRange(next);
    try {
      savedRange = next.cloneRange();
    } catch {
      // ignore
    }
  }
  return true;
}

/** 将字号/颜色/对齐应用到当前选区；成功返回 true */
export function applyStyleToCurrentSelection(patch: {
  fontSizePx?: number;
  textColor?: string;
  textAlign?: "left" | "center" | "right" | "justify";
}) {
  if (!inlineSelection.value.active) return false;
  const styles: Partial<CSSStyleDeclaration> = {};
  if (patch.fontSizePx != null) styles.fontSize = `${patch.fontSizePx}px`;
  if (patch.textColor) styles.color = patch.textColor;
  if (patch.textAlign) styles.textAlign = patch.textAlign;
  if (!styles.fontSize && !styles.color && !styles.textAlign) return false;

  const range = restoreWorkingRange();
  if (!range) return false;
  return wrapRangeWithCss(range, styles, Boolean(styles.textAlign));
}

export function getEditableBodyEl(cardIndex: number) {
  return document.getElementById(`edit-content-${cardIndex}`);
}

export function getEditableTitleEl(cardIndex: number) {
  return document.getElementById(`edit-title-${cardIndex}`);
}

export function persistInlineFieldFromDom(
  cardIndex: number,
  field: InlineSelectionField,
) {
  if (field === "body") {
    const el = getEditableBodyEl(cardIndex);
    if (!el) return;
    const html = sanitizeCardHtml(el.innerHTML || "");
    if (sectionMode.value) {
      updateSectionField(cardIndex, "body", html);
      return;
    }
    const parts = [...splitContents.value];
    if (cardIndex >= 0 && cardIndex < parts.length) {
      parts[cardIndex] = html;
      content.value = parts.join("\n\n---\n\n");
    }
    return;
  }

  const el =
    field === "title"
      ? getEditableTitleEl(cardIndex)
      : document.getElementById(`edit-subtitle-${cardIndex}`);
  if (!el) return;
  const html = sanitizeCardHtml(el.innerHTML || "");
  const plain = el.innerText || "";
  if (sectionMode.value) {
    updateSectionField(
      cardIndex,
      field,
      /<\/?span[\s>]/i.test(html) ? html : plain,
    );
  }
}

export function persistActiveSelectionField() {
  const { active, cardIndex, field } = inlineSelection.value;
  if (!active || cardIndex < 0 || !field) return;
  persistInlineFieldFromDom(cardIndex, field);
}
