"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ progress, label, className }: ProgressBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
