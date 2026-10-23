import { useTranslation } from "react-i18next";
export function LocalizedText({ id }: { id: string }) {
  const { t } = useTranslation();
  return <>{t(id)}</>;
}
