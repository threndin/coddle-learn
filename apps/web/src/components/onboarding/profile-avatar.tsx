"use client";

import { useState } from "react";

export function initials(name: string): string {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

export function ProfileAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const box =
    size === "lg"
      ? "h-16 w-16 text-lg"
      : size === "sm"
        ? "h-8 w-8 text-xs"
        : "h-12 w-12 text-sm";
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl;
  const ring = size === "sm" ? "ring-1 ring-border" : "ring-2 ring-white";

  if (showImage && avatarUrl) {
    return (
      // Avatar hosts vary with the Coddle account, so this stays a plain image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        onError={() => setFailedUrl(avatarUrl)}
        className={`${box} shrink-0 rounded-full object-cover ${ring}`}
      />
    );
  }

  return (
    <span
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-white ${ring}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
