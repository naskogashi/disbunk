import { supabase } from "@/lib/supabase";

export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const result = await supabase.functions.invoke(name, { body });
  if (result.error) {
    const context = result.error.context;
    let message = result.error.message;
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null);
      if (typeof payload?.error === "string") message = payload.error;
    }
    throw new Error(message);
  }
  if (result.data?.error) throw new Error(String(result.data.error));
  return result.data as T;
}
