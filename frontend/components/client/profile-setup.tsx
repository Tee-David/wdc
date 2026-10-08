"use client";
import { useEffect,useId,useState,useRef,type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Camera,UserRound } from 'lucide-react';
import { Form,Radios,Submit,Field } from '@/components/admin/form';
import { SettingsForm } from '@/components/admin/settings/kit';
import { toast } from '@/components/admin/toast';
import { FAIL,type ActionState } from '@/lib/admin/validate';
import { saveAppearance, saveClientProfile } from '@/lib/client-profile-actions';
import { appearanceValue,type Appearance,AVATAR_BYTES } from '@/lib/client-profile-policy';
import './profile-setup.css';

export function ProfileSetup({name,appearance,hasPhoto,welcome=false,readOnly=false}:{name:string;appearance:Appearance|null;hasPhoto:boolean;welcome?:boolean;readOnly?:boolean}) {
  const id=useId();const router=useRouter();const {theme,setTheme}=useTheme();
  const box=useRef<HTMLDivElement>(null);
  const [file,setFile]=useState<File|null>(null);const [preview,setPreview]=useState('');
  const [remove,setRemove]=useState(false);const [uploading,setUploading]=useState(false);const [skipping,setSkipping]=useState(false);
  const [photoError,setPhotoError]=useState('');const [photoFailed,setPhotoFailed]=useState(false);
  const previewUrl=useRef('');
  function chooseFile(selected:File|null){if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current=selected?URL.createObjectURL(selected):'';setPreview(previewUrl.current);setFile(selected);setPhotoFailed(false);}
  useEffect(()=>()=>{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);},[]);
  useEffect(()=>{const node=box.current;if(!node)return;const reset=()=>{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current='';setPreview('');setFile(null);setRemove(false);setPhotoError('');};node.addEventListener('reset',reset);return ()=>node.removeEventListener('reset',reset);},[]);
  async function save(previous:ActionState,fd:FormData) {
    if(readOnly)return FAIL({},'Profile changes are disabled in this preview.');
    if(skipping) return FAIL({},'Wait for Skip to finish.');
    setPhotoError('');
    fd.set('mode',welcome?'continue':'settings');fd.set('photo',remove?'remove':file?'replace':'keep');
    fd.delete('photoFile');
    if(file && !remove) {
      setUploading(true);
      try {
        const data=new FormData();data.set('photo',file);
        const response=await fetch('/api/client-profile/photo',{method:'POST',body:data});
        const out=await response.json();
        if(!response.ok) throw new Error(out.error||'The photo could not be prepared.');
        fd.set('pendingPhoto',out.pendingPhoto);
      } catch(error) {
        const message=error instanceof Error?error.message:'The photo could not be prepared.';
        setPhotoError(message);return FAIL({},message);
      } finally {setUploading(false);}
    }
    const result=await saveClientProfile(previous,fd);
    if(result.ok){const chosen=appearanceValue(fd.get('appearance'));if(result.profileSaved&&chosen)setTheme(chosen);chooseFile(null);setRemove(false);router.refresh();if(welcome)router.replace('/portal');}
    return result;
  }
  async function skip() {
    if(readOnly||uploading||skipping)return;
    setSkipping(true);
    try {const fd=new FormData();fd.set('mode','skip');const result=await saveClientProfile({ok:false},fd);toast(result.message||'Please try again.',result.ok?'good':'bad');if(result.ok){router.replace('/portal');router.refresh();}}
    finally{setSkipping(false);}
  }
  const controls=<>
    <div className="pProfile__photo">
      <span className="pProfile__avatar">{!photoFailed&&(preview || (hasPhoto&&!remove)) ? <Image unoptimized src={preview||'/api/client-profile/photo'} alt="Your profile photo" width={72} height={72} onError={()=>setPhotoFailed(true)} /> : <UserRound aria-hidden="true" />}</span>
      <div className="pProfile__photoControls">
        <label className="ad__btn" htmlFor={`${id}-photo`}><Camera aria-hidden="true" />{hasPhoto||file?'Replace photo':'Add a profile photo'}</label>
        <input id={`${id}-photo`} className="pProfile__file" type="file" name="photoFile" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading||skipping} onChange={event=>{const selected=event.target.files?.[0]??null;if(selected&&selected.size>AVATAR_BYTES){setPhotoError('Choose a photo up to 2MB.');event.target.value='';return;}setPhotoError('');chooseFile(selected);setRemove(false);}} />
        {file||hasPhoto ? <button type="button" className="ad__btn" disabled={uploading||skipping} onClick={()=>{chooseFile(null);setRemove(true);box.current?.querySelector('form')?.dispatchEvent(new Event('change',{bubbles:true}));}}>Remove photo</button> : null}
        <input type="hidden" name="photoChoice" value={remove?'remove':file?.name??'keep'} />
        <small>Optional. One still photo up to 2MB. It is saved when you continue or save changes.</small>
      </div>
    </div>
    {photoError?<p role="alert">{photoError}</p>:null}
    {uploading?<p role="status">Preparing your photo. Your current photo stays until saving succeeds.</p>:null}
    <Field name="name" label="Display name" defaultValue={name} required hint="Your sign-in name, up to 120 characters. Company and invoice details stay in Profile settings." />
    <div onChange={(event)=>{const t=event.target as HTMLInputElement;if(t.name==='appearance'&&!readOnly){const chosen=appearanceValue(t.value);if(chosen){setTheme(chosen);void saveAppearance(chosen);}}}}>
      <Radios name="appearance" label="Appearance" defaultValue={appearance??appearanceValue(theme)??'system'} options={[{value:'system',label:'System',note:'Follow your device.'},{value:'light',label:'Light'},{value:'dark',label:'Dark'}]} />
    </div>
  </>;
  return <div className="pProfile" ref={box}>
    {welcome ? <Form action={save} resetOnDone={false}>
      <PendingGate disabled={skipping||readOnly}>{controls}<div className="pProfile__actions"><Submit>Continue</Submit><button type="button" className="ad__btn" disabled={uploading||skipping||readOnly} onClick={()=>void skip()}>{skipping?'Skipping…':'Skip for now'}</button></div></PendingGate>
    </Form> : <SettingsForm action={save}><PendingGate>{controls}</PendingGate></SettingsForm>}
  </div>;
}

function PendingGate({children,disabled=false}:{children:ReactNode;disabled?:boolean}) {
  const {pending}=useFormStatus();return <fieldset disabled={pending||disabled}>{children}</fieldset>;
}

export function ProfileTheme({appearance}:{appearance:Appearance}) {
  const {setTheme}=useTheme();useEffect(()=>{setTheme(appearance);},[appearance,setTheme]);
  return <script dangerouslySetInnerHTML={{__html:`(function(){try{var t=${JSON.stringify(appearance)},d=document.documentElement;localStorage.setItem('theme',t);d.classList.remove('light','dark');d.classList.add(t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t)}catch(e){}})();`}} />;
}
