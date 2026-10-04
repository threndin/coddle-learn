import type { Metadata } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { APP_NAME, APP_TAGLINE } from "@coddle/shared";
import Script from "next/script";
import "./globals.css";

const themeBoot = `(function(){try{var t=localStorage.getItem("theme");var dark=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);if(dark)document.documentElement.classList.add("dark")}catch(e){}})();`;

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "Open-source interactive learning for developers. Roadmaps, projects, credentials, and community, connected in one place.";

export const metadata: Metadata = {
  metadataBase: new URL("https://learn.coddle.dev"),
  title: `${APP_NAME} · ${APP_TAGLINE}`,
  description,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    title: `${APP_NAME} · ${APP_TAGLINE}`,
    description,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} · ${APP_TAGLINE}`,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} ${geistMono.variable} antialiased`}>
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBoot}
        </Script>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
