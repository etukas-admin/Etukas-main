/**
 * QuantityControl – Renders the appropriate quantity UI based on the
 * product's QuantityConfig.
 *
 * Supported modes:
 *   • step  – increment / decrement buttons (cement bags, tiles, paints…)
 *   • bulk  – quick preset buttons + free-text input (bricks, sand…)
 */

import { useState, useCallback } from "react";
import { Minus, Plus } from "lucide-react";
import type { QuantityConfig } from "./cartTypes";
import { cn } from "../../lib/utils";

interface QuantityControlProps {
  config: QuantityConfig;
  value: number;
  onChange: (qty: number) => void;
  /** Disable all controls while a mutation is in-flight */
  disabled?: boolean;
  className?: string;
}

export function QuantityControl({ config, value, onChange, disabled, className }: QuantityControlProps) {
  if (config.type === "bulk") {
    return (
      <BulkQuantityControl
        config={config}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
      />
    );
  }

  // For "variants" type: fall back to step control using a synthesised step config.
  // Variant-level controls are managed per-item in CartItemCard (future enhancement).
  if (config.type === "variants") {
    // Build a minimal step config from the first variant as a fallback
    const firstVariant = config.variants[0];
    const stepConfig: Extract<QuantityConfig, { type: "step" }> = {
      type: "step",
      unit: config.unit,
      step: 1,
      min: firstVariant?.minOrderQuantity ?? 1,
      max: firstVariant?.stockQuantity,
    };
    return (
      <StepQuantityControl
        config={stepConfig}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
      />
    );
  }

  // step (default)
  return (
    <StepQuantityControl
      config={config}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
    />
  );
}

// ─── Step Control ─────────────────────────────────────────────────────────────

function StepQuantityControl({
  config,
  value,
  onChange,
  disabled,
  className,
}: QuantityControlProps & { config: Extract<QuantityConfig, { type: "step" }> }) {
  const canDecrease = !disabled && value - config.step >= config.min;
  const canIncrease = !disabled && (config.max === undefined || value + config.step <= config.max);
  const atMax = config.max !== undefined && value >= config.max;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => canDecrease && onChange(value - config.step)}
          disabled={!canDecrease}
          aria-label={`Decrease quantity by ${config.step}`}
          className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-gray-200 bg-gray-50 text-gray-600 transition hover:bg-etukas-pink hover:border-etukas-red hover:text-etukas-red disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={14} />
        </button>
        <div className="flex h-9 min-w-[3.5rem] items-center justify-center border-y border-gray-200 bg-white px-2 text-sm font-semibold tabular-nums text-etukas-black">
          {value}
        </div>
        <button
          type="button"
          onClick={() => canIncrease && onChange(value + config.step)}
          disabled={!canIncrease}
          aria-label={`Increase quantity by ${config.step}`}
          className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-gray-200 bg-gray-50 text-gray-600 transition hover:bg-etukas-pink hover:border-etukas-red hover:text-etukas-red disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>
      {atMax && (
        <p className="text-[11px] text-amber-600 font-medium">Max stock: {config.max}</p>
      )}
      <p className="text-[11px] text-gray-400">
        Min {config.min} {config.unit}
      </p>
    </div>
  );
}

// ─── Bulk Control ─────────────────────────────────────────────────────────────

function BulkQuantityControl({
  config,
  value,
  onChange,
  disabled,
  className,
}: QuantityControlProps & { config: Extract<QuantityConfig, { type: "bulk" }> }) {
  const [inputVal, setInputVal] = useState(String(value));
  const [inputError, setInputError] = useState<string | null>(null);

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseInt(raw.replace(/,/g, ""), 10);
      if (isNaN(parsed) || parsed < config.min) {
        setInputError(`Minimum is ${config.min.toLocaleString()} ${config.unit}s`);
        setInputVal(String(value));
        return;
      }
      if (config.max !== undefined && parsed > config.max) {
        setInputError(`Max stock is ${config.max.toLocaleString()} ${config.unit}s`);
        setInputVal(String(value));
        return;
      }
      // Snap to nearest step
      const snapped = Math.round(parsed / config.step) * config.step;
      const clamped = Math.max(config.min, snapped);
      setInputError(null);
      setInputVal(String(clamped));
      onChange(clamped);
    },
    [config, onChange, value]
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Quick select chips */}
      <div className="flex flex-wrap gap-1.5">
        {config.quickOptions.map((qty) => {
          const isSelected = value === qty;
          const isAvailable = config.max === undefined || qty <= config.max;
          return (
            <button
              key={qty}
              type="button"
              disabled={disabled || !isAvailable}
              onClick={() => {
                if (!isAvailable) return;
                setInputError(null);
                setInputVal(String(qty));
                onChange(qty);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                isSelected
                  ? "border-etukas-red bg-etukas-red text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-etukas-red hover:text-etukas-red",
                (!isAvailable || disabled) && "cursor-not-allowed opacity-40"
              )}
            >
              {qty >= 1000 ? `${(qty / 1000).toFixed(0)}k` : qty}
            </button>
          );
        })}
      </div>

      {/* Free-text input */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={inputVal}
          disabled={disabled}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit(inputVal)}
          placeholder="Custom qty"
          className={cn(
            "h-9 w-32 rounded-lg border px-3 text-sm font-medium tabular-nums outline-none transition",
            inputError
              ? "border-red-400 focus:ring-1 focus:ring-red-400"
              : "border-gray-200 focus:border-etukas-red focus:ring-1 focus:ring-etukas-red"
          )}
        />
        <span className="text-xs text-gray-500">{config.unit}s</span>
      </div>

      {inputError && <p className="text-[11px] font-medium text-red-500">{inputError}</p>}
      <p className="text-[11px] text-gray-400">
        Min {config.min.toLocaleString()} • Step {config.step.toLocaleString()} {config.unit}s
      </p>
    </div>
  );
}
