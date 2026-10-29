import React, { useState, useEffect, useRef, useCallback } from "react";
import { Crop, RotateCw, RotateCcw, ZoomIn, ZoomOut, Check, X, Move, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/Button";

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

export function ImageCropModal({
  isOpen,
  imageSrc,
  onCropComplete,
  onCancel
}: ImageCropModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgNatural, setImgNatural] = useState<{ width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Viewport square size
  const VIEWPORT_SIZE = 300;

  // Reset controls whenever a new image is loaded
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, imageSrc]);

  // Load natural dimensions of the image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      setImgNatural({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Pan handlers (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Pan handlers (Touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Generate 1:1 cropped canvas
  const handleApplyCrop = () => {
    if (!imageSrc || !imgRef.current) return;
    const img = imgRef.current;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    if (!naturalW || !naturalH) return;

    const OUTPUT_SIZE = 800; // 800x800 square
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill white background for clean product presentation
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Coordinate transform matching the preview
    // 1. Center of canvas
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

    // 2. Proportional pan translation
    const scaleRatio = OUTPUT_SIZE / VIEWPORT_SIZE;
    ctx.translate(pan.x * scaleRatio, pan.y * scaleRatio);

    // 3. Rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // 4. Calculate cover scale
    // When rotated 90 or 270, effective natural width/height flip
    const isSideways = rotation === 90 || rotation === 270;
    const effectiveW = isSideways ? naturalH : naturalW;
    const effectiveH = isSideways ? naturalW : naturalH;

    const baseCoverScale = Math.max(VIEWPORT_SIZE / effectiveW, VIEWPORT_SIZE / effectiveH);
    const drawScale = baseCoverScale * zoom * scaleRatio;

    const drawW = naturalW * drawScale;
    const drawH = naturalH * drawScale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    // Export with quality check under 500 KB
    let resultBase64 = canvas.toDataURL("image/jpeg", 0.9);
    if (resultBase64.length * 0.75 > 490 * 1024) {
      resultBase64 = canvas.toDataURL("image/jpeg", 0.78);
    }

    onCropComplete(resultBase64);
  };

  if (!isOpen || !imageSrc) return null;

  // Base cover scale for the on-screen preview
  const isSideways = rotation === 90 || rotation === 270;
  const naturalW = imgNatural?.width ?? 400;
  const naturalH = imgNatural?.height ?? 400;
  const effectiveW = isSideways ? naturalH : naturalW;
  const effectiveH = isSideways ? naturalW : naturalH;
  const baseScale = Math.max(VIEWPORT_SIZE / effectiveW, VIEWPORT_SIZE / effectiveH);
  const displayW = naturalW * baseScale;
  const displayH = naturalH * baseScale;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-md bg-gray-900 border border-gray-700 text-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-gray-950/60">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
              <Crop size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Crop & Adjust Photo
                <span className="rounded-full bg-orange-500/20 text-orange-400 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                  1:1 Ratio
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Fit your product inside the square card frame
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Crop Viewport */}
        <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-black/40">
          <div
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
            className={`relative overflow-hidden rounded-xl bg-neutral-950 border-2 border-white/80 shadow-2xl select-none touch-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {/* Image layer */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px)`
              }}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                style={{
                  width: `${displayW}px`,
                  height: `${displayH}px`,
                  maxWidth: "none",
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.05s ease-out"
                }}
                className="select-none pointer-events-none object-cover"
              />
            </div>

            {/* Rule-of-thirds grid overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/25"></div>
              <div className="border-r border-b border-white/25"></div>
              <div className="border-b border-white/25"></div>
              <div className="border-r border-b border-white/25"></div>
              <div className="border-r border-b border-white/25"></div>
              <div className="border-b border-white/25"></div>
              <div className="border-r border-white/25"></div>
              <div className="border-r border-white/25"></div>
              <div></div>
            </div>

            {/* Corner Bracket Accents */}
            <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-orange-400 pointer-events-none"></div>
            <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-orange-400 pointer-events-none"></div>
            <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-orange-400 pointer-events-none"></div>
            <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-orange-400 pointer-events-none"></div>

            {/* Subtle drag hint overlay at bottom */}
            <div className="absolute bottom-1.5 inset-x-0 flex justify-center pointer-events-none">
              <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-gray-300 backdrop-blur-sm">
                <Move size={10} className="text-orange-400" /> Drag to adjust
              </span>
            </div>
          </div>

          {/* Quick instructions */}
          <p className="mt-2 text-center text-[11px] text-gray-400">
            Center product inside the square • Buyers see this exact view
          </p>
        </div>

        {/* Interactive Controls */}
        <div className="px-5 py-3.5 space-y-3 bg-gray-950/70 border-t border-gray-800">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(1, +(prev - 0.1).toFixed(2)))}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, +(prev + 0.1).toFixed(2)))}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <span className="w-12 text-right font-mono text-xs text-orange-400 font-semibold">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Tool buttons: Rotate & Reset */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <RotateCw size={13} className="text-orange-400" /> Rotate 90°
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <RotateCcw size={13} className="text-gray-400" /> Reset
              </button>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <Sparkles size={11} /> Auto 1:1 Card Fit
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-800 bg-gray-900">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApplyCrop}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold inline-flex items-center gap-1.5 shadow-md shadow-orange-500/20"
          >
            <Check size={16} /> Save & Apply Crop
          </Button>
        </div>
      </div>
    </div>
  );
}
