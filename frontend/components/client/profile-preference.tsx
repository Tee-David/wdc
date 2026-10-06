import { Panel } from '@/components/admin/bits';
import { readClientProfile } from '@/lib/client-profile';
import { ProfileSetup } from './profile-setup';
export async function ClientProfilePreference({userId,name}:{userId:string;name:string}) {
  const result=await readClientProfile(userId).then(profile=>({profile,available:true})).catch(()=>({profile:null,available:false}));
  if(!result.available)return <Panel title="Your account"><p className="adSetPad">Profile photos and appearance are not available yet. Ask the studio to finish account setup. Your current details are unchanged.</p></Panel>;
  const profile=result.profile;
  return <Panel title="Your account"><ProfileSetup name={profile?.display_name??name} appearance={profile?.appearance??null} hasPhoto={Boolean(profile?.avatar_key)} /></Panel>;
}
