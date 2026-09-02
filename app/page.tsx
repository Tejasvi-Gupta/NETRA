// app/page.tsx
"use client";

import { motion } from "framer-motion";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { useEffect } from "react";
import { checkServerHealth } from "@/lib/aiApi";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"] });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"] });

// Three.js touches the DOM/WebGL directly, so it must never run during SSR.
const GlobeVisual = dynamic(() => import("../components/GlobeVisual"), { ssr: false });

/* ============ BACKGROUND: grid + scanlines + noise ============ */
/* ============ BACKGROUND: blended ambient glow + subtle grid ============ */
function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* base color wash — deep red-black blend */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 30%, rgba(220,38,38,0.16), transparent 60%), radial-gradient(ellipse 60% 50% at 15% 85%, rgba(185,28,28,0.12), transparent 65%), linear-gradient(180deg, #0a0505 0%, #0d0606 50%, #0a0505 100%)",
        }}
      />

      {/* subtle grid, softly masked */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(248,113,113,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(248,113,113,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 70% 65% at 60% 45%, black 15%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 60% 45%, black 15%, transparent 75%)",
          animation: "gridDrift 30s linear infinite",
        }}
      />

      {/* soft ambient glows for depth */}
      <div className="absolute right-[8%] top-1/3 h-[550px] w-[550px] rounded-full bg-red-600/10 blur-[140px]" />
      <div className="absolute left-[5%] bottom-0 h-[320px] w-[320px] rounded-full bg-red-500/[0.06] blur-[120px]" />

      {/* faint scanlines for texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.6) 0px, transparent 1px, transparent 3px)",
        }}
      />

      {/* noise */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.03] mix-blend-overlay">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      <style jsx>{`
        @keyframes gridDrift {
          from {
            background-position: 0 0, 0 0;
          }
          to {
            background-position: 64px 64px, 64px 64px;
          }
        }
      `}</style>
    </div>
  );
}



/* ============ Right-docked globe panel ============ */
function GlobePanel() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-full md:block md:w-[58%] lg:w-1/2">
      {/* the canvas itself accepts drag input; it sits far enough from the
          hero copy on the left that this never blocks page interaction */}
      <div className="pointer-events-auto absolute inset-0">
        <GlobeVisual />
      </div>

      {/* lightweight HUD readouts to match the eye it replaced */}
      <div className={`${mono.className} absolute right-10 top-10 text-right text-[11px] tracking-[0.2em] text-neutral-400 md:right-16`}>
       
      </div>
     
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    void checkServerHealth();
  }, []);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#0a0505] text-white">
      <Background />
      <GlobePanel />
    

      <div className="relative z-10 flex min-h-screen flex-col justify-between px-6 py-8 md:px-16 md:py-10">
        {/* header */}
        <header className={`${mono.className} flex items-center justify-between text-xs tracking-widest`}>
        
      
        </header>

        {/* hero */}
        <div className="mt-10 md:mt-0 ml-0 md:ml-20">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`${mono.className} mb-6 flex items-center gap-3 text-xs tracking-[0.3em] text-neutral-400`}
          >
            <span className="text-red-500"></span>
            INTELLIGENCE / ANALYSIS / RESPONSE
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className={`${display.className} netra-glitch relative mb-5  mt-10 text-[80px] font-bold leading-[0.85] tracking-tighter sm:text-[120px] md:text-[200px]`}
            data-text="NETRA"
          >
            NETRA
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className={`${display.className} mt-5 text-3xl mb-10  tracking-tight sm:text-4xl md:text-4xl`}
          >
            SEE BEYOND <span className="text-red-500">THE DATA</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className={`${mono.className} mt-6 text-sm tracking-widest text-neutral-400`}
          >
            AI-POWERED CRIMINAL NETWORK ANALYSIS SYSTEM
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <button
              onClick={() => router.push("/login")}
              className={`${mono.className} group relative mt-10 mb-20 flex items-center gap-3 overflow-hidden bg-red-600 px-8 py-4 text-sm font-bold tracking-widest transition-colors hover:bg-red-500`}
            >
              <span className="relative z-10">ENTER NETRA</span>
              <span className="relative z-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
              <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0" />
            </button>
          </motion.div>

        
        </div>

      
      </div>

     
    </main>
  );
}
