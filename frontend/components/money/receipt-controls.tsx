"use client";
import {Download,Printer} from "lucide-react";
export default function ReceiptControls({token,kind="Receipt"}:{token:string;kind?:"Receipt"|"Invoice"|"Estimate"}){
 return <div className="doc__actions" aria-label={`${kind} actions`}><button type="button" className="btn-primary" onClick={()=>window.print()}><Printer size={18} aria-hidden="true"/>Print {kind.toLowerCase()}</button><a className="btn-secondary" href={`/${kind==="Receipt"?"r":kind==="Invoice"?"i":"q"}/${encodeURIComponent(token)}/pdf`}><Download size={18} aria-hidden="true"/>Download PDF</a></div>;
}
