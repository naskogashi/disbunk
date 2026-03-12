import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Users, Shield, BarChart3, Loader2, RefreshCw } from "lucide-react";
import type { Profile, AppRole } from "@/types/database";

interface PendingUser extends Profile {
  email?: string;
}

interface ManagedUser {
  id: string;
  user_id: string;
  full_name: string | null;
  status: string;
  roles: AppRole[];
  email?: string;
}

export default function AdminPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [stats, setStats] = useState({ users: 0, claims: 0, teams: 0 });

  const fetchData = async () => {
    setLoading(true);

    const [pendingRes, usersRes, rolesRes, claimsCount, teamsCount] = await Promise.all([
      supabase.from("profiles").select("*").eq("status", "pending_approval"),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("claims").select("id", { count: "exact", head: true }),
      supabase.from("teams").select("id", { count: "exact", head: true }),
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
      }))
    );

    setStats({
      users: usersRes.data?.length ?? 0,
      claims: claimsCount.count ?? 0,
      teams: teamsCount.count ?? 0,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproval = async (profileId: string, userId: string, approve: boolean) => {
    setActing(profileId);
    const { error } = await supabase
      .from("profiles")
      .update({ status: approve ? "approved" : "rejected" })
      .eq("id", profileId);

    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      // Call edge function to send notification email
      try {
        await supabase.functions.invoke("notify-registration", {
          body: { userId, approved: approve },
        });
      } catch {
        // Email notification is best-effort
      }
      toast({
        title: approve ? t("admin.userApproved") : t("admin.userRejected"),
        description: approve
          ? t("admin.userApprovedDesc")
          : t("admin.userRejectedDesc"),
      });
      fetchData();
    }
    setActing(null);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    // Remove existing roles and add the new one
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });

    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.roleUpdated") });
      fetchData();
    }
  };

  const handleCrawlSbunker = async () => {
    toast({ title: t("admin.crawling") });
    try {
      const { error } = await supabase.functions.invoke("crawl-sbunker");
      if (error) throw error;
      toast({ title: t("admin.crawlComplete") });
    } catch (err: any) {
      toast({ title: t("admin.error"), description: err.message, variant: "destructive" });
    }
  };

  const initials = (name: string | null) =>
    (name || "U").split(" ").map((s) => s[0]?.toUpperCase()).join("").slice(0, 2);

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.users}</p>
                <p className="text-xs text-muted-foreground">{t("admin.totalUsers")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Shield className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.claims}</p>
                <p className="text-xs text-muted-foreground">{t("admin.totalClaims")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <BarChart3 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.teams}</p>
                <p className="text-xs text-muted-foreground">{t("admin.totalTeams")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
        </TabsList>

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
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => handleApproval(u.id, u.user_id, false)}
                      disabled={acting === u.id}
                    >
                      <XCircle className="h-3.5 w-3.5" /> {t("admin.reject")}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1"
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

        <TabsContent value="users" className="space-y-3 mt-4">
          {allUsers.map((u) => (
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={u.status === "approved" ? "default" : "secondary"} className="text-[10px]">
                        {u.status}
                      </Badge>
                      {u.roles.map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px]">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Select
                  value={u.roles[0] || "analyst"}
                  onValueChange={(val) => handleRoleChange(u.user_id, val as AppRole)}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
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
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
