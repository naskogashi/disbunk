import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ admin: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ hasRole: () => auth.admin }) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
import { ServiceCatalog } from "@/components/ServiceCatalog";
afterEach(cleanup);
it("shows the curated integration roadmap only to admins", () => {
  auth.admin = false; const view = render(<ServiceCatalog/>);
  expect(screen.queryByText("SMTP2GO")).not.toBeInTheDocument();
  auth.admin = true; view.rerender(<ServiceCatalog/>);
  expect(screen.getByText("SMTP2GO")).toBeInTheDocument();
  expect(screen.getByText("DocumentCloud")).toBeInTheDocument();
  expect(screen.queryByText(/SendGrid|Raindrop|GitLab|Pocket/)).not.toBeInTheDocument();
});
