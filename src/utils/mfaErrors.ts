export const mfaEnrollmentMessage=(error:{code?:string})=>{
 if(error.code==="mfa_totp_enroll_not_enabled")return"O TOTP está desativado no Supabase. Ative em Authentication > Multi-Factor Authentication.";
 if(error.code==="mfa_factor_name_conflict")return"Já existe um autenticador com esse nome. Tente novamente.";
 if(error.code==="session_not_found"||error.code==="no_authorization")return"Sua sessão expirou. Saia, entre novamente e repita a configuração.";
 if(error.code==="over_request_rate_limit")return"Muitas tentativas. Aguarde alguns minutos e tente novamente.";
 return `Não foi possível iniciar a configuração${error.code?` (${error.code})`:""}.`;
};
