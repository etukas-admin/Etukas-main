import { cn } from "../../lib/utils";

type LogoProps = {
  className?: string;
  compact?: boolean;
};

export function Logo({ className, compact = false }: LogoProps) {
  if (compact) {
    return (
      <img
        src="/favicon.png"
        alt="Etukas.com"
        className={cn("h-8 w-8 shrink-0 object-contain", className)}
      />
    );
  }

  return (
    <img
      src="/etukas-logo.png"
      alt="Etukas.com — Easy to build"
      className={cn(
        "h-10 w-auto max-w-[195px] object-contain sm:h-11 sm:max-w-[215px] lg:h-12 lg:max-w-[240px]",
        className
      )}
    />
  );
}
