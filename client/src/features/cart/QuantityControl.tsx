/**
 * QuantityControl – Renders the appropriate quantity UI based on the
 * product's QuantityConfig.
 *
 * Supported modes:
 *   • step  – increment / decrement buttons (cement bags, tiles, paints…)
 *   • bulk  – quick preset buttons + free-text input (bricks, sand…)
 */

import { useState, useCallback, useEffect } from "react";
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
  const [localInput, setLocalInput] = useState(String(value));

  useEffect(() => {
    setLocalInput(String(value));
  }, [value]);

  const canDecrease = !disabled && value - config.step >= config.min;
  const canIncrease = !disabled && (config.max === undefined || value + config.step <= config.max);
  const atMax = config.max !== undefined && value >= config.max;

  const commit = (raw: string) => {
    const parsed = parseInt(raw.replace(/\D/g, ""), 10);
    if (isNaN(parsed) || parsed < config.min) {
      setLocalInput(String(value));
      return;
    }
    const clamped = config.max !== undefined ? Math.min(parsed, config.max) : parsed;
    setLocalInput(String(clamped));
    onChange(clamped);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
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
        <input
          type="number"
          inputMode="numeric"
          value={localInput}
          disabled={disabled}
          onChange={(e) => setLocalInput(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit(localInput)}
          className="h-9 w-16 border-y border-gray-200 bg-white px-1 text-center text-sm font-bold tabular-nums text-etukas-black outline-none focus:bg-red-50/40"
        />
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

      {/* Quick bulk increment presets */}
      <div className="flex items-center gap-1">
        {[5, 10, 25, 50].map((delta) => {
          const target = value + delta;
          const allowed = config.max === undefined || target <= config.max;
          return (
            <button
              key={delta}
              type="button"
              disabled={disabled || !allowed}
              onClick={() => onChange(target)}
              className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 hover:border-etukas-red hover:bg-red-50 hover:text-etukas-red disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +{delta}
            </button>
          );
        })}
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

  useEffect(() => {
    setInputVal(String(value));
  }, [value]);

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
                "rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-95",
                isSelected
                  ? "border-etukas-red bg-etukas-red text-white shadow-xs"
                  : "border-gray-200 bg-white text-gray-700 hover:border-etukas-red hover:text-etukas-red",
                (!isAvailable || disabled) && "cursor-not-allowed opacity-40"
              )}
            >
              {qty >= 1000 ? `${(qty / 1000).toFixed(0)}k` : qty}
            </button>
          );
        })}
      </div>

      {/* Free-text input with +/- quick adjustments */}
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <button
            type="button"
            disabled={disabled || value <= config.min}
            onClick={() => {
              const next = Math.max(config.min, value - config.step);
              onChange(next);
            }}
            className="flex h-9 w-8 items-center justify-center rounded-l-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-etukas-red disabled:opacity-40"
          >
            <Minus size={13} />
          </button>
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
              "h-9 w-24 border-y border-gray-200 bg-white px-2 text-center text-sm font-bold tabular-nums outline-none transition",
              inputError
                ? "border-red-400 focus:ring-1 focus:ring-red-400"
                : "focus:border-etukas-red focus:ring-1 focus:ring-etukas-red"
            )}
          />
          <button
            type="button"
            disabled={disabled || (config.max !== undefined && value >= config.max)}
            onClick={() => {
              const next = config.max !== undefined ? Math.min(config.max, value + config.step) : value + config.step;
              onChange(next);
            }}
            className="flex h-9 w-8 items-center justify-center rounded-r-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-etukas-red disabled:opacity-40"
          >
            <Plus size={13} />
          </button>
        </div>
        <span className="text-xs text-gray-500 font-medium">{config.unit}s</span>
      </div>

      {inputError && <p className="text-[11px] font-medium text-red-500">{inputError}</p>}
      <p className="text-[11px] text-gray-400">
        Min {config.min.toLocaleString()} • Step {config.step.toLocaleString()} {config.unit}s
      </p>
    </div>
  );
}
