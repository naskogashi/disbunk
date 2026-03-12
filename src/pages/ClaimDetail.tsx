import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ClaimStatusBadge } from "@/components/ClaimStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ExternalLink, Shield, MessageSquare, Send, Clock,
  CheckCircle, XCircle, AlertTriangle, Search, FileText, Loader2,
} from "lucide-react";
import type { ClaimStatus } from "@/types/database";

interface ClaimDetail {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  language: string;
  status: ClaimStatus;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  sbunker_source_url: string | null;
}

interface Evidence {
  id: string;
  title: string;
  type: string;
  file_url: string | null;
  tags: string[];
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile?: { full_name: string | null };
}

const statusTransitions: Record<ClaimStatus, { label: string; icon: typeof CheckCircle; target: ClaimStatus; color: string }[]> = {
  pending: [
    { label: "Start Investigation", icon: Search, target: "investigating", color: "text-primary" },
    { label: "Escalate", icon: AlertTriangle, target: "escalated", color: "text-destructive" },
  ],
  investigating: [
    { label: "Mark Verified", icon: CheckCircle, target: "verified", color: "text-success" },
    { label: "Mark Debunked", icon: XCircle, target: "debunked", color: "text-destructive" },
    { label: "Escalate", icon: AlertTriangle, target: "escalated", color: "text-warning" },
  ],
  verified: [],
  debunked: [],
  escalated: [
    { label: "Start Investigation", icon: Search, target: "investigating", color: "text-primary" },
  ],
};

export default function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const canEdit = hasAnyRole(["editor", "team_lead", "admin"]);
  const canComment = hasAnyRole(["analyst", "editor", "team_lead", "admin"]);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      const [claimRes, evidenceRes, commentsRes] = await Promise.all([
        supabase.from("claims").select("*").eq("id", id).single(),
        supabase.from("evidence").select("*").eq("claim_id", id).order("created_at", { ascending: false }),
        supabase.from("comments").select("*").eq("claim_id", id).order("created_at", { ascending: true }),
      ]);

      setClaim(claimRes.data as ClaimDetail | null);
      setEvidence(evidenceRes.data ?? []);
      setComments(commentsRes.data ?? []);
      setLoading(false);
    };
    fetchAll();

    // Realtime comments
    const channel = supabase
      .channel(`claim-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `claim_id=eq.${id}` }, (payload) => {
        setComments((prev) => [...prev, payload.new as Comment]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleStatusChange = async (newStatus: ClaimStatus) => {
    if (!claim) return;
    setUpdatingStatus(true);
    const { error } = await supabase.from("claims").update({ status: newStatus }).eq("id", claim.id);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      setClaim((prev) => prev ? { ...prev, status: newStatus } : null);
      toast({ title: `Status updated to ${newStatus}` });
    }
    setUpdatingStatus(false);
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !claim || !user) return;
    setPosting(true);
    const { error } = await supabase.from("comments").insert({
      claim_id: claim.id,
      user_id: user.id,
      body: newComment.trim(),
    });
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      setNewComment("");
    }
    setPosting(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="text-center py-20">
        <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-foreground">Claim not found</h2>
        <Link to="/claims">
          <Button variant="outline" className="mt-4 gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Claims
          </Button>
        </Link>
      </div>
    );
  }

  const actions = statusTransitions[claim.status] ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link to="/claims" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("claims.title")}
          </Link>
          <h1 className="text-xl font-bold text-foreground tracking-tight leading-snug">
            {claim.title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="claim-id">{claim.id.slice(0, 8)}</span>
            <ClaimStatusBadge status={claim.status} />
            <Badge variant="outline" className="font-mono text-[10px] uppercase">{claim.language}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="border-border">
            <CardContent className="p-5 space-y-4">
              {claim.description ? (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{claim.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description provided.</p>
              )}

              {claim.source_url && (
                <a
                  href={claim.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {claim.source_url}
                </a>
              )}

              <Separator />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">{t("claims.createdBy")}</p>
                  <p className="font-mono text-foreground mt-0.5">{claim.created_by?.slice(0, 8) ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("claims.assignedTo")}</p>
                  <p className="font-mono text-foreground mt-0.5">{claim.assigned_to?.slice(0, 8) ?? "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-mono text-foreground mt-0.5">{new Date(claim.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-mono text-foreground mt-0.5">{new Date(claim.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evidence panel */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {t("claims.evidence")}
                  <Badge variant="secondary" className="ml-1 text-[10px]">{evidence.length}</Badge>
                </CardTitle>
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <Shield className="h-3.5 w-3.5" /> {t("claims.addEvidence")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {evidence.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-lg">
                  <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{t("claims.noEvidence")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {evidence.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[9px] uppercase">{ev.type}</Badge>
                            {ev.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[9px]">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        {new Date(ev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                {t("claims.comments")}
                <Badge variant="secondary" className="ml-1 text-[10px]">{comments.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t("claims.noComments")}</p>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback className="text-[10px] bg-muted text-foreground">
                          {(c.user_id ?? "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground font-mono">{c.user_id.slice(0, 8)}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1 leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {canComment && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={t("claims.addComment")}
                    className="min-h-[60px] text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePostComment();
                    }}
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 self-end"
                    onClick={handlePostComment}
                    disabled={posting || !newComment.trim()}
                  >
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Status actions */}
          {canEdit && actions.length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">{t("claims.statusActions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {actions.map((action) => (
                  <Button
                    key={action.target}
                    variant="outline"
                    className={`w-full justify-start gap-2 ${action.color}`}
                    onClick={() => handleStatusChange(action.target)}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <action.icon className="h-4 w-4" />
                    )}
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Meta info */}
          <Card className="border-border">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Status</p>
                <ClaimStatusBadge status={claim.status} />
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">{t("claims.language")}</p>
                <p className="text-sm font-mono text-foreground">{claim.language === "sq" ? "Shqip" : "English"}</p>
              </div>
              {claim.sbunker_source_url && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Sbunker Source</p>
                    <a
                      href={claim.sbunker_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View on Sbunker.org <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
