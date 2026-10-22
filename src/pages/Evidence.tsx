import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { sha256, redactImage } from "@/lib/response-tools";

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
  sha256?: string | null;
  original_sha256?: string | null;
  metadata_redacted?: boolean;
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

function SignedEvidenceImage({ path, title }: { path: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    supabase.storage.from("evidence").createSignedUrl(path, 3600).then(({ data }) => {
      if (active) setUrl(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [path]);
  return url ? <img src={url} alt={title} className="h-full w-full object-cover" loading="lazy" /> : <File className="h-10 w-10 text-muted-foreground/30" />;
}

export default function Evidence() {
  const { t } = useTranslation();
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const canUpload = hasAnyRole(["analyst", "editor", "team_lead", "admin"]);

  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [claims, setClaims] = useState<ClaimOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [claimFilter, setClaimFilter] = useState<string>(searchParams.get("claim") || "all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getSignedUrl = async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("evidence")
      .createSignedUrl(path, 3600);
    return error ? null : data.signedUrl;
  };

  const handleDownload = async (filePath: string) => {
    const url = await getSignedUrl(filePath);
    if (url) window.open(url, "_blank");
  };

  const verifyIntegrity = async (item: EvidenceRow) => {
    try {
      const url = await getSignedUrl(item.file_url!);
      if (!url) throw new Error(t("tools.downloadFailed"));
      const response = await fetch(url);
      if (!response.ok) throw new Error(t("tools.downloadFailed"));
      const actual = await sha256(await response.blob());
      toast({ title: actual === item.sha256 ? t("tools.integrityPassed") : t("tools.integrityFailed"), variant: actual === item.sha256 ? "default" : "destructive" });
    } catch (error) { toast({ title: t("auth.error"), description: error instanceof Error ? error.message : String(error), variant: "destructive" }); }
  };

  const handleBulkDownload = async () => {
    if (!claimFilter || claimFilter === "all") {
      toast({ title: t("evidence.selectClaimForBulk"), variant: "destructive" });
      return;
    }
    setDownloading(true);
    const filesForClaim = filtered.filter((e) => e.file_url);
    
    // Download files individually (zip requires a library not installed)
    for (const item of filesForClaim) {
      if (item.file_url) {
        const url = await getSignedUrl(item.file_url);
        if (url) {
          const a = document.createElement("a");
          a.href = url;
          a.download = item.title;
          a.click();
        }
      }
    }
    setDownloading(false);
    toast({ title: t("evidence.bulkDownloadStarted", { count: filesForClaim.length }) });
  };

  const fetchEvidence = async () => {
    setLoading(true);
    let query = supabase
      .from("evidence")
      .select("*, claims(id, title)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (typeFilter !== "all") query = query.eq("type", typeFilter);
    if (claimFilter !== "all") query = query.eq("claim_id", claimFilter);

    const [evidenceRes, claimsRes] = await Promise.all([
      query,
      supabase.from("claims").select("id, title").order("created_at", { ascending: false }).limit(100),
    ]);

    if (evidenceRes.error || claimsRes.error) toast({ title: t("auth.error"), description: (evidenceRes.error || claimsRes.error)?.message, variant: "destructive" });
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
          {claimFilter !== "all" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleBulkDownload}
              disabled={downloading}
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {t("evidence.bulkDownload")}
            </Button>
          )}
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
                    <SignedEvidenceImage path={item.file_url!} title={item.title} />
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
                  {item.sha256 && <div className="space-y-1 border-t pt-2"><p className="text-xs text-muted-foreground">SHA-256</p><p className="break-all font-mono text-[10px]">{item.sha256}</p>{item.metadata_redacted && <p className="text-xs text-success">{t("tools.metadataRemoved")}</p>}<Button size="sm" variant="outline" onClick={() => verifyIntegrity(item)}>{t("tools.verifyIntegrity")}</Button></div>}
                  {item.file_url && (
                    <button
                      onClick={() => handleDownload(item.file_url!)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      <Download className="h-3 w-3" /> {t("evidence.download")}
                    </button>
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
  const [removeMetadata, setRemoveMetadata] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !claimId || !userId) return;

    setSubmitting(true);
    let uploadedPath: string | null = null;
    try {
      if (file && file.size > 50 * 1024 * 1024) throw new Error(t("tools.fileTooLarge"));
      const originalHash = file ? await sha256(file) : null;
      const redacted = !!file && removeMetadata && ["image/jpeg", "image/png", "image/webp"].includes(file.type);
      const uploadFile = file && redacted ? await redactImage(file) : file;
      if (uploadFile && uploadFile.size > 50 * 1024 * 1024) throw new Error(t("tools.fileTooLarge"));
      const storedHash = uploadFile === file ? originalHash : uploadFile ? await sha256(uploadFile) : null;
      if (uploadFile) {
        const extension = uploadFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0,10) || "bin";
        const path = `${userId}/${claimId}/${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from("evidence").upload(path, uploadFile, { contentType: uploadFile.type });
        if (upload.error) throw upload.error;
        uploadedPath = path;
      }
      const result = await supabase.from("evidence").insert({
        claim_id: claimId, title: title.trim(), type, file_url: uploadedPath, uploaded_by: userId,
        tags: tags.split(",").map(tag => tag.trim()).filter(Boolean),
        sha256: storedHash, original_sha256: originalHash, metadata_redacted: redacted, file_size: uploadFile?.size ?? null,
      });
      if (result.error) throw result.error;
      onComplete();
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("evidence").remove([uploadedPath]);
      onError(error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : String(error));
    } finally { setSubmitting(false); }
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
        <div className="mr-auto max-w-sm space-y-2 pr-3"><label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={removeMetadata} onChange={event => setRemoveMetadata(event.target.checked)} />{t("tools.removeMetadata")}</label><p className="text-xs text-muted-foreground">{t("tools.hashNote")}</p></div>
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
