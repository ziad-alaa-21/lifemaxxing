import React from "react";
import { DESIGN_TOKENS } from "@/lib/design/tokens";

export interface BarbellSvgProps {
  /**
   * Actual barbell/load weight in kg for an exercise set (includes 20 kg bar).
   * If unset, zero, or less than 20 kg, an empty Olympic bar is drawn.
   */
  weightKg?: number | string | null;
  /**
   * When true, renders a decorative non-numeric barbell scaled by strength tier.
   * Used on the Body overall rank card.
   */
  decorative?: boolean;
  /**
   * Tier name for decorative mode: "Untrained" .. "Mr. Olympia".
   */
  tier?: string | null;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

interface PlateSpec {
  kg: number;
  height: number;
  width: number;
  fill: string;
  stroke: string;
}

const PLATES: readonly PlateSpec[] = [
  { kg: 25, height: 54, width: 7, fill: DESIGN_TOKENS.plates.plate25, stroke: DESIGN_TOKENS.plates.collar },
  { kg: 20, height: 50, width: 7, fill: DESIGN_TOKENS.plates.plate20, stroke: DESIGN_TOKENS.plates.collar },
  { kg: 15, height: 44, width: 6, fill: DESIGN_TOKENS.plates.plate15, stroke: DESIGN_TOKENS.plates.collar },
  { kg: 10, height: 38, width: 6, fill: DESIGN_TOKENS.plates.plate10, stroke: DESIGN_TOKENS.plates.collar },
  { kg: 5, height: 30, width: 5, fill: DESIGN_TOKENS.plates.plate5, stroke: "var(--color-border-medium)" },
  { kg: 2.5, height: 24, width: 4, fill: DESIGN_TOKENS.plates.plate2_5, stroke: DESIGN_TOKENS.plates.collar },
  { kg: 1.25, height: 18, width: 4, fill: DESIGN_TOKENS.plates.plate1_25, stroke: DESIGN_TOKENS.plates.collar },
];

/**
 * Decomposes real weight into Olympic plates per sleeve (greedy decomposition).
 * Olympic bar is 20 kg. If weight < 20 kg, returns empty array (empty bar).
 */
export function decomposeWeightToPlates(totalKg: number | string | null | undefined): PlateSpec[] {
  if (totalKg === null || totalKg === undefined || totalKg === "") return [];
  const num = typeof totalKg === "string" ? Number(totalKg) : totalKg;
  if (!Number.isFinite(num) || num < 20) return [];

  const barKg = 20;
  let perSide = Math.round(((num - barKg) / 2) * 100) / 100;
  const result: PlateSpec[] = [];

  for (const plate of PLATES) {
    while (perSide >= plate.kg - 0.001 && result.length < 10) {
      result.push(plate);
      perSide = Math.round((perSide - plate.kg) * 100) / 100;
    }
  }
  return result;
}

/**
 * Returns decorative plates for strength tiers (no numbers, aria-hidden).
 * More plates for higher tiers. Untrained shows an empty bar.
 */
export function decorativeTierPlates(tier: string | null | undefined): PlateSpec[] {
  if (!tier) return [];
  const p25 = PLATES[0];
  const p20 = PLATES[1];
  const p15 = PLATES[2];
  const p10 = PLATES[3];

  switch (tier) {
    case "Bronze":
      return [p10];
    case "Silver":
      return [p20, p10];
    case "Gold":
      return [p25, p15, p10];
    case "Platinum":
      return [p25, p20, p15, p10];
    case "Diamond":
      return [p25, p25, p20, p15, p10];
    case "Olympian":
      return [p25, p25, p25, p20, p15, p10];
    case "Mr. Olympia":
      return [p25, p25, p25, p25, p20, p15, p10];
    case "Untrained":
    default:
      return [];
  }
}

export function BarbellSvg({
  weightKg,
  decorative = false,
  tier,
  className = "w-full max-w-[260px] h-12",
  "aria-hidden": ariaHidden = true,
}: BarbellSvgProps) {
  const plates = decorative
    ? decorativeTierPlates(tier)
    : decomposeWeightToPlates(weightKg);

  return (
    <svg
      viewBox="0 0 340 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden ? "true" : undefined}
    >
      {/* Outer sleeves */}
      <rect x="10" y="31" width="84" height="8" rx="2" fill={DESIGN_TOKENS.plates.sleeve} />
      <rect x="246" y="31" width="84" height="8" rx="2" fill={DESIGN_TOKENS.plates.sleeve} />

      {/* Center knurled shaft */}
      <rect x="100" y="32" width="140" height="6" rx="2" fill={DESIGN_TOKENS.plates.shaft} />
      <rect x="124" y="32" width="28" height="6" fill={DESIGN_TOKENS.plates.collar} fillOpacity="0.4" />
      <rect x="188" y="32" width="28" height="6" fill={DESIGN_TOKENS.plates.collar} fillOpacity="0.4" />

      {/* Inner sleeve collars */}
      <rect x="94" y="23" width="6" height="24" rx="2" fill={DESIGN_TOKENS.plates.collar} />
      <rect x="240" y="23" width="6" height="24" rx="2" fill={DESIGN_TOKENS.plates.collar} />

      {/* Symmetric Plates */}
      {plates.map((plate, idx) => {
        const offset = plates.slice(0, idx).reduce((acc, p) => acc + p.width + 1.5, 0);
        const leftX = 94 - offset - plate.width - 1.5;
        const rightX = 246 + offset + 1.5;
        const y = 35 - plate.height / 2;

        return (
          <g key={idx}>
            <rect
              x={leftX}
              y={y}
              width={plate.width}
              height={plate.height}
              rx="2"
              fill={plate.fill}
              stroke={plate.stroke}
              strokeWidth="0.75"
            />
            <rect
              x={rightX}
              y={y}
              width={plate.width}
              height={plate.height}
              rx="2"
              fill={plate.fill}
              stroke={plate.stroke}
              strokeWidth="0.75"
            />
          </g>
        );
      })}
    </svg>
  );
}
