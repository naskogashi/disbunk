import { displayDate } from "@/lib/locale";
import { TeamDetailsEditor } from "@/components/TeamDetailsEditor";
import { PictureEditor, PrivateAvatar } from "@/components/ProfilePictures";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ManageUserForm } from "@/components/ManageUserForm";
import {
  Plus, Users, Loader2, ArrowLeft, ChevronRight, Shield,
  FileText, UserPlus, LogOut, Mail, Crown,
} from "lucide-react";

/* ─── Types ─── */
interface TeamRow {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  avatar_path?: string | null;
  member_count?: number;
  claim_count?: number;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: "member" | "lead";
  joined_at: string;
  profiles?: { full_name: string | null } | null;
}

/* ─── Main Component ─── */
export default function Teams() {
  const { t } = useTranslation();
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const canCreate = hasAnyRole(["analyst", "editor", "team_lead", "admin"]);

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchTeams = async () => {
    setLoading(true);
    const [teamsRes, membersRes, claimsRes] = await Promise.all([
      supabase.from("teams").select("*").order("created_at", { ascending: false }),
      supabase.from("team_members").select("team_id"),
      supabase.from("claims").select("team_id").not("team_id", "is", null),
    ]);

    const memberCounts: Record<string, number> = {};
    (membersRes.data ?? []).forEach((r: { team_id: string }) => {
      memberCounts[r.team_id] = (memberCounts[r.team_id] ?? 0) + 1;
    });
    const claimCounts: Record<string, number> = {};
    (claimsRes.data ?? []).forEach((r: { team_id: string }) => {
      claimCounts[r.team_id] = (claimCounts[r.team_id] ?? 0) + 1;
    });

    setTeams(
      (teamsRes.data ?? []).map((t: TeamRow) => ({
        ...t,
        member_count: memberCounts[t.id] ?? 0,
        claim_count: claimCounts[t.id] ?? 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  if (selectedId) {
    return (
      <TeamDetail
        teamId={selectedId}
        onBack={() => { setSelectedId(null); fetchTeams(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("teams.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("teams.subtitle")}</p>
        </div>
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> {t("teams.create")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("teams.createTitle")}</DialogTitle>
                <DialogDescription>{t("teams.createDesc")}</DialogDescription>
              </DialogHeader>
              <CreateTeamForm
                userId={user?.id ?? ""}
                onComplete={() => {
                  setCreateOpen(false);
                  fetchTeams();
                  toast({ title: t("teams.created") });
                }}
                onError={(msg) =>
                  toast({ title: t("admin.error"), description: msg, variant: "destructive" })
                }
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[140px] rounded-xl" />)}
        </div>
      ) : teams.length === 0 ? (
        <Card className="border-border border-dashed">
          <CardContent className="p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t("teams.noTeams")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="border-border card-hover cursor-pointer"
              onClick={() => setSelectedId(team.id)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <PrivateAvatar path={team.avatar_path} name={team.name} className="h-10 w-10"/>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{team.name}</h3>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {displayDate(team.created_at)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                </div>
                {team.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{team.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {team.member_count} {t("teams.members")}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {team.claim_count} {t("teams.activeClaims")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Team Detail ─── */
function TeamDetail({ teamId, onBack }: { teamId: string; onBack: () => void }) {
  const { t } = useTranslation();
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();

  const [team, setTeam] = useState<TeamRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isLead, setIsLead] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [candidates, setCandidates] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [adding, setAdding] = useState(false);

  const isAdmin = hasAnyRole(["admin"]);
  const canManage = isLead || isAdmin;

  const fetchDetail = async () => {
    setLoading(true);
    const [teamRes, membersRes] = await Promise.all([
      supabase.from("teams").select("*").eq("id", teamId).single(),
      supabase.rpc("get_team_roster", { target_team_id: teamId }),
    ]);

    setTeam(teamRes.data as TeamRow | null);
    if (teamRes.error || membersRes.error) toast({ title: t("admin.error"), description: (teamRes.error || membersRes.error)?.message, variant: "destructive" });
    const m: MemberRow[] = (membersRes.data ?? []).map((row: MemberRow & { full_name?: string | null }) => ({ ...row, profiles: { full_name: row.full_name ?? null } }));
    setMembers(m);
    setIsMember(m.some((r) => r.user_id === user?.id));
    setIsLead(m.some((r) => r.user_id === user?.id && r.role === "lead"));
    if (isAdmin || m.some(row => row.user_id === user?.id && row.role === "lead")) {
      const result = await supabase.rpc("list_team_candidates", { target_team_id: teamId });
      if (result.error) toast({ title: t("admin.error"), description: result.error.message, variant: "destructive" });
      else setCandidates(result.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDetail();
  }, [teamId]);

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    const { error } = await supabase.from("team_members").insert({
      team_id: teamId,
      user_id: user.id,
      role: "member",
    });
    setJoining(false);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("teams.joined") });
      fetchDetail();
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("teams.left") });
      fetchDetail();
    }
  };

  const handleRoleChange = async (memberId: string, newRole: "member" | "lead") => {
    const { error } = await supabase
      .from("team_members")
      .update({ role: newRole })
      .eq("id", memberId);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("teams.roleUpdated") });
      fetchDetail();
    }
  };

  const handleRemove = async (memberId: string) => {
    const { error } = await supabase.from("team_members").delete().eq("id", memberId);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("teams.memberRemoved") });
      fetchDetail();
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

  if (!team) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t("teams.notFound")}</p>
        <Button variant="outline" onClick={onBack} className="mt-4">{t("teams.backToList")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {t("teams.backToList")}
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PrivateAvatar path={team.avatar_path} name={team.name} className="h-12 w-12"/>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{team.name}</h1>
          </div>
          {team.description && (
            <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {!isMember ? isAdmin ? (
            <Button size="sm" className="gap-1.5" onClick={handleJoin} disabled={joining}>
              {joining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              {t("teams.join")}
            </Button>
          ) : <p className="max-w-xs text-sm text-muted-foreground">{t("accounts.requestInvite")}</p> : (
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={handleLeave}>
              <LogOut className="h-3.5 w-3.5" /> {t("teams.leave")}
            </Button>
          )}
          {canManage && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {t("teams.invite")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>{t("teams.inviteTitle")}</DialogTitle>
                  <DialogDescription>{t("teams.inviteDesc")}</DialogDescription>
                </DialogHeader>
                <ManageUserForm teamId={teamId} onComplete={() => { setInviteOpen(false); fetchDetail(); }} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {canManage && <TeamDetailsEditor team={team} onSaved={patch => setTeam(previous => previous ? { ...previous, ...patch } : previous)}/>}
      {canManage&&<Card><CardContent className="space-y-3 p-5"><h2 className="font-semibold">{t("accountTools.teamPicture")}</h2><PictureEditor kind="team" entityId={teamId} path={team.avatar_path} name={team.name} onChanged={avatar_path=>setTeam(previous=>previous?{...previous,avatar_path}:previous)}/></CardContent></Card>}
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground font-mono">{members.length}</p>
                <p className="text-[11px] text-muted-foreground">{t("teams.members")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                <Shield className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground font-mono">
                  {members.filter((m) => m.role === "lead").length}
                </p>
                <p className="text-[11px] text-muted-foreground">{t("teams.leads")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members list */}
      {canManage && <Card><CardContent className="space-y-3 p-5"><Label htmlFor="existing-member">{t("accounts.addExisting")}</Label><div className="flex flex-wrap gap-2"><select id="existing-member" className="h-10 min-w-0 flex-1 rounded-lg border bg-card px-3" value={candidateId} onChange={event => setCandidateId(event.target.value)}><option value="">{t("accounts.selectUser")}</option>{candidates.map(candidate => <option key={candidate.user_id} value={candidate.user_id}>{candidate.full_name || candidate.user_id.slice(0,8)}</option>)}</select><Button disabled={!candidateId || adding} onClick={async () => { setAdding(true); const result = await supabase.from("team_members").insert({ team_id: teamId, user_id: candidateId, role: "member" }); setAdding(false); if (result.error) toast({ title: t("admin.error"), description: result.error.message, variant: "destructive" }); else { setCandidateId(""); fetchDetail(); } }}>{t("tools.add")}</Button></div></CardContent></Card>}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t("teams.membersList")}</h2>
        {members.map((member) => (
          <Card key={member.id} className="border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-muted text-foreground text-xs">
                    {initials(member.profiles?.full_name ?? null)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {member.profiles?.full_name ?? t("admin.unnamed")}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant={member.role === "lead" ? "default" : "secondary"}
                      className="text-[10px] gap-1"
                    >
                      {member.role === "lead" && <Crown className="h-2.5 w-2.5" />}
                      {member.role === "lead" ? t("teams.lead") : t("teams.member")}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {displayDate(member.joined_at)}
                    </span>
                  </div>
                </div>
              </div>
              {canManage && member.user_id !== user?.id && (
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(v) => handleRoleChange(member.id, v as "member" | "lead")}
                  >
                    <SelectTrigger className="w-24 h-7 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">{t("teams.member")}</SelectItem>
                      <SelectItem value="lead">{t("teams.lead")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive text-xs h-7"
                    onClick={() => handleRemove(member.id)}
                  >
                    {t("teams.remove")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Create Team Form ─── */
function CreateTeamForm({
  userId,
  onComplete,
  onError,
}: {
  userId: string;
  onComplete: () => void;
  onError: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userId) return;

    setSubmitting(true);
    const { error } = await supabase.rpc("create_team_with_lead", { team_name: name.trim(), team_description: description.trim() || null });

    if (error) {
      onError(error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t("teams.teamName")} <span className="text-destructive">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("teams.namePlaceholder")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("claims.description")}</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("teams.descPlaceholder")}
          className="min-h-[80px]"
        />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={submitting || !name.trim()} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
          {t("teams.create")}
        </Button>
      </div>
    </form>
  );
}
