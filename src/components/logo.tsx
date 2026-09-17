import { cn } from "@/lib/utils";
import markSrc from "@/assets/nia-studio-logo.png";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={markSrc}
        alt="Nia Studio"
        width={639}
        height={178}
        className="h-8 w-auto object-contain"
      />
      {!showText && null}
    </div>
  );
}
