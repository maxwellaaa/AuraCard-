import { nextTick } from "vue";
import { toPng, getFontEmbedCSS } from "html-to-image";
import JSZip from "jszip";
import {
  cardRefs,
  isDownloading,
  downloadProgress,
  errorMessage,
  title,
  sectionMode,
  cardSections,
  exportResolutionId,
  activeAspect,
} from "./state";
import { exportResolutionPresets } from "./config";
import { safeFilename } from "./utils";
import { selectSticker } from "./stickers";
import { useToast } from "../composables/useToast";
import type { ExportResolutionPreset } from "./types";

const CARD_CAPTURE_TIMEOUT_MS = 45_000;
const FONT_EMBED_TIMEOUT_MS = 8_000;

/** Active download generation; bumped on cancel so stale work is discarded. */
let downloadGeneration = 0;
let downloadAbort: AbortController | null = null;

export function getExportPixelSize(
  preset: ExportResolutionPreset,
  aspect = activeAspect.value,
) {
  if (preset.targetWidth) {
    const w = preset.targetWidth;
    const h = Math.round((w * aspect.h) / aspect.w);
    return { w, h };
  }
  return null;
}

export function formatExportResolutionLabel(
  preset: ExportResolutionPreset,
  aspect = activeAspect.value,
) {
  const size = getExportPixelSize(preset, aspect);
  if (size) return `${preset.label} · ${size.w}×${size.h}`;
  return `${preset.label} · ${preset.hint}`;
}

function resolveExportPixelRatio(node: HTMLElement, preset: ExportResolutionPreset) {
  if (preset.pixelRatio && preset.pixelRatio > 0) {
    return preset.pixelRatio;
  }
  const target = getExportPixelSize(preset);
  if (!target) return 2;
  const nodeWidth = Math.max(1, node.offsetWidth || node.getBoundingClientRect().width);
  return Math.max(1, target.w / nodeWidth);
}

function collectCardNodes(): HTMLElement[] {
  const rawNodes = cardRefs.value as unknown;
  if (Array.isArray(rawNodes)) return rawNodes.filter(Boolean) as HTMLElement[];
  if (rawNodes) return [rawNodes as HTMLElement];
  return [];
}

function resolveExportPreset() {
  return (
    exportResolutionPresets.find((item) => item.id === exportResolutionId.value) ??
    exportResolutionPresets[1]
  );
}

function cardFileTitle(index: number) {
  if (sectionMode.value && cardSections.value[index]?.title) {
    return cardSections.value[index].title;
  }
  return title.value;
}

function buildPngFilename(
  index: number,
  total: number,
  preset: ExportResolutionPreset,
) {
  const sectionTitle = cardFileTitle(index);
  const size = getExportPixelSize(preset);
  const sizeTag = size ? `_${size.w}x${size.h}` : `_x${preset.pixelRatio ?? 2}`;
  const suffix = total > 1 ? `_${String(index + 1).padStart(2, "0")}` : "";
  return `${safeFilename(sectionTitle)}${sizeTag}${suffix}.png`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function yieldToUi() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 16);
  });
}

function assertNotCancelled(generation: number) {
  if (
    generation !== downloadGeneration ||
    downloadAbort?.signal.aborted
  ) {
    throw new DOMException("Download cancelled", "AbortError");
  }
}

async function resolveFontEmbedCSS(node: HTMLElement): Promise<string> {
  // Google Fonts / CORS often hang html-to-image forever on Electron macOS.
  try {
    return await withTimeout(
      getFontEmbedCSS(node),
      FONT_EMBED_TIMEOUT_MS,
      "font embed",
    );
  } catch {
    return "";
  }
}

