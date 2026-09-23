import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-brand-gradient text-white shadow-lg shadow-violet-500/25 hover:brightness-110 active:scale-[0.98]",
        secondary:
          "bg-accent-soft text-accent hover:bg-violet-100 active:bg-violet-200",
        outline:
          "border border-white/70 bg-white/70 text-foreground shadow-sm backdrop-blur hover:bg-white active:bg-violet-50",
        ghost:
          "text-slate-600 hover:bg-white/60 hover:text-accent active:bg-white/80",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
      },
      size: {
        default: "min-h-12 px-5 py-3",
        sm: "min-h-10 px-3.5 text-sm",
        lg: "min-h-14 px-7 text-base",
        icon: "size-12 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
