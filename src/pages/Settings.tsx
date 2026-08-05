import { Bell,Eye,KeyRound,Moon,Save,ShieldCheck,Trash2 } from "lucide-react";
import { useState } from "react";
import { PasskeyManager } from "../components/auth/PasskeyManager";
import { MfaSettings } from "../components/auth/MfaSettings";
import { LegalModal } from "../components/legal/LegalModal";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { Button,Card,Input } from "../components/ui/Common";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import { useFinance } from "../contexts/FinanceContext";
import { usePermissions } from "../hooks/usePermissions";
import { supabase } from "../services/supabase";

const Switch=({value,onChange,label}:{value:boolean;onChange:()=>void;label:string})=><button aria-label={label} onClick={onChange} className={`relative h-7 w-12 shrink-0 rounded-full transition ${value?"bg-blue-600":"bg-zinc-300 dark:bg-zinc-700"}`}><i className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${value?"left-6":"left-1"}`}/></button>;

export function Settings(){
  const{dark,setDark,hiddenValues,setHiddenValues,resetData,notify}=useFinance(),{user,resetPassword}=useAuth(),{profile,activeCompany,reload}=useCompany();
  const permissions=usePermissions();
  const[name,setName]=useState(profile?.fullName??String(user?.user_metadata.full_name??"")),[saving,setSaving]=useState(false),[confirmReset,setConfirmReset]=useState(false),[legal,setLegal]=useState<"privacy"|"terms"|null>(null),[preferences,setPreferences]=useState({financial:true,security:true,important:true,news:false});
  const provider=user?.app_metadata.provider??"email",avatar=profile?.avatarUrl??String(user?.user_metadata.avatar_url??"");
  const save=async()=>{if(!user||!name.trim())return;setSaving(true);const[{error:authError},{error:profileError}]=await Promise.all([supabase.auth.updateUser({data:{full_name:name.trim()}}),supabase.from("profiles").update({full_name:name.trim()}).eq("user_id",user.id)]);setSaving(false);if(!authError&&!profileError)await reload();notify(authError||profileError?"Não foi possível salvar o perfil.":"Perfil atualizado",authError||profileError?"error":"success")};
  const sendReset=async()=>{if(!user?.email)return;await resetPassword(user.email);notify("Se existir uma conta associada a este e-mail, enviaremos as instruções.","success")};
  return <>
    <div className="mb-6"><p className="text-sm text-zinc-500">Personalize sua experiência</p><h2 className="text-3xl font-black">Configurações</h2></div>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Card>
        <h3 className="mb-5 font-bold">Perfil e preferências</h3>
        <div className="mb-5 flex items-center gap-3">{avatar?<img src={avatar} alt="Foto do perfil" className="size-14 rounded-full object-cover"/>:<div className="grid size-14 place-items-center rounded-full bg-blue-600 text-xl font-bold text-white">{name.charAt(0).toUpperCase()}</div>}<div className="min-w-0"><b className="block truncate">{name||"Usuário"}</b><p className="truncate text-xs text-zinc-500">{user?.email}</p></div></div>
        <div className="space-y-4"><label>Nome completo<Input value={name} onChange={e=>setName(e.target.value)}/></label><label>E-mail da conta<Input disabled value={user?.email??""}/><span className="mt-1 block text-xs text-zinc-500">A alteração de e-mail exige verificação pelo Supabase.</span></label><label>Empresa<Input disabled value={activeCompany?.name??"Nenhuma empresa vinculada"}/></label><Button disabled={saving} onClick={()=>void save()}><Save size={17}/>{saving?"Salvando...":"Salvar alterações"}</Button></div>
      </Card>
      <div className="space-y-5">
        <Card><div className="flex items-center justify-between gap-4"><div className="flex gap-3"><Moon className="shrink-0 text-blue-500"/><div><b>Aparência</b><p className="text-xs text-zinc-500">Tema claro ou escuro</p></div></div><Switch value={dark} onChange={()=>setDark(!dark)} label="Alternar tema"/></div><div className="mt-5 flex items-center justify-between gap-4 border-t pt-5 dark:border-zinc-800"><div className="flex gap-3"><Eye className="shrink-0 text-violet-500"/><div><b>Ocultar valores</b><p className="text-xs text-zinc-500">Mascarar informações financeiras</p></div></div><Switch value={hiddenValues} onChange={()=>setHiddenValues(!hiddenValues)} label="Ocultar valores"/></div></Card>
        <Card><div className="flex gap-3"><KeyRound className="shrink-0 text-amber-500"/><div><b>Segurança da conta</b><p className="mb-3 text-xs text-zinc-500">{provider==="google"?"Sua conta utiliza acesso pelo Google.":"Redefina sua senha com verificação por e-mail."}</p>{provider!=="google"&&<Button variant="secondary" onClick={()=>void sendReset()}>Enviar e-mail de redefinição</Button>}</div></div></Card>
        <MfaSettings/>
        <PasskeyManager/>
      </div>
    </div>
    <Card className="mt-5"><div className="mb-5 flex gap-3"><Bell className="shrink-0 text-violet-500"/><div><b>Notificações</b><p className="text-xs text-zinc-500">Escolha os avisos que deseja receber dentro do Hub.</p></div></div><div className="grid gap-4 sm:grid-cols-2">{([['financial','Alertas financeiros'],['security','Alertas de segurança'],['important','Avisos importantes'],['news','Novidades do sistema']] as const).map(([key,label])=><div className="flex items-center justify-between gap-3 rounded-xl border p-3 dark:border-zinc-800" key={key}><span className="text-sm font-medium">{label}</span><Switch value={preferences[key]} onChange={()=>setPreferences(value=>({...value,[key]:!value[key]}))} label={label}/></div>)}</div><p className="mt-4 text-xs text-zinc-500">As preferências estão preparadas na interface; canais externos dependem de infraestrutura de envio.</p></Card>
    <div className="mt-5 grid gap-5 lg:grid-cols-2"><Card><h3 className="font-bold">Documentos</h3><div className="mt-3 flex flex-wrap gap-3 text-sm text-blue-500"><button onClick={()=>setLegal("privacy")}>Política de Privacidade</button><button onClick={()=>setLegal("terms")}>Termos de Uso</button></div></Card><Card><div className="flex gap-3"><ShieldCheck className="shrink-0 text-emerald-500"/><div><b>Conta autorizada</b><p className="text-xs text-zinc-500">A chave de ativação libera a conta; a passkey é um método separado de autenticação.</p></div></div></Card></div>
    {permissions.canWrite&&<Card className="mt-5 border-red-500/30"><h3 className="font-bold text-red-500">Zona de perigo</h3><p className="my-3 text-sm text-zinc-500">Apaga transações e metas da empresa ativa. A conta de autenticação não será removida.</p><Button variant="danger" onClick={()=>setConfirmReset(true)}><Trash2 size={17}/>Apagar meus dados</Button></Card>}
    <ConfirmModal open={confirmReset} title="Apagar dados financeiros" description="Esta ação é permanente e exige sua confirmação." confirmLabel="Apagar dados" danger onClose={()=>setConfirmReset(false)} onConfirm={resetData}/>{legal&&<LegalModal type={legal} onClose={()=>setLegal(null)}/>}</>;
}
