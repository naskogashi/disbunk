import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import "./i18n";
import "./index.css";

// Load the app only after configuration is present: importing App eagerly
// initializes the Supabase client, which throws when its URL/key are missing.
const App = lazy(() => import("./App.tsx"));
const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL?.trim() &&
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
);

createRoot(document.getElementById("root")!).render(
  configured ? (
    <Suspense fallback={<p role="status">Loading Disbunk…</p>}>
      <App />
    </Suspense>
  ) : (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-background text-foreground">
      <h1 className="text-2xl font-bold">Disbunk setup required</h1>
      <p>Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>
      <p>Restart the development server, or rebuild and redeploy after configuring these values.</p>
    </main>
  )
);
