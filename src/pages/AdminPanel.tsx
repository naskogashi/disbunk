import { displayDateTime } from "@/lib/locale";
import { AdminAccountList, type ManagedAccount } from "@/components/AdminAccountList";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, XCircle, Users, Shield, BarChart3, Loader2,
  Search, Ban, Trash2, Clock, FileText, Flag, ScrollText,
} from "lucide-react";
import type { Profile, AppRole } from "@/types/database";
import { ManageUserForm } from "@/components/ManageUserForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

/* ─── Types ─── */
interface PendingUser extends Profile { email?: string }

type ManagedUser = ManagedAccount;

interface AuditLogRow {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface FeatureFlagRow {
  key: string;
  value: unknown;
  updated_at: string;
}

/* ─── Main Component ─── */
export default function AdminPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<ManagedUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageUserOpen, setManageUserOpen] = useState(false);
  const [stats, setStats] = useState({ users: 0, claims: 0, teams: 0, evidence: 0 });

  const fetchData = async () => {
    const [pendingRes, usersRes, rolesRes, claimsCount, teamsCount, evidenceCount, logsRes, flagsRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("status", "pending_approval").is("deleted_at", null),
        supabase.from("profiles").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("claims").select("id", { count: "exact", head: true }),
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("evidence").select("id", { count: "exact", head: true }),
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("feature_flags").select("*").order("key"),
      ]);

    const failed = [pendingRes,usersRes,rolesRes,claimsCount,teamsCount,evidenceCount,logsRes,flagsRes].find(result=>result.error);
    if(failed?.error)toast({title:t("admin.error"),description:failed.error.message,variant:"destructive"});
    setPendingUsers(pendingRes.data ?? []);

    const rolesByUser = (rolesRes.data ?? []).reduce<Record<string, AppRole[]>>((acc, r) => {
      acc[r.user_id] = [...(acc[r.user_id] ?? []), r.role as AppRole];
      return acc;
    }, {});

    setAllUsers(
      (usersRes.data ?? []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_path: p.avatar_path,
        avatar_url: p.avatar_url,
        status: p.status,
        roles: rolesByUser[p.user_id] ?? [],
        created_at: p.created_at,
      }))
    );

    setStats({
      users: usersRes.data?.length ?? 0,
      claims: claimsCount.count ?? 0,
      teams: teamsCount.count ?? 0,
      evidence: evidenceCount.count ?? 0,
    });

    setAuditLogs(logsRes.data ?? []);
    setFeatureFlags(flagsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  /* ─── Actions ─── */
  const logAction = async (action: string, targetType: string | null, targetId: string | null, metadata: Record<string, unknown> = {}) => {
    if (!user) return;
    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
    });
  };

  const handleToggleFlag = async (key: string, currentValue: unknown) => {
    const newValue = !currentValue;
    const { error } = await supabase
      .from("feature_flags")
      .update({ value: newValue, updated_by: user?.id ?? null })
      .eq("key", key);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      await logAction("feature_flag_toggled", "feature_flag", null, { key, value: newValue });
      toast({ title: t("admin.flagUpdated") });
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2"><Dialog open={manageUserOpen} onOpenChange={setManageUserOpen}><DialogTrigger asChild><Button>{t("accounts.addUser")}</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{t("accounts.addUser")}</DialogTitle></DialogHeader><ManageUserForm onComplete={() => { setManageUserOpen(false); fetchData(); }} /></DialogContent></Dialog><Button asChild variant="outline"><Link to="/teams">{t("accounts.manageTeams")}</Link></Button></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users, value: stats.users, label: t("admin.totalUsers"), color: "primary" },
          { icon: FileText, value: stats.claims, label: t("admin.totalClaims"), color: "warning" },
          { icon: Shield, value: stats.teams, label: t("admin.totalTeams"), color: "success" },
          { icon: BarChart3, value: stats.evidence, label: t("admin.totalEvidence"), color: "primary" },
        ].map((s, i) => (
          <Card key={i} className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${s.color}/10`}>
                  <s.icon className={`h-5 w-5 text-${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            {t("admin.pendingApprovals")}
            {pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 text-xs">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">{t("admin.allUsers")}</TabsTrigger>
          <TabsTrigger value="flags">{t("admin.featureFlags")}</TabsTrigger>
          <TabsTrigger value="audit">{t("admin.auditLog")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4"><AdminAccountList users={allUsers.filter(row=>row.status==="pending_approval")} scope="pending" onChanged={fetchData}/></TabsContent>
        <TabsContent value="users" className="mt-4"><AdminAccountList users={allUsers} scope="all" onChanged={fetchData}/></TabsContent>

        {/* ─── Feature Flags ─── */}
        <TabsContent value="flags" className="mt-4 space-y-3">
          {featureFlags.length === 0 ? (
            <Card className="border-border border-dashed">
              <CardContent className="p-12 text-center">
                <Flag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{t("admin.noFlags")}</p>
              </CardContent>
            </Card>
          ) : (
            featureFlags.map((flag) => (
              <Card key={flag.key} className="border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">{flag.key}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("admin.lastUpdated")}: {displayDateTime(flag.updated_at)}
                    </p>
                  </div>
                  <Switch
                    checked={flag.value === true}
                    onCheckedChange={() => handleToggleFlag(flag.key, flag.value)}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ─── Audit Log ─── */}
        <TabsContent value="audit" className="mt-4">
          {auditLogs.length === 0 ? (
            <Card className="border-border border-dashed">
              <CardContent className="p-12 text-center">
                <ScrollText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{t("admin.noLogs")}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.timestamp")}</TableHead>
                    <TableHead>{t("admin.action")}</TableHead>
                    <TableHead>{t("admin.target")}</TableHead>
                    <TableHead>{t("admin.details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">
                          {displayDateTime(log.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {log.target_type && (
                            <span className="font-mono">
                              {log.target_type}:{log.target_id?.slice(0, 8)}
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {Object.keys(log.metadata).length > 0
                            ? JSON.stringify(log.metadata)
                            : "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
