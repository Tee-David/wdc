import { redirect } from 'next/navigation';
import { Panel } from '@/components/admin/bits';
import { ProfileSetup } from '@/components/client/profile-setup';
import { requireProfileClient,readClientProfile } from '@/lib/client-profile';
import { getPortalRequest } from '@/lib/portal/session';
import Link from 'next/link';
import { PageHead } from '@/components/admin/page-head';
import { RailCard, Workbench } from '@/components/admin/workbench';
import { RailRows } from '@/components/admin/rail-list';
import { WelcomeSteps, type WelcomeStep } from '@/components/admin/welcome';
import { LifeBuoy, MessageSquare } from 'lucide-react';
export const metadata={title:'Make yourself at home',robots:{index:false,follow:false}};
export default async function Welcome() {
  const request=await getPortalRequest();
  if(request.capture&&!request.support)return <div className="adDash"><header className="adDash__head"><div><h1>Make yourself at home</h1><p>Preview only. Profile changes are disabled.</p></div></header><Panel title="Your profile"><ProfileSetup name={request.session?.user.name??'Client'} appearance={null} hasPhoto={false} welcome readOnly /></Panel></div>;
  const result=await requireProfileClient().then(async account=>({account,profile:await readClientProfile(account.session.user.id)})).catch(()=>null);
  if(!result)return <div className="adDash"><header className="adDash__head"><h1>Your profile</h1></header><Panel title="Setup unavailable"><p className="adSetPad">Your account setup is not available right now. Your details are unchanged. Contact the studio to check your client access, or try again later.</p><Link className="ad__btn" href="/contact">Contact the studio</Link></Panel></div>;
  const {account:{name},profile}=result;
  if(profile?.setup_state!=='pending')redirect('/portal');
  const first=(name||'').split(/\s+/)[0]||'there';
  const steps:WelcomeStep[]=[
    {key:'details',icon:'person',title:'Confirm your details',body:'So invoices and emails reach the right person.',label:'Confirm',href:'/portal/settings'},
    {key:'projects',icon:'projects',title:'See your project',body:'Stages, files, and what we are doing next.',label:'Open projects',href:'/portal/projects'},
    {key:'approve',icon:'person',title:'Know how approvals work',body:'Approve a file or ask for changes. Nothing goes live without your yes.',label:'Show me',href:'/portal/projects'},
    {key:'pay',icon:'card',title:'See how to pay',body:'By Paystack or Flutterwave. A receipt follows.',label:'Open billing',href:'/portal/billing'},
    {key:'notify',icon:'bell',title:'Choose what reaches you',body:'Invoices, replies and files to approve, by email or here.',label:'Choose',href:'/portal/settings'},
  ];
  return <>
    <PageHead title={`Welcome, ${first}`} lede="Your account is ready. A few quick steps, or skip for now." />
    <Workbench railLabel="Help" rail={<RailCard title="Need a hand?" aside="We are a message away"><RailRows empty="" rows={[{key:'ask',title:'Message the studio',sub:'We reply the same working day',icon:MessageSquare,tone:'neutral',href:'/portal/support?new=1'},{key:'help',title:'Help articles',sub:'Short guides for each step',icon:LifeBuoy,tone:'neutral',href:'/portal/support?tab=articles'}]} /></RailCard>}>
      <WelcomeSteps id={`client-${name}`} title="Your portal is ready" blurb="Five steps. Everything about your projects, files and invoices lives here." steps={steps} />
      <Panel title="Your profile"><ProfileSetup name={name} appearance={profile.appearance} hasPhoto={Boolean(profile.avatar_key)} welcome /></Panel>
    </Workbench>
  </>;
}
