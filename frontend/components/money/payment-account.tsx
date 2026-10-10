import {paymentAccountDetails,type PaymentAccountSnapshot} from '@/lib/money/currency';
export default function PaymentAccount({account,reference}:{account:PaymentAccountSnapshot;reference?:string}){
 return <dl className="doc__meta">{paymentAccountDetails(account).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}{reference?<div><dt>Reference</dt><dd>{reference}</dd></div>:null}</dl>;
}
