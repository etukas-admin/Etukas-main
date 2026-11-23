import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  RefreshCw,
  Share2
} from "lucide-react";
import { marketplaceApi, type TrackingLinkResponse } from "../../services/api";

interface SellerTrackingShareButtonProps {
  orderId: string;
  orderNumber?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  compact?: boolean;
  className?: string;
}

export function SellerTrackingShareButton({
  orderId,
  orderNumber,
  driverName,
  driverPhone,
  vehicleNumber,
  compact = false,
  className = ""
}: SellerTrackingShareButtonProps) {
  const [linkData, setLinkData] = useState<TrackingLinkResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: () =>
      marketplaceApi.generateOrderTrackingLink(orderId, {
        clientOrigin: typeof window !== "undefined" ? window.location.origin : undefined
      }),
    onSuccess: (data) => {
      setLinkData(data);
    }
  });

  const handleCopy = async () => {
    if (!linkData?.trackingUrl) return;
    try {
      await navigator.clipboard.writeText(linkData.trackingUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard fallback
      window.prompt("Copy Driver Tracking Link:", linkData.trackingUrl);
    }
  };

  const handleGenerateAndShare = async () => {
    try {
      const data = await generateMutation.mutateAsync();
      if (compact && data.whatsappShareUrl) {
        window.open(data.whatsappShareUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      // Handled via generateMutation.error
    }
  };

  const trackPath = `/track/${encodeURIComponent(orderNumber || orderId)}`;

  if (compact && !linkData) {
    return (
      <div className={`inline-flex flex-col items-end gap-1 ${className}`}>
        <button
          type="button"
          onClick={() => void handleGenerateAndShare()}
          disabled={generateMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition disabled:opacity-60"
          title="Generate live GPS link and share with truck driver via WhatsApp"
        >
          {generateMutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <MessageCircle size={13} />
          )}
          <span>{generateMutation.isPending ? "Generating..." : "Driver GPS Link"}</span>
        </button>
        {generateMutation.isError && (
          <span className="text-[10px] font-semibold text-red-600">
            {(generateMutation.error as Error)?.message || "Failed to create link"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-teal-50/50 p-4 space-y-3 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <Share2 size={16} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950">
              Live Vehicle GPS Tracking (No Driver App Needed)
            </h4>
            <p className="text-[11px] text-emerald-800/90 mt-0.5">
              Share this one-tap link on WhatsApp with{" "}
              <strong>{driverName || "your truck driver"}</strong>
              {vehicleNumber ? ` (${vehicleNumber})` : ""}. Tracking starts as soon as they tap{" "}
              <em>Start Trip</em>.
            </p>
          </div>
        </div>

        <Link
          to={trackPath}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition"
        >
          <MapPin size={12} />
          <span>View Live Map</span>
        </Link>
      </div>

      {!linkData ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition disabled:opacity-60"
          >
            {generateMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <MessageCircle size={14} />
            )}
            <span>
              {generateMutation.isPending
                ? "Creating Secure Driver Link..."
                : "Generate Driver Tracking Link"}
            </span>
          </button>
          {driverPhone && (
            <span className="text-[11px] font-mono font-semibold text-emerald-900">
              Driver WhatsApp: {driverPhone}
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Tracking URL preview + Copy */}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2">
            <input
              type="text"
              readOnly
              value={linkData.trackingUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full bg-transparent font-mono text-[11px] text-gray-800 focus:outline-none"
              aria-label="Driver live tracking URL"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] font-bold text-gray-800 hover:bg-gray-100 transition"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          {/* Primary WhatsApp Share + Regenerate */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={linkData.whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#1ebe5d] active:scale-95 transition"
            >
              <MessageCircle size={15} />
              <span>Share Link on WhatsApp</span>
              <ExternalLink size={12} />
            </a>

            <button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50 transition disabled:opacity-60"
              title="Generate a fresh link (invalidates previous link)"
            >
              <RefreshCw size={12} className={generateMutation.isPending ? "animate-spin" : ""} />
              <span>New Link</span>
            </button>

            <span className="text-[10px] text-emerald-800 font-medium">
              Valid for 24 hrs · Auto-closes on delivery
            </span>
          </div>
        </div>
      )}

      {generateMutation.isError && (
        <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
          {(generateMutation.error as Error)?.message || "Could not generate tracking link. Please try again."}
        </p>
      )}
    </div>
  );
}
