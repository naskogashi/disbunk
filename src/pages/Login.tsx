import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, Github, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const { signInWithMagicLink } = useAuth();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    const { error } = await signInWithMagicLink(email);
    setSending(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-foreground">Disbunk.org</span>
            <span className="hidden sm:inline text-xs text-muted-foreground ml-2 tracking-wide">
              Rapid, credible, coordinated.
            </span>
          </div>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Sign in to Disbunk</CardTitle>
            <CardDescription>
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OAuth buttons */}
            <div className="grid grid-cols-2 gap-3">
              <OAuthButton provider="google" />
              <OAuthButton provider="github" />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or continue with</span>
              </div>
            </div>

            {/* Magic link form */}
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <p className="font-medium text-foreground">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  We sent a magic link to <strong>{email}</strong>. Click it to sign in.
                </p>
                <Button variant="ghost" size="sm" onClick={() => setSent(false)}>
                  Try another email
                </Button>
              </div>
            ) : (
              <MagicLinkForm
                email={email}
                setEmail={setEmail}
                sending={sending}
                onSubmit={handleMagicLink}
              />
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border px-6 py-6">
        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-4xl mx-auto text-center">
          This web page is produced as part of the Hackathon activity under the CIVICUS Digital Democracy Initiative (DDI), implemented by Metamorphosis Foundation in partnership with Civic Literacy Initiative.
        </p>
      </footer>
    </div>
  );
}

function OAuthButton({ provider }: { provider: "google" | "github" }) {
  const { signInWithOAuth } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const { error } = await signInWithOAuth(provider);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading} className="gap-2">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : provider === "google" ? (
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      ) : (
        <Github className="h-4 w-4" />
      )}
      {provider === "google" ? "Google" : "GitHub"}
    </Button>
  );
}

function MagicLinkForm({
  email,
  setEmail,
  sending,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  sending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full gap-2" disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        Send Magic Link
      </Button>
    </form>
  );
}
