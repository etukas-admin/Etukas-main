import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn("focus-ring h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none placeholder:text-gray-400", className)}
    {...props}
  />
));

Input.displayName = "Input";
