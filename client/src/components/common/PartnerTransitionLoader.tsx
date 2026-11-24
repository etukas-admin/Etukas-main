import { useEffect, useState } from "react";
import { Handshake } from "lucide-react";

export const PARTNER_LOADER_DONE_EVENT = "etukas_partner_loader_done";

type PartnerTransitionLoaderProps = {
  isActive: boolean;
  targetPath: string;
  onComplete: () => void;
};

export function PartnerTransitionLoader({
  isActive,
  targetPath,
  onComplete
}: PartnerTransitionLoaderProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsExiting(false);
      return;
    }

    setIsExiting(false);
    // Ensure the incoming Partner view starts cleanly at the top behind the loader
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const holdMs = prefersReduced ? 180 : 950;
    const fadeMs = prefersReduced ? 80 : 320;

    const exitTimer = window.setTimeout(() => setIsExiting(true), holdMs);
    const doneTimer = window.setTimeout(() => {
      onComplete();
      window.dispatchEvent(new Event(PARTNER_LOADER_DONE_EVENT));
    }, holdMs + fadeMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [isActive, onComplete]);

  if (!isActive) return null;

  const isDashboard = targetPath === "/partner-dashboard" || targetPath === "/seller";

  return (
    <div
      data-etukas-loader="active"
      role="status"
      aria-live="polite"
      aria-label={isDashboard ? "Opening Etukas Partner Dashboard" : "Switching to Etukas Partner"}
      className={`fixed inset-0 z-[110] flex flex-col items-center justify-center overflow-hidden bg-slate-950 px-6 text-white transition-all duration-300 ease-out ${
        isExiting ? "pointer-events-none scale-[1.02] opacity-0" : "opacity-100"
      }`}
    >
      {/* Subtle Etukas Red + Partner Orange ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(197,34,40,0.22),rgba(249,115,22,0.1)_34%,transparent_68%)]"
      />

      <div className="relative z-10 flex w-full max-w-xs flex-col items-center text-center sm:max-w-sm">
        {/* Top Etukas Partner Network pill */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-300">
          <Handshake size={13} className="text-orange-400" />
          <span>Etukas Partner Network</span>
        </span>

        {/* Brand Logo Card with gentle glow ring */}
        <div className="relative mt-6 flex items-center justify-center rounded-2xl border border-slate-800/90 bg-slate-900/90 px-6 py-4 shadow-2xl shadow-orange-500/10">
          {logoError ? (
            <div className="flex items-center gap-2.5">
              <img src="/favicon.png" alt="" className="h-9 w-9 object-contain" />
              <span className="text-lg font-black tracking-wide text-white">
                ETUKAS <span className="text-orange-400">PARTNER</span>
              </span>
            </div>
          ) : (
            <img
              src="/etukas-partner-logo.png"
              alt="Etukas Partner"
              onError={() => setLogoError(true)}
              className="h-12 w-auto object-contain brightness-110 sm:h-14"
            />
          )}
        </div>

        {/* Status copy */}
        <h2 className="mt-5 text-base font-extrabold tracking-tight text-white sm:text-lg">
          {isDashboard ? "Opening Partner Dashboard" : "Switching to Etukas Partner"}
        </h2>
        <p className="mt-1 text-xs font-medium text-slate-400">
          {isDashboard
            ? "Loading your store, orders & live inventory..."
            : "BUILD • CONNECT • GROW"}
        </p>

        {/* Smooth Etukas Red → Orange → Amber progress bar */}
        <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-slate-800/90">
          <div className="partner-loader-bar h-full rounded-full bg-gradient-to-r from-etukas-red via-orange-500 to-amber-400" />
        </div>
      </div>
    </div>
  );
}
