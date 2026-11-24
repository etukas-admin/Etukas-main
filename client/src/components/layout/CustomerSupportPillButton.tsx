import { useEffect, useState } from "react";
import { CustomerSupportIcon } from "../icons/CustomerSupportIcon";
import { BRAND_LOADER_DONE_EVENT } from "../common/BrandLoader";
import { PARTNER_LOADER_DONE_EVENT } from "../common/PartnerTransitionLoader";
import { cn } from "../../lib/utils";

/**
 * Module-scoped flag so the intro pill animation runs once per page load / browser refresh
 * without replaying when navigating between SPA routes.
 */
let hasCompletedIntroAnimation = false;

type CustomerSupportPillButtonProps = {
  onClick: () => void;
  label?: string;
  variant?: "light" | "dark";
  size?: number;
  animateOnLoad?: boolean;
  tabIndex?: number;
  className?: string;
};

export function CustomerSupportPillButton({
  onClick,
  label = "Customer Support",
  variant = "light",
  size = 30,
  animateOnLoad = true,
  tabIndex,
  className
}: CustomerSupportPillButtonProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (!animateOnLoad || hasCompletedIntroAnimation) return;

    const triggerAnimation = () => setShouldAnimate(true);

    // Wait for any active fullscreen loader (BrandLoader or PartnerTransitionLoader) to finish
    // so the 0.5s delayed expansion plays visibly right after the page appears.
    const loaderEl = document.querySelector(".brand-loader, [data-etukas-loader='active']");
    if (!loaderEl) {
      triggerAnimation();
      return;
    }

    window.addEventListener(BRAND_LOADER_DONE_EVENT, triggerAnimation, { once: true });
    window.addEventListener(PARTNER_LOADER_DONE_EVENT, triggerAnimation, { once: true });
    const fallbackTimer = window.setTimeout(triggerAnimation, 1800);

    return () => {
      window.removeEventListener(BRAND_LOADER_DONE_EVENT, triggerAnimation);
      window.removeEventListener(PARTNER_LOADER_DONE_EVENT, triggerAnimation);
      window.clearTimeout(fallbackTimer);
    };
  }, [animateOnLoad]);

  const handleAnimationEnd = () => {
    hasCompletedIntroAnimation = true;
    setShouldAnimate(false);
  };

  const isDark = variant === "dark";

  return (
    /* Fixed-size layout anchor so the expanding pill never shifts the logo or menu button */
    <div className={cn("relative h-10 w-10 shrink-0", className)}>
      <button
        type="button"
        tabIndex={tabIndex}
        onClick={onClick}
        aria-label={label}
        title={`Chat with Etukas ${label}`}
        className={cn(
          "focus-ring absolute right-0 top-1/2 z-20 inline-flex h-10 -translate-y-1/2 items-center overflow-hidden rounded-full border border-transparent transition-colors active:scale-95",
          isDark ? "hover:bg-slate-800/90" : "hover:bg-etukas-pink/60",
          shouldAnimate &&
            (isDark ? "support-pill-shell--dark-animate" : "support-pill-shell--animate")
        )}
      >
        <span
          onAnimationEnd={handleAnimationEnd}
          className={cn(
            "relative z-[1] block max-w-0 overflow-hidden whitespace-nowrap text-xs font-bold tracking-tight opacity-0",
            isDark ? "text-slate-100" : "text-etukas-black",
            shouldAnimate && "support-pill-label--animate"
          )}
        >
          {label}
        </span>

        <span
          className={cn(
            "relative z-[2] flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isDark && "bg-white/95 shadow-sm"
          )}
        >
          <CustomerSupportIcon size={size} />
        </span>
      </button>
    </div>
  );
}
