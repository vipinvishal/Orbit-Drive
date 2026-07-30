"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import Hero from "@/components/landing/Hero";
import FeatureGrid from "@/components/landing/FeatureGrid";
import HowItWorks from "@/components/landing/HowItWorks";
import Roadmap from "@/components/landing/Roadmap";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/Footer";
import LandingBackground from "@/components/landing/LandingBackground";
import ScrollFillBar from "@/components/landing/ScrollFillBar";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div style={{ position: "relative" }}>
      <ScrollFillBar />
      <LandingBackground />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "clamp(72px, 10vw, 128px)",
          paddingBottom: 40,
        }}
      >
        <Hero />
        <FeatureGrid />
        <div id="how-it-works">
          <HowItWorks />
        </div>
        <div id="roadmap">
          <Roadmap />
        </div>
        <FinalCTA />
        <LandingFooter />
      </div>
    </div>
  );
}
