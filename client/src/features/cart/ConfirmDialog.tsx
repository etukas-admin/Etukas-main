/**
 * ConfirmDialog – A lightweight, accessible confirmation modal.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showDialog}
 *     title="Remove item?"
 *     description="This will remove the item from your cart."
 *     confirmLabel="Yes, remove"
 *     variant="danger"
 *     onConfirm={handleRemove}
 *     onCancel={() => setShowDialog(false)}
 *   />
 */

import { useEffect } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  // Trap focus / prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        {/* Icon */}
        <div
          className={cn(
            "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full",
            variant === "danger" ? "bg-red-50" : "bg-amber-50"
          )}
        >
          {variant === "danger" ? (
            <Trash2 size={22} className="text-etukas-red" />
          ) : (
            <AlertTriangle size={22} className="text-amber-500" />
          )}
        </div>

        <h2
          id="confirm-dialog-title"
          className="text-center text-base font-bold text-etukas-black"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-center text-sm text-gray-500">{description}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-50",
              variant === "danger"
                ? "bg-etukas-red hover:bg-red-700"
                : "bg-amber-500 hover:bg-amber-600"
            )}
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
