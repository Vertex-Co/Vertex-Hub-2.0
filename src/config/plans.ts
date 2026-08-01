import type { PlanId } from "../types";
export const VERTEX_WHATSAPP="5561993972886";
export const plans:{id:PlanId;name:string;price:string;users:string;description:string;features:string[]}[]=[
 {id:"free",name:"Free",price:"R$ 0",users:"Até 3 usuários",description:"Para começar e utilizar o Vertex Hub sem compromisso.",features:["Gestão financeira essencial","Relatórios e metas","Uso contínuo gratuito"]},
 {id:"start",name:"Start",price:"R$ 50/mês",users:"Até 3 usuários",description:"Estrutura simples para pequenos negócios.",features:["Tudo do Free","Estrutura para equipe","Suporte comercial"]},
 {id:"growth",name:"Growth",price:"R$ 100/mês",users:"Até 10 usuários",description:"Para empresas em crescimento.",features:["Até 10 usuários","Mais estrutura operacional","Suporte comercial"]},
 {id:"prime",name:"Prime",price:"R$ 150/mês",users:"Até 30 usuários",description:"Para operações com equipes maiores.",features:["Até 30 usuários","Estrutura ampliada","Atendimento comercial"]},
 {id:"enterprise",name:"Enterprise",price:"Sob consulta",users:"Personalizado",description:"Condições ajustadas à sua empresa.",features:["Usuários personalizados","Armazenamento personalizado","Auxílio em gestão financeira"]},
];
export const whatsappForPlan=(name:string)=>`https://wa.me/${VERTEX_WHATSAPP}?text=${encodeURIComponent(name==="Enterprise"?"Olá! Estou utilizando o Vertex Hub e gostaria de conversar sobre um plano Enterprise personalizado para minha empresa.":`Olá! Estou utilizando o Vertex Hub e tenho interesse no plano ${name}. Gostaria de saber mais sobre o upgrade.`)}`;
