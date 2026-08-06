import { readFileSync } from "node:fs";
const edge=readFileSync("supabase/functions/user-admin/index.ts","utf8"),client=readFileSync("supabase/functions/_shared/email/client.ts","utf8"),templates=readFileSync("supabase/functions/_shared/email/templates.ts","utf8"),migration=readFileSync("supabase/migrations/202608060001_transactional_email_events.sql","utf8"),auth=readFileSync("src/contexts/AuthContext.tsx","utf8"),users=readFileSync("src/pages/UserManagement.tsx","utf8"),env=readFileSync(".env.example","utf8");
const checks={
 "templates tipados":["welcomeEmail","userAddedToCompanyEmail","companyInvitationEmail","roleChangedEmail","rewardUnlockedEmail","systemNotificationEmail"].every(x=>templates.includes(x)),
 "HTML escapado":/escapeHtml/.test(templates)&&!/dangerouslySetInnerHTML/.test(templates),
 "segredo somente servidor":env.includes("RESEND_API_KEY=")&&!env.includes("VITE_RESEND")&&!readFileSync("src/vite-env.d.ts","utf8").includes("RESEND_API_KEY"),
 "sem destinatário arbitrário":!/body\.to/.test(edge)&&!/action===\"send_email\"/.test(edge),
 "autorização de administrador":/company_owner','admin/.test(edge)&&/if\(!superAdmin/.test(edge),
 "rate limit e idempotência":/Idempotency-Key/.test(client)&&/event_key text not null unique/.test(migration)&&/count\?\?0\)>=20/.test(edge),
 "falha não reverte operação":edge.indexOf('post_create_email_failed')>edge.indexOf('company_members").insert'),
 "boas-vindas após login":/SIGNED_IN/.test(auth)&&/action: "welcome"/.test(auth),
 "cargo alterado no servidor":/action:"change_role"/.test(users)&&/admin_set_member_role/.test(edge),
 "sem senha no e-mail":!/password/.test(templates),
 "erros seguros":/RESEND_NOT_CONFIGURED/.test(client)&&/RESEND_SEND_FAILED/.test(client),
};
let failed=false;for(const[name,ok]of Object.entries(checks)){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true}if(failed)process.exit(1);
