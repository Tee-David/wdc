import {currencyOf,money} from "./currency";
/** Display separate currency balances; never perform an exchange or merge currencies. */
export function moneySummary<T extends {currency?:string}>(records:readonly T[],amount:(record:T)=>number):string{
 const totals=new Map<string,number>();for(const record of records){const currency=currencyOf(record);totals.set(currency,(totals.get(currency)??0)+amount(record));}
 return [...totals].map(([currency,total])=>money(total,currency)).join(" ? ")||money(0);
}
