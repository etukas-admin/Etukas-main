import { useEffect, useState } from "react";
import { LINE_MATERIAL_ICONS } from "./MaterialLineIcons";

interface LocationRefreshingOverlayProps {
  isOpen: boolean;
  locationName: string;
  scopeText?: string;
  durationMs?: number;
  onFinish?: () => void;
}

const ICON_COUNT = LINE_MATERIAL_ICONS.length; // 9

export function LocationRefreshingOverlay({
  isOpen,
  locationName,
  scopeText,
  durationMs = 1000,
  onFinish,
}: LocationRefreshingOverlayProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    setActiveIndex(0);

    // Step through all icons quickly across the duration
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % ICON_COUNT);
    }, Math.floor(durationMs / (ICON_COUNT * 1.5)));

    const timer = setTimeout(() => {
      clearInterval(interval);
      if (onFinish) onFinish();
    }, durationMs);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isOpen, durationMs, onFinish]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">

        {/* Icons row — all 9 shown, active one pops up in red */}
        <div className="flex items-center justify-center gap-2">
          {LINE_MATERIAL_ICONS.map((IconComp, idx) => {
            const isActive = idx === activeIndex;
            const isPrev =
              idx === (activeIndex - 1 + ICON_COUNT) % ICON_COUNT;
            const isNext = idx === (activeIndex + 1) % ICON_COUNT;

            let scale = "scale-75 opacity-0";
            if (isActive) scale = "scale-110 opacity-100 -translate-y-1";
            else if (isPrev || isNext) scale = "scale-90 opacity-25";

            return (
              <div
                key={idx}
                className={`transition-all duration-100 ease-in-out ${scale}`}
                style={{ color: "#C52228" }}
              >
                <IconComp size={40} />
              </div>
            );
          })}
        </div>

        {/* Dot progress indicator */}
        <div className="flex items-center gap-1.5">
          {LINE_MATERIAL_ICONS.map((_, idx) => (
            <span
              key={idx}
              className={`block rounded-full transition-all duration-100 ${
                idx === activeIndex
                  ? "h-2 w-6 bg-[#C52228]"
                  : "h-2 w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Location label */}
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#C52228]">
            {scopeText || "Loading Nearby Prices"}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-400 max-w-[220px] truncate">
            {locationName}
          </p>
        </div>

      </div>
    </div>
  );
}
