import { useEffect } from 'react';
import type { PublicLanguage } from '@/lib/public-site';

const copy={
  sq:{title:'Na shkruani',name:'Emri dhe mbiemri',email:'Email-i juaj',subject:'Tema',message:'Mesazhi',files:'Bashkëngjitje (opsionale)',hint:'PDF, imazh ose dokument (maks. 10 MB për skedar). Deri në 3 skedarë.',consent:'Pajtohem që Disbunk t’i përdorë këto të dhëna dhe skedarë për t’iu përgjigjur mesazhit tim.',privacy:'Informacion për privatësinë',send:'Dërgo mesazhin',sending:'Duke dërguar…',success:'Mesazhi juaj u dërgua. Faleminderit që na shkruat.',invalid:'Plotësoni fushat dhe pranoni përdorimin e të dhënave për përgjigjen.',filesError:'Zgjidhni deri në 3 skedarë, jo më shumë se 10 MB secili: PDF, JPG, PNG, GIF, WebP, DOC, DOCX, ODT, RTF ose TXT.',rate:'Keni dërguar disa mesazhe. Provoni përsëri më vonë.',unavailable:'Mesazhi nuk u dërgua. Provoni përsëri më vonë.',remove:'Hiq skedarin',note:'Mos dërgoni fjalëkalime ose materiale që nuk keni të drejtë t’i ndani.'},
  en:{title:'Send us a message',name:'Full name',email:'Your email',subject:'Subject',message:'Message',files:'Attachments (optional)',hint:'PDF, image or document (max. 10 MB per file). Up to 3 files.',consent:'I agree that Disbunk may use these details and files to respond to my message.',privacy:'Privacy information',send:'Send message',sending:'Sending…',success:'Your message has been sent. Thank you for getting in touch.',invalid:'Complete the fields and agree to the use of your details for a reply.',filesError:'Choose up to 3 files, no larger than 10 MB each: PDF, JPG, PNG, GIF, WebP, DOC, DOCX, ODT, RTF or TXT.',rate:'You have sent several messages. Please try again later.',unavailable:'Your message was not sent. Please try again later.',remove:'Remove file',note:'Do not send passwords or material you do not have permission to share.'},
};
export function ContactForm({language}:{language:PublicLanguage}){
  const t=copy[language];
  useEffect(()=>{
    if(document.querySelector('script[src="/contact-form.js"]')){document.dispatchEvent(new Event('disbunk-contact-ready'));return;}
    const script=document.createElement('script');script.src='/contact-form.js';script.defer=true;document.body.append(script);
  },[]);
  const field='mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';
  return <section aria-labelledby="contact-form-title" className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8"><h2 id="contact-form-title" className="text-2xl font-bold">{t.title}</h2>
    <form data-contact-form action={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-message`} method="post" encType="multipart/form-data" className="mt-7 space-y-6" data-invalid={t.invalid} data-files-error={t.filesError} data-rate={t.rate} data-unavailable={t.unavailable} data-success={t.success} data-sending={t.sending} data-send={t.send} data-remove={t.remove}>
      <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold" htmlFor="contact-name">{t.name}<input id="contact-name" name="name" required minLength={2} maxLength={120} autoComplete="name" className={field}/></label><label className="text-sm font-semibold" htmlFor="contact-email">{t.email}<input id="contact-email" name="email" type="email" required maxLength={254} autoComplete="email" className={field}/></label></div>
      <label className="block text-sm font-semibold" htmlFor="contact-subject">{t.subject}<input id="contact-subject" name="subject" required minLength={3} maxLength={160} className={field}/></label>
      <label className="block text-sm font-semibold" htmlFor="contact-message">{t.message}<textarea id="contact-message" name="message" required minLength={20} maxLength={10000} rows={6} className={`${field} resize-y`}/></label>
      <div><label className="block text-sm font-semibold" htmlFor="contact-files">{t.files}</label><p id="contact-files-hint" className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.hint}</p><input id="contact-files" name="files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.odt,.txt,.rtf" aria-describedby="contact-files-hint" className="mt-3 block w-full rounded-xl border border-dashed border-border p-4 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-semibold file:text-foreground"/><ul data-contact-files className="mt-3 space-y-2 text-sm"/></div>
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
      <label className="flex items-start gap-3 text-sm leading-relaxed"><input name="consent" type="checkbox" value="yes" required className="mt-1 size-4 shrink-0 accent-primary"/><span>{t.consent} <a className="underline underline-offset-4" href={language==='sq'?'/privatesia':'/en/privacy'}>{t.privacy}</a></span></label>
      <p className="text-xs leading-relaxed text-muted-foreground">{t.note}</p><p data-contact-status role="status" aria-live="polite" tabIndex={-1} className="text-sm leading-relaxed"/>
      <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground disabled:cursor-wait disabled:opacity-60">{t.send}</button>
    </form>
  </section>;
}
