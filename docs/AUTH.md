# Autenticação e autorização

Supabase Auth gerencia senha, OAuth, sessão, refresh e recuperação. Após login, `CompanyGate` carrega `profiles`: onboarding incompleto bloqueia a aplicação; concluído libera a dashboard. Google preenche nome/e-mail, mas não ignora onboarding.

O menu usa `global_role` apenas para UX. RLS é a autoridade: comuns acessam somente empresas vinculadas; admins podem consultar empresas e trocar contexto. Logout encerra a sessão; o UUID da empresa ativa fica apenas em `sessionStorage`, sem dados financeiros.
