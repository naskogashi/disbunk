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

const variantGlow: Record<string, string> = {
  default: "",
  success: "dark:shadow-[0_0_12px_hsl(160_64%_40%/0.1)]",
  destructive: "dark:shadow-[0_0_12px_hsl(0_84%_60%/0.1)]",
  warning: "dark:shadow-[0_0_12px_hsl(38_92%_50%/0.1)]",
  primary: "dark:shadow-[0_0_12px_hsl(189_94%_43%/0.1)]",
};

export function StatCard({ title, value, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <Card className={`border-border border-t-2 ${variantBorder[variant]} ${variantGlow[variant]} card-hover`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-widest">{title}</p>
            <p className={`text-2xl font-bold font-mono tabular-nums ${variantText[variant]}`}>{value}</p>
            {trend && (
              <p className="text-xs text-muted-foreground font-mono">{trend}</p>
            )}
          </div>
          <div className="rounded-md bg-accent/50 p-2">
            <Icon className={`h-4 w-4 ${variantText[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
