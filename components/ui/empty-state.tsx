import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center", className)}>
      {icon && <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      {action && (
        <button onClick={action.onClick}
          className="mt-4 text-sm font-medium text-primary hover:underline">
          {action.label}
        </button>
      )}
    </div>
  );
}
