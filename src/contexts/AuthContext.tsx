import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../services/supabase";
import { signInWithPasskey as performPasskeySignIn } from "../services/passkeys";

type AuthResult = { error?: string; confirmationRequired?: boolean };
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithPasskey: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    },
    signUp: async (name, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) return { error: error.message };
      return { confirmationRequired: !data.session };
    },
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      return error ? { error: error.message } : {};
    },
    signInWithGoogle: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (!error) return {};
      const message = error.message.toLowerCase();
      if (message.includes("provider") || message.includes("unsupported")) return { error: "O acesso com Google ainda não está configurado." };
      if (message.includes("redirect")) return { error: "A URL de retorno não está autorizada. Verifique a configuração do Supabase." };
      return { error: "Não foi possível entrar com o Google. Tente novamente." };
    },
    signInWithPasskey: performPasskeySignIn,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider ausente");
  return value;
}
