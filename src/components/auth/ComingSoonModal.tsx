import { X } from "lucide-react";

const items = [
  ["Em desenvolvimento", "Integração com Open Finance", "Estamos trabalhando para conectar informações financeiras de forma mais prática ao Vertex Hub, facilitando a gestão e reduzindo lançamentos manuais."],
  ["Em breve", "Pagamentos via Pix", "Em breve, queremos permitir que pagamentos e contratações sejam realizados diretamente pelo Vertex Hub utilizando Pix."],
  ["Em breve", "Pagamentos com cartão de crédito", "Estamos preparando suporte a pagamentos com cartão diretamente pela plataforma."],
  ["Planejado", "Débito e cobranças automáticas", "Planejamos opções de débito e cobranças recorrentes para tornar renovações e pagamentos mais simples."],
  ["Planejado", "Aplicativo Vertex Hub", "Uma versão para celular está planejada para facilitar o acesso à gestão da empresa onde quer que você esteja."],
  ["Planejado", "E muito mais", "O Vertex Hub continuará evoluindo com novos recursos, integrações e melhorias para acompanhar o crescimento das empresas."],
];

export function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-3 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="roadmap-title" className="modal-enter max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-zinc-700 bg-zinc-950 p-5 text-white shadow-2xl sm:p-7">
      <header className="flex items-start justify-between gap-4"><div><h2 id="roadmap-title" className="text-2xl font-black">O que vem por aí</h2><p className="mt-2 text-zinc-400">Conheça algumas das novidades que estão chegando ao Vertex Hub.</p></div><button aria-label="Fechar" onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"><X /></button></header>
      <div className="mt-6 grid gap-3 md:grid-cols-2">{items.map(([status, title, description]) => <article key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:-translate-y-0.5 hover:border-blue-500/50"><span className="text-xs font-bold text-blue-400">{status}</span><h3 className="mt-2 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p></article>)}</div>
      <p className="mt-5 text-xs text-zinc-500">Recursos em desenvolvimento ou planejamento podem sofrer alterações antes do lançamento.</p>
    </section>
  </div>;
}
