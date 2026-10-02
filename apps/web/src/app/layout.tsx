import type { Metadata } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { APP_NAME, APP_TAGLINE } from "@coddle/shared";
import "./globals.css";

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
  "Open-source interactive learning for developers. Roadmaps, projects, credentials, and community — connected in one place.";

export const metadata: Metadata = {
  metadataBase: new URL("https://learn.coddle.dev"),
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description,
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png" }],
  },
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${figtree.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
