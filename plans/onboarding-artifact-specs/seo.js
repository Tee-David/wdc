(function(){
var UN="I'm not sure, please advise me";
var join=function(a){return (a||[]).join(', ')};
var local=function(A){return A.customers==='local'||A.customers==='mix'};
var biz=function(A){return A.customers==='biz'||A.customers==='mix'};
var YNU=[{v:'yes',t:'Yes'},{v:'no',t:'No'},{v:'unsure',t:UN}];
var TF={'3':'3 months','6':'6 months','12':'12 months',unsure:'not sure, client wants advice'};
var Q=[
{id:'size',key:'seo_size',label:'How big is the job?',type:'choice',req:true,unsure:true,short:'Size the client gave',cond:'Always. First question of this flow.',
 opts:[{v:'S',t:'One site, one place',d:'A small site, or a single location.'},{v:'M',t:'A growing site',d:'More pages, or a few locations.'},{v:'L',t:'A big site or many places',d:'A large site, or many locations.'}],
 note:function(A){return 'Client says the job is: '+({S:'one site in one place',M:'a growing site',L:'a big site or many places'}[A.size]||'')}},
{id:'depth',key:'form_depth',label:'How much time do you want to spend on this form?',type:'choice',req:true,short:'Depth chosen',cond:'Always. Asked after the short core.',
 opts:[{v:'quick',t:'Quick',d:function(){return 'About '+depthMin(1)+' min. The short core only.'}},{v:'standard',t:'Standard',d:function(){return 'About '+depthMin(2)+' min. Adds your site, search words and tools.'}},{v:'deep',t:'Deep',d:function(){return 'About '+depthMin(3)+' min. Adds who writes your content and competitors.'}}],
 note:function(A){return 'Chose the '+A.depth+' depth'}},
{id:'has_site',key:'has_site',label:'Do you have a website now?',type:'choice',req:true,short:'Has a website',cond:'Always',opts:[{v:'yes',t:'Yes'},{v:'no',t:'Not yet'}],
 pts:function(A){return A.has_site==='no'?{t:'No site yet',n:1}:null},
 risk:function(A){return A.has_site==='no'?['No site yet: pages must exist before search work can start.']:[]}},
{id:'site_url',key:'site_url',old:true,label:'Your website',type:'url',req:true,parent:'has_site',ph:'https://',cond:'Shows when the answer is "Yes"',fn:function(A){return A.has_site==='yes'},short:'Website'},
{id:'customers',key:'customers',label:'Where are your customers?',type:'choice',req:true,unsure:true,short:'Customers',cond:'Always',
 opts:[{v:'local',t:'Near me',d:'People in my area.'},{v:'online',t:'Online, anywhere',d:'People across the country or the world.'},{v:'biz',t:'Other businesses',d:'My customers are companies.'},{v:'mix',t:'A mix',d:'More than one of these.'}],
 note:function(A){return 'Customers: '+({local:'near the business',online:'online, anywhere',biz:'other businesses',mix:'a mix'}[A.customers])},
 pts:function(A){return A.customers==='mix'?{t:'Mixed customers',n:2}:A.customers==='local'||A.customers==='biz'?{t:'Local or business customers',n:1}:null}},
{id:'geo',key:'geo',old:true,label:'Which areas do you serve?',type:'text',req:true,unsure:true,parent:'customers',ph:'For example the three areas around the shop, or nationwide',cond:'Shows when customers are "Near me" or "A mix"',fn:local,short:'Service area'},
{id:'has_gbp',key:'has_gbp',label:'Do you have a Google Business Profile?',type:'choice',req:false,parent:'customers',unsureOpt:UN,hint:'It is your business listing in maps and search.',cond:'Shows when customers are "Near me" or "A mix"',fn:local,short:'Google Business Profile',opts:YNU,
 risk:function(A){return A.has_gbp==='no'?['No Google Business Profile: set one up before local work.']:A.has_gbp==='unsure'?['Google Business Profile unknown: check it on the first call.']:[]},
 pts:function(A){return A.has_gbp==='no'?{t:'No business profile',n:1}:null}},
{id:'b2b_kind',key:'b2b_kind',label:'What kind of businesses buy from you?',type:'text',req:false,unsure:true,parent:'customers',cond:'Shows when customers are "Other businesses" or "A mix"',fn:biz,short:'Business customers'},
{id:'goals',key:'seo_goals',label:'What do you want search to do for you?',type:'multi',req:true,unsure:true,short:'Goals',cond:'Always',hint:'Pick as many as you need.',
 opts:[{v:'More calls',t:'More calls',d:'People phone you.'},{v:'More sales',t:'More sales',d:'People buy from you.'},{v:'More leads',t:'More leads',d:'People ask for a quote or leave details.'},{v:'More visibility',t:'More visibility',d:'More people find your name.'},{v:'Show up in AI answers',t:'Show up in AI answers',d:'Appear in answers from AI tools.'}],
 note:function(A){return 'Goals: '+join(A.goals).toLowerCase()},
 pts:function(A){var n=(A.goals||[]).length;return n?{t:'Goals',n:n+(has('goals','Show up in AI answers')?1:0)}:null},
 risk:function(A){return has('goals','Show up in AI answers')?['AI answers: no one controls what AI tools say. Promise nothing.']:[]}},
{id:'timeframe',key:'seo_timeframe',label:'How long would you like to run this for?',type:'choice',req:true,short:'Time frame',cond:'Always',unsureOpt:UN,
 opts:[{v:'3',t:'3 months'},{v:'6',t:'6 months'},{v:'12',t:'12 months'},{v:'unsure',t:UN}],
 note:function(A){return 'Time frame: '+TF[A.timeframe]},
 risk:function(A){return A.timeframe==='unsure'?['Time frame open: explain the 3 month minimum on the call.']:[]}},
{id:'tf_note',type:'notice',parent:'timeframe',label:'Results take time. Our work starts at 3 months. We cannot promise rankings or results.',html:'<b>Results take time.</b> Our work starts at 3 months. We cannot promise rankings or results.',cond:'Always, right under the time frame question',fn:function(){return true}},
{id:'target_terms',key:'target_terms',old:true,label:'What should someone be typing into Google when they find you?',type:'long',req:true,unsure:true,short:'Search words',cond:'Always'},
{id:'has_search_console',key:'has_search_console',label:'Do you have Google Search Console?',type:'choice',req:true,short:'Search Console',unsureOpt:UN,hint:'It shows how people find you in search. We only ask if you have it. Access comes later, and never as a password.',cond:'Always',opts:YNU,typeNote:'Choose one. Replaces the Search Console option in tools_access.',
 risk:function(A){return A.has_search_console!=='yes'?['No Search Console confirmed: set it up or check it on the first call.']:[]}},
{id:'has_analytics',key:'has_analytics',label:'Do you have Google Analytics?',type:'choice',req:true,short:'Analytics',unsureOpt:UN,hint:'It shows visits to your website and what people do there.',cond:'Always',opts:YNU,typeNote:'Choose one. Replaces the Analytics option in tools_access.',
 risk:function(A){return A.has_analytics!=='yes'?['No Analytics confirmed: set up measurement before reporting.']:[]}},
{id:'content_owner',key:'content_owner',old:true,label:'Who writes your content?',type:'choice',req:true,short:'Content owner',cond:'Always',opts:['Nobody yet','My team','An agency','I would like WDC to']},
{id:'content_writer_wanted',key:'content_writer_wanted',old:true,label:'Would you like us to write it?',type:'yesno',req:false,parent:'content_owner',cond:'Shows when the answer is "Nobody yet"',fn:function(A){return A.content_owner==='Nobody yet'},short:'Studio writes content',
 scope:'Extra to what you have already paid for. Say yes and we will send you a quote first. Nothing is charged from this form.',
 pts:function(A){return A.content_writer_wanted==='yes'?{t:'Content writing wanted',n:2}:null},
 risk:function(A){return A.content_writer_wanted==='yes'?['Content writing wanted: quote separately.']:[]}},
{id:'competitors',key:'competitors',old:true,label:'Which similar businesses show up when you search?',type:'long',req:false,unsure:true,ph:'Names or links are enough. You do not need to know their rankings.',short:'Competitors',cond:'Always'}
];
var S2=['has_search_console','has_analytics','content_owner','content_writer_wanted'],S3=['competitors'];
Q.forEach(function(q){q.s=S2.indexOf(q.id)>-1?2:S3.indexOf(q.id)>-1?3:1});
var D2=['has_site','site_url','target_terms','has_search_console','has_analytics'],D3=['content_owner','content_writer_wanted','competitors'];
Q.forEach(function(q){q.d=D3.indexOf(q.id)>-1?3:D2.indexOf(q.id)>-1?2:1});
var cust=['customers','geo','has_gbp','b2b_kind'],tools=['has_search_console','has_analytics','content_owner','content_writer_wanted','competitors'];
window.CFG={shortName:'SEO',h1:'Onboarding: SEO',
 lede:'One form for getting found on Google and in AI answers, near you or online. No budget question. Three ways to run it.',
 previewNote:'The shared details step stays as it is today. No monthly budget is asked. Access to tools comes later, through a secure route, never a password in this form.',
 flows:[
 {name:'Size first',short:'One opening question about how big the job is.',blurb:'The client says how big the job is. A small job finishes in about 6 to 8 questions. Bigger jobs open tools, content and competitors.',best:'Mixed clients and many small sites.',head:'size',gate:'s',levels:{S:1,M:2,L:3},levelText:{2:'And the job is "A growing site" or "A big site or many places", or the client was not sure.',3:'And the job is "A big site or many places".'},
  order:['size','has_site','site_url'].concat(cust,['goals','timeframe','tf_note','target_terms'],tools),studioNote:'The size question is the client’s view. The score on the left is counted from the picks.'},
 {name:'Outcome first',short:'Start with what search should do for them.',blurb:'Open with the goal, then the time frame, then who the customers are. Tools and content come last, and only if they apply.',best:'Clients with no technical knowledge.',head:'goals',tech:tools,
  order:['goals','timeframe','tf_note'].concat(cust,['has_site','site_url','target_terms'],tools),studioNote:'Tool questions come last.'},
 {name:'Choose your depth',short:'Same short core, then Quick, Standard or Deep.',blurb:'Everyone answers the same short core. Then they pick Quick, Standard or Deep. Deep adds content and competitors.',best:'Clients who want to spend more time, and clients who do not.',head:'depth',gate:'d',levels:{quick:1,standard:2,deep:3},levelText:{2:'And the depth is Standard or Deep.',3:'And the depth is Deep.'},
  order:cust.concat(['goals','timeframe','tf_note','depth','has_site','site_url','target_terms'],tools),studioNote:'Depth only changes how many questions show.'}],
 Q:Q,defaults:{size:'M',depth:'standard'},
 sample:{has_site:'yes',site_url:'https://yourbusiness.example',customers:'mix',geo:'The three areas around our shop',has_gbp:'no',goals:['More calls','Show up in AI answers'],timeframe:'6',target_terms:'Wedding photographer near me',has_search_console:'unsure',has_analytics:'yes',content_owner:'Nobody yet',content_writer_wanted:'yes'},
 bands:[{max:3,t:'Focused'},{max:7,t:'Standard'},{max:999,t:'Broad'}],
 sizeRule:'Focused is up to 3, Standard is 4 to 7, Broad is 8 or more. Points: each goal 1 (AI answers adds 1 more), a mix of customers 2, local or business customers 1, no site yet 1, no business profile 1, content writing wanted 2.',
 next:['We read your answers.','We book a short call to go through them with you.','You give us access to your tools in a secure way. We never ask for passwords here.','Your quote follows. Owner to confirm when the quote arrives.','You can come back to change your answers until you send them. Your link is saved.'],
 eng:{over:{9:'We work with care. We cannot promise rankings, traffic, calls, sales or a place in AI answers. Results take time.'},extra:{1:['The minimum engagement is 3 months.','Local SEO and AI search visibility work are part of the service.'],2:['You give us access to Search Console, Analytics and your site in a secure way. Never send passwords through this form.'],4:['Slow approvals delay the start of results and reports.'],5:['Content writing, if you want it, is extra and quoted first.','Tools you pay for stay in your name.'],10:['Search engines and AI answer tools change how they work. The studio is not liable for those changes.'],3:['You approve every content change before it goes live.']}},
 decisions:[
 'Pick one flow for SEO: Size first, Outcome first or Choose your depth.',
 'May the SEO page and this form say in public that work starts at 3 months? The plan makes it the owner’s call (plan 13.2). The form shows "Results take time. Our work starts at 3 months. We cannot promise rankings or results."',
 'The time frame options are 3, 6 and 12 months and the not sure option. Nothing shorter is offered. Confirm.',
 'No budget question is asked, as decided. Confirm that reports and quotes work without one.',
 'Search Console and Analytics are two Yes, No, Not sure questions. They replace the old tools_access multiple choice. Old submissions keep their tools_access answers. Confirm.',
 'Google Business Profile moved into its own question that only shows for local customers. Confirm.',
 'The AI answers card says "Appear in answers from AI tools." Approve the one line.',
 'Access is handled after the form, through a secure route. How should the studio ask for it, and where does the portal show it?',
 'target_terms stays required, with the not sure option as a valid answer. geo is renamed "Which areas do you serve?" and only shows for local customers. Stored keys stay. Confirm.',
 'The opening size question speaks for the client. The studio label Focused, Standard or Broad is counted from the picks. Confirm the thresholds on this page.',
 'The review screen says when the quote arrives. No timing exists in the plan. Owner to give the wording or the number of days.',
 'Engagement text is a draft. It stays off until a Nigerian lawyer has reviewed it. Open item O2 still decides whether ticks replace or sit beside a signed agreement.']
};
})();
