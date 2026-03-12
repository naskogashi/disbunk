import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, Github, Loader2, CheckCircle, ArrowLeft, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, loading, signInWithMagicLink, signInWithOAuth } = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const currentLang = i18n.language?.startsWith("sq") ? "sq" : "en";
  const toggleLang = () => i18n.changeLanguage(currentLang === "en" ? "sq" : "en");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    const { error } = await signInWithMagicLink(email);
    setSending(false);
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    const { error } = await signInWithOAuth(provider);
    if (error) {
      toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-foreground">Disbunk.org</span>
            <span className="hidden sm:inline text-xs text-muted-foreground ml-2 tracking-wide">
              {t("landing.tagline")}
            </span>
          </div>
        </Link>
        <Button variant="ghost" size="sm" className="text-xs font-mono text-muted-foreground" onClick={toggleLang}>
          {currentLang === "en" ? "EN → SQ" : "SQ → EN"}
        </Button>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md animate-fade-in">
          {sent ? (
            <MagicLinkSent email={email} onBack={() => setSent(false)} t={t} />
          ) : (
            <Card className="border-border">
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <KeyRound className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {t("auth.signInTitle")}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {t("auth.signInDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                {/* OAuth */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="gap-2 h-11"
                    onClick={() => handleOAuth("google")}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 h-11"
                    onClick={() => handleOAuth("github")}
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-medium tracking-wider">
                      {t("auth.orContinueWith")}
                    </span>
                  </div>
                </div>

                {/* Magic link */}
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      {t("auth.email")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 gap-2 font-medium" disabled={sending}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    {t("auth.sendMagicLink")}
                  </Button>
                </form>

                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  {t("auth.signUpNote")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-4xl mx-auto text-center">
          {t("common.footer")}
        </p>
      </footer>
    </div>
  );
}

function MagicLinkSent({ email, onBack, t }: { email: string; onBack: () => void; t: (k: string) => string }) {
  return (
    <Card className="border-border animate-scale-in">
      <CardContent className="pt-8 pb-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">{t("auth.checkEmail")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("auth.magicLinkSent")} <strong className="text-foreground">{email}</strong>
          </p>
        </div>
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 text-left p-3 rounded-lg bg-muted/50 border border-border">
            <Mail className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">{t("auth.checkInbox")}</p>
              <p className="text-[11px] text-muted-foreground">{t("auth.checkSpam")}</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("auth.tryAnother")}
        </Button>
      </CardContent>
    </Card>
  );
}