async function renderCardPng(
  node: HTMLElement,
  preset: ExportResolutionPreset,
  fontEmbedCSS: string,
  generation: number,
) {
  const pixelRatio = resolveExportPixelRatio(node, preset);
  const baseOptions = {
    cacheBust: true,
    pixelRatio,
    fontEmbedCSS,
  };

  assertNotCancelled(generation);

  try {
    return await withTimeout(
      toPng(node, baseOptions),
      CARD_CAPTURE_TIMEOUT_MS,
      "card capture",
    );
  } catch (firstError) {
    assertNotCancelled(generation);
    if (firstError instanceof DOMException && firstError.name === "AbortError") {
      throw firstError;
    }
    // Fallback: skip font embedding (common hang with remote webfonts).
    try {
      return await withTimeout(
        toPng(node, { ...baseOptions, fontEmbedCSS: "", skipFonts: true }),
        CARD_CAPTURE_TIMEOUT_MS,
        "card capture (no fonts)",
      );
    } catch (secondError) {
      assertNotCancelled(generation);
      throw secondError instanceof Error ? secondError : firstError;
    }
  }
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = href;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function dataUrlToBase64(dataUrl: string) {
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrlToBase64(dataUrl);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function siblingPath(baseFilePath: string, filename: string) {
  const normalized = baseFilePath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  if (idx < 0) return filename;
  const dir = baseFilePath.slice(0, idx + 1);
  return `${dir}${filename}`;
}

function extFilters(filename: string): { name: string; extensions: string[] }[] {
  const ext = filename.includes(".")
    ? filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()
    : "";
  if (ext === "zip") return [{ name: "ZIP", extensions: ["zip"] }];
  if (ext === "png") return [{ name: "PNG", extensions: ["png"] }];
  if (ext === "json") return [{ name: "JSON", extensions: ["json"] }];
  if (ext === "md" || ext === "markdown") {
    return [{ name: "Markdown", extensions: ["md", "markdown"] }];
  }
  if (ext === "txt") return [{ name: "Text", extensions: ["txt"] }];
  return [{ name: "All Files", extensions: ["*"] }];
}

export async function saveArrayBuffer(
  data: ArrayBuffer,
  filename: string,
): Promise<{ canceled: boolean; filePath?: string }> {
  const desktop = window.auraDesktop;
  if (desktop?.saveFile) {
    const result = await desktop.saveFile({
      defaultPath: filename,
      filters: extFilters(filename),
      data,
    });
    if (result.canceled) return { canceled: true };
    if (!result.ok) {
      throw new Error(result.error || "保存失败");
    }
    return { canceled: false, filePath: result.filePath };
  }

  const blob = new Blob([new Uint8Array(data)]);
  const url = URL.createObjectURL(blob);
  try {
    triggerDownload(url, filename);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  return { canceled: false };
}

export async function saveTextFile(text: string, filename: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  return saveArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), filename);
}

async function saveDataUrlAsPng(
  dataUrl: string,
  filename: string,
  reuseDirFrom?: string,
): Promise<{ canceled: boolean; filePath?: string }> {
  const data = dataUrlToArrayBuffer(dataUrl);
  const desktop = window.auraDesktop;

  if (desktop?.writeFile && reuseDirFrom) {
    const filePath = siblingPath(reuseDirFrom, filename);
    const written = await desktop.writeFile({ filePath, data });
    if (!written.ok) {
      throw new Error(written.error || "写入文件失败");
    }
    return { canceled: false, filePath };
  }

  return saveArrayBuffer(data, filename);
}

function notifyError(message: string) {
  errorMessage.value = message;
  useToast().error(message);
}

function notifyWarning(message: string) {
  useToast().warning(message);
}

function notifySuccess(message: string) {
  useToast().success(message);
}

function clearDownloadState() {
  isDownloading.value = false;
  downloadProgress.value = null;
  downloadAbort = null;
}

function beginDownload(total: number) {
  downloadAbort?.abort();
  downloadGeneration += 1;
  const generation = downloadGeneration;
  downloadAbort = new AbortController();
  isDownloading.value = true;
  downloadProgress.value = { current: 0, total };
  selectSticker(null);
  return generation;
}

/** Cancel in-flight pack/PNG download; clears downloading flag after current step. */
export function cancelDownload() {
  if (!isDownloading.value && !downloadAbort) return;
  downloadGeneration += 1;
  downloadAbort?.abort();
  clearDownloadState();
  errorMessage.value = "已取消下载";
  useToast().info("已取消下载");
}

function isAbortError(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError";
}

/** 逐张下载 PNG（多页时依次触发） */
export async function downloadPng() {
  errorMessage.value = null;
  const nodes = collectCardNodes();
  if (nodes.length === 0) {
    notifyError("导出失败：未找到可导出的卡片。");
    return;
  }

  const preset = resolveExportPreset();
  const generation = beginDownload(nodes.length);
  await nextTick();
  await yieldToUi();

  try {
    const fontEmbedCSS = await resolveFontEmbedCSS(nodes[0]);
    assertNotCancelled(generation);
    let savedAnchor: string | undefined;

    for (let i = 0; i < nodes.length; i++) {
      assertNotCancelled(generation);
      downloadProgress.value = { current: i + 1, total: nodes.length };
      const dataUrl = await renderCardPng(nodes[i], preset, fontEmbedCSS, generation);
      assertNotCancelled(generation);
      const filename = buildPngFilename(i, nodes.length, preset);
      const result = await saveDataUrlAsPng(dataUrl, filename, savedAnchor);
      if (result.canceled) {
        notifyWarning("已取消保存。");
        return;
      }
      if (result.filePath && !savedAnchor) {
        savedAnchor = result.filePath;
      }
      if (nodes.length > 1 && !window.auraDesktop) {
        await new Promise((r) => setTimeout(r, 400));
      } else {
        await yieldToUi();
      }
    }
    notifySuccess(
      nodes.length > 1 ? `已导出 ${nodes.length} 张 PNG` : "PNG 已保存",
    );
  } catch (err) {
    if (isAbortError(err)) {
      return;
    }
    const detail = err instanceof Error ? err.message : "";
    notifyError(
      detail.includes("timed out")
        ? "导出超时：请降低分辨率、切换系统字体后重试。"
        : "导出失败：请尝试换一个模板、降低分辨率或缩短文字。",
    );
  } finally {
    if (generation === downloadGeneration) {
      clearDownloadState();
    }
  }
}

/** 一键打包全部卡片为 ZIP（内含各页 PNG，沿用当前导出分辨率） */
export async function downloadAllCardsZip() {
  errorMessage.value = null;
  const nodes = collectCardNodes();
  if (nodes.length === 0) {
    notifyError("导出失败：未找到可导出的卡片。");
    return;
  }

  const preset = resolveExportPreset();
  const generation = beginDownload(nodes.length);
  await nextTick();
  await yieldToUi();

  try {
    const zip = new JSZip();
    const usedNames = new Map<string, number>();
    const fontEmbedCSS = await resolveFontEmbedCSS(nodes[0]);
    assertNotCancelled(generation);

    for (let i = 0; i < nodes.length; i++) {
      assertNotCancelled(generation);
      downloadProgress.value = { current: i + 1, total: nodes.length };
      const dataUrl = await renderCardPng(nodes[i], preset, fontEmbedCSS, generation);
      assertNotCancelled(generation);
      const baseName = buildPngFilename(i, nodes.length, preset);
      let name = baseName;
      const hit = usedNames.get(baseName) ?? 0;
      if (hit > 0) {
        name = name.replace(/\.png$/i, `_${hit + 1}.png`);
      }
      usedNames.set(baseName, hit + 1);
      zip.file(name, dataUrlToBase64(dataUrl), { base64: true });
      await yieldToUi();
    }

    assertNotCancelled(generation);
    downloadProgress.value = { current: nodes.length, total: nodes.length };
    const blob = await zip.generateAsync({ type: "blob" });
    assertNotCancelled(generation);
    const size = getExportPixelSize(preset);
    const sizeTag = size ? `_${size.w}x${size.h}` : `_x${preset.pixelRatio ?? 2}`;
    const zipName = `${safeFilename(title.value || "auracard")}_全部${nodes.length}页${sizeTag}.zip`;
    const buffer = await blob.arrayBuffer();
    const result = await saveArrayBuffer(buffer, zipName);
    if (result.canceled) {
      notifyWarning("已取消保存。");
      return;
    }
    notifySuccess(`已打包 ${nodes.length} 页为 ZIP`);
  } catch (err) {
    if (isAbortError(err)) {
      return;
    }
    const detail = err instanceof Error ? err.message : "";
    notifyError(
      detail.includes("timed out")
        ? "打包超时：请降低分辨率、减少页数或改用系统字体后重试。"
        : "打包下载失败：请尝试降低分辨率或减少页数后重试。",
    );
  } finally {
    if (generation === downloadGeneration) {
      clearDownloadState();
    }
  }
}
