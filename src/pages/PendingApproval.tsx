import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Clock, XCircle, Ban, Mail, ArrowRight } from "lucide-react";
import type { ProfileStatus } from "@/types/database";

export function PendingApproval({ status }: { status: ProfileStatus | null }) {
  const { signOut, user } = useAuth();
  const { t } = useTranslation();
  const key = status ?? "pending_approval";

  const configs: Record<string, {
    icon: typeof Clock;
    titleKey: string;
    descKey: string;
    color: string;
    bgColor: string;
    showContact: boolean;
  }> = {
    pending_approval: {
      icon: Clock,
      titleKey: "auth.pendingTitle",
      descKey: "auth.pendingDesc",
      color: "text-warning",
      bgColor: "bg-warning/10",
      showContact: false,
    },
    rejected: {
      icon: XCircle,
      titleKey: "auth.rejectedTitle",
      descKey: "auth.rejectedDesc",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      showContact: true,
    },
    suspended: {
      icon: Ban,
      titleKey: "auth.suspendedTitle",
      descKey: "auth.suspendedDesc",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      showContact: true,
    },
  };

  const config = configs[key] ?? configs.pending_approval;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10 animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground text-lg tracking-tight">Disbunk.org</span>
      </div>

      {/* Status card */}
      <Card className="w-full max-w-md border-border animate-scale-in">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${config.bgColor} ${config.color}`}>
              <Icon className="h-10 w-10" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {t(config.titleKey)}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {t(config.descKey)}
            </p>
          </div>

          {/* Pending-specific info */}
          {key === "pending_approval" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-left p-4 rounded-lg bg-muted/50 border border-border">
                <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground">{t("auth.pendingEmailNote")}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                {t("auth.pendingWaiting")}
              </div>
            </div>
          )}

          {/* Contact link for rejected/suspended */}
          {config.showContact && (
            <a
              href="mailto:info@disbunk.org"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {t("auth.contactSupport")} <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}

          <Button variant="outline" onClick={signOut} className="w-full">
            {t("auth.signOut")}
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground mt-8 text-center max-w-md leading-relaxed">
        {t("common.footer")}
      </p>
    </div>
  );
}
