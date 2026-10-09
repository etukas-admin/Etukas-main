import { useEffect, useState } from "react";

export function useMobileScrollState() {
  const [isMobileScrolled, setIsMobileScrolled] = useState(false);

  useEffect(() => {
    let lastTouch: { x: number; y: number } | null = null;

    const isMobile = () => window.innerWidth < 768;
    const updateFromWheel = (event: WheelEvent) => {
      if (!isMobile() || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (event.deltaY > 0 && window.scrollY + event.deltaY > 8) {
        setIsMobileScrolled(true);
      }
    };
    const updateFromTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!isMobile() || !lastTouch || !touch) return;

      const deltaX = touch.clientX - lastTouch.x;
      const deltaY = touch.clientY - lastTouch.y;
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 1 && deltaY < 0 && window.scrollY - deltaY > 8) {
        setIsMobileScrolled(true);
      }
      lastTouch = { x: touch.clientX, y: touch.clientY };
    };
    const resetAtTop = () => {
      if (!isMobile() || window.scrollY <= 8) {
        setIsMobileScrolled(false);
      }
    };
    const handleResize = () => {
      if (!isMobile()) setIsMobileScrolled(false);
    };
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      lastTouch = touch ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const clearTouch = () => {
      lastTouch = null;
    };

    window.addEventListener("wheel", updateFromWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", updateFromTouch, { passive: true });
    window.addEventListener("touchend", clearTouch, { passive: true });
    window.addEventListener("touchcancel", clearTouch, { passive: true });
    window.addEventListener("scroll", resetAtTop, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("wheel", updateFromWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", updateFromTouch);
      window.removeEventListener("touchend", clearTouch);
      window.removeEventListener("touchcancel", clearTouch);
      window.removeEventListener("scroll", resetAtTop);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isMobileScrolled;
}
