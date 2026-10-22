import { Component, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

class PageBoundary extends Component<{ children: ReactNode; path: string; title: string; description: string; reload: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: Readonly<typeof this.props>) {
    if (previous.path !== this.props.path && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="mx-auto max-w-xl space-y-4 p-8" role="alert"><h1 className="text-2xl font-bold">{this.props.title}</h1><p>{this.props.description}</p><button type="button" className="rounded-lg bg-primary px-5 py-3 text-primary-foreground" onClick={() => window.location.reload()}>{this.props.reload}</button></main>;
  }
}
export function RouteErrorBoundary({children}: {children: ReactNode}) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  return <PageBoundary path={pathname} title={t("seo.loadFailed")} description={t("seo.retryMessage")} reload={t("seo.reload")}>{children}</PageBoundary>;
}
