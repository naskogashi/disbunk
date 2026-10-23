import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { displayDateTime } from '@/lib/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Suggestion {
  id: string; title: string; team_id: string | null;
  narrative_suggestion_claims: { strength: number; claims: { id: string; title: string } | null }[];
}
interface Run { id: string; status: string; started_at: string; claim_count: number; group_count: number }

export function NarrativeSuggestions({ onAccepted }: { onAccepted: () => void }) {
  const { hasRole } = useAuth();
  if (!hasRole('admin')) return null;
  return <AdminSuggestions onAccepted={onAccepted} />;
}

function AdminSuggestions({ onAccepted }: { onAccepted: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  async function load() {
    setLoading(true);
    const [suggestions, runs] = await Promise.all([
      supabase.from('narrative_suggestions').select('id,title,team_id,narrative_suggestion_claims(strength,claims(id,title))')
        .eq('status','pending').order('created_at',{ascending:false}).limit(20),
      supabase.from('cluster_runs').select('id,status,started_at,claim_count,group_count').order('started_at',{ascending:false}).limit(1),
    ]);
    setError(Boolean(suggestions.error || runs.error));
    setItems((suggestions.data ?? []) as unknown as Suggestion[]);
    setRun(runs.data?.[0] ?? null);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  async function review(item: Suggestion, decision: 'accepted' | 'rejected') {
    setBusy(item.id);
    try {
      const { error } = await supabase.rpc('review_narrative_suggestion', {
        suggestion_id:item.id, decision, campaign_name:names[item.id] ?? item.title,
      });
      if (error) throw error;
      toast({title:t(`clustering.${decision}`)});
      if (decision==='accepted') onAccepted();
      await load();
    } catch {
      toast({title:t('clustering.reviewError'),variant:'destructive'});
    } finally { setBusy(null); }
  }
  return <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3">
    <CardTitle>{t('clustering.title')}</CardTitle>
    <Button variant="outline" size="sm" disabled={loading || busy!==null} onClick={() => void load()}>{t('clustering.refresh')}</Button>
  </div><p className="text-sm text-muted-foreground">{t('clustering.description')}</p></CardHeader>
    <CardContent className="space-y-4" aria-busy={loading}>
      {loading ? <p role="status">{t('clustering.loading')}</p> : error ? <p role="alert">{t('clustering.unavailable')}</p> : <>
        {run ? <p className="text-sm text-muted-foreground">{t('clustering.run',{date:displayDateTime(run.started_at),status:t(`clustering.${run.status}`),claims:run.claim_count,groups:run.group_count})}</p>
          : <p className="text-sm text-muted-foreground">{t('clustering.notRun')}</p>}
        {items.length===0 && run && <p className="text-sm">{t('clustering.empty')}</p>}
        {items.map(item => <div key={item.id} className="space-y-3 rounded-xl border p-4">
          <label className="block space-y-2 text-sm font-medium">
            <span>{t('clustering.name')}</span><Input maxLength={160} value={names[item.id] ?? item.title} onChange={e => setNames(previous=>({...previous,[item.id]:e.target.value}))} />
          </label>
          <ul className="space-y-2 text-sm">{item.narrative_suggestion_claims.map((member,index)=>member.claims && <li key={member.claims.id}>
            <Link className="underline underline-offset-4" to={`/claims/${member.claims.id}`}>{member.claims.title}</Link>
            <span className="ml-2 text-xs text-muted-foreground">{t('clustering.strength',{value:Math.round(member.strength*100),index:index+1})}</span>
          </li>)}</ul>
          <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy!==null || (names[item.id] ?? item.title).trim().length<3} onClick={()=>void review(item,'accepted')}>{t('clustering.accept')}</Button>
            <Button size="sm" variant="outline" disabled={busy!==null} onClick={()=>void review(item,'rejected')}>{t('clustering.reject')}</Button></div>
        </div>)}
      </>}
      <p className="text-xs text-muted-foreground">{t('clustering.caution')}</p>
    </CardContent>
  </Card>;
}
