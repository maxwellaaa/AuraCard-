import {
  cardSections,
  sectionMode,
  content,
  title,
  subtitle,
  splitContents,
  contentFontSizePx,
  textAlignment,
  contentTextAlignment,
  textColor,
  activeCardIndex,
} from "./state";
import { newId } from "./utils";
import type { CardSection, CardTextStyle } from "./types";

export function createDefaultCardStyle(): CardTextStyle {
  return {
    fontSizePx: contentFontSizePx.value,
    titleAlign: textAlignment.value,
    contentAlign: contentTextAlignment.value,
    textColor: textColor.value,
  };
}

export function resolveCardStyle(style?: CardTextStyle): Required<CardTextStyle> {
  const base = createDefaultCardStyle();
  return {
    fontSizePx: style?.fontSizePx ?? base.fontSizePx!,
    titleAlign: style?.titleAlign ?? base.titleAlign!,
    contentAlign: style?.contentAlign ?? base.contentAlign!,
    textColor: style?.textColor ?? base.textColor!,
  };
}

const CIRCLED_NUM = "^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]";

/** AI 拆解时的段落说明 / 排版提示，不应进入卡片 */
const AI_META_LINE_PATTERNS: RegExp[] = [
  /^第[一二三四五六七八九十百\d]+部分[：:].*/u,
  /可直接截图(保存)?/,
  /建议按以下(布局|格式|结构)?排版/,
  /^这是一张.*(长图|卡片|图文|信息图)/,
  /^(?:排版|布局|说明|备注|提示|注意)[：:]/,
  /按以下(格式|结构|布局|方式)/,
  /^以下是.*(卡片|内容|排版|示例)/,
  /^下面是.*(卡片|内容|排版)/,
  /^这里是.*(卡片|内容)/,
  /^【[^】]*(卡片|说明|提示)[^】]*】$/,
  /^\([^)]*可直接[^)]*\)$/,
  /^>*\s*(?:提示|说明|备注)[：:]/,
  /^#{1,6}\s*第[一二三四五六七八九十百\d]+部分/u,
  /^#{1,6}\s*.*(速览卡|封面卡|干货卡|信息长图).*/u,
  /（可直接截图[^）]*）/,
  /\(可直接截图[^)]*\)/,
];

function isAiMetaLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  const plain = t
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*+|\*+$/g, "")
    .replace(/^>\s*/, "")
    .trim();
  return AI_META_LINE_PATTERNS.some((re) => re.test(plain) || re.test(t));
}

function stripMarkdownHeadingMarks(raw: string) {
  return raw
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*+|\*+$/g, "")
    .replace(/^>\s*/, "")
    .trim();
}

/** 解析「标题：」「副标题：」「正文：」显式字段 */
function extractLabeledFields(block: string): {
  title: string;
  subtitle: string;
  body: string;
  usedLabels: boolean;
} {
  const lines = block.replace(/\r\n/g, "\n").split("\n");
  let foundTitle = "";
  let foundSubtitle = "";
  let bodyStart = -1;
  const kept: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const plain = stripMarkdownHeadingMarks(raw);

    const titleHit = plain.match(/^标题[：:]\s*(.+)$/);
    if (titleHit) {
      foundTitle = titleHit[1].trim();
      continue;
    }

    const subHit = plain.match(/^副标题[：:]\s*(.+)$/);
    if (subHit) {
      foundSubtitle = subHit[1].trim();
      continue;
    }

    const bodyHit = plain.match(/^正文[：:]\s*(.*)$/);
    if (bodyHit) {
      bodyStart = i;
      if (bodyHit[1].trim()) kept.push(bodyHit[1]);
      kept.push(...lines.slice(i + 1));
      break;
    }

    if (isAiMetaLine(raw)) continue;
    kept.push(raw);
  }

  let body =
    bodyStart >= 0
      ? kept.join("\n").trim()
      : filterMetaLines(kept.join("\n")).trim();

  // 正文里若仍残留「标题：」行，再清一次
  body = body
    .split("\n")
    .filter((line) => {
      const plain = stripMarkdownHeadingMarks(line);
      return !/^标题[：:]/.test(plain) && !/^副标题[：:]/.test(plain);
    })
    .join("\n")
    .trim();

  return {
    title: foundTitle,
    subtitle: foundSubtitle,
    body,
    usedLabels: Boolean(foundTitle || foundSubtitle || bodyStart >= 0),
  };
}

