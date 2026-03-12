import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ClaimStatusBadge } from "@/components/ClaimStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Loader2, Network, Calendar, Users, FileText,
  ArrowLeft, ChevronRight, AlertTriangle, Sparkles, X,
} from "lucide-react";
import type { ClaimStatus } from "@/types/database";

/* ─── Types ─── */
interface CampaignRow {
  id: string;
  name: string;
  description: string | null;
  team_id: string | null;
  created_by: string | null;
  created_at: string;
  teams?: { name: string } | null;
  claim_count?: number;
}

interface CampaignClaimRow {
  id: string;
  claim_id: string;
  claims: {
    id: string;
    title: string;
    status: ClaimStatus;
    created_at: string;
  };
}

interface TeamOption {
  id: string;
  name: string;
}

/* ─── Main Component ─── */
export default function Campaigns() {
  const { t } = useTranslation();
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const canManage = hasAnyRole(["editor", "team_lead", "admin"]);

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [similarBanner, setSimilarBanner] = useState<{ count: number; claimIds: string[] } | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    const [campaignsRes, teamsRes, ccRes] = await Promise.all([
      supabase.from("campaigns").select("*, teams(name)").order("created_at", { ascending: false }),
      supabase.from("teams").select("id, name"),
      supabase.from("campaign_claims").select("campaign_id"),
    ]);

    const countMap: Record<string, number> = {};
    (ccRes.data ?? []).forEach((r: { campaign_id: string }) => {
      countMap[r.campaign_id] = (countMap[r.campaign_id] ?? 0) + 1;
    });

    setCampaigns(
      (campaignsRes.data ?? []).map((c: any) => ({ ...c, claim_count: countMap[c.id] ?? 0 }))
    );
    setTeams(teamsRes.data ?? []);
    setLoading(false);
  };

  // Check for similar claims (pgvector cosine similarity suggestion)
  const checkSimilarClaims = async () => {
    // Simple heuristic: find claims not in any campaign that share words in title
    const { data: unlinked } = await supabase
      .from("claims")
      .select("id, title")
      .limit(100);

    if (!unlinked || unlinked.length < 2) return;

    const { data: linked } = await supabase
      .from("campaign_claims")
      .select("claim_id");

    const linkedSet = new Set((linked ?? []).map((r: { claim_id: string }) => r.claim_id));
    const orphans = unlinked.filter((c: { id: string }) => !linkedSet.has(c.id));

    // Simple word-overlap similarity (real implementation would use pgvector)
    if (orphans.length >= 2) {
      const words = (s: string) => new Set(s.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4));
      const first = words(orphans[0].title);
      const similar = orphans.filter((c: any, i: number) => {
        if (i === 0) return true;
        const cw = words(c.title);
        let overlap = 0;
        first.forEach((w: string) => { if (cw.has(w)) overlap++; });
        return overlap >= 1;
      });

      if (similar.length >= 2) {
        setSimilarBanner({ count: similar.length, claimIds: similar.map((c: any) => c.id) });
      }
    }
  };

  useEffect(() => {
    fetchCampaigns();
    checkSimilarClaims();
  }, []);

  const filtered = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  if (selectedId) {
    return (
      <CampaignDetail
        campaignId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {t("campaigns.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("campaigns.subtitle")}
          </p>
        </div>
        {canManage && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> {t("campaigns.create")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("campaigns.createTitle")}</DialogTitle>
                <DialogDescription>{t("campaigns.createDesc")}</DialogDescription>
              </DialogHeader>
              <CreateCampaignForm
                teams={teams}
                userId={user?.id ?? ""}
                onComplete={() => {
                  setCreateOpen(false);
                  fetchCampaigns();
                  toast({ title: t("campaigns.created") });
                }}
                onError={(msg) =>
                  toast({ title: t("admin.error"), description: msg, variant: "destructive" })
                }
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Similar claims banner */}
      {similarBanner && (
        <Card className="border-warning/30 bg-warning/5 animate-fade-in">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("campaigns.similarFound", { count: similarBanner.count })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("campaigns.similarDesc")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-warning border-warning/30 hover:bg-warning/10"
                  onClick={() => setCreateOpen(true)}
                >
                  <Network className="h-3.5 w-3.5" /> {t("campaigns.createFromSimilar")}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setSimilarBanner(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="animate-fade-in">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("campaigns.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border border-dashed">
          <CardContent className="p-12 text-center">
            <Network className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t("campaigns.noResults")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {filtered.map((campaign) => (
            <Card
              key={campaign.id}
              className="border-border card-hover cursor-pointer"
              onClick={() => setSelectedId(campaign.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Network className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="text-sm font-semibold text-foreground">{campaign.name}</h3>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {campaign.claim_count} {t("campaigns.claims")}
                      </span>
                      {campaign.teams && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {campaign.teams.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" />
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Campaign Detail View ─── */
function CampaignDetail({ campaignId, onBack }: { campaignId: string; onBack: () => void }) {
  const { t } = useTranslation();
  const { hasAnyRole } = useAuth();
  const { toast } = useToast();
  const canManage = hasAnyRole(["editor", "team_lead", "admin"]);

  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [claims, setClaims] = useState<CampaignClaimRow[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [campRes, claimsRes] = await Promise.all([
        supabase.from("campaigns").select("*, teams(name)").eq("id", campaignId).single(),
        supabase
          .from("campaign_claims")
          .select("id, claim_id, claims(id, title, status, created_at)")
          .eq("campaign_id", campaignId),
      ]);
      setCampaign(campRes.data as CampaignRow | null);
      setClaims((claimsRes.data as unknown as CampaignClaimRow[]) ?? []);
      setNotes(campRes.data?.description ?? "");
      setLoading(false);
    };
    fetch();
  }, [campaignId]);

  const handleSaveNotes = async () => {
    const { error } = await supabase
      .from("campaigns")
      .update({ description: notes })
      .eq("id", campaignId);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("campaigns.notesSaved") });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t("campaigns.notFound")}</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          {t("campaigns.backToList")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {t("campaigns.backToList")}
      </button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Network className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{campaign.name}</h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" /> {claims.length} {t("campaigns.claims")}
          </span>
          {campaign.teams && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {campaign.teams.name}
            </span>
          )}
          <span className="font-mono">
            {new Date(campaign.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Claims column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            {t("campaigns.memberClaims")}
          </h2>
          {claims.length === 0 ? (
            <Card className="border-border border-dashed">
              <CardContent className="p-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("campaigns.noClaims")}</p>
              </CardContent>
            </Card>
          ) : (
            claims.map((cc) => (
              <Link key={cc.id} to={`/claims/${cc.claims.id}`}>
                <Card className="border-border card-hover cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="claim-id shrink-0">{cc.claims.id.slice(0, 8)}</span>
                      <span className="text-sm text-foreground truncate">{cc.claims.title}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ClaimStatusBadge status={cc.claims.status} />
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(cc.claims.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Notes / info sidebar */}
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {t("campaigns.notes")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("campaigns.notesPlaceholder")}
                className="min-h-[120px] text-sm"
                disabled={!canManage}
              />
              {canManage && (
                <Button size="sm" onClick={handleSaveNotes} className="w-full">
                  {t("common.save")}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Create Campaign Form ─── */
interface CreateFormProps {
  teams: TeamOption[];
  userId: string;
  onComplete: () => void;
  onError: (msg: string) => void;
}

function CreateCampaignForm({ teams, userId, onComplete, onError }: CreateFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userId) return;

    setSubmitting(true);
    const { error } = await supabase.from("campaigns").insert({
      name: name.trim(),
      description: description.trim() || null,
      team_id: teamId || null,
      created_by: userId,
    });
    setSubmitting(false);

    if (error) {
      onError(error.message);
    } else {
      onComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t("campaigns.name")} <span className="text-destructive">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("campaigns.namePlaceholder")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("claims.description")}</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("campaigns.descPlaceholder")}
          className="min-h-[80px]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("campaigns.assignTeam")}</Label>
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger>
            <SelectValue placeholder={t("campaigns.selectTeam")} />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={submitting || !name.trim()} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
          {t("campaigns.create")}
        </Button>
      </div>
    </form>
  );
}
