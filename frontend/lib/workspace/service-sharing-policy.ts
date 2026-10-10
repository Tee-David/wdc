import type {ServiceRecord} from './service-model';

/** Never project current private title/content into a previously shared record. */
export function projectSharedServiceRecord(record:ServiceRecord):ServiceRecord|null {
 if(record.visibility==='shared')return record;
 const shared=record.versions.filter(version=>version.visibility==='shared').sort((a,b)=>b.version-a.version)[0];
 if(!shared)return null;
 const decision=record.decisions.find(value=>value.version===shared.version);
 const activity=record.activity.find(value=>value.version===shared.version&&value.details.state);
 const delivery=record.activity.filter(value=>value.version===shared.version).reverse().reduce((data,value)=>({...data,...Object.fromEntries(Object.entries(value.details).filter(([key,text])=>['evidence','actual','publicationUrl','publishedAt'].includes(key)&&text))}),{...shared.data});
 return {...record,title:shared.title,data:delivery,version:shared.version,visibility:'shared',state:activity?.details.state||decision?.decision||'shared',updated_at:activity?.created_at||decision?.created_at||shared.created_at,readOnlyVersion:true};
}
