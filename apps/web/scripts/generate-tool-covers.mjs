import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/tools");

const ICONS = [
  { slug: "visual-studio-code", title: "VS Code", icon: "visualstudiocode", hex: "#007ACC" },
  { slug: "zed", title: "Zed", icon: "zedindustries", hex: "#0849F3" },
  { slug: "warp", title: "Warp", icon: "warp", hex: "#01A4FF" },
  { slug: "raycast", title: "Raycast", icon: "raycast", hex: "#FF6363" },
  { slug: "github", title: "GitHub", icon: "github", hex: "#181717", invert: true },
  { slug: "figma", title: "Figma", icon: "figma", hex: "#1E1E1E" },
  { slug: "excalidraw", title: "Excalidraw", icon: "excalidraw", hex: "#6965DB" },
  { slug: "postman", title: "Postman", icon: "postman", hex: "#FF6C37" },
  { slug: "hoppscotch", title: "Hoppscotch", icon: "hoppscotch", hex: "#0F172A" },
  { slug: "tableplus", title: "TablePlus", icon: "tableplus", hex: "#1A90FF" },
  { slug: "dbeaver", title: "DBeaver", icon: "dbeaver", hex: "#F5A623", invert: true },
  { slug: "docker-desktop", title: "Docker", icon: "docker", hex: "#2496ED" },
  { slug: "vercel", title: "Vercel", icon: "vercel", hex: "#000000" },
  { slug: "railway", title: "Railway", icon: "railway", hex: "#0B0D0E" },
  { slug: "supabase", title: "Supabase", icon: "supabase", hex: "#1C1C1C" },
  { slug: "playwright", title: "Playwright", icon: "playwright", hex: "#2EAD33" },
  { slug: "ngrok", title: "ngrok", icon: "ngrok", hex: "#1F1E37" },
  { slug: "homebrew", title: "Homebrew", icon: "homebrew", hex: "#FBB040", invert: true },
];

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function letterMark(title, fill) {
  const initials = title
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return `<text x="12" y="16.2" text-anchor="middle" fill="${fill}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="9" font-weight="800">${escapeXml(initials)}</text>`;
}

function innerIcon(svg, fill) {
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!match) return null;
  const body = match[1]
    .replace(/<title>[\s\S]*?<\/title>/g, "")
    .replace(/fill="(?!none)[^"]*"/g, `fill="${fill}"`)
    .replace(/<path(?![^>]*fill=)/g, `<path fill="${fill}"`);
  return body;
}

function coverSvg({ title, hex, invert, iconBody }) {
  const fg = invert ? "#0B1220" : "#FFFFFF";
  const muted = invert ? "rgba(11,18,32,0.72)" : "rgba(255,255,255,0.78)";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750" role="img" aria-label="${escapeXml(title)}">
  <rect width="1200" height="750" fill="${hex}"/>
  <circle cx="1020" cy="90" r="220" fill="${invert ? "rgba(11,18,32,0.08)" : "rgba(255,255,255,0.08)"}"/>
  <circle cx="120" cy="680" r="260" fill="${invert ? "rgba(11,18,32,0.06)" : "rgba(255,255,255,0.06)"}"/>
  <g transform="translate(480 175) scale(10)">
    ${iconBody ?? letterMark(title, fg)}
  </g>
  <text x="600" y="620" text-anchor="middle" fill="${fg}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="44" font-weight="800">${escapeXml(title)}</text>
  <text x="600" y="662" text-anchor="middle" fill="${muted}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="600" letter-spacing="3">CODDLE LEARN</text>
</svg>
`;
}

async function fetchIcon(name) {
  const url = `https://cdn.jsdelivr.net/npm/simple-icons/icons/${name}.svg`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

await mkdir(outDir, { recursive: true });

const coddleSrc = "/Users/johney/.cursor/projects/Users-johney-Documents-2026-quarter4-coddle-learn/assets/logo-d7e54b67-5c53-47e2-adff-bf502cfbf77d.png";
const watchupSrc = "/Users/johney/.cursor/projects/Users-johney-Documents-2026-quarter4-coddle-learn/assets/watchup_logo-eb96254a-cbf2-493b-bda4-951ab6187b2b.webp";
await copyFile(coddleSrc, join(outDir, "coddle.png"));
await copyFile(watchupSrc, join(outDir, "watchup.webp"));

for (const tool of ICONS) {
  const raw = await fetchIcon(tool.icon);
  const fg = tool.invert ? "#0B1220" : "#FFFFFF";
  const iconBody = raw ? innerIcon(raw, fg) : null;
  if (!iconBody) {
    console.warn(`No simple-icon for ${tool.icon}; using letter mark.`);
  }
  const svg = coverSvg({
    title: tool.title,
    hex: tool.hex,
    invert: Boolean(tool.invert),
    iconBody,
  });
  await writeFile(join(outDir, `${tool.slug}.svg`), svg);
  console.log(`Wrote ${tool.slug}.svg`);
}

console.log("Tool covers ready.");
