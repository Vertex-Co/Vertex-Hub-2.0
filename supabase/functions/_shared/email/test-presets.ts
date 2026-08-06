export const EMAIL_TEST_TYPES = [
  "welcome", "role_changed", "reward_unlocked", "company_added",
  "invitation", "security_alert", "two_factor_enabled", "admin_notification",
] as const;
export type EmailTestType = typeof EMAIL_TEST_TYPES[number];
export type EmailTestPreset = { id:EmailTestType; label:string; title:string; message:string; cardLabel:string; cardValue:string; buttonText:string; buttonPath:string };

export const EMAIL_TEST_PRESETS:Record<EmailTestType,EmailTestPreset> = {
 welcome:{id:"welcome",label:"👋 Boas-vindas",title:"Bem-vindo ao Vertex Hub",message:"Sua conta foi criada com sucesso. Você já pode acessar o Vertex Hub e utilizar os recursos disponíveis para o seu perfil.",cardLabel:"STATUS DA CONTA",cardValue:"Conta ativa ✓",buttonText:"Acessar Vertex Hub",buttonPath:"/dashboard"},
 role_changed:{id:"role_changed",label:"👑 Alteração de cargo",title:"Seu nível de acesso foi atualizado",message:"Seu cargo dentro da empresa foi alterado. As novas permissões já estão disponíveis na sua conta.",cardLabel:"NOVO CARGO",cardValue:"Administrador",buttonText:"Acessar minha conta",buttonPath:"/dashboard"},
 reward_unlocked:{id:"reward_unlocked",label:"🏅 Badge desbloqueada",title:"Nova conquista desbloqueada 🏅",message:"Você desbloqueou uma nova conquista no Vertex Hub. Obrigado por apoiar o desenvolvimento do projeto.",cardLabel:"NOVA CONQUISTA",cardValue:"Vertex Supporter",buttonText:"Ver meu perfil",buttonPath:"/profile"},
 company_added:{id:"company_added",label:"🏢 Adicionado a uma empresa",title:"Você foi adicionado a uma empresa",message:"Seu acesso à empresa foi configurado com sucesso e já está disponível no Vertex Hub.",cardLabel:"EMPRESA",cardValue:"Vertex",buttonText:"Acessar empresa",buttonPath:"/dashboard"},
 invitation:{id:"invitation",label:"✉️ Convite",title:"Você recebeu um convite",message:"Você foi convidado para participar de uma empresa dentro do Vertex Hub.",cardLabel:"EMPRESA",cardValue:"Vertex",buttonText:"Aceitar convite",buttonPath:"/login"},
 security_alert:{id:"security_alert",label:"🔐 Alerta de segurança",title:"Alerta de segurança",message:"Detectamos uma alteração importante relacionada à segurança da sua conta. Se foi você, nenhuma ação adicional é necessária.",cardLabel:"ATIVIDADE",cardValue:"Configuração de segurança alterada",buttonText:"Verificar minha conta",buttonPath:"/settings"},
 two_factor_enabled:{id:"two_factor_enabled",label:"🔑 2FA ativado",title:"Autenticação em duas etapas ativada",message:"A autenticação em duas etapas foi ativada com sucesso na sua conta.",cardLabel:"SEGURANÇA",cardValue:"2FA ativado ✓",buttonText:"Ver configurações",buttonPath:"/settings"},
 admin_notification:{id:"admin_notification",label:"⚙️ Aviso administrativo",title:"Nova notificação do Vertex Hub",message:"Há uma nova informação relacionada à sua conta que pode exigir sua atenção.",cardLabel:"NOTIFICAÇÃO",cardValue:"Nova atualização disponível",buttonText:"Acessar Vertex Hub",buttonPath:"/dashboard"},
};
export const isEmailTestType=(value:unknown):value is EmailTestType=>typeof value==="string"&&EMAIL_TEST_TYPES.includes(value as EmailTestType);
