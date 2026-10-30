/**
 * Flat line-art outline icons for the location refresh overlay.
 * All icons use stroke="currentColor" fill="none" so they respond
 * to CSS `color` — set to Etukas Red (#C52228) in the overlay.
 */

import React from "react";

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** 1. Bricks and Blocks — stacked brick wall */
export function LineBricksIcon({ size = 44, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Bottom row */}
      <rect x="3" y="28" width="16" height="9" rx="1" />
      <rect x="21" y="28" width="20" height="9" rx="1" />
      {/* Middle row */}
      <rect x="3" y="18" width="20" height="9" rx="1" />
      <rect x="25" y="18" width="16" height="9" rx="1" />
      {/* Top row */}
      <rect x="3" y="8" width="16" height="9" rx="1" />
      <rect x="21" y="8" width="20" height="9" rx="1" />
    </svg>
  );
}

/** 2. Cement — triangular bag with a triangle mark */
export function LineCementIcon({ size = 44, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Bag outline — wide bottom, tied top */}
      <path d="M10 38 L8 16 Q8 12 12 11 L32 11 Q36 12 36 16 L34 38 Q34 40 22 40 Q10 40 10 38 Z" />
      {/* Tie at top */}
      <path d="M15 11 L22 6 L29 11" />
      {/* Triangle mark on bag */}
      <path d="M17 28 L22 19 L27 28 Z" />
      {/* Horizontal crease lines */}
      <line x1="11" y1="22" x2="33" y2="22" />
    </svg>
  );
}

/** 3. Sand — triangle heap of sand */
export function LineSandIcon({ size = 44, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Heap triangle */}
      <path d="M4 38 L22 10 L40 38 Z" />
      {/* Grain dots inside */}
      <circle cx="16" cy="30" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="22" cy="24" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="28" cy="30" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="22" cy="32" r="1.2" fill="currentColor" stroke="none" />
      {/* Ground line */}
      <line x1="3" y1="38" x2="41" y2="38" />
    </svg>
  );
}

/** 4. Stone / Aggregate — cluster of 3 rounded stones */
export function LineStoneIcon({ size = 44, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Back stone */}
      <ellipse cx="22" cy="16" rx="9" ry="7" />
      {/* Left stone */}
      <ellipse cx="12" cy="30" rx="9" ry="7" />
      {/* Right stone */}
      <ellipse cx="32" cy="30" rx="9" ry="7" />
    </svg>
  );
}

/** 5. Iron Bars — bundle of parallel rods */
export function LineIronBarsIcon({ size = 44, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* 5 parallel rods, slightly staggered */}
      <line x1="4" y1="14" x2="40" y2="20" />
      <line x1="4" y1="19" x2="40" y2="25" />
      <line x1="4" y1="24" x2="40" y2="30" />
      <line x1="4" y1="29" x2="40" y2="35" />
      {/* Binding wire wrap */}
      <rect x="14" y="12" width="4" height="26" rx="1" />
      <rect x="26" y="16" width="4" height="22" rx="1" />
    </svg>
  );
}

/** 6. Tiles — 2×2 tile grid with grout lines */
export function LineTilesIcon({ size = 44, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Outer square */}
      <rect x="5" y="5" width="34" height="34" rx="2" />
      {/* Grout cross */}
      <line x1="22" y1="5" x2="22" y2="39" />
      <line x1="5" y1="22" x2="39" y2="22" />
      {/* Subtle inner detail — diagonal lines on two tiles */}
      <line x1="8" y1="8" x2="19" y2="19" />
      <line x1="25" y1="25" x2="36" y2="36" />
    </svg>
  );
}

/** 7. Paints — paint bucket with drip and roller */
export function LinePaintsIcon({ size = 44, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Bucket body */}
      <path d="M8 16 L10 38 Q10 40 22 40 Q34 40 34 38 L36 16 Z" />
      {/* Bucket top rim */}
      <ellipse cx="22" cy="16" rx="14" ry="4" />
      {/* Bucket handle */}
      <path d="M12 16 Q12 8 22 8 Q32 8 32 16" strokeDasharray="none" />
      {/* Paint drip */}
      <path d="M22 40 Q22 43 24 43 Q26 43 26 41 Q26 40 24 40" />
      {/* Paint level line inside bucket */}
      <path d="M12 26 Q22 28 32 26" />
    </svg>
  );
}

/** 8. Statues / Decorative Items — classical bust on pedestal */
export function LineStatuesIcon({ size = 44, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Head */}
      <ellipse cx="22" cy="10" rx="7" ry="8" />
      {/* Neck */}
      <path d="M18 17 L17 22 M26 17 L27 22" />
      {/* Shoulders/chest */}
      <path d="M12 30 Q14 22 17 22 Q22 24 27 22 Q30 22 32 30 L32 36 L12 36 Z" />
      {/* Pedestal */}
      <rect x="10" y="36" width="24" height="5" rx="1" />
      {/* Face detail — eyes */}
      <circle cx="19" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="25" cy="9" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 9. Cement Articles — cylindrical drum / pipe */
export function LineCementArticlesIcon({ size = 44, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Cylinder top ellipse */}
      <ellipse cx="22" cy="12" rx="14" ry="5" />
      {/* Cylinder body sides */}
      <line x1="8" y1="12" x2="8" y2="34" />
      <line x1="36" y1="12" x2="36" y2="34" />
      {/* Cylinder bottom ellipse */}
      <ellipse cx="22" cy="34" rx="14" ry="5" />
      {/* Horizontal texture bands */}
      <path d="M8 20 Q22 23 36 20" />
      <path d="M8 27 Q22 30 36 27" />
    </svg>
  );
}

/** All 9 icons as an ordered array for the overlay cycle */
export const LINE_MATERIAL_ICONS = [
  LineBricksIcon,
  LineCementIcon,
  LineSandIcon,
  LineStoneIcon,
  LineIronBarsIcon,
  LineTilesIcon,
  LinePaintsIcon,
  LineStatuesIcon,
  LineCementArticlesIcon,
] as const;

