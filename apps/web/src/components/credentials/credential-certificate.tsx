"use client";

import { forwardRef, useEffect, useId, useRef, useState } from "react";
import QRCode from "qrcode";
import { APP_NAME, CREDENTIAL_KIND_LABELS, isCredentialKind } from "@coddle/shared";

export type CertificateData = {
  earnerName: string;
  title: string;
  kind: string;
  issuedAt: string;
  code: string;
  verifyUrl: string;
  assessmentTitle?: string | null;
  courseTitle?: string | null;
  projectTitle?: string | null;
  pathLabel?: string | null;
};

function kindLabel(kind: string) {
  return isCredentialKind(kind) ? CREDENTIAL_KIND_LABELS[kind] : kind;
}

function formatIssued(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function achievementLine(data: CertificateData) {
  if (data.kind === "assessment") {
    return data.assessmentTitle?.trim() || data.title;
  }
  if (data.kind === "project") {
    return data.projectTitle?.trim() || data.title;
  }
  return data.title;
}

function contextLine(data: CertificateData) {
  if (data.kind === "assessment") {
    return data.courseTitle?.trim() || null;
  }
  if (data.kind === "project") {
    return data.pathLabel?.trim() || null;
  }
  return null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function CertificateBackdrop({ uid }: { uid: string }) {
  const grid = `${uid}-grid`;
  const dots = `${uid}-dots`;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 800 566"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <pattern id={grid} width="24" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M24 0H0V24"
            fill="none"
            stroke="#004CC8"
            strokeOpacity="0.06"
            strokeWidth="1"
          />
        </pattern>
        <pattern id={dots} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" fill="#004CC8" fillOpacity="0.07" />
        </pattern>
      </defs>
      <rect width="800" height="566" fill="#ffffff" />
      <rect width="800" height="566" fill={`url(#${grid})`} />
      <rect width="800" height="566" fill={`url(#${dots})`} />
    </svg>
  );
}

function CertificateSeal({
  kind,
  compact,
}: {
  kind: string;
  compact: boolean;
}) {
  return (
    <div className={["flex flex-col items-center", compact ? "gap-0.5" : "gap-1"].join(" ")}>
      <div
        className={[
          "relative flex items-center justify-center rounded-full border-[#004CC8] bg-[#e8f0ff]",
          compact
            ? "h-8 w-8 border-2 sm:h-9 sm:w-9"
            : "h-16 w-16 border-[3px] sm:h-20 sm:w-20",
        ].join(" ")}
      >
        {!compact ? (
          <div className="absolute inset-[3px] rounded-full border border-dashed border-[#004CC8]/50" />
        ) : null}
        <svg
          viewBox="0 0 48 48"
          className={compact ? "h-4 w-4" : "h-8 w-8 sm:h-10 sm:w-10"}
          aria-hidden
        >
          <circle cx="24" cy="24" r="22" fill="#004CC8" />
          <path
            d="M14 25.5l6 6 14-15"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p
        className={[
          "font-bold uppercase tracking-[0.12em] text-[#004CC8]",
          compact ? "text-[5px]" : "text-[8px] sm:text-[9px]",
        ].join(" ")}
      >
        {kindLabel(kind)}
      </p>
    </div>
  );
}

function VerifyQr({
  url,
  compact,
}: {
  url: string;
  compact: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(url, {
          margin: 1,
          width: compact ? 96 : 140,
          color: {
            dark: "#004CC8",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setSrc(dataUrl);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, compact]);

  return (
    <div className={["flex flex-col items-start", compact ? "gap-0.5" : "gap-1"].join(" ")}>
      <div
        className={[
          "overflow-hidden rounded-md border border-[#004CC8]/25 bg-white",
          compact
            ? "h-8 w-8 p-px sm:h-9 sm:w-9"
            : "h-16 w-16 p-0.5 sm:h-20 sm:w-20",
        ].join(" ")}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- generated data URL
          <img src={src} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="h-full w-full animate-pulse bg-[#e8f0ff]" />
        )}
      </div>
      {!compact ? (
        <p className="text-[7px] uppercase tracking-[0.12em] text-[#94a3b8] sm:text-[8px]">
          Scan to verify
        </p>
      ) : null}
    </div>
  );
}

/** Standard landscape certificate, filled from credential data. Always light for shareability. */
export const CredentialCertificate = forwardRef<
  HTMLDivElement,
  {
    data: CertificateData;
    compact?: boolean;
    className?: string;
  }
>(function CredentialCertificate({ data, compact = false, className = "" }, ref) {
  const uid = useId().replace(/:/g, "");
  const subject = achievementLine(data);
  const context = contextLine(data);
  const dated = formatIssued(data.issuedAt);

  return (
    <div
      ref={ref}
      className={[
        "relative flex aspect-[1.414/1] w-full select-none flex-col overflow-hidden border-[#004CC8] bg-white text-[#111827]",
        compact
          ? "rounded-lg border-2 shadow-none"
          : "rounded-xl border-[3px] shadow-[0_20px_50px_-28px_rgba(0,60,160,0.45)]",
        className,
      ].join(" ")}
      role="img"
      aria-label={`${APP_NAME} certificate for ${data.earnerName}: ${data.title}`}
    >
      <CertificateBackdrop uid={uid} />

      {!compact ? (
        <>
          <div className="pointer-events-none absolute inset-[6px] rounded-lg border border-[#004CC8]/40 sm:inset-[8px]" />
          <div className="pointer-events-none absolute inset-[11px] rounded-md border border-dashed border-[#004CC8]/30 sm:inset-[14px]" />
          <span className="absolute left-3 top-3 z-[1] h-4 w-4 border-l-2 border-t-2 border-white/80 sm:left-4 sm:top-4 sm:h-5 sm:w-5" />
          <span className="absolute right-3 top-3 z-[1] h-4 w-4 border-r-2 border-t-2 border-white/80 sm:right-4 sm:top-4 sm:h-5 sm:w-5" />
          <span className="absolute bottom-3 left-3 z-[1] h-4 w-4 border-b-2 border-l-2 border-[#004CC8] sm:bottom-4 sm:left-4 sm:h-5 sm:w-5" />
          <span className="absolute bottom-3 right-3 z-[1] h-4 w-4 border-b-2 border-r-2 border-[#004CC8] sm:bottom-4 sm:right-4 sm:h-5 sm:w-5" />
        </>
      ) : null}

      <div
        className={[
          "relative z-[1] flex items-center justify-center bg-[#004CC8]",
          compact ? "py-1.5" : "py-3.5 sm:py-4",
        ].join(" ")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- inline cert asset */}
        <img
          src="/logo.png"
          alt=""
          crossOrigin="anonymous"
          className={[
            "w-auto object-contain brightness-0 invert",
            compact ? "h-4" : "h-8 sm:h-10",
          ].join(" ")}
        />
      </div>

      <div
        className={[
          "relative z-[1] flex flex-1 flex-col",
          compact ? "px-3 py-2" : "px-[6%] py-[4%] sm:px-[8%]",
        ].join(" ")}
      >
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p
            className={[
              "font-display font-bold tracking-tight text-[#003A9E]",
              compact ? "text-[10px]" : "text-lg sm:text-2xl",
            ].join(" ")}
          >
            Certificate of Completion
          </p>
          <p
            className={[
              "text-[#64748b]",
              compact ? "mt-1 text-[7px]" : "mt-3 text-[10px] sm:text-xs",
            ].join(" ")}
          >
            This certifies that
          </p>
          <p
            className={[
              "font-display font-bold tracking-tight text-[#111827]",
              compact
                ? "mt-0.5 line-clamp-1 text-xs leading-tight"
                : "mt-1 text-2xl leading-tight sm:text-3xl",
            ].join(" ")}
          >
            {data.earnerName}
          </p>
          <div
            className={[
              "mx-auto h-px bg-gradient-to-r from-transparent via-[#004CC8]/50 to-transparent",
              compact ? "mt-1 w-10" : "mt-2 w-28 sm:w-40",
            ].join(" ")}
          />
          <p
            className={[
              "text-[#64748b]",
              compact ? "mt-1 text-[7px]" : "mt-2 text-[10px] sm:text-xs",
            ].join(" ")}
          >
            {data.kind === "assessment"
              ? "has successfully passed"
              : "has successfully completed"}
          </p>
          <p
            className={[
              "font-display font-bold tracking-tight text-[#004CC8]",
              compact
                ? "mt-0.5 line-clamp-1 text-[10px] leading-snug"
                : "mt-1 line-clamp-2 text-base leading-snug sm:text-xl",
            ].join(" ")}
          >
            {subject}
          </p>
          {context && context !== subject ? (
            <p
              className={[
                "line-clamp-1 text-[#64748b]",
                compact ? "mt-0.5 text-[7px]" : "mt-1 text-[10px] sm:text-xs",
              ].join(" ")}
            >
              {context}
            </p>
          ) : null}

          <div className={["mx-auto", compact ? "mt-1.5" : "mt-5"].join(" ")}>
            <svg
              viewBox="0 0 160 52"
              className={[
                "mx-auto",
                compact ? "h-5 w-20" : "h-11 w-40 sm:h-12 sm:w-48",
              ].join(" ")}
              aria-hidden
            >
              <text
                x="80"
                y="32"
                textAnchor="middle"
                fill="#004CC8"
                fontFamily="Segoe Script, Brush Script MT, Lucida Handwriting, Apple Chancery, cursive"
                fontSize="34"
                fontStyle="italic"
                letterSpacing="1"
              >
                John
              </text>
              <path
                d="M24 40c20-2 44-2 112 0"
                fill="none"
                stroke="#004CC8"
                strokeOpacity="0.3"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <p
              className={[
                "mt-0.5 uppercase leading-tight tracking-[0.14em]",
                compact ? "text-[4px]" : "text-[7px] sm:text-[8px]",
              ].join(" ")}
            >
              Ahiakwo John
              <br />
              Founder, Coddle Learn
            </p>
          </div>
        </div>

        <div
          className={[
            "mt-auto grid w-full grid-cols-3 items-end self-center",
            compact ? "gap-1" : "max-w-[96%] gap-2",
          ].join(" ")}
        >
          <div className="flex justify-start">
            <VerifyQr url={data.verifyUrl} compact={compact} />
          </div>

          <div className="min-w-0 text-center">
            <p
              className={[
                "uppercase tracking-[0.14em] text-[#94a3b8]",
                compact ? "text-[5px]" : "text-[8px] sm:text-[9px]",
              ].join(" ")}
            >
              Issued
            </p>
            <p
              className={[
                "font-bold text-[#111827]",
                compact ? "truncate text-[7px]" : "text-[10px] sm:text-xs",
              ].join(" ")}
            >
              {dated}
            </p>
            {!compact ? (
              <p className="mt-0.5 truncate font-mono text-[8px] text-[#64748b] sm:text-[9px]">
                {data.code}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <CertificateSeal kind={data.kind} compact={compact} />
          </div>
        </div>
      </div>
    </div>
  );
});

export function DownloadableCertificate({
  data,
  className = "",
}: {
  data: CertificateData;
  className?: string;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    const node = nodeRef.current;
    if (!node || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `coddle-learn-${slugify(data.earnerName)}-${slugify(data.code)}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Could not download the certificate. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <CredentialCertificate ref={nodeRef} data={data} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void download()}
          disabled={busy}
          className="inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Preparing…" : "Download certificate"}
        </button>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}
