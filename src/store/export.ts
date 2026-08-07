import { toPng } from "html-to-image";
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
  // 按目标宽度缩放；长文卡片高度会随之同比放大
  return Math.max(1, target.w / nodeWidth);
}

export async function downloadPng() {
  errorMessage.value = null;
  const rawNodes = cardRefs.value as unknown;
  const nodes = Array.isArray(rawNodes)
    ? rawNodes.filter(Boolean)
    : rawNodes
      ? [rawNodes as HTMLElement]
      : [];
  if (nodes.length === 0) {
    errorMessage.value = "导出失败：未找到可导出的卡片。";
    return;
  }

  const preset =
    exportResolutionPresets.find((item) => item.id === exportResolutionId.value) ??
    exportResolutionPresets[1];

  isDownloading.value = true;
  selectSticker(null);
  try {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const pixelRatio = resolveExportPixelRatio(node, preset);
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio,
      });
      const link = document.createElement("a");
      const sectionTitle =
        sectionMode.value && cardSections.value[i]?.title
          ? cardSections.value[i].title
          : title.value;
      const size = getExportPixelSize(preset);
      const sizeTag = size ? `_${size.w}x${size.h}` : `_x${preset.pixelRatio ?? 2}`;
      const suffix = nodes.length > 1 ? `_${i + 1}` : "";
      link.download = `${safeFilename(sectionTitle)}${sizeTag}${suffix}.png`;
      link.href = dataUrl;
      link.click();
      if (nodes.length > 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } catch (e) {
    errorMessage.value = "导出失败：请尝试换一个模板、降低分辨率或缩短文字。";
  } finally {
    isDownloading.value = false;
  }
}
