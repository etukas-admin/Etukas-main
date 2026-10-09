import { useEffect, useState } from "react";

export function BrandLoader() {
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsExiting(true), 1250);
    const hideTimer = window.setTimeout(() => setIsVisible(false), 1650);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`brand-loader${isExiting ? " brand-loader--exiting" : ""}`} role="status" aria-label="Loading Etukas">
      <div className="brand-loader__lockup">
        <img className="brand-loader__symbol" src="/favicon.png" alt="" />
        <img className="brand-loader__wordmark" src="/etukas-wordmark.png" alt="Etukas.com — Easy to build" />
      </div>
    </div>
  );
}
