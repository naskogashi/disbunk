import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const services = [
  { name: "Supabase", category: "coreService", state: "implemented", url: "https://supabase.com/docs" },
  { name: "Sbunker", category: "feedService", state: "implemented", url: "https://sbunker.org/" },
  { name: "SMTP2GO", category: "authEmailService", state: "setupRequired", url: "https://developers.smtp2go.com/docs/send-an-email" },
  { name: "Google Cloud Translation / DeepL", category: "translationService", state: "requiresIntegration", url: "https://docs.cloud.google.com/translate/docs/languages" },
  { name: "SendGrid / Twilio", category: "deliveryService", state: "requiresIntegration", url: "https://www.twilio.com/docs/sendgrid/for-developers/sending-email/api-getting-started" },
  { name: "Slack / Discord / Telegram", category: "teamService", state: "requiresIntegration", url: "https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/" },
  { name: "Raindrop.io", category: "collectionService", state: "requiresIntegration", url: "https://developer.raindrop.io/" },
  { name: "DocumentCloud", category: "documentsService", state: "requiresIntegration", url: "https://help.muckrock.com/API-19ef889269638147bbb7d8cc8af8e0fc" },
  { name: "GitHub / GitLab / X / Facebook", category: "externalService", state: "requiresIntegration", url: "https://docs.github.com/en/rest" },
  { name: "Pocket", category: "retiredService", state: "retired", url: "https://blog.mozilla.org/en/mozilla/building-whats-next/" },
];

export function ServiceCatalog() {
  const { t } = useTranslation();
  return <Card><CardHeader><CardTitle>{t("tools.services")}</CardTitle><p className="text-sm text-muted-foreground">{t("tools.servicesNote")}</p></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{services.map(service => <div key={service.name} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><a href={service.url} target="_blank" rel="noopener noreferrer" className="font-bold underline-offset-4 hover:underline">{service.name}</a><Badge variant={service.state === "implemented" ? "default" : "secondary"}>{t(`tools.${service.state}`)}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{t(`tools.${service.category}`)}</p></div>)}</CardContent></Card>;
}
