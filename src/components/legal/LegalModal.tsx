import { useEffect,useState } from "react";
import { supabase } from "../../services/supabase";
import { Modal } from "../ui/Common";
import { TermsContent } from "./TermsContent";
export function LegalModal({type,onClose}:{type:"privacy"|"terms";onClose:()=>void}){
 const[current,setCurrent]=useState(type),[settings,setSettings]=useState({platformName:"Vertex Hub",contact:""});
 useEffect(()=>{void supabase.from("global_settings").select("key,value").in("key",["platform_name","commercial_email","commercial_whatsapp"]).then(({data})=>{const values=Object.fromEntries((data??[]).map(row=>[row.key,row.value]));setSettings({platformName:values.platform_name||"Vertex Hub",contact:values.commercial_email||values.commercial_whatsapp||""})})},[]);
 return <Modal title={current==="privacy"?"Política de Privacidade":"Termos de Uso do Vertex Hub"} onClose={onClose} panelClassName="sm:max-w-5xl"><TermsContent type={current} platformName={settings.platformName} contact={settings.contact} onSwitch={setCurrent}/></Modal>;
}
