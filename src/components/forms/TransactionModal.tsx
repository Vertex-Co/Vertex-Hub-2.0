import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useFinance } from "../../contexts/FinanceContext";
import type { Transaction } from "../../types";
import { Button, Input, Modal, Select } from "../ui/Common";
const schema=z.object({type:z.enum(["income","expense"]),description:z.string().min(2,"Informe uma descrição"),amount:z.number().positive("Informe um valor válido"),category:z.string().min(1,"Selecione a categoria"),date:z.string().min(1,"Informe a data"),paymentMethod:z.string().min(1),status:z.enum(["paid","pending","scheduled"]),notes:z.string().optional()});
type FormData=z.infer<typeof schema>;
const categories=["Salário","Freelance","Moradia","Alimentação","Transporte","Lazer","Saúde","Educação","Assinaturas","Outros"];
export function TransactionModal({onClose,transaction}:{onClose:()=>void,transaction?:Transaction}) {
 const {saveTransaction}=useFinance(); const {register,handleSubmit,formState:{errors},reset}=useForm<FormData>({resolver:zodResolver(schema),defaultValues:{type:"expense",status:"paid",date:new Date().toISOString().slice(0,10),paymentMethod:"Pix"}});
 useEffect(()=>{if(transaction)reset(transaction);},[transaction,reset]);
 const submit=(data:FormData)=>{saveTransaction(data,transaction?.id);onClose();};
 return <Modal title={transaction?"Editar transação":"Nova transação"} onClose={onClose}><form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
  <label>Tipo<Select {...register("type")}><option value="expense">Despesa</option><option value="income">Receita</option></Select></label>
  <label>Valor (R$)<Input type="number" step="0.01" placeholder="0,00" {...register("amount",{valueAsNumber:true})}/><small>{errors.amount?.message}</small></label>
  <label className="sm:col-span-2">Descrição<Input placeholder="Ex.: Supermercado" {...register("description")}/><small>{errors.description?.message}</small></label>
  <label>Categoria<Select {...register("category")}><option value="">Selecione</option>{categories.map(x=><option key={x}>{x}</option>)}</Select><small>{errors.category?.message}</small></label>
  <label>Data<Input type="date" {...register("date")}/></label>
  <label>Pagamento<Select {...register("paymentMethod")}>{["Pix","Dinheiro","Cartão de crédito","Cartão de débito","Boleto","Transferência"].map(x=><option key={x}>{x}</option>)}</Select></label>
  <label>Status<Select {...register("status")}><option value="paid">Pago</option><option value="pending">Pendente</option><option value="scheduled">Agendado</option></Select></label>
  <label className="sm:col-span-2">Observações<textarea className="mt-1 min-h-20 w-full rounded-xl border border-zinc-200 bg-transparent p-3 dark:border-zinc-700" {...register("notes")}/></label>
  <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">Salvar transação</Button></div>
 </form></Modal>;
}
