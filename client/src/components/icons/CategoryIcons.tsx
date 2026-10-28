import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * 1. Bricks and Blocks
 * 3D Terracotta Wire-Cut Red Bricks with holes & a solid Grey Fly-Ash Concrete Cinder Block
 * Engineered without fragile SVG filters for 100% guaranteed rendering across all browsers.
 */
export function BricksBlocksIcon({ size = 56, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      {/* Ground Cast Shadow */}
      <ellipse cx="32" cy="56" rx="28" ry="5.5" fill="#3D1D13" fillOpacity="0.28" />

      {/* Concrete Cinder Block (Back-Left) */}
      <g>
        {/* Top Face */}
        <polygon points="5,33 26,19 39,26 18,40" fill="#B0BEC5" stroke="#CFD8DC" strokeWidth="0.8" />
        {/* Left Face */}
        <polygon points="5,33 18,40 18,52 5,45" fill="#78909C" />
        {/* Right/Side Face */}
        <polygon points="18,40 39,26 39,38 18,52" fill="#546E7A" />

        {/* Dual Hollow Cores of Cinder Block */}
        <polygon points="12,32 18,27 23,30 17,35" fill="#263238" />
        <polygon points="17,35 23,30 23,39 17,44" fill="#1A2226" />
        <polygon points="26,27 32,23 37,26 31,30" fill="#263238" />
        <polygon points="31,30 37,26 37,35 31,39" fill="#1A2226" />
      </g>

      {/* Brick 1: Bottom Red Clay Brick */}
      <g>
        {/* Shadow under top brick */}
        <polygon points="19,42 41,28 59,38 37,52" fill="#E64A19" stroke="#FF7043" strokeWidth="0.8" />
        <polygon points="19,42 37,52 37,60 19,50" fill="#C62828" />
        <polygon points="37,52 59,38 59,46 37,60" fill="#8E0000" />
      </g>

      {/* Brick 2: Top Red Clay Brick (Interlocked) */}
      <g>
        {/* Top Face with Highlight */}
        <polygon points="21,23 43,9 61,19 39,33" fill="#FF5722" stroke="#FF8A65" strokeWidth="1" />
        {/* Front Face */}
        <polygon points="21,23 39,33 39,41 21,31" fill="#D84315" />
        {/* Side Face */}
        <polygon points="39,33 61,19 61,27 39,41" fill="#992605" />

        {/* Realistic Brick Frogs / Indentations */}
        <ellipse cx="36" cy="19" rx="4.5" ry="2.2" fill="#BF360C" />
        <ellipse cx="36" cy="19" rx="3.5" ry="1.6" fill="#781C02" />
        <ellipse cx="48" cy="23" rx="4.5" ry="2.2" fill="#BF360C" />
        <ellipse cx="48" cy="23" rx="3.5" ry="1.6" fill="#781C02" />
      </g>
    </svg>
  );
}

/**
 * 2. Cement
 * Realistic 3D ACC/UltraTech Style Red Industrial Cement Bag
 * Stitched top ears, bold CEMENT 50KG label band, and gold star seal stamp.
 */
