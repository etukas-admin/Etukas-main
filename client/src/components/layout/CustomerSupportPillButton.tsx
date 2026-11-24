import { useEffect, useState } from "react";
import { CustomerSupportIcon } from "../icons/CustomerSupportIcon";
import { BRAND_LOADER_DONE_EVENT } from "../common/BrandLoader";
import { cn } from "../../lib/utils";

/**
 * Module-scoped flag so the intro pill animation runs once per page load / browser refresh
 * without replaying when navigating between SPA routes.
 */
let hasCompletedIntroAnimation = false;

type CustomerSupportPillButtonProps = {
  onClick: () => void;
  size?: number;
  animateOnLoad?: boolean;
  tabIndex?: number;
  className?: string;
};

export function CustomerSupportPillButton({
  onClick,
  size = 30,
  animateOnLoad = true,
  tabIndex,
  className
}: CustomerSupportPillButtonProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (!animateOnLoad || hasCompletedIntroAnimation) return;

    const triggerAnimation = () => setShouldAnimate(true);

    // Wait for the fullscreen BrandLoader overlay to finish if present,
    // so the 0.5s delayed expansion plays visibly right after the storefront appears.
    const loaderEl = document.querySelector(".brand-loader");
    if (!loaderEl) {
      triggerAnimation();
      return;
    }

    window.addEventListener(BRAND_LOADER_DONE_EVENT, triggerAnimation, { once: true });
    // Safety fallback in case the loader unmounts before listener attaches
    const fallbackTimer = window.setTimeout(triggerAnimation, 1800);

    return () => {
      window.removeEventListener(BRAND_LOADER_DONE_EVENT, triggerAnimation);
      window.clearTimeout(fallbackTimer);
    };
  }, [animateOnLoad]);

  const handleAnimationEnd = () => {
    hasCompletedIntroAnimation = true;
    setShouldAnimate(false);
  };

  return (
    /* Fixed-size layout anchor so the expanding pill never shifts the logo or menu button */
    <div className={cn("relative h-10 w-10 shrink-0", className)}>
      <button
        type="button"
        tabIndex={tabIndex}
        onClick={onClick}
        aria-label="Customer Support"
        title="Chat with Etukas Support Team"
        className={cn(
          "focus-ring absolute right-0 top-1/2 z-20 inline-flex h-10 -translate-y-1/2 items-center overflow-hidden rounded-full border border-transparent transition-colors hover:bg-etukas-pink/60 active:scale-95",
          shouldAnimate && "support-pill-shell--animate"
        )}
      >
        <span
          onAnimationEnd={handleAnimationEnd}
          className={cn(
            "relative z-[1] block max-w-0 overflow-hidden whitespace-nowrap text-xs font-bold tracking-tight text-etukas-black opacity-0",
            shouldAnimate && "support-pill-label--animate"
          )}
        >
          Customer Support
        </span>

        <span className="relative z-[2] flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <CustomerSupportIcon size={size} />
        </span>
      </button>
    </div>
  );
}
