"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "atlas-label text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      style={{
        fontFamily: 'var(--font-sans)',
        letterSpacing: 'var(--tracking-normal)',
        color: 'hsl(var(--foreground))'
      }}
      {...props}
    />
  )
);

Label.displayName = "Label";

export { Label };