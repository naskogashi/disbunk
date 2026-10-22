import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "success" | "destructive" | "warning" | "primary";
}

const variantBorder: Record<string, string> = {
  default: "border-t-muted-foreground/30",
  success: "border-t-success",
  destructive: "border-t-destructive",
  warning: "border-t-warning",
  primary: "border-t-primary",
};

const variantText: Record<string, string> = {
  default: "text-foreground",
  success: "text-success",
  destructive: "text-destructive",
  warning: "text-warning",
  primary: "text-primary",
};

export function StatCard({ title, value, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <Card className={`rounded-2xl border-border border-t-2 ${variantBorder[variant]} card-hover shadow-none`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
            <p className={`text-4xl font-extrabold tabular-nums ${variantText[variant]}`}>{value}</p>
            {trend && (
              <p className="text-xs text-muted-foreground">{trend}</p>
            )}
          </div>
          <div className="rounded-xl bg-accent/50 p-3">
            <Icon className={`h-4 w-4 ${variantText[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
