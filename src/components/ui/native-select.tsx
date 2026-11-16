import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div
      data-slot="native-select-wrapper"
      className="group/native-select relative w-full has-[select:disabled]:opacity-50"
    >
      <select
        data-slot="native-select"
        className={cn(
          "border-input bg-background text-foreground selection:bg-primary selection:text-primary-foreground h-11 w-full appearance-none rounded-md border px-3 py-2 pr-9 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive cursor-pointer",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-70"
      />
    </div>
  );
}

export { NativeSelect };
