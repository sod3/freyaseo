import path from "node:path";

export type LocalMediaPathCandidate = {
  target: string;
  relativeStorageKey: string;
};

type LocalMediaPathInput = {
  storageKey?: string;
  fileName?: string;
  url?: string;
};

function isInsideRoot(root: string, target: string) {
  const relative = path.relative(root, target);
  return Boolean(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function validRelativeSegments(value: string) {
  if (!value || value.includes("\0")) return null;
  const normalized = value.replace(/\\/g, "/");
  if (path.posix.isAbsolute(normalized) || path.win32.isAbsolute(value)) return null;
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes(":"))) return null;
  return segments;
}

/** Returns a filename correctly even when the stored path came from another OS. */
export function portablePathBasename(value: string) {
  const normalized = String(value || "").replace(/\\/g, "/");
  const basename = path.posix.basename(normalized);
  return basename && basename !== "." && basename !== ".." && !basename.includes("\0") ? basename : "";
}

/** Accepts only same-application root-relative upload URLs, never arbitrary URLs. */
export function relativeUploadKeyFromUrl(value: string) {
  if (!value || !value.startsWith("/uploads/") || value.includes("?") || value.includes("#") || value.includes("\\")) return null;
  const rawSegments = value.slice("/uploads/".length).split("/");
  const segments: string[] = [];
  for (const rawSegment of rawSegments) {
    let segment: string;
    try {
      segment = decodeURIComponent(rawSegment);
    } catch {
      return null;
    }
    if (!segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\") || segment.includes("\0")) {
      return null;
    }
    segments.push(segment);
  }
  return segments.join("/");
}

/**
 * Builds read candidates under the current managed root. An absolute path from
 * another host is never trusted directly; only its filename is used as a
 * portable fallback under the configured root.
 */
export function localMediaPathCandidates(rootValue: string, input: LocalMediaPathInput) {
  if (!rootValue) return [];
  const root = path.resolve(rootValue);
  const candidates: LocalMediaPathCandidate[] = [];
  const seen = new Set<string>();

  const addTarget = (targetValue: string) => {
    const target = path.resolve(targetValue);
    if (!isInsideRoot(root, target) || seen.has(target)) return;
    const relativeStorageKey = path.relative(root, target).split(path.sep).join("/");
    seen.add(target);
    candidates.push({ target, relativeStorageKey });
  };

  const addRelative = (value: string) => {
    const segments = validRelativeSegments(value);
    if (segments) addTarget(path.join(root, ...segments));
  };

  const storageKey = String(input.storageKey || "");
  if (storageKey && path.isAbsolute(storageKey)) addTarget(storageKey);
  if (storageKey && !path.posix.isAbsolute(storageKey) && !path.win32.isAbsolute(storageKey)) addRelative(storageKey);

  const uploadUrlKey = relativeUploadKeyFromUrl(String(input.url || ""));
  if (uploadUrlKey) addRelative(uploadUrlKey);

  const fileName = String(input.fileName || "");
  if (fileName && portablePathBasename(fileName) === fileName) addRelative(fileName);

  const storedBasename = portablePathBasename(storageKey);
  if (storedBasename) addRelative(storedBasename);

  return candidates;
}

export function fallbackRelativeLocalMediaKey(input: LocalMediaPathInput) {
  const fileName = String(input.fileName || "");
  return (
    relativeUploadKeyFromUrl(String(input.url || "")) ||
    (fileName && portablePathBasename(fileName) === fileName ? fileName : "") ||
    portablePathBasename(String(input.storageKey || ""))
  );
}
