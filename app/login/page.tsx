"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const roles = [
  {
    key: "admin",
    tag: "ADMIN",
    title: "ADMIN",
    desc: "Oversee cases and assign investigators",
    operatorId: "netra-admin",
    accessKey: "netra@2026",
    accent: "#ef4444",
  },
  {
    key: "investigator",
    tag: "INVESTIGATOR",
    title: "INVESTIGATOR",
    desc: "Review evidence and follow assigned cases",
    operatorId: "netra-investigator",
    accessKey: "investigator@2026",
    accent: "#f97316",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  function handleLogin(roleKey: string) {
    setLoadingRole(roleKey);
    localStorage.setItem("netra_role", roleKey);
    localStorage.setItem(
      "netra_display_name",
      roleKey === "admin" ? "Administrator" : "Field Investigator"
    );
    setTimeout(() => {
      router.push(roleKey === "admin" ? "/admin/dashboard" : "/investigator/dashboard");
    }, 650);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] font-mono text-neutral-200">
      {/* animated grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: "linear-gradient(rgba(239,68,68,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.5) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
        maskImage: "radial-gradient(ellipse 80% 80% at 30% 20%, black 20%, transparent 75%)",
      }} />

      {/* animated glow orb */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-red-600/10 blur-[120px] animate-[pulse_6s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-orange-600/10 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />

      {/* scanline sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 h-px w-full bg-gradient-to-r from-transparent via-red-500/40 to-transparent animate-[scan_5s_linear_infinite]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-8 py-14 md:py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-neutral-500 hover:text-red-400 transition-colors">
          ← RETURN TO NETRA
        </Link>

        <div className="mt-10 opacity-0 animate-[fadeUp_0.7s_ease-out_0.1s_forwards]">
          <div className="flex items-baseline gap-2">
            <h1 className="text-6xl md:text-7xl font-black tracking-tight text-white">NETRA</h1>
            <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          </div>
          <p className="mt-3 text-[12px] tracking-[0.3em] text-neutral-500">SECURE ACCESS / SELECT ROLE</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {roles.map((r, i) => (
            <div
              key={r.key}
              className="group relative overflow-hidden border border-white/10 bg-white/[0.02] p-8 opacity-0 backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/[0.04]"
              style={{
                animation: `fadeUp 0.7s ease-out ${0.25 + i * 0.15}s forwards`,
              }}
            >
              {/* accent glow on hover */}
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
                style={{ background: r.accent }}
              />

              <span
                className="inline-block rounded-full px-3 py-1 text-[10px] font-bold tracking-wider text-white"
                style={{ backgroundColor: r.accent }}
              >
                {r.tag}
              </span>

              <h2 className="mt-5 text-3xl font-black tracking-tight text-white">{r.title}</h2>
              <p className="mt-2 text-[12px] text-neutral-500">{r.desc}</p>

              <div className="mt-6 h-px w-full bg-white/10" />

              <div className="mt-5 space-y-2.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Operator ID</span>
                  <span className="font-semibold text-neutral-200">{r.operatorId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Access Key</span>
                  <span className="font-semibold text-neutral-200">{r.accessKey}</span>
                </div>
              </div>

              <button
                onClick={() => handleLogin(r.key)}
                disabled={loadingRole !== null}
                className="mt-7 flex items-center gap-2 text-[12px] font-bold tracking-widest transition-all disabled:opacity-40"
                style={{ color: r.accent }}
              >
                {loadingRole === r.key ? (
                  <>AUTHENTICATING <span className="inline-block h-2 w-2 animate-ping rounded-full" style={{ backgroundColor: r.accent }} /></>
                ) : (
                  <>LOGIN →</>
                )}
              </button>

              {/* bottom border sweep on hover */}
              <div
                className="absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-500 group-hover:w-full"
                style={{ backgroundColor: r.accent }}
              />
            </div>
          ))}
        </div>

      
      </div>

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}