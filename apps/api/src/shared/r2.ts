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

export function courseThumbnailSvg(input: {
  title: string;
  level: string;
  accent: string;
}): string {
  const title = escapeXml(input.title);
  const level = escapeXml(input.level);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${title}">
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
  <text x="72" y="300" fill="#FFFFFF" font-family="ui-sans-serif, system-ui, sans-serif" font-size="64" font-weight="800">${title}</text>
  <text x="72" y="370" fill="rgba(255,255,255,0.82)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28" font-weight="600">${level}</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
