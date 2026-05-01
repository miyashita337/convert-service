"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ImageCompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeSize: number; // bytes
  afterSize: number; // bytes
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

import { formatFileSize } from "@/lib/format";

export function ImageCompareSlider({
  beforeSrc,
  afterSrc,
  beforeSize,
  afterSize,
  beforeLabel = "Original",
  afterLabel = "Converted",
  className,
}: ImageCompareSliderProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isLoading = !beforeLoaded || !afterLoaded;
  const reduction = beforeSize > 0 ? ((beforeSize - afterSize) / beforeSize) * 100 : 0;
  const isSmaller = afterSize < beforeSize;

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(percent);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    },
    [isDragging, updatePosition],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 2;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPosition((prev) => Math.max(0, prev - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPosition((prev) => Math.min(100, prev + step));
    }
  }, []);

  // Reset loaded state when src changes
  useEffect(() => {
    setBeforeLoaded(false);
  }, [beforeSrc]);

  useEffect(() => {
    setAfterLoaded(false);
  }, [afterSrc]);

  return (
    <div className={cn("w-full", className)} data-testid="image-compare-slider">
      {/* Size reduction badge */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
            isSmaller
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
          )}
        >
          {isSmaller ? `-${Math.abs(reduction).toFixed(1)}%` : `+${Math.abs(reduction).toFixed(1)}%`}
          {isSmaller ? " smaller" : " larger"}
        </span>
      </div>

      {/* Slider container */}
      <div
        ref={containerRef}
        role="slider"
        aria-label="Image comparison slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        tabIndex={0}
        className={cn(
          "relative w-full overflow-hidden rounded-lg border border-border select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        {/* Skeleton loading */}
        {isLoading && (
          <div className="aspect-video w-full animate-pulse bg-muted flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
          </div>
        )}

        {/* Before image (full width, bottom layer) */}
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className={cn("block w-full h-auto", isLoading && "sr-only")}
          draggable={false}
          onLoad={() => setBeforeLoaded(true)}
        />

        {/* After image (clipped, top layer) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={afterSrc}
            alt={afterLabel}
            className="block w-full h-auto"
            draggable={false}
            onLoad={() => setAfterLoaded(true)}
          />
        </div>

        {/* Labels overlay */}
        {!isLoading && (
          <>
            {/* Before label + size (top-left) */}
            <div className="absolute top-3 left-3 pointer-events-none">
              <span className="inline-flex flex-col items-start rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
                <span className="font-medium">{beforeLabel}</span>
                <span className="opacity-80">{formatFileSize(beforeSize)}</span>
              </span>
            </div>

            {/* After label + size (top-right) */}
            <div className="absolute top-3 right-3 pointer-events-none">
              <span className="inline-flex flex-col items-end rounded bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
                <span className="font-medium">{afterLabel}</span>
                <span className="opacity-80">{formatFileSize(afterSize)}</span>
              </span>
            </div>
          </>
        )}

        {/* Slider divider line + handle */}
        {!isLoading && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)] pointer-events-none"
            style={{ left: `${position}%`, transform: "translateX(-50%)" }}
          >
            {/* Drag handle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-md border border-border">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-muted-foreground"
              >
                <path
                  d="M4.5 3L1 8l3.5 5M11.5 3L15 8l-3.5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
