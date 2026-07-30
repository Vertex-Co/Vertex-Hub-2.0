import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(url && publishableKey);

// O fallback nunca autentica. Ele evita uma tela branca para que o app possa
// explicar ao responsável pelo deploy quais variáveis precisam ser definidas.
export const supabase = createClient(
  url ?? "https://configuration-required.supabase.co",
  publishableKey ?? "configuration-required",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
