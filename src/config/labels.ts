import type { CompanyRole } from "../types";
export const roleLabels:Record<CompanyRole|string,string>={company_owner:"Dono",owner:"Dono",admin:"Administrador",administrator:"Administrador",employee:"Funcionário",viewer:"Visualizador",manager:"Gerente",financial:"Financeiro",member:"Membro"};
export const recordTypeLabels:Record<string,string>={meeting:"Reunião",appointment:"Agendamento",task:"Tarefa",payment:"Pagamento",receipt:"Recibo",internal:"Interno",other:"Outro"};
export const crmStatusLabels:Record<string,string>={lead:"Lead",contacted:"Contatado",proposal:"Proposta",negotiation:"Negociação",client:"Cliente",inactive:"Inativo"};
export const taskStatusLabels:Record<string,string>={pending:"Pendente",in_progress:"Em andamento",completed:"Concluída",cancelled:"Cancelada"};
export const labelFor=(map:Record<string,string>,value:string)=>map[value]??value;
