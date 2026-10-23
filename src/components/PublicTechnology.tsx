import { useTranslation } from 'react-i18next';
import { Network, Filter, Radar, Languages, Files, BellRing, ArrowUpRight, Check } from 'lucide-react';

export function PublicTechnology() {
  const { t } = useTranslation();
  const benefits = [
    { key:'grouping',icon:Network },
    { key:'noise',icon:Filter },
    { key:'earlier',icon:Radar },
  ];
  const integrations = [
    { name:'Google Cloud Translation',key:'translation',icon:Languages,url:'https://cloud.google.com/translate' },
    { name:'DocumentCloud',key:'documents',icon:Files,url:'https://www.documentcloud.org/' },
    { name:'Slack / Discord / Telegram',key:'notifications',icon:BellRing,url:null },
  ];
  return <section id="technology" aria-labelledby="technology-title" className="border-b border-border bg-secondary/30">
    <div className="page-wrap py-16 lg:py-24">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div><p className="eyebrow">{t('publicTools.eyebrow')}</p><h2 id="technology-title" className="mt-4 max-w-xl text-3xl font-extrabold sm:text-4xl">{t('publicTools.title')}</h2></div>
        <div className="space-y-4 text-base leading-relaxed text-muted-foreground"><p>{t('publicTools.mission')}</p><p>{t('publicTools.challenge')}</p></div>
      </div>
      <article className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid gap-6 border-b border-border p-6 sm:p-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success"><Check className="size-3.5"/>{t('publicTools.active')}</span><h3 className="mt-5 text-3xl font-extrabold">HDBSCAN</h3><p className="mt-2 text-sm text-muted-foreground">{t('publicTools.hdbscanLabel')}</p></div>
          <div className="space-y-4"><p className="text-lg font-semibold leading-relaxed">{t('publicTools.intro')}</p><p className="text-sm leading-relaxed text-muted-foreground">{t('publicTools.example')}</p></div>
        </div>
        <div className="grid md:grid-cols-3">{benefits.map(({key,icon:Icon},index)=><div key={key} className="border-b border-border p-6 last:border-0 sm:p-8 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between"><Icon className="size-5 text-primary" strokeWidth={1.7}/><span className="font-mono text-xs text-muted-foreground">0{index+1}</span></div>
          <h4 className="mt-6 text-lg font-bold">{t(`publicTools.${key}Title`)}</h4><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(`publicTools.${key}Body`)}</p>
        </div>)}</div>
        <div className="grid gap-3 border-t border-border bg-secondary/40 p-6 sm:p-8 lg:grid-cols-[1fr_2fr] lg:gap-12"><h4 className="text-base font-bold">{t('publicTools.whyTitle')}</h4><p className="text-sm leading-relaxed text-muted-foreground">{t('publicTools.whyBody')}</p></div>
      </article>
      <p className="mt-5 max-w-4xl text-sm leading-relaxed text-muted-foreground">{t('publicTools.boundaries')}</p>
      <div className="mt-14 flex flex-wrap items-end justify-between gap-4"><h3 className="text-2xl font-bold">{t('publicTools.integrationsTitle')}</h3><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t('publicTools.integrationsNote')}</p></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">{integrations.map(({name,key,icon:Icon,url})=><article key={key} className="flex flex-col rounded-xl border border-border bg-card p-6">
        <Icon className="size-5 text-primary" strokeWidth={1.7}/>
        <h4 className="mt-6 text-lg font-bold">{name}</h4><p className="mb-5 mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{t(`publicTools.${key}Body`)}</p>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-primary" aria-label={t('publicTools.visit',{name})}>{t('publicTools.learnMore')}<ArrowUpRight className="size-4"/></a>}
      </article>)}</div>
    </div>
  </section>;
}
