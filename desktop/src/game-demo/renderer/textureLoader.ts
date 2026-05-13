import * as THREE from "three";

export type RuntimeTextureCache = {
  baseUrl: string;
  load(path: string): Promise<THREE.Texture | null>;
  get(path: string): THREE.Texture | null;
  getWarnings(): string[];
  dispose(): void;
};

export function isSafeRuntimeTexturePath(path: string): boolean {
  const value = path.trim();
  if (!value) {
    return false;
  }

  const lower = value.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("javascript:") ||
    lower.includes("://") ||
    lower.includes("%2e%2e")
  ) {
    return false;
  }

  if (value.startsWith("/") || value.startsWith("\\") || /^[a-zA-Z]:/.test(value)) {
    return false;
  }

  return !value
    .replace(/\\/g, "/")
    .split("/")
    .some((segment) => segment === "..");
}

export function resolveRuntimeTextureUrl(path: string, baseUrl: string): string | null {
  if (!isSafeRuntimeTexturePath(path)) {
    return null;
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.trim().replace(/^\/+/, "");
  const filePath = normalizedPath.startsWith("outputs/")
    ? normalizedPath
    : `outputs/${normalizedPath}`;
  return `${normalizedBaseUrl}/api/files/${encodeURI(filePath)}`;
}

export async function loadRuntimeTexture(
  path: string,
  baseUrl: string,
  loader = new THREE.TextureLoader(),
): Promise<THREE.Texture | null> {
  const url = resolveRuntimeTextureUrl(path, baseUrl);
  if (!url) {
    return null;
  }

  try {
    const texture = await loader.loadAsync(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  } catch {
    return null;
  }
}

export function createRuntimeTextureCache(
  baseUrl: string,
  loader = new THREE.TextureLoader(),
): RuntimeTextureCache {
  const textures = new Map<string, THREE.Texture | null>();
  const pending = new Map<string, Promise<THREE.Texture | null>>();
  const warnings: string[] = [];

  const addWarning = (warning: string) => {
    if (!warnings.includes(warning)) {
      warnings.push(warning);
    }
  };

  return {
    baseUrl,
    load(path: string) {
      if (!isSafeRuntimeTexturePath(path)) {
        addWarning(`Skipped unsafe runtime texture path: ${path}`);
        textures.set(path, null);
        return Promise.resolve(null);
      }

      if (textures.has(path)) {
        return Promise.resolve(textures.get(path) ?? null);
      }

      const existing = pending.get(path);
      if (existing) {
        return existing;
      }

      const promise = loadRuntimeTexture(path, baseUrl, loader).then((texture) => {
        pending.delete(path);
        textures.set(path, texture);
        if (!texture) {
          addWarning(`Runtime texture failed to load: ${path}`);
        }
        return texture;
      });
      pending.set(path, promise);
      return promise;
    },
    get(path: string) {
      return textures.get(path) ?? null;
    },
    getWarnings() {
      return [...warnings];
    },
    dispose() {
      for (const texture of textures.values()) {
        texture?.dispose();
      }
      textures.clear();
      pending.clear();
      warnings.length = 0;
    },
  };
}