function filterMetaLines(text: string) {
  return text
    .split("\n")
    .filter((line) => !isAiMetaLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isSectionBreakTitle(line: string, prevBlank: boolean): string | null {
  const t = line.trim();
  if (!t) return null;

  // 显式「标题：」不当作分段符（由字段解析处理）
  const plain = stripMarkdownHeadingMarks(t);
  if (/^(标题|副标题|正文)[：:]/.test(plain)) return null;

  // AI 段落说明不当作卡片标题
  if (isAiMetaLine(t)) return null;

  const md = t.match(/^#{1,3}\s+(.+)$/);
  if (md) {
    const heading = md[1].trim();
    if (isAiMetaLine(heading) || /^(标题|副标题|正文)[：:]/.test(heading)) {
      return null;
    }
    return heading;
  }

  if (new RegExp(CIRCLED_NUM).test(t)) {
    return t.replace(/^#+\s*/, "").trim();
  }

  const numbered = t.match(/^(\d{1,2})[.、．]\s*(.+)$/);
  if (
    numbered &&
    prevBlank &&
    numbered[2].length <= 40 &&
    !/[。！？]/.test(numbered[2]) &&
    !isAiMetaLine(t)
  ) {
    return t;
  }

  return null;
}

function deriveTitleFromBody(body: string, fallback: string) {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return fallback;
  const first = stripMarkdownHeadingMarks(lines[0]);
  if (first.length > 0 && first.length <= 48 && !first.startsWith("|")) {
    return first.slice(0, 40);
  }
  return fallback;
}

function splitByHorizontalRules(raw: string): string[] {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/\n(?:---|\*\*\*|___)(?:\s*\n|$)/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function parseOneBlock(block: string, index: number): CardSection | null {
  const labeled = extractLabeledFields(block);
  let sectionTitle = labeled.title;
  let sectionSubtitle = labeled.subtitle;
  let body = labeled.body;

  // 无「标题：」时，尝试用首个非说明性 Markdown/编号标题
  if (!sectionTitle) {
    const lines = body.split("\n");
    let prevBlank = true;
    for (let i = 0; i < lines.length; i++) {
      const matched = isSectionBreakTitle(lines[i], prevBlank);
      if (matched !== null) {
        sectionTitle = matched;
        body = lines
          .slice(i + 1)
          .filter((line) => !isAiMetaLine(line))
          .join("\n")
          .trim();
        break;
      }
      prevBlank = !lines[i].trim();
    }
  }

  body = filterMetaLines(body);

  if (!sectionTitle) {
    sectionTitle = deriveTitleFromBody(
      body,
      index === 0 ? "封面导语" : `第 ${index + 1} 页`,
    );
    const bodyLines = body.split("\n");
    const firstPlain = stripMarkdownHeadingMarks(bodyLines[0] || "");
    if (
      bodyLines[0] &&
      firstPlain &&
      !firstPlain.startsWith("|") &&
      !/^[-*+]/.test(firstPlain) &&
      firstPlain.startsWith(sectionTitle.slice(0, Math.min(12, sectionTitle.length)))
    ) {
      body = bodyLines.slice(1).join("\n").trim();
    }
  }

  // 去掉正文开头与标题重复的一行
  const bodyLines = body.split("\n");
  if (bodyLines[0] && sectionTitle) {
    const firstPlain = stripMarkdownHeadingMarks(bodyLines[0]);
    if (
      firstPlain === sectionTitle ||
      firstPlain === `标题：${sectionTitle}` ||
      firstPlain === `标题:${sectionTitle}`
    ) {
      body = bodyLines.slice(1).join("\n").trim();
    }
  }

  if (!sectionTitle.trim() && !body.trim()) return null;

  return {
    id: newId(),
    title: sectionTitle.slice(0, 48),
    subtitle: sectionSubtitle.slice(0, 40),
    body,
    style: createDefaultCardStyle(),
  };
}

/**
 * 将 AI/Markdown 长文整理为多张卡片：
 * - 过滤「第X部分」「建议排版」等说明
 * - 「标题：」「副标题：」映射到卡片标题区
 * - 表格与正文进入 body
 * - 以 --- / ①编号 / ## 标题 分段
 */
export function segmentMarkdownIntoCards(raw: string): CardSection[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  // 优先按 --- 切成「一张卡一块」
  let blocks = splitByHorizontalRules(text);

  // 若几乎没有 ---，再按结构标题粗切
  if (blocks.length <= 1) {
    const lines = text.split("\n");
    const rough: string[] = [];
    let buf: string[] = [];
    let prevBlank = true;
    for (const line of lines) {
      const breakTitle = isSectionBreakTitle(line, prevBlank);
      const isCircled = new RegExp(CIRCLED_NUM).test(line.trim());
      if (breakTitle !== null && isCircled && buf.some((l) => l.trim())) {
        rough.push(buf.join("\n"));
        buf = [line];
      } else {
        buf.push(line);
      }
      prevBlank = !line.trim();
    }
    if (buf.length) rough.push(buf.join("\n"));
    if (rough.length > 1) blocks = rough;
  }

  const sections: CardSection[] = [];
  blocks.forEach((block, index) => {
    const card = parseOneBlock(block, index);
    if (card) sections.push(card);
  });

  return sections.filter((s) => s.title.trim() || s.body.trim());
}

export function sectionsToMarkdown(sections: CardSection[]) {
  return sections
    .map((s) => {
      const parts = [
        s.title.trim() ? `标题：${s.title.trim()}` : "",
        s.subtitle.trim() ? `副标题：${s.subtitle.trim()}` : "",
        s.body.trim() ? `正文：\n${s.body.trim()}` : "",
      ];
      return parts.filter(Boolean).join("\n\n");
    })
    .join("\n\n---\n\n");
}

export function syncContentFromSections() {
  const sections = cardSections.value;
  content.value = sectionsToMarkdown(sections);
  splitContents.value = sections.map((s) => s.body);
  if (sections[0]) {
    title.value = sections[0].title;
    subtitle.value = sections[0].subtitle || subtitle.value;
  }
  if (activeCardIndex.value >= sections.length) {
    activeCardIndex.value = Math.max(0, sections.length - 1);
  }
}

export function applyTitleSegmentedCards(raw: string) {
  const sections = segmentMarkdownIntoCards(raw);
  if (!sections.length) {
    throw new Error("未识别到可用的卡片内容，请检查是否多为说明文字。");
  }
  sectionMode.value = true;
  cardSections.value = sections;
  activeCardIndex.value = 0;
  syncContentFromSections();
  return sections.length;
}

/** 将当前预览内容转为可独立编辑的分段卡片（若不在分段模式） */
export function ensureSectionModeFromCurrent() {
  if (sectionMode.value && cardSections.value.length) return;

  const style = createDefaultCardStyle();
  const bodies = splitContents.value.filter((b) => b.trim().length >= 0);
  if (bodies.length > 0 && (bodies.length > 1 || bodies[0] || content.value.trim())) {
    cardSections.value = (bodies.length ? bodies : [content.value]).map(
      (body, i) => ({
        id: newId(),
        title: i === 0 ? title.value || "新页面" : `第 ${i + 1} 页`,
        subtitle: i === 0 ? subtitle.value || "" : "",
        body: body || "",
        style: { ...style },
      }),
    );
  } else {
    cardSections.value = [
      {
        id: newId(),
        title: title.value || "新页面",
        subtitle: subtitle.value || "",
        body: content.value || "",
        style: { ...style },
      },
    ];
  }
  sectionMode.value = true;
  if (activeCardIndex.value >= cardSections.value.length) {
    activeCardIndex.value = 0;
  }
  syncContentFromSections();
}

/** 手动新增一页可编辑卡片（标题 / 副标题 / 正文均可直接点选编辑） */
export function addCardPage() {
  ensureSectionModeFromCurrent();
  const nextIndex = cardSections.value.length + 1;
  cardSections.value = [
    ...cardSections.value,
    {
      id: newId(),
      title: `第 ${nextIndex} 页`,
      subtitle: "",
      body: "",
      style: createDefaultCardStyle(),
    },
  ];
  activeCardIndex.value = cardSections.value.length - 1;
  syncContentFromSections();
}

/** 删除指定页（至少保留一页） */
export function removeCardPage(index: number) {
  if (!sectionMode.value || cardSections.value.length <= 1) return;
  if (index < 0 || index >= cardSections.value.length) return;
  cardSections.value = cardSections.value.filter((_, i) => i !== index);
  if (activeCardIndex.value >= cardSections.value.length) {
    activeCardIndex.value = cardSections.value.length - 1;
  } else if (activeCardIndex.value > index) {
    activeCardIndex.value -= 1;
  }
  syncContentFromSections();
}

export function selectCard(index: number) {
  if (index < 0) return;
  if (sectionMode.value) {
    if (index >= cardSections.value.length) return;
    activeCardIndex.value = index;
    return;
  }
  if (index >= splitContents.value.length) return;
  activeCardIndex.value = index;
}

export function updateSectionStyle(
  index: number,
  patch: Partial<CardTextStyle>,
) {
  ensureSectionModeFromCurrent();
  const section = cardSections.value[index];
  if (!section) return;
  const next = [...cardSections.value];
  next[index] = {
    ...section,
    style: {
      ...createDefaultCardStyle(),
      ...section.style,
      ...patch,
    },
  };
  cardSections.value = next;
  activeCardIndex.value = index;
}

export function applyStyleToAllCards(patch?: Partial<CardTextStyle>) {
  ensureSectionModeFromCurrent();
  const source = {
    ...resolveCardStyle(cardSections.value[activeCardIndex.value]?.style),
    ...patch,
  };
  cardSections.value = cardSections.value.map((section) => ({
    ...section,
    style: { ...source },
  }));
}

export function clearSectionMode() {
  sectionMode.value = false;
  cardSections.value = [];
  activeCardIndex.value = 0;
}

export function updateSectionField(
  index: number,
  field: "title" | "subtitle" | "body",
  value: string,
) {
  const section = cardSections.value[index];
  if (!section) return;
  const next = [...cardSections.value];
  next[index] = { ...section, [field]: value };
  cardSections.value = next;
  syncContentFromSections();
}
