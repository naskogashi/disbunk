"""One bounded batch. Run under a systemd CPU/memory limit, never as a web request."""
import os
for name in ('OMP_NUM_THREADS', 'MKL_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'NUMEXPR_NUM_THREADS'):
    os.environ[name] = '1'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

import json
from collections import defaultdict
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from core import MODEL, REVISION, MODEL_KEY, source_hash, fingerprint, group_vectors, embed_claim


def main():
    # Dedicated database login; never a browser key. URL must enforce TLS.
    url = os.environ['DISBUNK_WORKER_DATABASE_URL']
    run_id = None
    with psycopg.connect(url, sslmode='verify-full', sslrootcert=os.path.join(os.path.dirname(__file__),'supabase-ca.crt'), connect_timeout=15, autocommit=True, row_factory=dict_row) as db:
        if not db.execute('select pg_try_advisory_lock(782348102) as locked').fetchone()['locked']:
            print('Another batch is active; skipped')
            return
        try:
            db.execute("set statement_timeout='30s'")
            db.execute("update public.cluster_runs set status='failed',finished_at=now(),error_code='interrupted' where status='running'")
            run_id = db.execute("insert into public.cluster_runs(model,parameters) values(%s,%s) returning id",
                (MODEL_KEY, Jsonb({'days':90,'limit':500,'min_cluster_size':5,'min_samples':3}))).fetchone()['id']
            claims = db.execute("""select id,title,description,team_id,updated_at from public.claims
                where created_at>=now()-interval '90 days'
                order by created_at desc,id limit 500""").fetchall()
            cache = {str(c['claim_id']): c for c in db.execute('select * from public.claim_embedding_cache where claim_id=any(%s)', ([c['id'] for c in claims],)).fetchall()}
            scopes = defaultdict(list)
            model = None
            skipped = 0
            for claim in claims:
                digest = source_hash(claim)
                cached = cache.get(str(claim['id']))
                if cached and cached['model']==MODEL_KEY and cached['source_hash']==digest:
                    vector = cached['embedding']
                else:
                    if model is None:
                        import torch
                        from sentence_transformers import SentenceTransformer
                        torch.set_num_threads(1)
                        model = SentenceTransformer(MODEL, revision=REVISION, device='cpu', trust_remote_code=False, local_files_only=True)
                    vector = embed_claim(model, claim)
                    if vector is None:
                        skipped += 1
                        continue
                    db.execute("""insert into public.claim_embedding_cache(claim_id,source_hash,model,embedding)
                        values(%s,%s,%s,%s) on conflict(claim_id) do update set source_hash=excluded.source_hash,
                        model=excluded.model,embedding=excluded.embedding,generated_at=now()""",
                        (claim['id'],digest,MODEL_KEY,vector))
                scopes[claim['team_id']].append((claim,vector))
            groups = 0
            with db.transaction():
                # Expire only unreviewed proposals; identical proposals retain IDs/decisions.
                db.execute("update public.narrative_suggestions set status='superseded' where status='pending'")
                for scope, members in scopes.items():
                    labels, strengths = group_vectors([m[1] for m in members])
                    for label in sorted(set(labels)-{-1,-2,-3}):
                        indices = [i for i, value in enumerate(labels) if value==label]
                        selected = [members[i][0] for i in indices]
                        # Recheck after model work; no stale/changed membership is published.
                        current = db.execute('select id,title,description,team_id,updated_at from public.claims where id=any(%s)',
                            ([c['id'] for c in selected],)).fetchall()
                        if fingerprint(current)!=fingerprint(selected):
                            continue
                        versions = {c['id']:c['updated_at'] for c in current}
                        result = db.execute("""insert into public.narrative_suggestions(run_id,team_id,fingerprint,title)
                            values(%s,%s,%s,%s) on conflict(fingerprint) do update set run_id=excluded.run_id,
                            status=case when narrative_suggestions.status='superseded' then 'pending' else narrative_suggestions.status end
                            returning id,status""", (run_id,scope,fingerprint(selected),selected[0]['title'][:160])).fetchone()
                        if result['status']=='pending':
                            for i in indices:
                                claim = members[i][0]
                                db.execute("""insert into public.narrative_suggestion_claims(suggestion_id,claim_id,source_hash,strength,source_updated_at)
                                    values(%s,%s,%s,%s,%s) on conflict(suggestion_id,claim_id) do update
                                    set strength=excluded.strength,source_updated_at=excluded.source_updated_at""",
                                    (result['id'],claim['id'],source_hash(claim),float(strengths[i]),versions[claim['id']]))
                        groups += 1
                db.execute("update public.cluster_runs set status='completed',finished_at=now(),claim_count=%s,group_count=%s,parameters=parameters||%s where id=%s",
                    (len(claims),groups,Jsonb({'skipped_long_or_empty':skipped}),run_id))
            print(json.dumps({'status':'completed','claims':len(claims),'groups':groups,'skipped':skipped}))
        except Exception:
            if run_id:
                db.execute("update public.cluster_runs set status='failed',finished_at=now(),error_code='worker_error' where id=%s", (run_id,))
            # Avoid logging database URLs, claim text or provider tokens in exception messages.
            print('Clustering failed; check database/runtime configuration')
            raise SystemExit(1)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('Worker startup failed; check private database configuration and CA certificate')
        raise SystemExit(1)
