import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ModuleError({ error, retry }: { error: unknown; retry?: () => void }) {
  const { t } = useTranslation();
  const message = error instanceof Error ? error.message : (error && typeof error === "object" && "message" in error ? String(error.message) : String(error));
  return <Alert variant="destructive"><AlertTitle>{t("tools.loadError")}</AlertTitle><AlertDescription className="space-y-3"><p>{message}</p><p>{t("tools.migrationHint")}</p>{retry && <Button variant="outline" size="sm" onClick={retry}>{t("tools.retry")}</Button>}</AlertDescription></Alert>;
}
