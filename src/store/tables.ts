import { computed, ref } from "vue";
import { suppressBodyBlur } from "./selection";

export type TableAlign = "left" | "center" | "right";

export type TableSelection = {
  active: boolean;
  cardIndex: number;
  colIndex: number;
  colCount: number;
  align: TableAlign;
  widthPercent: number;
};

export const tableSelection = ref<TableSelection>({
  active: false,
  cardIndex: -1,
  colIndex: 0,
  colCount: 0,
  align: "left",
  widthPercent: 0,
});

/** 当前选中表格的弱引用，供左侧控件操作 */
let selectedTable: HTMLTableElement | null = null;

export const hasTableSelection = computed(() => tableSelection.value.active);

export function clearTableSelection() {
  selectedTable = null;
  tableSelection.value = {
    active: false,
    cardIndex: -1,
    colIndex: 0,
    colCount: 0,
    align: "left",
    widthPercent: 0,
  };
}

function colCountOf(table: HTMLTableElement) {
  let max = 0;
  for (const row of Array.from(table.rows)) {
    max = Math.max(max, row.cells.length);
  }
  return max;
}

function readCellAlign(cell: HTMLTableCellElement | undefined): TableAlign {
  if (!cell) return "left";
  const attr = (cell.getAttribute("align") || "").toLowerCase();
  if (attr === "center" || attr === "right" || attr === "left") return attr;
  const style = (cell.style.textAlign || "").toLowerCase();
  if (style === "center" || style === "right" || style === "left") return style;
  return "left";
}

function ensureColgroup(table: HTMLTableElement) {
  const n = colCountOf(table);
  let cg = table.querySelector("colgroup");
  if (!cg) {
    cg = document.createElement("colgroup");
    table.insertBefore(cg, table.firstChild);
  }
  while (cg.children.length < n) {
    cg.appendChild(document.createElement("col"));
  }
  while (cg.children.length > n) {
    cg.lastElementChild?.remove();
  }
  return cg;
}

function readColumnWidthPercent(table: HTMLTableElement, colIndex: number) {
  const cg = table.querySelector("colgroup");
  const col = cg?.children[colIndex] as HTMLElement | undefined;
  const raw = col?.style?.width || "";
  const m = raw.match(/([\d.]+)\s*%/);
  if (m) return Math.round(Number(m[1]));
  const n = Math.max(1, colCountOf(table));
  return Math.round(100 / n);
}

function syncSelectionState(cardIndex: number, colIndex: number, table: HTMLTableElement) {
  const n = colCountOf(table);
  const safeCol = Math.min(Math.max(0, colIndex), Math.max(0, n - 1));
  const cell = table.rows[0]?.cells[safeCol];
  tableSelection.value = {
    active: true,
    cardIndex,
    colIndex: safeCol,
    colCount: n,
    align: readCellAlign(cell),
    widthPercent: readColumnWidthPercent(table, safeCol),
  };
}

export function trackTableCellSelection(
  cardIndex: number,
  target: EventTarget | null,
) {
  const el = target instanceof HTMLElement ? target : null;
  const cell = el?.closest?.("th, td") as HTMLTableCellElement | null;
  const table = cell?.closest?.("table") as HTMLTableElement | null;
  if (!cell || !table) {
    clearTableSelection();
    return;
  }
  selectedTable = table;
  const colIndex = cell.cellIndex;
  syncSelectionState(cardIndex, colIndex, table);
}

export function preserveTableSelection(e?: Event) {
  suppressBodyBlur.value = true;
  window.setTimeout(() => {
    suppressBodyBlur.value = false;
  }, 400);
  const target = e?.target as HTMLElement | null;
  if (target?.closest?.("button, .segmented__btn")) {
    e?.preventDefault?.();
  }
}

export function setSelectedColumnAlign(align: TableAlign) {
  const table = selectedTable;
  if (!table || !tableSelection.value.active) return;
  const col = tableSelection.value.colIndex;
  for (const row of Array.from(table.rows)) {
    const cell = row.cells[col];
    if (!cell) continue;
    cell.setAttribute("align", align);
    cell.style.textAlign = align;
  }
  tableSelection.value = { ...tableSelection.value, align };
}

export function setSelectedColumnWidth(percent: number) {
  const table = selectedTable;
  if (!table || !tableSelection.value.active) return;
  const n = colCountOf(table);
  if (n <= 0) return;
  const col = tableSelection.value.colIndex;
  const clamped = Math.min(80, Math.max(10, Math.round(percent)));
  const cg = ensureColgroup(table);
  const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== col);
  const remain = 100 - clamped;
  const each = others.length ? remain / others.length : remain;
  Array.from(cg.children).forEach((node, i) => {
    const el = node as HTMLElement;
    el.style.width = `${i === col ? clamped : Math.round(each * 10) / 10}%`;
  });
  table.style.tableLayout = "fixed";
  table.style.width = "100%";
  tableSelection.value = { ...tableSelection.value, widthPercent: clamped };
}

/** 交换相邻列（含表头），用于手动重排列顺序 */
export function moveSelectedColumn(delta: -1 | 1) {
  const table = selectedTable;
  if (!table || !tableSelection.value.active) return;
  const from = tableSelection.value.colIndex;
  const to = from + delta;
  const n = colCountOf(table);
  if (to < 0 || to >= n) return;

  for (const row of Array.from(table.rows)) {
    const a = row.cells[from];
    const b = row.cells[to];
    if (!a || !b) continue;
    if (delta > 0) {
      row.insertBefore(b, a);
    } else {
      row.insertBefore(a, b);
    }
  }

  const cg = table.querySelector("colgroup");
  if (cg && cg.children[from] && cg.children[to]) {
    const ca = cg.children[from];
    const cb = cg.children[to];
    if (delta > 0) cg.insertBefore(cb, ca);
    else cg.insertBefore(ca, cb);
  }

  syncSelectionState(tableSelection.value.cardIndex, to, table);
}

/** Markdown 表格：按列写入对齐分隔行 */
export function buildMarkdownTable(
  headers: string[],
  rows: string[][],
  aligns?: TableAlign[],
) {
  const cols = headers.length;
  const alignRow = Array.from({ length: cols }, (_, i) => {
    const a = aligns?.[i] || "left";
    if (a === "center") return ":---:";
    if (a === "right") return "---:";
    return ":---";
  });
  const line = (cells: string[]) =>
    `| ${cells.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;
  return [
    line(headers),
    line(alignRow),
    ...rows.map((r) => line(Array.from({ length: cols }, (_, i) => r[i] || ""))),
  ].join("\n");
}

export function insertAlignedMarkdownTableSample() {
  return `\n${buildMarkdownTable(
    ["列 A", "列 B", "列 C"],
    [
      ["左对齐", "居中", "右对齐"],
      ["内容", "内容", "内容"],
    ],
    ["left", "center", "right"],
  )}\n`;
}
