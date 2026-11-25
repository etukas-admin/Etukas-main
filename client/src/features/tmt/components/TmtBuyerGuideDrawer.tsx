import { useEffect } from "react";
import { BookOpen, X } from "lucide-react";
import type { HouseBhkKey, TmtDiameterLabel } from "../../../types/tmt";
import { TmtBuyerGuideContent } from "./TmtBuyerGuideContent";

interface TmtBuyerGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentBrandSlug?: string;
  currentBrandName?: string;
  onAutoFill: (
    bundles: Partial<Record<TmtDiameterLabel, number>>,
    bhkKey: HouseBhkKey,
    targetBrandSlug: string
  ) => void;
}

export function TmtBuyerGuideDrawer({
  isOpen,
  onClose,
  currentBrandSlug,
  currentBrandName,
  onAutoFill
}: TmtBuyerGuideDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="TMT Buyer Guide and Quick Steel Estimator"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-gray-50 shadow-2xl sm:rounded-3xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-etukas-pink text-etukas-red">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-etukas-black sm:text-lg">
                TMT Buyer Guide &amp; Steel Estimator
              </h2>
              <p className="text-[11px] text-gray-500">
                IS 1786 structural sizing, grade comparison &amp; 1/2/3 BHK auto-fill
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close buyer guide"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <TmtBuyerGuideContent
            currentBrandSlug={currentBrandSlug}
            currentBrandName={currentBrandName}
            onAutoFill={(bundles, bhk, brandSlug) => {
              onAutoFill(bundles, bhk, brandSlug);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
