import { FileText, CheckCircle, XCircle, Clock, ArrowRight, Plus, Shield } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClaimStatusBadge } from "@/components/ClaimStatusBadge";
import { Link } from "react-router-dom";

const recentClaims = [
  { id: "CLM-0042", title: "Viral video claims parliament building was stormed", status: "investigating" as const, date: "2 hours ago" },
  { id: "CLM-0041", title: "False election fraud statistics shared on social media", status: "debunked" as const, date: "5 hours ago" },
  { id: "CLM-0040", title: "Manipulated photo of political leader circulating", status: "pending" as const, date: "8 hours ago" },
  { id: "CLM-0039", title: "Verified: Water contamination report confirmed by EPA", status: "verified" as const, date: "1 day ago" },
];

const sbunkerArticles = [
  { title: "How disinformation campaigns target Balkan elections", url: "#", date: "Mar 10, 2026" },
  { title: "New wave of AI-generated content floods social media", url: "#", date: "Mar 8, 2026" },
  { title: "Fact-checking partnerships expand across Southeast Europe", url: "#", date: "Mar 5, 2026" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your misinformation response operations</p>
        </div>
        <div className="flex gap-2">
          <Link to="/claims">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Claim
            </Button>
          </Link>
          <Link to="/evidence">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Add Evidence
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Claims" value={142} icon={FileText} trend="+12 this week" variant="primary" />
        <StatCard title="Verified" value={38} icon={CheckCircle} trend="26.8% of total" variant="success" />
        <StatCard title="Debunked" value={67} icon={XCircle} trend="47.2% of total" variant="destructive" />
        <StatCard title="In Progress" value={37} icon={Clock} trend="14 assigned to you" variant="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Claims */}
        <Card className="lg:col-span-2 border-border card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Claims</CardTitle>
              <Link to="/claims">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentClaims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="claim-id shrink-0">{claim.id}</span>
                  <span className="text-sm text-foreground truncate">{claim.title}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <ClaimStatusBadge status={claim.status} />
                  <span className="text-xs text-muted-foreground hidden sm:inline">{claim.date}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sbunker Widget */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sbunker Feed</CardTitle>
              <Link to="/sbunker">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                  More <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sbunkerArticles.map((article) => (
              <div key={article.title} className="space-y-1 pb-3 border-b border-border last:border-0 last:pb-0">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors leading-snug block"
                >
                  {article.title}
                </a>
                <p className="text-xs text-muted-foreground">{article.date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
