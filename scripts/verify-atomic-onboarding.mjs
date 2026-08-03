import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration=readFileSync(resolve("supabase/migrations/202608030002_atomic_onboarding.sql"),"utf8");
const app=readFileSync(resolve("src/App.tsx"),"utf8");
const onboarding=readFileSync(resolve("src/pages/Onboarding.tsx"),"utf8");
const required=["for update","activation_key_expired","activation_key_wrong_type","activation_key_wrong_company","access_confirmation_failed","onboarding_completed=true","status=case when use_count+1>=max_uses"];
for(const marker of required)if(!migration.includes(marker))throw new Error(`Proteção ausente: ${marker}`);
const membership=migration.indexOf("insert into public.company_members",migration.indexOf("complete_activation_onboarding"));
const profile=migration.indexOf("update public.profiles set is_authorized=true",membership);
const confirmation=migration.indexOf("access_confirmation_failed",profile);
const consumption=migration.indexOf("update public.activation_keys set use_count=use_count+1",confirmation);
if(!(membership>0&&profile>membership&&confirmation>profile&&consumption>confirmation))throw new Error("A chave deve ser consumida somente após vínculo, perfil e confirmação de acesso.");
if(!app.includes("!profile.isAuthorized||!profile.onboardingCompleted"))throw new Error("O guard não bloqueia onboarding incompleto.");
if(!onboarding.includes("complete_activation_onboarding"))throw new Error("O frontend não usa a RPC atômica.");
console.log("Onboarding atômico: verificações estruturais aprovadas.");
