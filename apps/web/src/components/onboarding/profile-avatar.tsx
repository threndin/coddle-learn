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
  size?: "md" | "lg";
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const box = size === "lg" ? "h-16 w-16 text-lg" : "h-12 w-12 text-sm";
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl;

  if (showImage && avatarUrl) {
    return (
      // Avatar hosts vary with the Coddle account, so this stays a plain image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        onError={() => setFailedUrl(avatarUrl)}
        className={`${box} rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  return (
    <span
      className={`${box} inline-flex items-center justify-center rounded-full bg-brand font-semibold text-white ring-2 ring-white`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
