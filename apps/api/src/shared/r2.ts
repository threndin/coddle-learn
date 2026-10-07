import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { config, isR2Configured } from "../config.js";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!isR2Configured()) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, and R2_BUCKET.",
    );
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: config.r2.endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return client;
}

/** Normalize a key under the Learn folder: `coddle-learn/...`. */
export function r2Key(path: string): string {
  const cleaned = path.replace(/^\/+/, "").replace(/^coddle-learn\/?/, "");
  return `${config.r2.keyPrefix}/${cleaned}`;
}

export function r2PublicUrl(path: string): string {
  return `${config.r2.publicUrl}/${r2Key(path)}`;
}

export async function uploadToR2(input: {
  /** Path relative to `coddle-learn/` (e.g. `courses/html/thumbnail.svg`). */
  path: string;
  body: PutObjectCommandInput["Body"];
  contentType: string;
  cacheControl?: string;
}): Promise<{ key: string; url: string }> {
  const key = r2Key(input.path);
  await getClient().send(
    new PutObjectCommand({
      Bucket: config.r2.bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl ?? "public, max-age=31536000, immutable",
    }),
  );
  return { key, url: `${config.r2.publicUrl}/${key}` };
}

function wrapTitle(title: string, maxChars: number, maxLines: number): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1]!.replace(/\s+\S*$/, "")}…`;
  return kept;
}

export function courseThumbnailSvg(input: {
  title: string;
  level: string;
  accent: string;
}): string {
  const label = escapeXml(input.title);
  const level = escapeXml(input.level.charAt(0).toUpperCase() + input.level.slice(1));
  const lines = wrapTitle(input.title, 24, 3);
  const fontSize = lines.length >= 3 ? 56 : 64;
  const lineHeight = Math.round(fontSize * 1.12);
  const blockTop = 315 - ((lines.length - 1) * lineHeight) / 2;
  const titleSpans = lines
    .map(
      (line, index) =>
        `<tspan x="72" y="${Math.round(blockTop + index * lineHeight)}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const levelY = Math.round(blockTop + (lines.length - 1) * lineHeight + 72);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${input.accent}"/>
      <stop offset="100%" stop-color="#0B1220"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="980" cy="120" r="180" fill="rgba(255,255,255,0.08)"/>
  <circle cx="160" cy="520" r="220" fill="rgba(255,255,255,0.06)"/>
  <text x="72" y="120" fill="rgba(255,255,255,0.78)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28" font-weight="700" letter-spacing="4">CODDLE LEARN</text>
  <text fill="#FFFFFF" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${fontSize}" font-weight="800">${titleSpans}</text>
  <text x="72" y="${levelY}" fill="rgba(255,255,255,0.82)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28" font-weight="600">${level}</text>
</svg>`;
}

/**
 * Store a generated course thumbnail. Without R2 (local dev), fall back to an
 * inline data URI so courses still render.
 */
export async function storeGeneratedThumbnail(input: {
  courseId: string;
  title: string;
  level: string;
  accent: string;
}): Promise<string> {
  const svg = courseThumbnailSvg(input);
  if (!isR2Configured()) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  const { url } = await uploadToR2({
    path: `courses/${input.courseId}/thumbnail-${Date.now().toString(36)}.svg`,
    body: svg,
    contentType: "image/svg+xml",
  });
  return url;
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function imageExtension(contentType: string): string | null {
  return IMAGE_EXTENSIONS[contentType] ?? null;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
