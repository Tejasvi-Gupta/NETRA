// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"] });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"] });

// demo-only fake credentials — replace with real auth (NextAuth) later
const FAKE_OPERATOR_ID = "netra-admin";
const FAKE_ACCESS_KEY = "netra@2026";

function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 30%, rgba(220,38,38,0.16), transparent 60%), radial-gradient(ellipse 60% 50% at 15% 85%, rgba(185,28,28,0.12), transparent 65%), linear-gradient(180deg, #0a0505 0%, #0d0606 50%, #0a0505 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(248,113,113,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(248,113,113,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 70% 65% at 50% 45%, black 15%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 45%, black 15%, transparent 75%)",
        }}
      />
      <div className="absolute right-[8%] top-1/3 h-[550px] w-[550px] rounded-full bg-red-600/10 blur-[140px]" />
      <div className="absolute left-[5%] bottom-0 h-[320px] w-[320px] rounded-full bg-red-500/[0.06] blur-[120px]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.6) 0px, transparent 1px, transparent 3px)",
        }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-[0.03] mix-blend-overlay">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [operatorId, setOperatorId] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuthenticate = () => {
    if (loading) return;
    setError(false);
    setLoading(true);

    // simulated auth check — swap this for a real API/NextAuth call
    setTimeout(() => {
      if (operatorId.trim() === FAKE_OPERATOR_ID && accessKey === FAKE_ACCESS_KEY) {
        router.push("/dashboard");
      } else {
        setError(true);
        setLoading(false);
      }
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAuthenticate();
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#0a0505] text-white">
      <Background />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-[540px]">
          <motion.a
            href="/"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`${mono.className} mb-16 inline-flex items-center gap-2 text-xs tracking-widest text-neutral-500 transition-colors hover:text-neutral-300`}
          >
            ← RETURN TO NETRA
          </motion.a>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-10"
          >
            <h1 className={`${display.className} flex items-end text-[64px] font-bold leading-none tracking-tight`}>
              NETRA
              <span className="mb-1 ml-1 h-3 w-3 rounded-full bg-red-500" />
            </h1>
            <p className={`${mono.className} mt-4 text-xs tracking-[0.25em] text-neutral-500`}>
              SECURE ACCESS / CLEARANCE REQUIRED
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <div>
              <label className={`${mono.className} mb-2 block text-[11px] tracking-widest text-neutral-500`}>
                OPERATOR ID
              </label>
              <input
                type="text"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter operator ID"
                autoComplete="off"
                className={`${mono.className} w-full border border-white/10 bg-white/[0.02] px-4 py-3.5 text-sm text-neutral-200 placeholder:text-neutral-600 outline-none transition-colors focus:border-red-500/50 focus:bg-white/[0.04]`}
              />
            </div>

            <div>
              <label className={`${mono.className} mb-2 block text-[11px] tracking-widest text-neutral-500`}>
                ACCESS KEY
              </label>
              <input
                type="password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter access key"
                autoComplete="off"
                className={`${mono.className} w-full border border-white/10 bg-white/[0.02] px-4 py-3.5 text-sm text-neutral-200 placeholder:text-neutral-600 outline-none transition-colors focus:border-red-500/50 focus:bg-white/[0.04]`}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`${mono.className} text-xs tracking-widest text-red-400`}
                >
                  ACCESS DENIED — INVALID CREDENTIALS
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              onClick={handleAuthenticate}
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className={`${mono.className} group relative mt-4 flex w-full items-center justify-between overflow-hidden bg-red-600 px-8 py-4 text-sm font-bold tracking-widest transition-colors hover:bg-red-500 disabled:opacity-60`}
            >
              <span className="relative z-10">
                {loading ? "AUTHENTICATING..." : "AUTHENTICATE"}
              </span>
              <span className="relative z-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">
                ↗
              </span>
              <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-0" />
            </motion.button>
          </motion.div>
        </div>
      </div>
    </main>
  );
}