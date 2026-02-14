import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  variant?: "default" | "primary" | "accent" | "warning" | "success";
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary/10 border-primary/20",
  accent: "bg-accent/10 border-accent/20",
  warning: "bg-warning/10 border-warning/20",
  success: "bg-success/10 border-success/20",
};

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/20 text-primary",
  accent: "bg-accent/20 text-accent",
  warning: "bg-warning/20 text-warning",
  success: "bg-success/20 text-success",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  variant = "default",
}: StatCardProps) {
  return (
    <div className={cn("stat-card animate-fade-in", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trendUp ? "text-success" : "text-destructive",
              )}
            >
              {trend}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconStyles[variant])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
