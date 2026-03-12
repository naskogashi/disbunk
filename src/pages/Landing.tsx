import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, Search, Users, CheckCircle } from "lucide-react";

const steps = [
  { icon: Search, title: "Submit", desc: "Report a suspicious claim with source links and context." },
  { icon: Users, title: "Investigate", desc: "Analysts verify claims with evidence, coordinated in teams." },
  { icon: CheckCircle, title: "Respond", desc: "Publish findings rapidly — verified, debunked, or escalated." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-foreground">Disbunk.org</span>
            <span className="hidden sm:inline text-xs text-muted-foreground ml-2 tracking-wide">
              Rapid, credible, coordinated.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
            EN / SQ
          </Button>
          <Link to="/dashboard">
            <Button size="sm">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
            Open-source misinformation response platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight">
            Fight disinfo,{" "}
            <span className="text-primary">together.</span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Submit claims, coordinate investigations, and respond to digital misinformation — rapidly, credibly, and as a team.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/dashboard">
              <Button size="lg" className="gap-2 px-6">
                Submit a Claim <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="px-6">
                Learn How It Works
              </Button>
            </a>
          </div>
        </div>

        {/* Steps */}
        <div id="how-it-works" className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {steps.map((step, i) => (
            <div key={step.title} className="text-center space-y-3 p-6 rounded-xl border border-border bg-card">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                <h3 className="font-semibold text-foreground">{step.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-4xl mx-auto text-center">
          This web page is produced as part of the Hackathon activity under the CIVICUS Digital Democracy Initiative (DDI), implemented by Metamorphosis Foundation in partnership with Civic Literacy Initiative.
        </p>
      </footer>
    </div>
  );
}
