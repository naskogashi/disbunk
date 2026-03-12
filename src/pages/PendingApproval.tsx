import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock, XCircle, Ban } from "lucide-react";
import type { ProfileStatus } from "@/types/database";

const statusConfig: Record<string, { icon: typeof Clock; title: string; description: string; color: string }> = {
  pending_approval: {
    icon: Clock,
    title: "Account Pending Approval",
    description: "Your account is awaiting approval from an administrator. You'll receive an email once your account has been reviewed.",
    color: "text-warning",
  },
  rejected: {
    icon: XCircle,
    title: "Account Rejected",
    description: "Your account registration has been rejected. Please contact info@disbunk.org for more information.",
    color: "text-destructive",
  },
  suspended: {
    icon: Ban,
    title: "Account Suspended",
    description: "Your account has been suspended. Please contact info@disbunk.org for assistance.",
    color: "text-destructive",
  },
};

export function PendingApproval({ status }: { status: ProfileStatus | null }) {
  const { signOut } = useAuth();
  const config = statusConfig[status ?? "pending_approval"] ?? statusConfig.pending_approval;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-2 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground text-lg">Disbunk.org</span>
      </div>

      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-muted ${config.color}`}>
              <Icon className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-xl">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
          <Button variant="outline" onClick={signOut} className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