export function CementIcon({ size = 56, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      {/* Ground Cast Shadow */}
      <ellipse cx="32" cy="57" rx="25" ry="5" fill="#3D0000" fillOpacity="0.3" />

      {/* Sack Body Outer */}
      <path
        d="M13 18L19 9h26l6 9 1.5 35c0 4-3.5 6-7 6H18.5c-3.5 0-7-2-7-6L13 18z"
        fill="#D32F2F"
        stroke="#B71C1C"
        strokeWidth="1.2"
      />

      {/* 3D Curved Sack Body Highlights & Shadows */}
      <path
        d="M13 18L19 9h16l2 47H18.5c-3.5 0-7-2-7-6L13 18z"
        fill="#E53935"
      />
      {/* Dark right edge shadow */}
      <path
        d="M45 9l6 9 1.5 35c0 4-3.5 6-7 6h-6l2-50h3.5z"
        fill="#B71C1C"
      />

      {/* Top Paper Stitch Band */}
      <path d="M19 9h26v6H19z" fill="#FFF9C4" stroke="#FBC02D" strokeWidth="1" />
      <line x1="20" y1="12" x2="44" y2="12" stroke="#C62828" strokeWidth="1.8" strokeDasharray="2.5 2" />

      {/* Top Corner Fold Ears */}
      <polygon points="13,18 19,9 19,16" fill="#8E0000" />
      <polygon points="51,18 45,9 45,16" fill="#8E0000" />

      {/* White Center Brand Panel */}
      <rect x="13.5" y="21" width="37" height="17" rx="2.5" fill="#FFFFFF" stroke="#ECEFF1" strokeWidth="0.8" />
      <rect x="14" y="22" width="36" height="2.5" fill="#D32F2F" />

      {/* Crisp High-Contrast "CEMENT" Typography */}
      <text
        x="32"
        y="32"
        textAnchor="middle"
        fill="#B71C1C"
        fontSize="8"
        fontWeight="900"
        fontFamily="Arial Black, Impact, sans-serif"
        letterSpacing="0.8"
      >
        CEMENT
      </text>
      <text
        x="32"
        y="36.5"
        textAnchor="middle"
        fill="#37474F"
        fontSize="4.2"
        fontWeight="800"
        fontFamily="sans-serif"
      >
        SUPER GRADE • 50 KG
      </text>

      {/* Gold Seal of Quality */}
      <circle cx="32" cy="46.5" r="8.5" fill="#FFC107" stroke="#FFA000" strokeWidth="1.2" />
      <circle cx="32" cy="46.5" r="6.5" fill="#FFD54F" />
      {/* Red Star in Seal */}
      <polygon
        points="32,41.5 33.5,45 37,45.5 34.5,48 35,51.5 32,49.5 29,51.5 29.5,48 27,45.5 30.5,45"
        fill="#C62828"
      />

      {/* Left highlight crease */}
      <path d="M16 20C18 32 17 44 15 52" stroke="#FFCDD2" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  );
}

/**
 * 3. Iron Bars
 * 3D Metallic Steel & Fe550D Blue Ribbed TMT Rebar Rods
 * High-definition metallic reflections, diagonal ridges & gold bundling strap
 */
export function IronBarsIcon({ size = 56, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      {/* Ground Cast Shadow */}
      <ellipse cx="32" cy="58" rx="24" ry="4.5" fill="#102027" fillOpacity="0.3" />

      {/* Bar 1 (Left - Metallic Steel) */}
      <g>
        <rect x="10" y="8" width="12" height="49" rx="6" fill="#455A64" stroke="#263238" strokeWidth="0.8" />
        <rect x="13" y="8" width="5" height="49" fill="#90A4AE" />
        <rect x="14.5" y="8" width="2" height="49" fill="#FFFFFF" fillOpacity="0.8" />
        <ellipse cx="16" cy="11" rx="6" ry="3" fill="#CFD8DC" stroke="#ECEFF1" strokeWidth="1" />
        {/* TMT Ribs */}
        <path d="M11 17L21 14M11 23L21 20M11 29L21 26M11 35L21 32M11 41L21 38M11 47L21 44M11 53L21 50" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* Bar 2 (Center - Fe550D High-Strength Blue TMT) */}
      <g>
        <rect x="25.5" y="4" width="13" height="53" rx="6.5" fill="#0277BD" stroke="#01579B" strokeWidth="0.8" />
        <rect x="29" y="4" width="5.5" height="53" fill="#29B6F6" />
        <rect x="30.5" y="4" width="2" height="53" fill="#FFFFFF" fillOpacity="0.9" />
        <ellipse cx="32" cy="7" rx="6.5" ry="3" fill="#B3E5FC" stroke="#FFFFFF" strokeWidth="1" />
        {/* Prominent Ribs */}
        <path d="M26.5 13L37.5 10M26.5 19L37.5 16M26.5 25L37.5 22M26.5 31L37.5 28M26.5 37L37.5 34M26.5 43L37.5 40M26.5 49L37.5 46" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
      </g>

      {/* Bar 3 (Right - Metallic Steel) */}
      <g>
        <rect x="42" y="8" width="12" height="49" rx="6" fill="#455A64" stroke="#263238" strokeWidth="0.8" />
        <rect x="45" y="8" width="5" height="49" fill="#90A4AE" />
        <rect x="46.5" y="8" width="2" height="49" fill="#FFFFFF" fillOpacity="0.8" />
        <ellipse cx="48" cy="11" rx="6" ry="3" fill="#CFD8DC" stroke="#ECEFF1" strokeWidth="1" />
        <path d="M43 17L53 14M43 23L53 20M43 29L53 26M43 35L53 32M43 41L53 38M43 47L53 44M43 53L53 50" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* Heavy Gold Bundle Clamp Band */}
      <rect x="8" y="31" width="48" height="6.5" rx="3" fill="#FFC107" stroke="#E65100" strokeWidth="1.2" />
      <line x1="23" y1="31" x2="23" y2="37.5" stroke="#BF360C" strokeWidth="1.4" />
      <line x1="41" y1="31" x2="41" y2="37.5" stroke="#BF360C" strokeWidth="1.4" />
    </svg>
  );
}

