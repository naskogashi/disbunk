export type SignInProvider = "google" | "github" | "facebook" | "x";

// Public Auth settings report enabled providers, never provider credentials.
export async function additionalSignInProviders(): Promise<{ facebook: boolean; x: boolean }> {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) return { facebook: false, x: false };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${base}/auth/v1/settings`, {
      headers: { apikey: key }, signal: controller.signal,
    });
    if (!response.ok) throw new Error("Unable to load sign-in providers");
    const settings = await response.json();
    return { facebook: settings.external?.facebook === true, x: settings.external?.x === true };
  } finally { clearTimeout(timeout); }
}
