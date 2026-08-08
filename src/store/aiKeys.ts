import { ref } from "vue";
import { aiApiKey, aiProvider } from "./state";
import type { AiProviderId } from "./types";
import { aiProviderOptions } from "./config";

const LEGACY_KEY = "ai.apiKey";
const MAP_KEY = "ai.apiKeys";

/** Brief UI hint after a key is persisted. */
export const aiKeySaveHint = ref("");

let hintTimer: number | null = null;
let persistTimer: number | null = null;
let hydrating = false;

function showHint(message: string) {
  aiKeySaveHint.value = message;
  if (hintTimer != null) window.clearTimeout(hintTimer);
  hintTimer = window.setTimeout(() => {
    if (aiKeySaveHint.value === message) aiKeySaveHint.value = "";
  }, 2500);
}

function readLocalMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === "object") {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string" && v.trim()) out[k] = v.trim();
        }
        return out;
      }
    }
  } catch {
    /* ignore */
  }

  const legacy = localStorage.getItem(LEGACY_KEY)?.trim() || "";
  if (legacy) {
    const provider = localStorage.getItem("ai.provider") || "deepseek";
    return { [provider]: legacy };
  }
  return {};
}

function writeLocalMap(map: Record<string, string>, legacyProvider?: AiProviderId) {
  localStorage.setItem(MAP_KEY, JSON.stringify(map));
  const provider = legacyProvider || aiProvider.value;
  const current = map[provider]?.trim() || "";
  if (current) localStorage.setItem(LEGACY_KEY, current);
  else if (!map[aiProvider.value]) localStorage.removeItem(LEGACY_KEY);
}

async function readDesktopSecrets(): Promise<Record<string, string>> {
  const desktop = window.auraDesktop;
  if (!desktop?.getSecrets) return {};
  try {
    const result = await desktop.getSecrets();
    if (result?.ok && result.keys) return { ...result.keys };
  } catch {
    /* ignore */
  }
  return {};
}

async function writeDesktopSecrets(
  map: Record<string, string>,
  activeProvider?: AiProviderId | null,
) {
  const desktop = window.auraDesktop;
  if (!desktop?.setSecrets) return;
  try {
    await desktop.setSecrets({
      keys: map,
      activeProvider: activeProvider ?? aiProvider.value,
    });
  } catch {
    /* ignore */
  }
}

function mergeMaps(
  ...maps: Array<Record<string, string>>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const map of maps) {
    for (const [k, v] of Object.entries(map)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
  }
  return out;
}

export async function persistAiApiKeyForProvider(
  providerId: AiProviderId,
  key: string,
  options?: { quiet?: boolean },
) {
  if (hydrating) return;
  const trimmed = key.trim();
  const map = readLocalMap();
  if (trimmed) map[providerId] = trimmed;
  else delete map[providerId];
  writeLocalMap(map, providerId);
  await writeDesktopSecrets(map, providerId);
  if (trimmed && !options?.quiet) {
    const name =
      aiProviderOptions.find((p) => p.id === providerId)?.name || providerId;
    showHint(`已自动保存 ${name} 的 API Key`);
  }
}

/** Persist current key for the active provider (localStorage + Electron safe storage). */
export async function persistAiApiKeyNow() {
  await persistAiApiKeyForProvider(aiProvider.value, aiApiKey.value);
}

export function schedulePersistAiApiKey() {
  if (hydrating) return;
  if (persistTimer != null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    void persistAiApiKeyNow();
  }, 200);
}

export function loadKeyForProvider(providerId: AiProviderId) {
  const map = readLocalMap();
  const key =
    map[providerId]?.trim() ||
    (providerId === "deepseek"
      ? String(import.meta.env.VITE_DEEPSEEK_API_KEY || "").trim()
      : "");
  hydrating = true;
  aiApiKey.value = key;
  queueMicrotask(() => {
    hydrating = false;
  });
}

/** Save key under previous provider, then restore the next provider's key. */
export async function switchAiProviderKeys(
  next: AiProviderId,
  prev?: AiProviderId,
) {
  if (prev && prev !== next) {
    const outgoing = aiApiKey.value.trim();
    // Only write when non-empty — avoid wiping a stored key during provider hydrate/switch.
    if (outgoing) {
      await persistAiApiKeyForProvider(prev, outgoing, { quiet: true });
    }
  }
  loadKeyForProvider(next);
  localStorage.setItem("ai.provider", next);
}

export async function hydrateAiApiKeys() {
  const local = readLocalMap();
  const desktop = await readDesktopSecrets();
  const merged = mergeMaps(local, desktop);
  writeLocalMap(merged, aiProvider.value);
  if (Object.keys(merged).length) {
    await writeDesktopSecrets(merged, aiProvider.value);
  }

  const provider = aiProvider.value;
  const fromMap = merged[provider]?.trim() || "";
  const legacy = localStorage.getItem(LEGACY_KEY)?.trim() || "";
  const envFallback =
    provider === "deepseek"
      ? String(import.meta.env.VITE_DEEPSEEK_API_KEY || "").trim()
      : "";

  hydrating = true;
  aiApiKey.value = fromMap || legacy || envFallback;
  queueMicrotask(() => {
    hydrating = false;
  });
}
