"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessKey, logout, updateAccessKey } from "@/lib/auth";

export default function UserSettings() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentKey, setCurrentKey] = useState("");
  const [nextKey, setNextKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setShowPassword(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function openPassword() {
    setOpen(false);
    setShowPassword(true);
    setCurrentKey("");
    setNextKey("");
    setConfirmKey("");
    setMessage(null);
    setError(null);
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  function handleUpdatePassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (currentKey !== getAccessKey()) {
      setError("Current access key is incorrect.");
      return;
    }
    if (nextKey.trim().length < 6) {
      setError("New access key must be at least 6 characters.");
      return;
    }
    if (nextKey !== confirmKey) {
      setError("New access keys do not match.");
      return;
    }

    updateAccessKey(nextKey);
    setMessage("Access key updated.");
    setCurrentKey("");
    setNextKey("");
    setConfirmKey("");
  }

  return (
    <div ref={rootRef} className="relative flex items-center gap-3 border-l border-neutral-800 pl-4">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-[34px] w-[34px] items-center justify-center border border-neutral-800 hover:border-neutral-600"
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2.5"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-xs text-neutral-300">
          RV
        </div>
        <div className="text-left">
          <div className="text-[13px] font-semibold text-white">R. Verma</div>
          <div className="mt-0.5 text-[10px] tracking-wide text-neutral-500">FIELD ANALYST</div>
        </div>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-[220px] border border-neutral-800 bg-[#0b0b0b] py-1"
        >
          <button
            role="menuitem"
            onClick={openPassword}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[11px] tracking-[0.12em] text-neutral-300 hover:bg-[#141414] hover:text-white"
          >
            CHANGE PASSWORD
          </button>
          <button
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[11px] tracking-[0.12em] text-red-400 hover:bg-[#141414]"
          >
            LOG OUT
          </button>
        </div>
      )}

      {showPassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowPassword(false);
          }}
        >
          <form
            onSubmit={handleUpdatePassword}
            className="w-full max-w-md border border-neutral-800 bg-[#0b0b0b] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] tracking-[0.18em] text-neutral-500">SETTINGS</div>
                <h2 className="mt-1 text-lg font-semibold text-white">Change access key</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(false)}
                className="text-[10px] tracking-widest text-neutral-500 hover:text-red-400"
              >
                CLOSE
              </button>
            </div>

            <label className="mt-6 block text-[10px] tracking-widest text-neutral-500">CURRENT ACCESS KEY</label>
            <input
              type="password"
              value={currentKey}
              onChange={(e) => setCurrentKey(e.target.value)}
              className="mt-2 w-full border border-neutral-800 bg-[#111] px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600"
            />

            <label className="mt-4 block text-[10px] tracking-widest text-neutral-500">NEW ACCESS KEY</label>
            <input
              type="password"
              value={nextKey}
              onChange={(e) => setNextKey(e.target.value)}
              className="mt-2 w-full border border-neutral-800 bg-[#111] px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600"
            />

            <label className="mt-4 block text-[10px] tracking-widest text-neutral-500">CONFIRM NEW ACCESS KEY</label>
            <input
              type="password"
              value={confirmKey}
              onChange={(e) => setConfirmKey(e.target.value)}
              className="mt-2 w-full border border-neutral-800 bg-[#111] px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600"
            />

            {error && <p className="mt-3 text-[11px] text-red-400">{error}</p>}
            {message && <p className="mt-3 text-[11px] text-emerald-400">{message}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPassword(false)}
                className="px-4 py-2 text-[11px] tracking-widest text-neutral-500 hover:text-neutral-200"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="border border-red-500/40 bg-red-500/10 px-4 py-2 text-[11px] tracking-widest text-red-300 hover:bg-red-500/15"
              >
                UPDATE KEY
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
