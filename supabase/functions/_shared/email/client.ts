import type { SendEmailInput, SendEmailResult } from "./types.ts";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const emailConfigured = () => Boolean(Deno.env.get("RESEND_API_KEY")?.trim() && Deno.env.get("RESEND_FROM_EMAIL")?.trim() && Deno.env.get("APP_URL")?.trim());
export const appUrl = () => { const raw=(Deno.env.get("APP_URL")??"").trim(); if(!raw)throw new Error("RESEND_NOT_CONFIGURED:APP_URL"); const url=new URL(raw); if(!['http:','https:'].includes(url.protocol))throw new Error("RESEND_NOT_CONFIGURED:APP_URL"); return url.toString() };
const mask = (email:string) => {const [local,domain]=email.split('@');return `${local?.[0]??'*'}***@${domain??'invalid'}`};
export async function sendEmail(input:SendEmailInput):Promise<SendEmailResult>{
 const apiKey=(Deno.env.get("RESEND_API_KEY")??"").trim(),fromEmail=(Deno.env.get("RESEND_FROM_EMAIL")??"").trim(),fromName=(Deno.env.get("RESEND_FROM_NAME")??"Vertex Hub").trim();
 if(!EMAIL_PATTERN.test(input.to))return {ok:false,code:"INVALID_RECIPIENT",retryable:false};
 if(!apiKey||!EMAIL_PATTERN.test(fromEmail))return {ok:false,code:"RESEND_NOT_CONFIGURED",retryable:false};
 try{const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json","User-Agent":"Vertex-Hub/1.0","Idempotency-Key":input.eventKey.slice(0,256)},body:JSON.stringify({from:`${fromName} <${fromEmail}>`,to:[input.to],subject:input.rendered.subject,html:input.rendered.html,text:input.rendered.text})}); const data=await response.json().catch(()=>({})); if(!response.ok||!data?.id)throw new Error(`HTTP_${response.status}`); console.log("email_sent",{template:input.template,userId:input.userId??null,recipient:mask(input.to),provider:"resend",timestamp:new Date().toISOString()}); return {ok:true,id:String(data.id)}}
 catch(error){console.error("email_failed",{template:input.template,userId:input.userId??null,recipient:mask(input.to),provider:"resend",reason:error instanceof Error?error.message.slice(0,80):"unknown",timestamp:new Date().toISOString()}); return {ok:false,code:"RESEND_SEND_FAILED",retryable:true}}
}
