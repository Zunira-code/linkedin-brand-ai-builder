import { cn } from "@/lib/utils";
import markSrc from "@/assets/nia-studio-logo.png";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={markSrc}
        alt="Nia Studio"
        className="h-8 w-8 rounded-xl object-cover shadow-glow"
      />
      {showText && (
        <span className="font-display text-lg font-semibold tracking-tight">Nia Studio</span>
      )}
    </div>
  );
}
