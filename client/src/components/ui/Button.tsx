import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ children, className, variant = "primary", ...props }: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-etukas-red text-white hover:bg-red-700",
        variant === "secondary" && "border border-gray-200 bg-white text-etukas-black hover:bg-gray-50",
        variant === "ghost" && "bg-transparent text-etukas-black hover:bg-etukas-pink",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
