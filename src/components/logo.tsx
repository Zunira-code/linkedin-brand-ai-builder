import { cn } from "@/lib/utils";
import markSrc from "@/assets/postpilot-mark.png";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={markSrc}
        alt="Postpilot"
        className="h-8 w-8 rounded-xl object-cover shadow-glow"
      />
      {showText && (
        <span className="font-display text-lg font-semibold tracking-tight">Postpilot</span>
      )}
    </div>
  );
}