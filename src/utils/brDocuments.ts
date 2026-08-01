export const digitsOnly = (value:string) => value.replace(/\D/g, "");
export const normalizeDocument = digitsOnly;
export const normalizePhone = (value:string) => digitsOnly(value).slice(0, 11);
export function formatCPF(value:string){const v=digitsOnly(value).slice(0,11);return v.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2")}
export function formatCNPJ(value:string){const v=digitsOnly(value).slice(0,14);return v.replace(/(\d{2})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1/$2").replace(/(\d{4})(\d{1,2})$/,"$1-$2")}
export function formatPhone(value:string){const v=normalizePhone(value);if(v.length<=10)return v.replace(/(\d{2})(\d)/,"($1) $2").replace(/(\d{4})(\d)/,"$1-$2");return v.replace(/(\d{2})(\d)(\d{4})(\d{0,4})/,"($1) $2 $3-$4").replace(/-$/,'')}
const validCheck=(value:string,weights:number[])=>{const sum=weights.reduce((total,w,i)=>total+Number(value[i])*w,0);const digit=sum%11<2?0:11-sum%11;return digit===Number(value[weights.length])};
export function validateCPF(value:string){const v=digitsOnly(value);if(v.length!==11||/^(\d)\1+$/.test(v))return false;return validCheck(v,[10,9,8,7,6,5,4,3,2])&&validCheck(v,[11,10,9,8,7,6,5,4,3,2])}
export function validateCNPJ(value:string){const v=digitsOnly(value);if(v.length!==14||/^(\d)\1+$/.test(v))return false;return validCheck(v,[5,4,3,2,9,8,7,6,5,4,3,2])&&validCheck(v,[6,5,4,3,2,9,8,7,6,5,4,3,2])}
export const validatePhone=(value:string)=>{const v=normalizePhone(value);return v.length===10||v.length===11};
export const maskCPF=(value:string)=>`***.***.***-${digitsOnly(value).slice(-2).padStart(2,"*")}`;
