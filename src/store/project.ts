import { ref } from "vue";
import {
  title,
  subtitle,
  content,
  sectionMode,
  cardSections,
  splitContents,
} from "./state";
import {
  captureLayoutSnapshot,
  applyLayoutSnapshot,
  type LayoutSnapshot,
} from "./presets";
import { safeFilename } from "./utils";
import { saveArrayBuffer, saveTextFile } from "./export";
import { useToast } from "../composables/useToast";

export type AuraCardProject = {
  version: 1;
  kind: "auracard-project";
  name: string;
  savedAt: number;
  snapshot: LayoutSnapshot;
};

export type SavedProjectMeta = {
  id: string;
  name: string;
  savedAt: number;
};

const LIBRARY_KEY = "auracard.savedProjects";

export const savedProjects = ref<AuraCardProject[]>([]);
export const projectMessage = ref("");

function toast() {
  return useToast();
}

function loadLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) {
      savedProjects.value = [];
      return;
    }
    const parsed = JSON.parse(raw) as AuraCardProject[];
    savedProjects.value = Array.isArray(parsed) ? parsed : [];
  } catch {
    savedProjects.value = [];
  }
}

function persistLibrary() {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(savedProjects.value));
}

export function initProjects() {
  loadLibrary();
}

function buildProject(name?: string): AuraCardProject {
  const snap = captureLayoutSnapshot();
  const label =
    (name || "").trim() ||
    snap.title?.trim() ||
    `光语项目 ${new Date().toLocaleString()}`;
  return {
    version: 1,
    kind: "auracard-project",
    name: label,
    savedAt: Date.now(),
    snapshot: snap,
  };
}

function isProject(data: unknown): data is AuraCardProject {
  if (!data || typeof data !== "object") return false;
  const p = data as AuraCardProject;
  return (
    p.kind === "auracard-project" &&
    p.version === 1 &&
    p.snapshot != null &&
    typeof p.snapshot === "object"
  );
}

/** Save current card layout into local library (reloadable later). */
export function saveProjectToLibrary(name?: string) {
  const project = buildProject(name);
  savedProjects.value = [
    project,
    ...savedProjects.value.filter((p) => p.name !== project.name),
  ].slice(0, 40);
  persistLibrary();
  projectMessage.value = `已保存项目「${project.name}」`;
  toast().success(projectMessage.value);
  return project;
}

export function loadProjectFromLibrary(idOrName: string) {
  const project =
    savedProjects.value.find((p) => `${p.savedAt}` === idOrName) ||
    savedProjects.value.find((p) => p.name === idOrName);
  if (!project) {
    projectMessage.value = "未找到该项目";
    toast().warning(projectMessage.value);
    return;
  }
  applyLayoutSnapshot(project.snapshot);
  projectMessage.value = `已打开「${project.name}」`;
  toast().success(projectMessage.value);
}

export function deleteProjectFromLibrary(savedAt: number) {
  savedProjects.value = savedProjects.value.filter((p) => p.savedAt !== savedAt);
  persistLibrary();
  projectMessage.value = "已删除项目";
}

/** Download current project as JSON (Electron save dialog when available). */
export async function exportProjectFile(name?: string) {
  const project = buildProject(name);
  const json = JSON.stringify(project, null, 2);
  const filename = `${safeFilename(project.name || "auracard")}.auracard.json`;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  const result = await saveArrayBuffer(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    filename,
  );
  if (result.canceled) {
    toast().info("已取消导出项目");
    return;
  }
  projectMessage.value = `项目已导出：${filename}`;
  toast().success("项目 JSON 已保存");
}

/** Import project JSON from a File (file picker). */
export async function importProjectFile(file: File) {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as unknown;
    if (!isProject(data)) {
      // Also accept raw LayoutSnapshot / preset snapshot
      if (data && typeof data === "object" && "selectedTemplateId" in (data as object)) {
        applyLayoutSnapshot(data as LayoutSnapshot);
        projectMessage.value = `已导入：${file.name}`;
        toast().success(projectMessage.value);
        return;
      }
      throw new Error("不是有效的光语项目文件");
    }
    applyLayoutSnapshot(data.snapshot);
    projectMessage.value = `已导入「${data.name}」`;
    toast().success(projectMessage.value);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "导入失败";
    projectMessage.value = msg;
    toast().error(msg);
  }
}

/** Build markdown for current title/subtitle/body (all pages). */
export function buildContentMarkdown() {
  if (sectionMode.value && cardSections.value.length) {
    return cardSections.value
      .map((section, index) => {
        const parts = [
          `# ${section.title || `第 ${index + 1} 页`}`,
          section.subtitle ? `## ${section.subtitle}` : "",
          "",
          section.body || "",
        ].filter((line, i, arr) => !(line === "" && arr[i - 1] === ""));
        return parts.join("\n").trim();
      })
      .join("\n\n---\n\n");
  }

  const pages = splitContents.value.length ? splitContents.value : [content.value];
  if (pages.length <= 1) {
    return [`# ${title.value || "光语卡片"}`, subtitle.value ? `## ${subtitle.value}` : "", "", content.value || ""]
      .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
      .join("\n")
      .trim();
  }

  return pages
    .map((body, index) => {
      const heading =
        index === 0 ? `# ${title.value || `第 ${index + 1} 页`}` : `# 第 ${index + 1} 页`;
      const sub = index === 0 && subtitle.value ? `## ${subtitle.value}` : "";
      return [heading, sub, "", body || ""].filter(Boolean).join("\n").trim();
    })
    .join("\n\n---\n\n");
}

/** Save body/title content as a Markdown file. */
export async function exportContentMarkdown() {
  const md = buildContentMarkdown();
  if (!md.trim()) {
    toast().warning("当前没有可保存的文字内容");
    return;
  }
  const filename = `${safeFilename(title.value || "auracard-content")}.md`;
  const result = await saveTextFile(md, filename);
  if (result.canceled) {
    toast().info("已取消保存文字");
    return;
  }
  projectMessage.value = "文字已保存为 Markdown";
  toast().success(projectMessage.value);
}
