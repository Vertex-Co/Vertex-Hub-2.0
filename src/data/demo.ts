import type { Goal, Transaction } from "../types";
const daysAgo = (days: number) => {
  const date = new Date(); date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};
export const demoTransactions: Transaction[] = [
  ["Salário",12800,"income","Salário",2,"Transferência","paid"],
  ["Freelance Website",2350,"income","Freelance",8,"Pix","paid"],
  ["Aluguel",1850,"expense","Moradia",4,"Pix","paid"],
  ["Supermercado",736.42,"expense","Alimentação",6,"Cartão de crédito","paid"],
  ["Conta de energia",284.6,"expense","Moradia",9,"Boleto","paid"],
  ["Internet",119.9,"expense","Assinaturas",10,"Cartão de crédito","paid"],
  ["Uber e metrô",328.8,"expense","Transporte",12,"Cartão de crédito","paid"],
  ["Jantar italiano",186.5,"expense","Lazer",14,"Cartão de crédito","paid"],
  ["Academia",129.9,"expense","Saúde",16,"Cartão de crédito","paid"],
  ["Netflix",44.9,"expense","Assinaturas",18,"Cartão de crédito","paid"],
  ["Farmácia",158.36,"expense","Saúde",20,"Cartão de débito","paid"],
  ["Curso de inglês",359.9,"expense","Educação",22,"Boleto","paid"],
  ["Café com amigos",72.5,"expense","Lazer",24,"Pix","paid"],
  ["Manutenção da bike",121.52,"expense","Transporte",26,"Pix","paid"],
  ["Projeto de identidade",750,"income","Freelance",32,"Pix","paid"],
  ["Seguro residencial",106.9,"expense","Moradia",35,"Boleto","scheduled"],
  ["Consulta médica",250,"expense","Saúde",39,"Pix","paid"],
  ["Compras do mês",620,"expense","Alimentação",45,"Cartão de crédito","paid"]
].map(([description,amount,type,category,days,paymentMethod,status], i) => ({
  id:`demo-${i}`, description:String(description), amount:Number(amount), type:type as Transaction["type"],
  category:String(category), date:daysAgo(Number(days)), paymentMethod:String(paymentMethod),
  status:status as Transaction["status"], createdAt:new Date().toISOString()
}));
export const demoGoals: Goal[] = [
  { id:"g1", name:"Reserva de emergência", targetAmount:30000, currentAmount:12450, deadline:daysAgo(-240), createdAt:new Date().toISOString() },
  { id:"g2", name:"Viagem para Portugal", targetAmount:15000, currentAmount:6300, deadline:daysAgo(-150), createdAt:new Date().toISOString() }
];
