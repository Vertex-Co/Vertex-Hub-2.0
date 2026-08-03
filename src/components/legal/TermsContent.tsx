export function TermsContent({type="terms"}:{type?:"privacy"|"terms"}) {
  const privacy = [
    ["Dados tratados","O Vertex Hub trata os dados necessários à autenticação, segurança e gestão das informações inseridas pelo usuário."],
    ["Finalidade","Os dados são utilizados para operar o serviço, proteger contas e cumprir obrigações legais."],
    ["Compartilhamento","Informações não são vendidas. Fornecedores essenciais recebem somente o necessário."],
    ["Segurança","São adotadas medidas técnicas e administrativas para reduzir riscos de acesso indevido."],
    ["Direitos","O titular pode solicitar acesso, correção ou exclusão nos limites da legislação aplicável."],
  ];
  const terms = [
    ["Aceitação","Ao criar uma conta ou utilizar o Vertex Hub, o usuário declara ter lido e concordado com estes Termos."],
    ["Acesso autorizado","Qualquer pessoa pode criar uma conta, mas o acesso ao Hub depende de autorização permanente vinculada a uma empresa."],
    ["Conta","As credenciais são pessoais. Cada usuário deve proteger sua conta e comunicar acessos indevidos."],
    ["Uso permitido","É proibido acessar contas de terceiros, explorar vulnerabilidades, distribuir malware ou prejudicar a plataforma."],
    ["Dados empresariais","Cada empresa é responsável pelos dados inseridos e por conceder acesso apenas a pessoas autorizadas."],
    ["Disponibilidade","Podem ocorrer manutenções, atualizações e falhas de fornecedores fora do controle razoável da Vertex."],
    ["Propriedade intelectual","Marca, software, identidade visual e materiais do Vertex Hub permanecem protegidos."],
    ["Contato","Solicitações devem ser encaminhadas pelos canais oficiais da Vertex."],
  ];
  const sections = type === "privacy" ? privacy : terms;
  return <div className="space-y-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{sections.map(([title,text],i)=><section key={title}><h3 className="font-bold text-zinc-900 dark:text-white">{i+1}. {title}</h3><p>{text}</p></section>)}<p className="border-t pt-4 text-xs text-zinc-500">Versão 2.0 • Atualizado em 02/08/2026</p></div>;
}
