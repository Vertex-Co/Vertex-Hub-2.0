# Google OAuth — Vertex Hub

## 1. Google Cloud

1. No Google Cloud Console, crie ou selecione um projeto.
2. Em **Google Auth Platform**, configure a tela de consentimento, nome do app `Vertex Hub`, e-mails de suporte e público autorizado.
3. Em **Clientes**, crie um cliente **Aplicativo da Web**.
4. Copie os dados somente para o painel do Supabase:

```text
Google Client ID:
[INSERIR NO PAINEL DO SUPABASE]

Google Client Secret:
[INSERIR SOMENTE NO PAINEL DO SUPABASE]
```

5. Em URIs de redirecionamento autorizados, cadastre a callback exibida em **Supabase > Authentication > Providers > Google**:

```text
https://SEU-PROJECT-REF.supabase.co/auth/v1/callback
```

Não cadastre o Client Secret no Vite, GitHub ou Vercel.

## 2. Supabase

1. Acesse **Authentication > Providers > Google**, habilite o provider e informe Client ID e Client Secret.
2. Em **Authentication > URL Configuration**, defina:
   - Site URL de produção: a URL principal da Vercel;
   - Redirect URLs: `http://localhost:5173/**`, a URL de produção e previews autorizados;
   - futuramente, o domínio personalizado com `https://`.
3. Mantenha a callback do Supabase cadastrada no Google, não a URL direta do app.

O frontend usa `window.location.origin`, portanto funciona em localhost, produção, previews autorizados e futuros domínios sem URL fixa.

## 3. Teste e diagnóstico

Teste login, cancelamento, atualização da página, logout e novo login. Confirme nome, foto e isolamento de registros. Erros `redirect_uri_mismatch` indicam callback divergente no Google; erros de URL após o retorno indicam Site URL/Redirect URLs no Supabase. Se o provider não abrir, confirme que foi habilitado e salvo.

Contas com o mesmo e-mail seguem o comportamento seguro configurado pelo Supabase. O Vertex Hub não faz união manual de identidades.
