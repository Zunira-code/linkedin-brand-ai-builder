import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-brand-foreground">
          <path
            d="M4 20L12 4L20 20L12 15L4 20Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.9"
          />
        </svg>
      </div>
      {showText && (
        <span className="font-display text-lg font-semibold tracking-tight">Postpilot</span>
      )}
    </div>
  );
}