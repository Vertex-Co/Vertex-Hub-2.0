# Checklist de Segurança Vertex Hub

- [x] Auth, migrations, RLS, Edge Function e armazenamento auditados
- [x] Isolamento por empresa baseado em `auth.uid()` e membership
- [x] IDOR/BOLA protegido no banco; funcionário somente leitura
- [x] Roles e campos de autoridade protegidos server-side
- [x] Escrita REST direta em vínculos revogada
- [x] Service Role ausente do frontend; anon sem privilégio privado
- [x] Retorno administrativo minimizado
- [x] Super Admin exige TOTP e AAL2 no banco e Edge Function
- [x] Manipulação de local/session storage sem efeito na autorização
- [x] Testes estruturais executados
- [ ] Aplicar migration e republicar Edge Function (ação manual)
- [ ] Confirmar MFA/rate limits no Dashboard (ação manual)
- [ ] Executar testes dinâmicos A/B em staging (ação manual)

