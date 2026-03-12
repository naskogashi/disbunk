import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/components/OnboardingModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Loader2, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";

const DEMO_CLAIM = {
  title: "Viral video claims parliament building was stormed during protest",
  description:
    "A video circulating on social media claims to show a storming of the parliament building during a political protest. The video has been shared over 50,000 times across Facebook, Twitter, and Telegram. Initial analysis suggests the footage may be from a different event in a different country, repurposed with misleading captions.",
  sourceUrl: "https://facebook.com/example/post/12345",
  language: "sq",
};

export default function NewClaim() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isComplete: onboardingDone } = useOnboarding();

  const isFirstTime = !onboardingDone;

  const [title, setTitle] = useState(isFirstTime ? DEMO_CLAIM.title : "");
  const [description, setDescription] = useState(isFirstTime ? DEMO_CLAIM.description : "");
  const [sourceUrl, setSourceUrl] = useState(isFirstTime ? DEMO_CLAIM.sourceUrl : "");
  const [language, setLanguage] = useState(isFirstTime ? DEMO_CLAIM.language : "en");
  const [submitting, setSubmitting] = useState(false);
  const [showDemo, setShowDemo] = useState(isFirstTime);

  const clearDemo = () => {
    setTitle("");
    setDescription("");
    setSourceUrl("");
    setLanguage("en");
    setShowDemo(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from("claims")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        source_url: sourceUrl.trim() || null,
        language,
        status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Claim submitted successfully" });
      navigate(`/claims/${data.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Back link */}
      <Link to="/claims" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> {t("claims.title")}
      </Link>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">
                {t("claims.newClaimTitle")}
              </CardTitle>
              <CardDescription>{t("claims.searchPlaceholder")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showDemo && (
            <Alert className="mb-6 border-primary/20 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm text-foreground">{t("claims.demoNotice")}</span>
                <Button variant="ghost" size="sm" onClick={clearDemo} className="text-xs gap-1 shrink-0 ml-2">
                  <X className="h-3 w-3" /> {t("claims.clearDemo")}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                {t("claims.claimTitle")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("claims.claimTitlePlaceholder")}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                {t("claims.description")}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("claims.descriptionPlaceholder")}
                className="min-h-[140px] text-sm leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceUrl" className="text-sm font-medium">
                  {t("claims.sourceUrl")}
                </Label>
                <Input
                  id="sourceUrl"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={t("claims.sourceUrlPlaceholder")}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("claims.language")}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t("claims.selectLanguage")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sq">Shqip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" className="gap-2 px-6" disabled={submitting || !title.trim()}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {t("claims.submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