/**
 * 4. Sand
 * Rich Golden Sand Mountain with layered dune ripples, granular aggregate particles & steel construction shovel
 */
export function SandIcon({ size = 56, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      {/* Ground Cast Shadow */}
      <ellipse cx="32" cy="56" rx="28" ry="6" fill="#4E342E" fillOpacity="0.3" />

      {/* Secondary Dune Layer (Back) */}
      <path d="M6 55C10 35 22 21 37 21c13 0 21 16 24 34H6z" fill="#FFA000" stroke="#FF8F00" strokeWidth="0.8" />

      {/* Main Foreground Sand Mound */}
      <path
        d="M3 56C9 31 20 14 33 14c13 0 23 17 28 42H3z"
        fill="#FFC107"
        stroke="#FFB300"
        strokeWidth="1"
      />

      {/* Sunlit Highlight Side */}
      <path
        d="M3 56C9 31 20 14 33 14c3 0 6 3 8 7l-9 35H3z"
        fill="#FFD54F"
      />

      {/* Layered Dune Ridge Waves */}
      <path d="M11 53C18 43 25 38 34 38c9 0 16 5 23 15" stroke="#FFE082" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M17 45C22 38 27 34 34 34c6 0 11 3 17 11" stroke="#FF8F00" strokeWidth="2.2" strokeLinecap="round" />

      {/* High-Contrast Sand Grains */}
      <circle cx="33" cy="18" r="1.6" fill="#FFF9C4" />
      <circle cx="28" cy="24" r="1.4" fill="#FFF9C4" />
      <circle cx="39" cy="23" r="1.4" fill="#E65100" />
      <circle cx="23" cy="33" r="1.3" fill="#FFF9C4" />
      <circle cx="34" cy="29" r="1.6" fill="#E65100" />
      <circle cx="43" cy="31" r="1.3" fill="#FFF9C4" />
      <circle cx="15" cy="48" r="1.4" fill="#FFF9C4" />
      <circle cx="31" cy="44" r="1.5" fill="#BF360C" />
      <circle cx="47" cy="46" r="1.4" fill="#FFF9C4" />

      {/* Red Construction Shovel Planted in Sand */}
      <g transform="translate(20, 7) rotate(-22)">
        {/* Shovel blade */}
        <path d="M11 21L21 5L31 21C27 25 15 25 11 21Z" fill="#ECEFF1" stroke="#37474F" strokeWidth="1.2" />
        <polygon points="17,14 21,5 25,14 21,21" fill="#B0BEC5" />
        {/* Steel shaft */}
        <path d="M21 21V33" stroke="#263238" strokeWidth="3.2" strokeLinecap="round" />
        {/* Red D-handle */}
        <rect x="17.5" y="32" width="7" height="5.5" rx="2" fill="#D32F2F" stroke="#B71C1C" strokeWidth="1" />
        <circle cx="21" cy="34.8" r="1.2" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

/**
 * 5. Stone/Aggregate
 * 20mm Crushed Blue Metal Granite Rocks (Gitti)
 * Multi-faceted geometric crystal planes with high-contrast sunlight highlights
 */
export function StoneAggregateIcon({ size = 56, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      {/* Ground Cast Shadow */}
      <ellipse cx="32" cy="57" rx="28" ry="5.5" fill="#1C2833" fillOpacity="0.32" />

      {/* Small Rock (Left) */}
      <g>
        <polygon points="4,43 14,32 23,38 18,52 7,50" fill="#607D8B" stroke="#37474F" strokeWidth="0.8" />
        <polygon points="4,43 14,32 16,43" fill="#CFD8DC" />
        <polygon points="16,43 23,38 18,52" fill="#37474F" />
      </g>

      {/* Small Rock (Right) */}
      <g>
        <polygon points="41,43 51,33 61,42 56,53 45,51" fill="#607D8B" stroke="#37474F" strokeWidth="0.8" />
        <polygon points="41,43 51,33 50,45" fill="#CFD8DC" />
        <polygon points="50,45 61,42 56,53 45,51" fill="#37474F" />
      </g>

      {/* Main Massive Blue-Metal Granite Rock (Center) */}
      <g>
        {/* Top Facet (Peak Sunlight Highlight) */}
        <polygon points="26,9 44,13 36,27 17,21" fill="#ECEFF1" stroke="#FFFFFF" strokeWidth="1" />
        {/* Right Facet (Midtone Blue Slate) */}
        <polygon points="44,13 55,29 46,48 36,27" fill="#78909C" stroke="#546E7A" strokeWidth="0.8" />
        {/* Left Upper Face */}
        <polygon points="26,9 17,21 9,35 15,45 28,40 36,27" fill="#B0BEC5" stroke="#78909C" strokeWidth="0.8" />
        {/* Bottom Shaded Deep Basalt Face */}
        <polygon points="15,45 28,40 36,27 46,48 33,55 17,52" fill="#37474F" stroke="#263238" strokeWidth="0.8" />

        {/* Crisp White Crystal Edge Ridges */}
        <line x1="26" y1="9" x2="36" y2="27" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="36" y1="27" x2="46" y2="48" stroke="#ECEFF1" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="17" y1="21" x2="36" y2="27" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * 6. Tiles/Marbles
 * Polished Calacatta Gold Marble Slab & Glazed Emerald Wall Tiles with high-gloss sparkle
 */
export function TilesMarblesIcon({ size = 56, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      {/* Ground Cast Shadow */}
      <ellipse cx="32" cy="58" rx="26" ry="4.5" fill="#00332C" fillOpacity="0.25" />

      {/* Tile 1: Top-Left (Glossy Emerald Ceramic) */}
      <g>
        <rect x="6" y="8" width="24" height="24" rx="4" fill="#00897B" stroke="#004D40" strokeWidth="1.5" />
        <rect x="8" y="10" width="20" height="3.5" rx="1.5" fill="#FFFFFF" fillOpacity="0.6" />
        <path d="M10 12L28 30" stroke="#E0F2F1" strokeWidth="2.5" strokeOpacity="0.45" strokeLinecap="round" />
      </g>

      {/* Tile 2: Top-Right (Calacatta White & Gold Marble) */}
      <g>
        <rect x="34" y="8" width="24" height="24" rx="4" fill="#FFFFFF" stroke="#90A4AE" strokeWidth="1.5" />
        {/* Prominent Marble Veins */}
        <path d="M37 12C41 18 47 21 55 29" stroke="#78909C" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M43 11C46 15 49 18 52 20" stroke="#FFB300" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M38 23C42 25 46 28 48 31" stroke="#90A4AE" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Tile 3: Bottom-Left (Calacatta White & Slate Marble) */}
      <g>
        <rect x="6" y="34" width="24" height="24" rx="4" fill="#FFFFFF" stroke="#90A4AE" strokeWidth="1.5" />
        <path d="M9 51C16 46 23 44 29 43" stroke="#78909C" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M15 44C20 42 25 40 29 38" stroke="#FFB300" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Tile 4: Bottom-Right (Royal Onyx Gold) */}
      <g>
        <rect x="34" y="34" width="24" height="24" rx="4" fill="#FFA000" stroke="#E65100" strokeWidth="1.5" />
        <rect x="36" y="36" width="20" height="3.5" rx="1.5" fill="#FFFFFF" fillOpacity="0.5" />
        <path d="M38 38L56 56" stroke="#FFF8E1" strokeWidth="2.5" strokeOpacity="0.55" strokeLinecap="round" />
      </g>

      {/* Center Glaze Sparkle Flare */}
      <g transform="translate(32, 22)">
        <polygon points="0,-8 2.5,-2.5 8,0 2.5,2.5 0,8 -2.5,2.5 -8,0 -2.5,-2.5" fill="#FFFFFF" />
        <circle cx="0" cy="0" r="3" fill="#FFD54F" />
      </g>
    </svg>
  );
}

/**
 * 7. Paints
 * Realistic Asian Paints Style Bucket with Blue Band, Overflowing Glossy Red Paint & Sponge Roller
 */
export function PaintsIcon({ size = 56, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      {/* Ground Cast Shadow */}
      <ellipse cx="27" cy="57" rx="23" ry="5" fill="#263238" fillOpacity="0.28" />

      {/* Paint Bucket Outer Tin */}
      <ellipse cx="27" cy="20" rx="19" ry="6.5" fill="#CFD8DC" stroke="#78909C" strokeWidth="1.2" />
      <path
        d="M8 20L14 53c.5 2.5 3 4 6 4h14c3 0 5.5-1.5 6-4L46 20"
        fill="#ECEFF1"
        stroke="#78909C"
        strokeWidth="1.2"
      />

      {/* Commercial Blue Label Strip */}
      <path d="M9.8 28L13 46h28l3.2-18H9.8z" fill="#0288D1" stroke="#01579B" strokeWidth="0.8" />
      <rect x="17" y="33.5" width="20" height="6.5" rx="1.5" fill="#FFFFFF" />
      <text x="27" y="38.5" textAnchor="middle" fill="#D50000" fontSize="4.2" fontWeight="900" fontFamily="sans-serif">
        PAINTS
      </text>

      {/* Liquid Red Paint Pool Inside */}
      <ellipse cx="27" cy="20" rx="16.5" ry="5.5" fill="#D50000" />
      <ellipse cx="25" cy="19" rx="7" ry="2.2" fill="#FF8A80" />

      {/* Overflowing Paint Spill & Droplets */}
      <path
        d="M13 21c2 5 4 14 3 21a3 3 0 1 1-6 0c0-7-1-15 3-21z"
        fill="#D50000"
        stroke="#FF1744"
        strokeWidth="0.8"
      />
      <circle cx="13" cy="47" r="2.5" fill="#D50000" />

      {/* Steel Wire Handle */}
      <path d="M8 20C8 9 27 6 27 6s19 3 19 14" stroke="#455A64" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <rect x="22.5" y="5" width="9" height="3.5" rx="1.5" fill="#263238" />

      {/* Ergonomic Yellow Sponge Paint Roller */}
      <g transform="translate(33, 5) rotate(20)">
        <rect x="0" y="0" width="21" height="9.5" rx="4" fill="#FFC107" stroke="#FFA000" strokeWidth="1" />
        <rect x="0" y="5.5" width="21" height="4" rx="2" fill="#D50000" />
        <path d="M10.5 9.5v8h-6v15" stroke="#37474F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="1.5" y="27" width="6.5" height="14" rx="3" fill="#D50000" stroke="#900" strokeWidth="1" />
      </g>
    </svg>
  );
}

/**
 * 8. Plumbing
 * Chrome CPVC Pipe Elbow with Brass Turn Valve & Glistening 3D Water Droplet
 */
export function PlumbingIcon({ size = 56, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      {/* Ground Cast Shadow */}
      <ellipse cx="32" cy="57" rx="26" ry="4.5" fill="#0D47A1" fillOpacity="0.25" />

      {/* Horizontal Inflow Pipe */}
      <rect x="4" y="21" width="24" height="13" rx="2" fill="#B0BEC5" stroke="#546E7A" strokeWidth="1" />
      <rect x="4" y="24" width="24" height="3" fill="#FFFFFF" fillOpacity="0.8" />
      <rect x="3" y="18" width="5" height="19" rx="2" fill="#78909C" stroke="#37474F" strokeWidth="1" />

      {/* 90-Degree Curved Elbow Joint */}
      <path
        d="M26 21h9a9 9 0 0 1 9 9v17h-13V32a2 2 0 0 0-2-2h-3v-9z"
        fill="#90A4AE"
        stroke="#546E7A"
        strokeWidth="1"
      />
      <rect x="29" y="44" width="17" height="4.5" rx="1.5" fill="#78909C" stroke="#37474F" strokeWidth="1" />

      {/* Heavy Brass Gate Valve Dial (Top) */}
      <rect x="22" y="13" width="9" height="9" rx="2" fill="#FFA000" stroke="#E65100" strokeWidth="1" />
      <ellipse cx="26.5" cy="10" rx="11" ry="4" fill="#FFC107" stroke="#D84315" strokeWidth="1.2" />
      <circle cx="26.5" cy="10" r="3" fill="#D84315" />

      {/* 3D Crystal Blue Water Droplet */}
      <g>
        <path
          d="M37 35C37 30 47.5 16 47.5 16s10.5 14 10.5 19a10.5 10.5 0 0 1-21 0z"
          fill="#00B0FF"
          stroke="#0091EA"
          strokeWidth="1.2"
        />
        <path
          d="M39 35C39 31 47.5 19 47.5 19s8.5 12 8.5 16a8.5 8.5 0 0 1-17 0z"
          fill="#40C4FF"
        />
        {/* Curving Highlight Reflection */}
        <ellipse cx="44" cy="33" rx="3" ry="5.5" transform="rotate(-28 44 33)" fill="#FFFFFF" fillOpacity="0.85" />
        <circle cx="53" cy="40" r="1.8" fill="#FFFFFF" fillOpacity="0.9" />
      </g>
    </svg>
  );
}

/**
 * 9. Electricals
 * Radiant 3D Lightning Spark Bolt with Industrial Orange 3-Pin Heavy-Duty Plug
 */
export function ElectricalsIcon({ size = 56, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      {/* Ground Cast Shadow */}
      <ellipse cx="32" cy="57" rx="24" ry="4.5" fill="#BF360C" fillOpacity="0.25" />

      {/* Industrial 3-Pin Electrical Plug (Left Foreground) */}
      <g transform="translate(8, 26)">
        {/* Plug Body */}
        <rect x="4" y="9" width="18" height="18" rx="5" fill="#FF6D00" stroke="#BF360C" strokeWidth="1.2" />
        <rect x="7" y="11" width="12" height="4" rx="2" fill="#FFA000" />
        {/* Solid Brass Pins */}
        <rect x="6.5" y="1" width="4" height="9" rx="1.5" fill="#FFD54F" stroke="#E65100" strokeWidth="1" />
        <rect x="15.5" y="1" width="4" height="9" rx="1.5" fill="#FFD54F" stroke="#E65100" strokeWidth="1" />
        <rect x="11" y="-2.5" width="4" height="8.5" rx="1.8" fill="#FFD54F" stroke="#E65100" strokeWidth="1" />
        {/* Heavy Black Cable */}
        <path d="M13 27v8a5 5 0 0 0 5 5h4" stroke="#212121" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      </g>

      {/* 3D High-Voltage Lightning Energy Bolt */}
      <g>
        {/* Outer Orange/Red Flame Edge */}
        <polygon
          points="37,4 17,31 33,31 27,59 55,23 39,23"
          fill="#FFD600"
          stroke="#FF6D00"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Pure White/Yellow Radiant Core */}
        <polygon points="37,8 22,30 34,30 30,51 49,25 38,25" fill="#FFF9C4" />
        <polygon points="37,11 25,29 33,29 31,45 44,26 38,26" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

/**
 * 10. Statues
 * 3D Golden Bronze Sculpted Architectural Idol / Bust on Stepped Granite Pedestal
 */
export function StatuesIcon({ size = 56, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      {/* Ground Cast Shadow */}
      <ellipse cx="32" cy="58" rx="25" ry="4.5" fill="#3E2723" fillOpacity="0.3" />

      {/* Stepped Granite Pedestal Base */}
      <rect x="7" y="50" width="50" height="7" rx="2" fill="#546E7A" stroke="#37474F" strokeWidth="1" />
      <polygon points="11,50 16,43 48,43 53,50" fill="#78909C" stroke="#455A64" strokeWidth="1" />
      <rect x="16" y="40" width="32" height="4" rx="1" fill="#B0BEC5" stroke="#78909C" strokeWidth="0.8" />

      {/* Sculpted Golden Bronze Idol / Statue */}
      <g>
        {/* Ornate Crown / Mukut */}
        <polygon points="32,4 38,12 34,14 32,11 30,14 26,12" fill="#FFEA00" stroke="#F57F17" strokeWidth="1" />
        <circle cx="32" cy="7.5" r="1.5" fill="#D50000" />

        {/* Head */}
        <circle cx="32" cy="18" r="9" fill="#FFC107" stroke="#FFA000" strokeWidth="1.2" />
        <ellipse cx="30" cy="17" rx="3" ry="4" fill="#FFFDE7" fillOpacity="0.75" />

        {/* Halo / Aura Ring */}
        <circle cx="32" cy="18" r="12" stroke="#FFD54F" strokeWidth="1.8" strokeDasharray="3 2" fill="none" />

        {/* Sculpted Shoulders & Ornate Torso */}
        <path
          d="M16 40C16 30 22 25 32 25s16 5 16 15v2H16v-2z"
          fill="#FFA000"
          stroke="#E65100"
          strokeWidth="1.2"
        />

        {/* Royal Garland & Neck Ornaments */}
        <path d="M21 32c3 6 19 6 22 0" stroke="#FFF9C4" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M23 37c2 5 14 5 18 0" stroke="#BF360C" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

/**
 * 11. Cement Articles
 * Realistic Precast RCC Concrete Hume Well Ring with Deep Hollow Cavity & Interlocking Red Paver Block
 */
export function CementArticlesIcon({ size = 56, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} {...props}>
      {/* Ground Cast Shadow */}
      <ellipse cx="32" cy="58" rx="27" ry="5" fill="#263238" fillOpacity="0.32" />

      {/* Precast Concrete Well Ring Cylinder */}
      <g>
        {/* Outer Cylinder Wall Depth */}
        <path
          d="M7 19v20c0 8 11.2 13 25 13s25-5 25-13V19"
          fill="#78909C"
          stroke="#455A64"
          strokeWidth="1.2"
        />
        {/* Left cylinder highlight face */}
        <path
          d="M7 19v20c0 8 11.2 13 25 13V19C18.2 19 7 19 7 19z"
          fill="#90A4AE"
        />

        {/* Cylinder Top Rim Surface (Concrete Texture) */}
        <ellipse cx="32" cy="19" rx="25" ry="10.5" fill="#CFD8DC" stroke="#78909C" strokeWidth="1.4" />

        {/* Deep Hollow Interior Cavity */}
        <ellipse cx="32" cy="19" rx="14.5" ry="6" fill="#263238" stroke="#1A2226" strokeWidth="1.2" />

        {/* Mold Ribbed Ring Feature Line */}
        <path d="M7 29c0 8 11.2 13 25 13s25-5 25-13" stroke="#ECEFF1" strokeWidth="2" strokeOpacity="0.8" fill="none" />
      </g>

      {/* Interlocking Red Paver Block (Resting in Front) */}
      <g transform="translate(32, 38)">
        <polygon points="0,7 11,0 26,6 15,13" fill="#FF7043" stroke="#FFAB91" strokeWidth="1" />
        <polygon points="0,7 15,13 15,19 0,13" fill="#D84315" />
        <polygon points="15,13 26,6 26,12 15,19" fill="#992605" />
      </g>
    </svg>
  );
}
