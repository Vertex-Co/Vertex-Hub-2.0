import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../services/supabase";
import type { Company, CompanyRole, Profile } from "../types";
import { useAuth } from "./AuthContext";
type Value = {
  profile: Profile | null;
  companies: Company[];
  activeCompany: Company | null;
  companyRole: CompanyRole | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  selectCompany: (id: string) => void;
  reload: () => Promise<void>;
};
const Context = createContext<Value | null>(null);
type ProfileRow = {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  avatar_url: string | null;
  global_role: Profile["globalRole"];
  onboarding_completed: boolean;
  is_authorized: boolean;
  account_type: Profile["accountType"] | null;
  onboarding_state: Profile["onboardingState"];
  selected_company_id: string | null;
};
type CompanyRow = {
  id: string;
  name: string;
  legal_name: string | null;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  status: Company["status"];
  created_at: string;
};
const mapCompany = (r: CompanyRow): Company => ({
  id: r.id,
  name: r.name,
  legalName: r.legal_name ?? undefined,
  cnpj: r.cnpj ?? undefined,
  phone: r.phone ?? undefined,
  email: r.email ?? undefined,
  logoUrl: r.logo_url ?? undefined,
  status: r.status,
  createdAt: r.created_at,
});
export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null),
    [companies, setCompanies] = useState<Company[]>([]),
    [activeCompany, setActive] = useState<Company | null>(null),
    [companyRole, setCompanyRole] = useState<CompanyRole | null>(null),
    [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    let { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!p) {
      const ensured = await supabase.rpc("ensure_onboarding_profile");
      p = ensured.data as typeof p;
    }
    if (!p) {
      setProfile(null);
      setCompanies([]);
      setActive(null);
      setLoading(false);
      return;
    }
    const r = p as ProfileRow;
    const mapped: Profile = {
      userId: r.user_id,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone ?? undefined,
      cpf: r.cpf ?? undefined,
      avatarUrl: r.avatar_url ?? undefined,
      globalRole: r.global_role,
      onboardingCompleted: r.onboarding_completed,
      isAuthorized: Boolean(r.is_authorized) || r.global_role === "super_admin",
      accountType: r.account_type ?? undefined,
      onboardingState: r.onboarding_state ?? "account_created",
      selectedCompanyId: r.selected_company_id ?? undefined,
    };
    setProfile(mapped);
    if (!mapped.isAuthorized || !mapped.onboardingCompleted) {
      setCompanies([]);
      setActive(null);
      setCompanyRole(null);
      setLoading(false);
      return;
    }
    const superAdmin = r.global_role === "super_admin";
    const q = superAdmin
      ? supabase.from("companies").select("*").order("name")
      : supabase
          .from("companies")
          .select("*, company_members!inner(user_id)")
          .eq("company_members.user_id", user.id)
          .order("name");
    const [{ data }, { data: memberships }] = await Promise.all([
      q,
      supabase
        .from("company_members")
        .select("company_id,role")
        .eq("user_id", user.id),
    ]);
    const list = ((data ?? []) as unknown as CompanyRow[]).map(mapCompany);
    setCompanies(list);
    const stored = sessionStorage.getItem("vertex-active-company");
    const selected =
      list.find((x) => x.id === stored) ??
      list.find((x) => x.id === mapped.selectedCompanyId) ??
      list[0] ??
      null;
    setActive(selected);
    const membership = (memberships ?? []).find(
      (m) => m.company_id === selected?.id,
    );
    setCompanyRole((membership?.role as CompanyRole) ?? null);
    setLoading(false);
  }, [user?.id]);
  useEffect(() => {
    void reload();
  }, [reload]);
  const selectCompany = (id: string) => {
    const found = companies.find((x) => x.id === id);
    if (found) {
      sessionStorage.setItem("vertex-active-company", id);
      setActive(found);
      void supabase
        .from("company_members")
        .select("role")
        .eq("company_id", id)
        .eq("user_id", user?.id ?? "")
        .maybeSingle()
        .then(({ data }) =>
          setCompanyRole((data?.role as CompanyRole) ?? null),
        );
    }
  };
  const isSuperAdmin = profile?.globalRole === "super_admin";
  const isAdmin =
    isSuperAdmin || companyRole === "company_owner" || companyRole === "admin";
  const value = useMemo(
    () => ({
      profile,
      companies,
      activeCompany,
      companyRole,
      loading,
      isAdmin,
      isSuperAdmin,
      selectCompany,
      reload,
    }),
    [
      profile,
      companies,
      activeCompany,
      companyRole,
      loading,
      isAdmin,
      isSuperAdmin,
      reload,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useCompany = () => {
  const v = useContext(Context);
  if (!v) throw new Error("CompanyProvider ausente");
  return v;
};
