import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { APP_NAME, APP_TAGLINE } from "@coddle/shared";

export const alt = `${APP_NAME} — Your path to becoming a better developer.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const pills = ["TypeScript", "React", "Postgres", "Go", "Docker"];

async function readIcon() {
  const candidates = [
    join(process.cwd(), "public/icon.png"),
    join(process.cwd(), "apps/web/public/icon.png"),
  ];

  for (const path of candidates) {
    try {
      return await readFile(path);
    } catch {
      continue;
    }
  }

  throw new Error("public/icon.png was not found");
}

async function loadFigtree(weight: number) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Figtree:wght@${weight}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
    },
  });

  if (!css.ok) {
    throw new Error(`Could not load Figtree ${weight}`);
  }

  const body = await css.text();
  const url = body.match(/src: url\((.+?)\) format\('(opentype|truetype|woff2?)'\)/)?.[1];

  if (!url) {
    throw new Error(`Could not find a Figtree ${weight} file`);
  }

  const font = await fetch(url);
  if (!font.ok) {
    throw new Error(`Could not download Figtree ${weight}`);
  }

  return font.arrayBuffer();
}

export default async function OpenGraphImage() {
  const [icon, figtree, figtreeBold] = await Promise.all([
    readIcon(),
    loadFigtree(600),
    loadFigtree(800),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#004CC8",
          color: "white",
          padding: "64px 72px 56px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "58%",
            background:
              "radial-gradient(ellipse 42% 90% at 50% 100%, #001a44 0%, #003080 46%, transparent 74%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 22,
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={`data:image/png;base64,${icon.toString("base64")}`}
                width={68}
                height={68}
                alt=""
              />
            </div>
            <div
              style={{
                marginLeft: 20,
                fontFamily: "Figtree",
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: -0.6,
              }}
            >
              {APP_NAME}
            </div>
          </div>
          <div
            style={{
              fontFamily: "Figtree",
              fontSize: 22,
              fontWeight: 600,
              color: "rgba(255,255,255,0.78)",
            }}
          >
            {APP_TAGLINE}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <div
            style={{
              fontFamily: "Figtree",
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            Your path to becoming a better developer.
          </div>
          <div style={{ display: "flex", marginTop: 36 }}>
            {pills.map((pill) => (
              <div
                key={pill}
                style={{
                  display: "flex",
                  marginRight: 12,
                  borderRadius: 999,
                  backgroundColor: "white",
                  color: "#004CC8",
                  fontFamily: "Figtree",
                  fontSize: 20,
                  fontWeight: 700,
                  padding: "10px 18px",
                }}
              >
                {pill}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Figtree", data: figtree, weight: 600, style: "normal" },
        { name: "Figtree", data: figtreeBold, weight: 800, style: "normal" },
      ],
    },
  );
}
