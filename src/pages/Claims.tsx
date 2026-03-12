import { useState } from "react";
import { ClaimStatusBadge } from "@/components/ClaimStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";

type ClaimStatus = "pending" | "investigating" | "verified" | "debunked" | "escalated";

interface Claim {
  id: string;
  title: string;
  description: string;
  status: ClaimStatus;
  source: string;
  createdBy: string;
  date: string;
  lang: string;
}

const mockClaims: Claim[] = [
  { id: "CLM-0042", title: "Viral video claims parliament building was stormed", description: "A video circulating on social media claims to show a storming of the parliament building. The video has been shared over 50,000 times across multiple platforms.", status: "investigating", source: "facebook.com", createdBy: "Ana M.", date: "2026-03-12", lang: "sq" },
  { id: "CLM-0041", title: "False election fraud statistics shared on social media", description: "A graphic claiming 30% of votes were fraudulent has been widely shared. No official source supports this claim.", status: "debunked", source: "twitter.com", createdBy: "Mark T.", date: "2026-03-12", lang: "en" },
  { id: "CLM-0040", title: "Manipulated photo of political leader circulating", description: "A photo appearing to show a political leader at an inappropriate event has been digitally altered.", status: "pending", source: "telegram.org", createdBy: "Sara K.", date: "2026-03-11", lang: "sq" },
  { id: "CLM-0039", title: "Water contamination report confirmed by environmental agency", description: "Reports of water contamination in the northern region have been confirmed by the Environmental Protection Agency.", status: "verified", source: "news.al", createdBy: "Erion B.", date: "2026-03-10", lang: "en" },
  { id: "CLM-0038", title: "Claim of mass surveillance program launched without oversight", description: "Multiple social media posts allege a new mass surveillance program. This claim requires urgent investigation.", status: "escalated", source: "reddit.com", createdBy: "Lina P.", date: "2026-03-09", lang: "en" },
];

export default function Claims() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = mockClaims.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Claims</h1>
          <p className="text-sm text-muted-foreground mt-1">{mockClaims.length} claims tracked</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Claim
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search claims..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="debunked">Debunked</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Claims List */}
      <div className="space-y-3">
        {filtered.map((claim) => (
          <Card key={claim.id} className="border-border card-hover cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="claim-id">{claim.id}</span>
                    <ClaimStatusBadge status={claim.status} />
                    <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 uppercase font-mono">
                      {claim.lang}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground leading-snug">{claim.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{claim.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Source: {claim.source}</span>
                    <span>By: {claim.createdBy}</span>
                    <span>{claim.date}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card className="border-border border-dashed">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-sm">No claims match your filters.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
