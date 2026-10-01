import type { Metadata } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Open-source interactive learning for developers. Roadmaps, projects, credentials, and community — connected in one place.",
  openGraph: {
    title: APP_NAME,
    description: APP_TAGLINE,
    type: "website",
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
      </body>
    </html>
  );
}
