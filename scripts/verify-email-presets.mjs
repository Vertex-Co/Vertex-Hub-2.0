import {readFileSync} from "node:fs";
const presets=readFileSync("supabase/functions/_shared/email/test-presets.ts","utf8"),edge=readFileSync("supabase/functions/user-admin/index.ts","utf8"),client=readFileSync("supabase/functions/_shared/email/client.ts","utf8"),ui=readFileSync("src/pages/AdminSystemSettings.tsx","utf8"),env=readFileSync(".env.example","utf8");
const types=["welcome","role_changed","reward_unlocked","company_added","invitation","security_alert","two_factor_enabled","admin_notification"];
const checks={
 "oito presets":types.every(type=>new RegExp(`${type}:?\\{`).test(presets))&&/EMAIL_TEST_TYPES/.test(presets),
 "whitelist e erro 400":/isEmailTestType\(body\.templateType\)/.test(edge)&&/INVALID_EMAIL_TEST_TYPE/.test(edge)&&/400/.test(edge),
 "somente Super Admin":/body\.action===\"email_test\"[\s\S]*if\(!superAdmin\)return json\(\{error:\"forbidden\"\},403\)/.test(edge),
 "destinatário do Auth":/caller\.email\?\?callerProfile\?\.email/.test(edge)&&!/body\.to/.test(edge),
 "APP_URL compõe botão":/new URL\(preset\.buttonPath,base\)/.test(edge)&&env.includes("APP_URL=https://vertex-hub-2-0.vercel.app"),
 "template publicado único":/RESEND_TEMPLATE_ID/.test(edge)&&/template:\{id:input\.templateId,variables:input\.variables\}/.test(client)&&!/html:input/.test(client.slice(client.indexOf("sendPublishedTemplate"))),
 "variáveis fechadas":["NOME","TITULO","MENSAGEM","CARD_LABEL","CARD_VALUE","BUTTON_TEXT","BUTTON_URL","ANO"].every(value=>edge.includes(value)),
 "rate limit 5 por minuto":/Date\.now\(\)-60_000/.test(edge)&&/count\?\?0\)>=5/.test(edge),
 "nenhuma ação real":!/createUser|admin_set_member_role|company_members|reward|mfa\.enroll/.test(edge.slice(edge.indexOf('body.action==="email_test"'),edge.indexOf('body.action==="welcome"'))),
 "seletor e feedback":/EMAIL_TEST_TYPES\.map/.test(ui)&&/Enviar e-mail de teste/.test(ui)&&/E-mail de teste enviado/.test(ui),
 "API key fora da resposta":!/RESEND_API_KEY.*return json/.test(edge),
};
let failed=false;for(const[name,ok]of Object.entries(checks)){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true}if(failed)process.exit(1);
