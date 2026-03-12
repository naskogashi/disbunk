import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  Upload, Search, Image, FileText, Archive, Globe, File,
  Loader2, Plus, Download, Calendar, User, Link as LinkIcon,
} from "lucide-react";
import type { EvidenceType } from "@/types/database";

interface EvidenceRow {
  id: string;
  claim_id: string;
  title: string;
  type: EvidenceType;
  file_url: string | null;
  uploaded_by: string;
  tags: string[];
  created_at: string;
  claims?: { id: string; title: string } | null;
  profiles?: { full_name: string | null } | null;
}

interface ClaimOption {
  id: string;
  title: string;
}

const TYPE_ICONS: Record<EvidenceType, typeof Image> = {
  screenshot: Image,
  archive: Archive,
  document: FileText,
  social_post: Globe,
  other: File,
};

const TYPE_COLORS: Record<EvidenceType, string> = {
  screenshot: "bg-primary/15 text-primary",
  archive: "bg-warning/15 text-warning",
  document: "bg-success/15 text-success",
  social_post: "bg-destructive/15 text-destructive",
  other: "bg-muted text-muted-foreground",
};

export default function Evidence() {
  const { t } = useTranslation();
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const canUpload = hasAnyRole(["analyst", "editor", "team_lead", "admin"]);

  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [claims, setClaims] = useState<ClaimOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [claimFilter, setClaimFilter] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchEvidence = async () => {
    setLoading(true);
    let query = supabase
      .from("evidence")
      .select("*, claims(id, title), profiles:uploaded_by(full_name)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (typeFilter !== "all") query = query.eq("type", typeFilter);
    if (claimFilter !== "all") query = query.eq("claim_id", claimFilter);

    const [evidenceRes, claimsRes] = await Promise.all([
      query,
      supabase.from("claims").select("id, title").order("created_at", { ascending: false }).limit(100),
    ]);

    setEvidence((evidenceRes.data as EvidenceRow[]) ?? []);
    setClaims(claimsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvidence();
  }, [typeFilter, claimFilter]);

  const filtered = evidence.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const isImage = (url: string | null) =>
    url && /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {t("evidence.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("evidence.subtitle", { count: evidence.length })}
          </p>
        </div>
        <div className="flex gap-2">
          {canUpload && (
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> {t("evidence.upload")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("evidence.uploadTitle")}</DialogTitle>
                  <DialogDescription>{t("evidence.uploadDesc")}</DialogDescription>
                </DialogHeader>
                <UploadForm
                  claims={claims}
                  userId={user?.id ?? ""}
                  onComplete={() => {
                    setUploadOpen(false);
                    fetchEvidence();
                    toast({ title: t("evidence.uploaded") });
                  }}
                  onError={(msg) =>
                    toast({ title: t("admin.error"), description: msg, variant: "destructive" })
                  }
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("evidence.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40 h-10">
            <SelectValue placeholder={t("evidence.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("evidence.allTypes")}</SelectItem>
            <SelectItem value="screenshot">{t("evidence.screenshot")}</SelectItem>
            <SelectItem value="archive">{t("evidence.archive")}</SelectItem>
            <SelectItem value="document">{t("evidence.document")}</SelectItem>
            <SelectItem value="social_post">{t("evidence.socialPost")}</SelectItem>
            <SelectItem value="other">{t("evidence.other")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={claimFilter} onValueChange={setClaimFilter}>
          <SelectTrigger className="w-full sm:w-52 h-10">
            <SelectValue placeholder={t("evidence.allClaims")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("evidence.allClaims")}</SelectItem>
            {claims.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title.slice(0, 40)}{c.title.length > 40 ? "…" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Evidence Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[240px] rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border border-dashed">
          <CardContent className="p-12 text-center">
            <Archive className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t("evidence.noResults")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
          {filtered.map((item) => {
            const Icon = TYPE_ICONS[item.type] ?? File;
            return (
              <Card key={item.id} className="border-border card-hover overflow-hidden group">
                {/* Thumbnail */}
                <div className="aspect-video bg-muted/50 flex items-center justify-center overflow-hidden">
                  {isImage(item.file_url) ? (
                    <img
                      src={item.file_url!}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <Icon className="h-10 w-10 text-muted-foreground/30" />
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <Badge className={`${TYPE_COLORS[item.type]} text-[10px] shrink-0 font-mono uppercase`}>
                      {item.type.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{item.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {item.claims && (
                      <Link
                        to={`/claims/${item.claims.id}`}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        <LinkIcon className="h-3 w-3" />
                        <span className="truncate">{item.claims.title}</span>
                      </Link>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.profiles?.full_name ?? t("admin.unnamed")}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Download */}
                  {item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      <Download className="h-3 w-3" /> {t("evidence.download")}
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Upload Form Component ─── */
interface UploadFormProps {
  claims: ClaimOption[];
  userId: string;
  onComplete: () => void;
  onError: (msg: string) => void;
}

function UploadForm({ claims, userId, onComplete, onError }: UploadFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EvidenceType>("screenshot");
  const [claimId, setClaimId] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !claimId || !userId) return;

    setSubmitting(true);
    let fileUrl: string | null = null;

    // Upload file to Supabase Storage if provided
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `evidence/${claimId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("evidence")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        onError(uploadError.message);
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("evidence")
        .getPublicUrl(path);
      fileUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("evidence").insert({
      claim_id: claimId,
      title: title.trim(),
      type,
      file_url: fileUrl,
      uploaded_by: userId,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
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
          {t("evidence.evidenceTitle")} <span className="text-destructive">*</span>
        </Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("evidence.titlePlaceholder")}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("evidence.type")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as EvidenceType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="screenshot">{t("evidence.screenshot")}</SelectItem>
              <SelectItem value="archive">{t("evidence.archive")}</SelectItem>
              <SelectItem value="document">{t("evidence.document")}</SelectItem>
              <SelectItem value="social_post">{t("evidence.socialPost")}</SelectItem>
              <SelectItem value="other">{t("evidence.other")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t("evidence.linkedClaim")} <span className="text-destructive">*</span>
          </Label>
          <Select value={claimId} onValueChange={setClaimId}>
            <SelectTrigger>
              <SelectValue placeholder={t("evidence.selectClaim")} />
            </SelectTrigger>
            <SelectContent>
              {claims.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title.slice(0, 40)}{c.title.length > 40 ? "…" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("evidence.tags")}</Label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder={t("evidence.tagsPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("evidence.file")}</Label>
        <Input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="cursor-pointer"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={submitting || !title.trim() || !claimId} className="gap-2">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {t("evidence.upload")}
        </Button>
      </div>
    </form>
  );
}
