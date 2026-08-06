import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, emailConfigured, sendEmail } from "../_shared/email/client.ts";
import { roleChangedEmail, userAddedToCompanyEmail, welcomeEmail } from "../_shared/email/templates.ts";
import type { EmailTemplate, RenderedEmail } from "../_shared/email/types.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const clean=(value:unknown,max=160)=>String(value??"").trim().slice(0,max);
const validUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const mask=(email:string)=>{const[local,domain]=email.split("@");return `${local?.[0]??"*"}***@${domain??"invalid"}`};

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,authorization=req.headers.get("Authorization")??"";
  if(!authorization)return json({error:"unauthorized"},401);
  const callerClient=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const{data:{user:caller}}=await callerClient.auth.getUser();if(!caller)return json({error:"unauthorized"},401);
  const body=await req.json().catch(()=>({}));
  const{data:claims}=await callerClient.auth.getClaims();const aal=String(claims?.claims?.aal??"aal1");
  const{data:callerProfile}=await admin.from("profiles").select("global_role,status,full_name,email").eq("user_id",caller.id).single();
  const hasSuperRole=callerProfile?.global_role==="super_admin"&&callerProfile?.status==="active";
  const superAdmin=hasSuperRole&&aal==="aal2";
  if(hasSuperRole&&!superAdmin)return json({error:"mfa_required"},403);

  const reserveEmail=async(eventKey:string,template:EmailTemplate,userId:string,email:string)=>{
   const since=new Date(Date.now()-10*60_000).toISOString();
   const{count}=await admin.from("transactional_email_events").select("id",{count:"exact",head:true}).eq("actor_id",caller.id).gte("created_at",since);
   if((count??0)>=20)return {allowed:false,reason:"rate_limited" as const};
   const{data,error}=await admin.from("transactional_email_events").insert({event_key:eventKey,template,user_id:userId,actor_id:caller.id,recipient_masked:mask(email)}).select("id").single();
   if(error?.code==="23505")return {allowed:false,reason:"duplicate" as const};
   if(error)throw error;return {allowed:true,id:data.id};
  };
  const deliver=async(eventKey:string,template:EmailTemplate,userId:string,email:string,rendered:RenderedEmail)=>{
   const reservation=await reserveEmail(eventKey,template,userId,email);if(!reservation.allowed)return reservation.reason;
   const result=await sendEmail({to:email,template,eventKey,rendered,userId});
   await admin.from("transactional_email_events").update(result.ok?{status:"sent",provider_message_id:result.id,updated_at:new Date().toISOString()}:{status:"failed",error_code:result.code,updated_at:new Date().toISOString()}).eq("id",reservation.id);
   return result.ok?"sent":result.code;
  };

  if(body.action==="email_status"){
   if(!superAdmin)return json({error:"forbidden"},403);
   return json({configured:emailConfigured(),from_email:emailConfigured()?Deno.env.get("RESEND_FROM_EMAIL"):null,provider:"resend"});
  }
  if(body.action==="welcome"){
   if(!emailConfigured())return json({ok:true,email:"RESEND_NOT_CONFIGURED"});
   const email=clean(caller.email??callerProfile?.email,320),name=clean(callerProfile?.full_name??caller.user_metadata?.full_name??"Usuário",100);
   if(!email)return json({ok:true,email:"skipped"});
   const result=await deliver(`welcome:${caller.id}`,"welcome",caller.id,email,welcomeEmail({name,appUrl:appUrl()}));
   return json({ok:true,email:result});
  }
  if(body.action==="list"){
   if(!superAdmin)return json({error:"forbidden"},403);
   const page=Math.max(1,Number(body.page)||1),perPage=Math.min(100,Math.max(1,Number(body.perPage)||50));
   const{data,error}=await admin.auth.admin.listUsers({page,perPage});if(error)throw error;const ids=data.users.map(u=>u.id);
   const[{data:profiles},{data:memberships}]=await Promise.all([admin.from("profiles").select("user_id,full_name,email,status,global_role,created_at,last_seen_at,auth_method").in("user_id",ids),admin.from("company_members").select("id,user_id,company_id,role,created_at,companies(id,name,status)").in("user_id",ids)]);
   return json({users:data.users.map(u=>({id:u.id,email:u.email,created_at:u.created_at,last_sign_in_at:u.last_sign_in_at,auth_method:u.app_metadata?.provider,profile:profiles?.find(p=>p.user_id===u.id)??null,memberships:memberships?.filter(m=>m.user_id===u.id)??[]})),nextPage:data.nextPage,lastPage:data.lastPage});
  }
  if(body.action==="create_member"){
   const companyId=clean(body.companyId,36),role=body.role==="admin"?"admin":"employee";
   const{data:membership}=await admin.from("company_members").select("role").eq("company_id",companyId).eq("user_id",caller.id).maybeSingle();
   if(!superAdmin&&!['company_owner','admin'].includes(membership?.role))return json({error:"forbidden"},403);
   const name=clean(body.name,100),email=clean(body.email,320).toLowerCase(),password=String(body.password??""),jobTitle=clean(body.jobTitle,100);
   if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/.test(password))return json({error:"invalid_input"},400);
   const{data:company}=await admin.from("companies").select("name,status").eq("id",companyId).single();if(!company||company.status!=="active")return json({error:"company_unavailable"},400);
   const{data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name,created_by_company:true}});
   if(createError)return json({error:/already|registered|exists/i.test(createError.message)?"email_exists":"create_failed"},createError.status??400);
   try{
    await admin.from("profiles").upsert({user_id:created.user.id,full_name:name,email,job_title:jobTitle||null,global_role:"user",status:"active",onboarding_completed:true,is_authorized:true,authorized_at:new Date().toISOString(),authorized_company_id:companyId,must_change_password:true},{onConflict:"user_id"}).throwOnError();
    await admin.from("company_members").insert({company_id:companyId,user_id:created.user.id,role}).throwOnError();
    await admin.from("activity_logs").insert({company_id:companyId,actor_id:caller.id,action:"member.created",entity_type:"company_member",metadata:{user_id:created.user.id,role}}).throwOnError();
   }catch(error){await admin.auth.admin.deleteUser(created.user.id);throw error;}
   let emailResult="not_configured";try{emailResult=await deliver(`member-created:${created.user.id}:${companyId}`,"user_added_to_company",created.user.id,email,userAddedToCompanyEmail({name,companyName:company.name,role,actorName:clean(callerProfile?.full_name,100)||undefined,appUrl:appUrl()}))}catch(error){console.error("post_create_email_failed",{userId:created.user.id,reason:error instanceof Error?error.message.slice(0,80):"unknown"})}
   return json({ok:true,userId:created.user.id,email:emailResult});
  }
  if(body.action==="change_role"){
   const memberId=clean(body.memberId,36),role=clean(body.role,30),requestId=clean(body.requestId,36);if(!validUuid(memberId)||!validUuid(requestId)||!['company_owner','admin','employee'].includes(role))return json({error:"invalid_input"},400);
   const{data:target}=await admin.from("company_members").select("id,user_id,company_id,role,companies(name)").eq("id",memberId).maybeSingle();
   if(!target)return json({error:"not_found"},404);
   const{data:membership}=await admin.from("company_members").select("role").eq("company_id",target.company_id).eq("user_id",caller.id).maybeSingle();if(!superAdmin&&!['company_owner','admin'].includes(membership?.role))return json({error:"forbidden"},403);
   const{error}=await callerClient.rpc("admin_set_member_role",{p_member_id:memberId,p_role:role});if(error)return json({error:"role_change_failed"},400);
   const{data:profile}=await admin.from("profiles").select("full_name,email").eq("user_id",target.user_id).maybeSingle();const company=Array.isArray(target.companies)?target.companies[0]:target.companies;
   let emailResult="skipped";if(target.role!==role&&profile?.email){try{emailResult=await deliver(`role-change:${requestId}`,"role_changed",target.user_id,profile.email,roleChangedEmail({name:profile.full_name??"Usuário",companyName:company?.name??"sua empresa",role,appUrl:appUrl()}))}catch(error){console.error("post_role_email_failed",{userId:target.user_id,reason:error instanceof Error?error.message.slice(0,80):"unknown"})}}
   return json({ok:true,email:emailResult});
  }
  return json({error:"unknown_action"},400);
 }catch(error){console.error("user-admin",error instanceof Error?error.message.slice(0,160):"unknown");return json({error:"internal_error"},500)}
});
