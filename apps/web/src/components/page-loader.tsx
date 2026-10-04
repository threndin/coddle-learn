import Image from "next/image";

export function PageLoader() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-surface-subtle">
      <Image
        src="/logo.png"
        alt="Coddle Learn"
        width={180}
        height={44}
        className="h-10 w-auto animate-pulse dark:brightness-0 dark:invert"
        priority
      />
    </main>
  );
}
