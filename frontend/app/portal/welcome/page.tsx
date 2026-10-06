import { redirect } from 'next/navigation';
import { Panel } from '@/components/admin/bits';
import { ProfileSetup } from '@/components/client/profile-setup';
import { requireProfileClient,readClientProfile } from '@/lib/client-profile';
import { getPortalRequest } from '@/lib/portal/session';
import Link from 'next/link';
export const metadata={title:'Make yourself at home',robots:{index:false,follow:false}};
export default async function Welcome() {
  const request=await getPortalRequest();
  if(request.capture&&!request.support)return <div className="adDash"><header className="adDash__head"><div><h1>Make yourself at home</h1><p>Preview only. Profile changes are disabled.</p></div></header><Panel title="Your profile"><ProfileSetup name={request.session?.user.name??'Client'} appearance={null} hasPhoto={false} welcome readOnly /></Panel></div>;
  const result=await requireProfileClient().then(async account=>({account,profile:await readClientProfile(account.session.user.id)})).catch(()=>null);
  if(!result)return <div className="adDash"><header className="adDash__head"><h1>Your profile</h1></header><Panel title="Setup unavailable"><p className="adSetPad">Your account setup is not available right now. Your details are unchanged. Contact the studio to check your client access, or try again later.</p><Link className="ad__btn" href="/contact">Contact the studio</Link></Panel></div>;
  const {account:{name},profile}=result;
  if(profile?.setup_state!=='pending')redirect('/portal');
  return <div className="adDash"><header className="adDash__head"><div><h1>Make yourself at home</h1><p>Your account is ready. Add a photo and choose how your Client portal looks, or skip for now.</p></div></header><Panel title="Your profile"><ProfileSetup name={name} appearance={profile.appearance} hasPhoto={Boolean(profile.avatar_key)} welcome /></Panel></div>;
}
