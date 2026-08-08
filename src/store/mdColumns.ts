import { marked } from "marked";
import { looksLikeHtml, sanitizeCardHtml } from "./utils";

export const COL_COUNT_MIN = 2;
export const COL_COUNT_MAX = 6;

export type ColumnDirection = "v" | "h";

export function clampColCount(n: number) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 2;
  return Math.min(COL_COUNT_MAX, Math.max(COL_COUNT_MIN, v));
}

/** 插入到 MD 编辑器的分栏语法（栏间用 --- 分隔） */
export function buildColumnFence(dir: ColumnDirection, count: number) {
  const n = clampColCount(count);
  const label = dir === "v" ? "竖排" : "横排";
  const cells = Array.from({ length: n }, (_, i) => `${label}栏 ${i + 1}`);
  return `\n:::cols ${dir} ${n}\n${cells.join("\n\n---\n\n")}\n:::\n`;
}

function dirClass(dir: ColumnDirection) {
  return dir === "h" ? "md-cols--h" : "md-cols--v";
}

export function buildColumnHtml(
  dir: ColumnDirection,
  count: number,
  cellHtmlList: string[],
) {
  const n = clampColCount(count);
  const cells = [...cellHtmlList];
  while (cells.length < n) {
    cells.push(`<p>栏 ${cells.length + 1}</p>`);
  }
  const inner = cells
    .slice(0, n)
    .map((html) => `<div class="md-cols__cell">${html}</div>`)
    .join("");
  return `<div class="md-cols ${dirClass(dir)} md-cols--n${n}">${inner}</div>\n`;
}

const COLS_BLOCK_RE =
  /:::cols\s+(v|h|vertical|horizontal)\s+(\d+)\s*\r?\n([\s\S]*?):::/gi;

/** 将 :::cols v|h N ... ::: 展开为 HTML（单元格内先走 marked） */
export function preprocessColumnBlocks(md: string): string {
  if (!md || !/:::cols\b/i.test(md)) return md;
  return md.replace(COLS_BLOCK_RE, (_m, dirRaw: string, countStr: string, body: string) => {
    const dir: ColumnDirection = /^h/i.test(dirRaw) ? "h" : "v";
    const count = clampColCount(Number(countStr));
    const parts = String(body || "")
      .split(/\n(?:---|\*\*\*|___)\s*\n/)
      .map((s) => s.trim())
      .filter((s, i, arr) => s.length > 0 || arr.length === 1);
    const cells = Array.from({ length: count }, (_, i) => {
      const src = parts[i] || `栏 ${i + 1}`;
      return String(marked.parse(src) || `<p>${src}</p>`);
    });
    return buildColumnHtml(dir, count, cells);
  });
}

/** 卡片正文统一渲染：分栏语法 → marked → sanitize */
export function renderCardMarkdown(text: string): string {
  const raw = text || "";
  if (!raw.trim()) return "";

  // 卡片内编辑落盘的 HTML（含 md-cols）直接净化
  if (!/:::cols\b/i.test(raw) && looksLikeHtml(raw)) {
    return sanitizeCardHtml(raw);
  }

  const preprocessed = preprocessColumnBlocks(raw);
  return sanitizeCardHtml(String(marked.parse(preprocessed) || ""));
}

/** 测量分页时注入，保证竖排分栏高度计算正确 */
export const MD_COLS_MEASURE_CSS = `
.md-cols{display:grid;gap:12px;margin:0 0 12px;width:100%;}
.md-cols--v.md-cols--n2{grid-template-columns:repeat(2,minmax(0,1fr));}
.md-cols--v.md-cols--n3{grid-template-columns:repeat(3,minmax(0,1fr));}
.md-cols--v.md-cols--n4{grid-template-columns:repeat(4,minmax(0,1fr));}
.md-cols--v.md-cols--n5{grid-template-columns:repeat(5,minmax(0,1fr));}
.md-cols--v.md-cols--n6{grid-template-columns:repeat(6,minmax(0,1fr));}
.md-cols--h{grid-template-columns:1fr;}
.md-cols__cell{min-width:0;break-inside:avoid;}
.md-cols__cell>*:last-child{margin-bottom:0;}
`;
