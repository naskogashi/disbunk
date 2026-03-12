import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, XCircle, Users, Shield, BarChart3, Loader2, RefreshCw,
  Search, Ban, Trash2, Clock, FileText, Flag, ScrollText,
} from "lucide-react";
import type { Profile, AppRole } from "@/types/database";

/* ─── Types ─── */
interface PendingUser extends Profile { email?: string }

interface ManagedUser {
  id: string;
  user_id: string;
  full_name: string | null;
  status: string;
  roles: AppRole[];
  created_at: string;
}

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
  const [acting, setActing] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [stats, setStats] = useState({ users: 0, claims: 0, teams: 0, evidence: 0 });

  const fetchData = async () => {
    setLoading(true);
    const [pendingRes, usersRes, rolesRes, claimsCount, teamsCount, evidenceCount, logsRes, flagsRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("status", "pending_approval"),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("claims").select("id", { count: "exact", head: true }),
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("evidence").select("id", { count: "exact", head: true }),
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("feature_flags").select("*").order("key"),
      ]);

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

    setAuditLogs(auditLogs.length === 0 ? (logsRes.data ?? []) : auditLogs);
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

  const handleApproval = async (profileId: string, userId: string, approve: boolean) => {
    setActing(profileId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: approve ? "approved" : "rejected" })
      .eq("id", profileId);

    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      try {
        await supabase.functions.invoke("notify-registration", {
          body: { userId, approved: approve },
        });
      } catch { /* best-effort */ }
      await logAction(approve ? "user_approved" : "user_rejected", "profile", profileId);
      toast({
        title: approve ? t("admin.userApproved") : t("admin.userRejected"),
        description: approve ? t("admin.userApprovedDesc") : t("admin.userRejectedDesc"),
      });
      fetchData();
    }
    setActing(null);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      await logAction("role_changed", "user", userId, { new_role: newRole });
      toast({ title: t("admin.roleUpdated") });
      fetchData();
    }
  };

  const handleSuspend = async (profileId: string, userId: string) => {
    const { error } = await supabase.from("profiles").update({ status: "suspended" }).eq("id", profileId);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      await logAction("user_suspended", "profile", profileId);
      toast({ title: t("admin.userSuspended") });
      fetchData();
    }
  };

  const handleUnsuspend = async (profileId: string) => {
    const { error } = await supabase.from("profiles").update({ status: "approved" }).eq("id", profileId);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      await logAction("user_unsuspended", "profile", profileId);
      toast({ title: t("admin.userUnsuspended") });
      fetchData();
    }
  };

  const handleDeleteUser = async (profileId: string, userId: string) => {
    const { error } = await supabase.from("profiles").delete().eq("id", profileId);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      await logAction("user_deleted", "profile", profileId, { user_id: userId });
      toast({ title: t("admin.userDeleted") });
      fetchData();
    }
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

  const handleCrawlSbunker = async () => {
    toast({ title: t("admin.crawling") });
    try {
      const { error } = await supabase.functions.invoke("crawl-sbunker");
      if (error) throw error;
      await logAction("crawl_sbunker", null, null);
      toast({ title: t("admin.crawlComplete") });
    } catch (err: any) {
      toast({ title: t("admin.error"), description: err.message, variant: "destructive" });
    }
  };

  const initials = (name: string | null) =>
    (name || "U").split(" ").map((s) => s[0]?.toUpperCase()).join("").slice(0, 2);

  const filteredUsers = allUsers.filter(
    (u) =>
      (u.full_name ?? "").toLowerCase().includes(userSearch.toLowerCase()) ||
      u.user_id.toLowerCase().includes(userSearch.toLowerCase())
  );

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-success/15 text-success";
      case "pending_approval": return "bg-warning/15 text-warning";
      case "rejected": return "bg-destructive/15 text-destructive";
      case "suspended": return "bg-destructive/15 text-destructive";
      default: return "bg-muted text-muted-foreground";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.subtitle")}</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCrawlSbunker}>
          <RefreshCw className="h-3.5 w-3.5" /> {t("admin.crawlSbunker")}
        </Button>
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

        {/* ─── Pending Approvals ─── */}
        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingUsers.length === 0 ? (
            <Card className="border-border border-dashed">
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-10 w-10 text-success mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{t("admin.noPending")}</p>
              </CardContent>
            </Card>
          ) : (
            pendingUsers.map((u) => (
              <Card key={u.id} className="border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-muted text-foreground text-xs">
                        {initials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.full_name || t("admin.unnamed")}</p>
                      <p className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="outline"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => handleApproval(u.id, u.user_id, false)}
                      disabled={acting === u.id}
                    >
                      <XCircle className="h-3.5 w-3.5" /> {t("admin.reject")}
                    </Button>
                    <Button
                      size="sm" className="gap-1"
                      onClick={() => handleApproval(u.id, u.user_id, true)}
                      disabled={acting === u.id}
                    >
                      {acting === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      {t("admin.approve")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ─── All Users Table ─── */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.searchUsers")}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Card className="border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.user")}</TableHead>
                  <TableHead>{t("admin.status")}</TableHead>
                  <TableHead>{t("admin.role")}</TableHead>
                  <TableHead>{t("admin.joined")}</TableHead>
                  <TableHead className="text-right">{t("admin.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-muted text-foreground text-[10px]">
                            {initials(u.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.full_name || t("admin.unnamed")}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{u.user_id.slice(0, 12)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColor(u.status)} text-[10px] font-mono`}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.roles[0] || "analyst"}
                        onValueChange={(val) => handleRoleChange(u.user_id, val as AppRole)}
                      >
                        <SelectTrigger className="w-28 h-7 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visitor">Visitor</SelectItem>
                          <SelectItem value="analyst">Analyst</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="team_lead">Team Lead</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.status === "suspended" ? (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs text-success gap-1"
                            onClick={() => handleUnsuspend(u.id)}
                          >
                            <CheckCircle className="h-3 w-3" /> {t("admin.unsuspend")}
                          </Button>
                        ) : u.status === "approved" ? (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs text-warning gap-1"
                            onClick={() => handleSuspend(u.id, u.user_id)}
                          >
                            <Ban className="h-3 w-3" /> {t("admin.suspend")}
                          </Button>
                        ) : null}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1">
                              <Trash2 className="h-3 w-3" /> {t("common.delete")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("admin.deleteConfirm")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("admin.deleteConfirmDesc")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground"
                                onClick={() => handleDeleteUser(u.id, u.user_id)}
                              >
                                {t("common.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

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
                      {t("admin.lastUpdated")}: {new Date(flag.updated_at).toLocaleString()}
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
                          {new Date(log.created_at).toLocaleString()}
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
