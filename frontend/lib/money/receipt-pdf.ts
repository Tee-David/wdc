import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import fontkit from '@pdf-lib/fontkit';
import {PDFDocument,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import {estimateTotals,invoiceStatus,estimateState,lineTotal,type Estimate,type Invoice,type Client,type Payment} from '@/lib/admin/types';
import {COMPANY_NAME,CONTACT_EMAIL,REGISTRATION_NO} from '@/lib/site';
import {qrCode} from '@/lib/qr';
import {STAMP_STATES,noise,circlePath,scallop,type StampStatus} from './stamp-geometry';
import {receiptState,receiptDocumentUrl,type ReceiptDocument} from './receipt-model';

const W=595.28,H=841.89,M=38,INNER=W-M*2;
const color=(hex:string)=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
const ink=color('#0e0e2c'),dim=color('#5a5a72'),rule=color('#dedee8'),paper=color('#f6f6f4');
const at=(...parts:string[])=>fs.readFileSync(path.join(process.cwd(),...parts));
let assets:Promise<{body:Buffer;bold:Buffer;fallback:Buffer;logo:Buffer;mark:Buffer}>|undefined;
function loadAssets(){return assets??=Promise.all([Promise.resolve(at('assets','fonts','Outfit-Regular.ttf')),Promise.resolve(at('assets','fonts','SpaceGrotesk-Bold.ttf')),Promise.resolve(at('assets','fonts','SpaceGrotesk-Medium.ttf')),sharp(at('public','brand','icon-navy.svg')).resize(120,120).png().toBuffer(),Promise.resolve(at('assets','brand','watermark.png'))]).then(([body,bold,fallback,logo,mark])=>({body,bold,fallback,logo,mark}));}
const date=(value:string)=>new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
type Glyph={advanceWidth:number;path:{toSVG:()=>string}};
type GlyphFont={unitsPerEm:number;layout:(value:string)=>{glyphs:Glyph[]}};
/** The page stamp's existing rings, states and wear, with the same font outlined for reliable PDF rasterisation. */
function stampSvg(status:StampStatus,bold:Buffer){
 const state=STAMP_STATES[status],font=fontkit.create(bold) as unknown as GlyphFont,s=40/font.unitsPerEm;
 const glyphs=font.layout(state.word).glyphs,total=glyphs.reduce((sum,g)=>sum+g.advanceWidth*s+1,0),width=state.word.length>7?104:92;let cursor=0;
 const word=glyphs.map(g=>{const result=`<path d="${g.path.toSVG()}" transform="translate(${cursor},0) scale(${s},${-s})"/>`;cursor+=g.advanceWidth*s+1;return result;}).join('');
 const arc=(text:string,bottom:boolean)=>{const size=17/font.unitsPerEm,run=font.layout('· '+text+' ·').glyphs,length=run.reduce((sum,g)=>sum+g.advanceWidth*size+2.2,0);let offset=-length/2;return run.map(g=>{const a=(bottom?Math.PI/2:-Math.PI/2)+(bottom?-1:1)*(offset+g.advanceWidth*size/2)/71,x=120+Math.cos(a)*71,y=120+Math.sin(a)*71,angle=a*180/Math.PI+(bottom?-90:90);offset+=g.advanceWidth*size+2.2;return `<path d="${g.path.toSVG()}" transform="translate(${x},${y}) rotate(${angle}) translate(${-g.advanceWidth*size/2},0) scale(${size},${-size})"/>`;}).join('');};
 const specks=Array.from({length:70},(_,i)=>{const a=noise(i,1)*Math.PI*2,r=18+noise(i,2)*88;return `<circle cx="${120+Math.cos(a)*r}" cy="${120+Math.sin(a)*r}" r="${.8+noise(i,3)*3.4}" fill="black"/>`;}).join('');
 const tones={good:'#1c7a4a',warn:'#8a5200',bad:'#b3261e',info:'#2a4b8d',mute:'#5a5a72'};
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs><mask id="wear"><rect width="240" height="240" fill="white"/>${specks}<circle cx="44" cy="60" r="15" fill="black" opacity=".4"/><circle cx="190" cy="176" r="12" fill="black" opacity=".32"/></mask></defs><g transform="rotate(-11,120,120)" fill="${tones[state.tone]}" opacity=".82" mask="url(#wear)"><path fill-rule="evenodd" d="${scallop(120,120,108,28)+circlePath(120,120,97)}"/><path fill-rule="evenodd" d="${circlePath(120,120,92)+circlePath(120,120,84)}"/><path fill-rule="evenodd" d="${circlePath(120,120,58)+circlePath(120,120,55.5)}"/>${arc(state.top,false)}${arc(state.bottom,true)}<g transform="translate(${120-width/2},132) scale(${width/total},1)">${word}</g></g></svg>`;
}
function wrap(value:string,font:PDFFont,size:number,width:number){const result:string[]=[];for(const paragraph of value.replace(/\r/g,'').split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(font.widthOfTextAtSize((line?line+' ':'')+word,size)>width&&line){result.push(line);line='';}if(font.widthOfTextAtSize(word,size)>width){for(const char of word){if(font.widthOfTextAtSize(line+char,size)>width){result.push(line);line='';}line+=char;}}else line+=(line?' ':'')+word;}result.push(line);}return result;}
/** A4 export of the current receipt design. Screen printing still uses DocumentShell's exact CSS. */
type FinancialMeta={kind:"Invoice"|"Estimate";record:Invoice|Estimate;stamp?:StampStatus;url:string;payments?:Payment[]};
export async function renderReceiptPdf(input:ReceiptDocument,document?:FinancialMeta):Promise<Uint8Array>{
 const kind=document?.kind??"Receipt",number=document?.record.number??input.payment.receiptNo;
 const money=(amount:number)=>new Intl.NumberFormat("en-NG",{style:"currency",currency:input.currency??"NGN"}).format(amount/100);
 const assets=await loadAssets(),pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);pdf.setTitle(kind+' '+number);pdf.setAuthor(COMPANY_NAME);pdf.setSubject('Receipt for '+input.invoice.number);
 const body=await pdf.embedFont(assets.body,{subset:false}),bold=await pdf.embedFont(assets.bold,{subset:true}),fallback=await pdf.embedFont(assets.fallback,{subset:true}),logo=await pdf.embedPng(assets.logo),watermark=await pdf.embedPng(assets.mark),state=receiptState(input);let page!:PDFPage,y=0;
 const charsets=new Map([body,bold,fallback].map(font=>[font,new Set(font.getCharacterSet())]));
 const text=(value:string,x:number,top:number,size=10,font=body,tone=ink)=>{
  let cursor=x,run="",selected=font;
  const flush=()=>{if(!run)return;page.drawText(run,{x:cursor,y:H-top-size,size,font:selected,color:tone});cursor+=selected.widthOfTextAtSize(run,size);run="";};
  for(const character of value){const next=charsets.get(font)!.has(character.codePointAt(0)!)?font:fallback;if(next!==selected){flush();selected=next;}run+=character;}flush();
 };
 const line=(top:number)=>page.drawLine({start:{x:M,y:H-top},end:{x:W-M,y:H-top},thickness:.6,color:rule});
 const newPage=()=>{page=pdf.addPage([W,H]);page.drawImage(watermark,{x:(W-300)/2,y:(H-300)/2,width:300,height:300,opacity:.06});page.drawImage(logo,{x:M,y:H-70,width:30,height:30});text('We Dig Creativity',M+39,40,13,bold);text(REGISTRATION_NO+(input.tin?' · TIN '+input.tin:''),M+39,59,9,body,dim);text(kind.toUpperCase(),W-M-165,39,9,bold,color('#c95000'));for(const [i,value]of wrap(number,bold,17,165).entries())text(value,W-M-165,54+i*20,17,bold);line(88);y=104;};
 const room=(height:number)=>{if(y+height>H-M-25)newPage();};
 const paragraph=(value:string,tone=ink)=>{for(const valueLine of wrap(value,body,10,INNER)){room(16);text(valueLine,M,y,10,body,tone);y+=15;}y+=9;};
 const table=(headers:string[],rows:string[][],widths:number[])=>{const heading=()=>{room(29);page.drawRectangle({x:M,y:H-y-25,width:INNER,height:25,color:paper});let x=M;headers.forEach((value,i)=>{text(value,x+7,y+6,9,bold);x+=widths[i];});y+=25;};heading();for(const row of rows){const lines=row.map((value,i)=>wrap(value,body,9,widths[i]-14)),count=Math.max(...lines.map(cell=>cell.length));let index=0;while(index<count){if(y+20>H-M-25){newPage();heading();}const fit=Math.max(1,Math.floor((H-M-25-y-10)/13)),take=Math.min(count-index,fit),height=take*13+10;let x=M;lines.forEach((cell,i)=>{cell.slice(index,index+take).forEach((value,n)=>text(value,x+7,y+5+n*13,9));x+=widths[i];});y+=height;line(y);index+=take;if(index<count){newPage();heading();}}}y+=16;};
 newPage();
 if(document){
  const record=document.record,total=document.kind==="Estimate"?estimateTotals(record as Estimate):state.totals;
  const status=document.kind==="Invoice"?invoiceStatus(record as Invoice):estimateState(record as Estimate);
  paragraph(status+(document.kind==="Invoice"&& (record as Invoice).voided?": "+(record as Invoice).voided!.reason:""));
  room(66);text(document.kind==="Invoice"?"TOTAL DUE":"ESTIMATED TOTAL",M,y,9,bold,dim);y+=18;text(money(document.kind==="Invoice"?state.totals.due:total.total),M,y,27,bold);y+=45;
  paragraph("For: "+(input.client?.company??"?"));paragraph("Issued: "+date(record.issued));paragraph((document.kind==="Invoice"?"Due: ":"Holds until: ")+date(document.kind==="Invoice"?(record as Invoice).due:(record as Estimate).expires));if(input.projectTitle)paragraph("Project: "+input.projectTitle);
  table(["What for","Qty","Unit","Total"],record.lines.map(row=>[row.description,String(row.qty),money(row.unit),money(lineTotal(row))]),[INNER-235,45,95,95]);
  paragraph("Subtotal: "+money(total.subtotal));if(document.kind==="Estimate"&&(record as Estimate).discount)paragraph("Discount: "+money(estimateTotals(record as Estimate).discount));if(total.vat)paragraph("VAT: "+money(total.vat));paragraph("Total: "+money(total.total));
  if(document.kind==="Invoice"){paragraph("Paid to date: "+money(input.invoice.paid));paragraph("Outstanding: "+money(state.totals.due));if(document.payments?.length)table(["Received","Reference","Method","Amount"],document.payments.map(p=>[date(p.at),p.reference+(p.reversed?" (reversed)":""),p.method,money(p.reversed?0:Math.max(0,p.amount-(p.refunds??[]).reduce((sum,r)=>sum+r.amount,0)))]),[85,INNER-265,85,95]);}
  const bank=record.paymentAccount;
  if(bank){room(82);paragraph("Payment account: "+bank.label);paragraph(bank.bankName+" ? "+bank.accountName+" ? "+bank.accountNumber+" ? "+bank.currency);if(bank.instructions)paragraph(bank.instructions);}
  if("notes" in record && record.notes)paragraph(record.notes);
 }else{
 if(state.gone)paragraph('This receipt has been reversed. The payment did not stay with us'+(state.gone.reason?': '+state.gone.reason:'.')+' It no longer counts towards '+input.invoice.number+'. This is the original receipt, marked.',color('#b3261e'));
 if(state.refunded){const refunds=input.payment.refunds||[],where=refunds.every(r=>r.toCredit)?'onto your balance with us':refunds.some(r=>r.toCredit)?'partly to your account with us and partly to your bank':'to your bank';paragraph((state.fullyRefunded?'This payment was refunded in full.':money(state.refunded)+' of this payment has been refunded.')+' The money did arrive and was then returned '+where+'. This is still the original receipt for what was received.',color('#b3261e'));}
 room(98);page.drawRectangle({x:M,y:H-y-87,width:INNER,height:87,color:paper,borderColor:rule,borderWidth:.6});text(state.gone?'REVERSED, ORIGINALLY RECEIVED':state.fullyRefunded?'REFUNDED, ORIGINALLY RECEIVED':'RECEIVED WITH THANKS',M+14,y+11,9,bold,dim);text(money(input.payment.amount),M+14,y+28,27,bold,!state.gone&&!state.refunded?color('#1c7a4a'):ink);text(state.gone?'Reversed '+date(state.gone.at):state.fullyRefunded?'Returned in full':state.refunded?money(state.refunded)+' refunded · '+money(state.net)+' still held':state.totals.due>0?money(state.totals.due)+' still outstanding':'Invoice settled in full',M+14,y+65,10);y+=102;
 const facts=[['From',input.client?.company||'—'],['Received',date(input.payment.at)],['How',input.payment.method],['Against',input.invoice.number],...(input.projectTitle?[['Project',input.projectTitle]]:[]),['Reference',input.payment.reference]];
 for(const [label,value]of facts){const lines=wrap(value,body,10,INNER-90);room(lines.length*14+9);text(label,M,y,9,bold,dim);lines.forEach((value,i)=>text(value,M+90,y+i*14));y+=lines.length*14+9;}y+=8;
 if(input.payment.note)paragraph(input.payment.note);
 if(input.payment.refunds?.length){room(38);text('Refunded',M,y,13,bold);y+=23;table(['When','Why','Where it went','Amount'],input.payment.refunds.map(r=>[date(r.at),r.reason,(r.toCredit?'Held on your balance':'Returned to your bank')+(r.reference?'\n'+r.reference:''),'−'+money(r.amount)]),[95,175,145,INNER-415]);paragraph('Still held against '+input.invoice.number+': '+money(state.net));}
 table(['Invoice','Total','Paid to date','Outstanding'],[[input.invoice.number,money(state.totals.total),money(input.invoice.paid),money(state.totals.due)]],[130,125,125,INNER-380]);
 }
 const footer=[input.footerNote,COMPANY_NAME+'. Questions about this '+kind.toLowerCase()+' go to '+CONTACT_EMAIL+'. This is a copy of the live '+kind.toLowerCase()+': scan the code to reopen it.'].filter(Boolean).join('\n'),footerLines=wrap(footer,body,8.5,INNER-230);room(Math.max(110,footerLines.length*12+25));line(y);y+=14;footerLines.forEach((value,i)=>text(value,M,y+i*12,8.5,body,dim));
 const receiptUrl=document?.url??receiptDocumentUrl(input.payment.token),mark='data:image/svg+xml;base64,'+at('public','brand','icon-navy.svg').toString('base64'),qr=await qrCode(receiptUrl,{dark:'#000065',light:'#ffffff',logo:mark,margin:4,level:'H'}),qrImage=await pdf.embedPng(await sharp(Buffer.from(qr.svg)).resize(400,400).png().toBuffer()),stamp=await pdf.embedPng(await sharp(Buffer.from(stampSvg(document?.stamp??state.stamp,assets.bold))).resize(480,480).png().toBuffer());
 y+=footerLines.length*12+16;room(110);page.drawImage(qrImage,{x:M,y:H-y-100,width:100,height:100});if(!document||document.stamp)page.drawImage(stamp,{x:W-M-110,y:H-y-110,width:110,height:110});
 for(const [index,leaf]of pdf.getPages().entries())leaf.drawText(input.payment.receiptNo+' · '+(index+1)+' / '+pdf.getPageCount(),{x:M,y:19,font:body,size:8,color:dim});
 return pdf.save();
}

export async function renderFinancialDocumentPdf(input:{record:Invoice|Estimate;kind:"Invoice"|"Estimate";client:Client|null;projectTitle:string|null;tin:string;footerNote:string;currency?:string;payments?:Payment[]}){
 const invoice=input.kind==="Invoice"?input.record as Invoice:{...input.record,status:"Sent",due:(input.record as Estimate).expires,paid:0} as Invoice;
 const status=input.kind==="Invoice"?invoiceStatus(invoice):estimateState(input.record as Estimate);
 const stamps:Record<string,StampStatus|undefined>={Paid:"paid","Part paid":"part",Overdue:"overdue",Void:"void",Draft:"draft",Declined:"failed",Expired:"void"};
 // The common renderer's receipt-only fields are never drawn for invoice/estimate documents.
 const payment={receiptNo:input.record.number,token:input.record.token,amount:0,refunds:[]} as unknown as Payment;
 return renderReceiptPdf({...input,payment,invoice},{kind:input.kind,record:input.record,stamp:stamps[status],url:new URL((input.kind==="Invoice"?"/i/":"/q/")+encodeURIComponent(input.record.token),receiptDocumentUrl("")).toString(),payments:input.payments});
}
