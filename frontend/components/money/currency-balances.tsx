import {currencyTotals} from "@/lib/admin/store";
import type {Invoice} from "@/lib/admin/types";
import {money} from "@/lib/money/currency";
import {Panel} from "@/components/admin/bits";
export default function CurrencyBalances({invoices}:{invoices:Invoice[]}){
 const rows=currencyTotals(invoices);if(!rows.length)return null;
 return <Panel title="Balances by currency" dataTour="money-currencies"><p className="ad__dim">Each currency stands on its own. These amounts are not converted or added together.</p><div className="ad__scroll"><table className="ad__t"><thead><tr><th>Currency</th><th className="num">Invoiced</th><th className="num">Paid to date</th><th className="num">Outstanding</th></tr></thead><tbody>{rows.map(row=><tr key={row.currency}><td>{row.currency}</td><td className="num">{money(row.invoiced,row.currency)}</td><td className="num">{money(row.collected,row.currency)}</td><td className="num">{money(row.outstanding,row.currency)}</td></tr>)}</tbody></table></div></Panel>;
}
