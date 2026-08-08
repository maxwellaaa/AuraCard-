import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const origPath =
  "G:/GitHub 软件/AuraCard-master/AuraCard-master/src/store/ai.ts";
const fPath = resolve("src/store/aiOrganize.ts");
const aiPath = resolve("src/store/ai.ts");

const orig = readFileSync(origPath, "utf8");
const f = readFileSync(fPath, "utf8");
const ai = readFileSync(aiPath, "utf8");

const EXPECTED =
  "你是内容编辑助手。请将用户提供的文字整理成图文内容格式。如果内容较长，请尽量保留原始正文细节，只需生成合适的标题、副标题和水印。输出格式必须为：\n标题：...\n副标题：...\n正文：...\n水印：...";

const extractQuoted = (src, needle) => {
  const idx = src.indexOf(needle);
  if (idx < 0) return null;
  // find the opening quote just before needle
  const start = src.lastIndexOf('"', idx);
  if (start < 0) return null;
  let out = "";
  for (let i = start + 1; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\\") {
      const next = src[i + 1];
      if (next === "n") {
        out += "\n";
        i++;
        continue;
      }
      out += next;
      i++;
      continue;
    }
    if (ch === '"') break;
    out += ch;
  }
  return out;
};

const promptOrig = extractQuoted(orig, "你是内容编辑助手");
const promptF = extractQuoted(f, "你是内容编辑助手");

const checks = {
  prompt_equals_expected_orig: promptOrig === EXPECTED,
  prompt_equals_expected_f: promptF === EXPECTED,
  prompt_orig_eq_f: promptOrig === promptF,
  has_parser_f: ["/标题[:：]/", "/副标题[:：]/", "/正文[:：]/", "/水印[:：]/"].every(
    (p) => f.includes(p.slice(1, -1)) || f.includes(p),
  ),
  // simpler marker check
  markers_f:
    f.includes("标题[:：]") &&
    f.includes("副标题[:：]") &&
    f.includes("正文[:：]") &&
    f.includes("水印[:：]"),
  limits_f:
    f.includes("title: 32") &&
    f.includes("subtitle: 40") &&
    f.includes("watermark: 24"),
  wired_all_providers:
    ai.includes("await runAiOrganize(rawContent, callAiChat)") &&
    ai.includes('provider === "deepseek"') &&
    ai.includes('provider === "qwen"') &&
    ai.includes('provider === "openai"') &&
    ai.includes('provider === "openrouter"') &&
    ai.includes('provider === "custom"'),
};

console.log(JSON.stringify(checks, null, 2));
const ok = Object.values(checks).every(Boolean);
if (!ok) process.exit(1);
