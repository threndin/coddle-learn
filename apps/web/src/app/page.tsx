import { Hero } from "@/components/landing/hero";
import { LearningLoop } from "@/components/landing/learning-loop";
import { Marquee } from "@/components/landing/marquee";
import { OpenSource } from "@/components/landing/open-source";
import { PathsShowcase } from "@/components/landing/paths-showcase";
import { PlatformBoard } from "@/components/landing/platform-board";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Marquee />
        <LearningLoop />
        <PlatformBoard />
        <PathsShowcase />
        <OpenSource />
      </main>
      <SiteFooter />
    </>
  );
}
