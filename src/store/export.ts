import { toPng } from "html-to-image";
import JSZip from "jszip";
import {
  cardRefs,
  isDownloading,
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
import type { ExportResolutionPreset } from "./types";

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

async function renderCardPng(node: HTMLElement, preset: ExportResolutionPreset) {
  const pixelRatio = resolveExportPixelRatio(node, preset);
  return toPng(node, {
    cacheBust: true,
    pixelRatio,
  });
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = href;
  link.click();
}

function dataUrlToBase64(dataUrl: string) {
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

/** 逐张下载 PNG（多页时依次触发） */
export async function downloadPng() {
  errorMessage.value = null;
  const nodes = collectCardNodes();
  if (nodes.length === 0) {
    errorMessage.value = "导出失败：未找到可导出的卡片。";
    return;
  }

  const preset = resolveExportPreset();
  isDownloading.value = true;
  selectSticker(null);
  try {
    for (let i = 0; i < nodes.length; i++) {
      const dataUrl = await renderCardPng(nodes[i], preset);
      triggerDownload(dataUrl, buildPngFilename(i, nodes.length, preset));
      if (nodes.length > 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  } catch {
    errorMessage.value = "导出失败：请尝试换一个模板、降低分辨率或缩短文字。";
  } finally {
    isDownloading.value = false;
  }
}

/** 一键打包全部卡片为 ZIP（内含各页 PNG，沿用当前导出分辨率） */
export async function downloadAllCardsZip() {
  errorMessage.value = null;
  const nodes = collectCardNodes();
  if (nodes.length === 0) {
    errorMessage.value = "导出失败：未找到可导出的卡片。";
    return;
  }

  const preset = resolveExportPreset();
  isDownloading.value = true;
  selectSticker(null);
  try {
    const zip = new JSZip();
    const usedNames = new Map<string, number>();

    for (let i = 0; i < nodes.length; i++) {
      const dataUrl = await renderCardPng(nodes[i], preset);
      let name = buildPngFilename(i, nodes.length, preset);
      const hit = usedNames.get(name) ?? 0;
      if (hit > 0) {
        name = name.replace(/\.png$/i, `_${hit + 1}.png`);
      }
      usedNames.set(buildPngFilename(i, nodes.length, preset), hit + 1);
      zip.file(name, dataUrlToBase64(dataUrl), { base64: true });
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const size = getExportPixelSize(preset);
    const sizeTag = size ? `_${size.w}x${size.h}` : `_x${preset.pixelRatio ?? 2}`;
    const zipName = `${safeFilename(title.value || "auracard")}_全部${nodes.length}页${sizeTag}.zip`;
    const url = URL.createObjectURL(blob);
    try {
      triggerDownload(url, zipName);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  } catch {
    errorMessage.value = "打包下载失败：请尝试降低分辨率或减少页数后重试。";
  } finally {
    isDownloading.value = false;
  }
}
