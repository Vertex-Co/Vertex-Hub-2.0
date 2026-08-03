import { Eye,EyeOff,LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Input } from "../ui/Common";
type Props={label:string;value:string;onChange:(value:string)=>void;autoComplete:"current-password"|"new-password";minLength?:number;required?:boolean};
export function PasswordInput({label,value,onChange,autoComplete,minLength=8,required=true}:Props){
 const[visible,setVisible]=useState(false);
 return <label>{label}<div className="relative"><LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-500" size={17}/><Input required={required} minLength={minLength} autoComplete={autoComplete} type={visible?"text":"password"} value={value} onChange={event=>onChange(event.target.value)} className="!pl-11 !pr-11"/><button type="button" aria-label={visible?"Ocultar senha":"Mostrar senha"} onClick={()=>setVisible(current=>!current)} className="absolute right-3 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded p-0.5 text-zinc-500 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-zinc-200">{visible?<EyeOff aria-hidden="true" size={17}/>:<Eye aria-hidden="true" size={17}/>}</button></div></label>;
}
