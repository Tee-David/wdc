(function(){
var UN="I'm not sure, please advise me";
var JW={'Sell online':3,'Take bookings':2,'Show our work':1,'Get enquiries':1,'Share information':1,'A members only area':3,'Something else':1};
var join=function(a){return (a||[]).join(', ')};
var improving=function(A){return A.site_new_or_existing==='Improving an existing site'};
var pays=function(A){return has('site_jobs','Sell online')||A.book_pay==='yes'};
var PG={'1 to 5':1,'6 to 15':2,'16 to 40':3,'More than 40':4};
var DL={none:'no fixed date',month:'within a month',two:'within two weeks',set:'a set date'};
var Q=[
{id:'size',key:'site_size',label:'How big is the site?',type:'choice',req:true,unsure:true,short:'Size the client gave',cond:'Always. First question of this flow.',
 opts:[{v:'S',t:'A simple site',d:'Up to about 5 pages.'},{v:'M',t:'A bigger site',d:'About 6 to 15 pages.'},{v:'L',t:'A large site',d:'More than 15 pages, or special features.'}],
 note:function(A){return 'Client says the site is: '+({S:'a simple site, up to about 5 pages',M:'a bigger site, about 6 to 15 pages',L:'a large site, more than 15 pages or special features'}[A.size]||'')}},
{id:'depth',key:'form_depth',label:'How much time do you want to spend on this form?',type:'choice',req:true,short:'Depth chosen',cond:'Always. Asked after the short core.',
 opts:[{v:'quick',t:'Quick',d:function(){return 'About '+depthMin(1)+' min. The short core only.'}},{v:'standard',t:'Standard',d:function(){return 'About '+depthMin(2)+' min. Adds words and pictures, extra features, and your domain.'}},{v:'deep',t:'Deep',d:function(){return 'About '+depthMin(3)+' min. Adds examples you like and detail.'}}],
 note:function(A){return 'Chose the '+A.depth+' depth'}},
{id:'site_new_or_existing',key:'site_new_or_existing',old:true,label:'Is this a new website, or improving one you have?',type:'choice',req:true,short:'New or existing',cond:'Always',opts:['Brand new','Improving an existing site'],
 pts:function(A){return improving(A)?{t:'Existing site to improve',n:1}:null},
 risk:function(A){return improving(A)?['Existing site: check what must move across and what can change.']:[]}},
{id:'current_url',key:'current_url',old:true,label:'Your current site',type:'url',req:true,parent:'site_new_or_existing',ph:'https://',cond:'Shows when the answer is "Improving an existing site"',fn:improving,short:'Current site'},
{id:'current_problem',key:'current_problem',old:true,label:'What do you like and dislike about it?',type:'long',req:false,parent:'site_new_or_existing',cond:'Shows when the answer is "Improving an existing site"',fn:improving,short:'Likes and dislikes'},
{id:'free_review',key:'free_review',label:'Would you like a free review of your current site?',type:'yesno',req:false,parent:'site_new_or_existing',cond:'Shows when the answer is "Improving an existing site"',fn:improving,short:'Free review',
 scope:'A free review is advice. It is not a promise of results.',
 note:function(A){return A.free_review==='yes'?'Free review requested. Book it before the quote.':'No free review wanted.'},
 risk:function(A){return A.free_review==='yes'?['Free review owed. It is advice, not a guarantee.']:[]}},
{id:'site_jobs',key:'site_jobs',label:'What should the site do for you?',type:'multi',req:true,unsure:true,short:'Site jobs',cond:'Always',hint:'Pick as many as you need. Each one opens only the questions it needs.',
 opts:[{v:'Sell online',t:'Sell online',d:'A shop with a basket and payments.'},{v:'Take bookings',t:'Take bookings',d:'People pick a time or a date.'},{v:'Show our work',t:'Show our work',d:'A gallery or a set of projects.'},{v:'Get enquiries',t:'Get enquiries',d:'People send you a message or ask for a quote.'},{v:'Share information',t:'Share information',d:'Pages that explain who you are and what you do.'},{v:'A members only area',t:'A members only area',d:'Some pages are for people who sign in.'},{v:'Something else',t:'Something else',d:'Tell us what you have in mind.'}],
 note:function(A){return 'Site must: '+join(A.site_jobs).toLowerCase()},
 pts:function(A){var n=0;(A.site_jobs||[]).forEach(function(v){n+=JW[v]||1});return {t:'What the site must do',n:n}},
 risk:function(A){var r=[];if(has('site_jobs','A members only area'))r.push('Members area: sign in, roles and the client’s duty over member data.');return r}},
{id:'site_jobs_other',key:'site_jobs_other',label:'What else should the site do?',type:'text',req:false,parent:'site_jobs',cond:'Shows when "Something else" is picked',fn:function(A){return has('site_jobs','Something else')},short:'Other job'},
{id:'store_items',key:'store_items',label:'About how many things will you sell?',type:'choice',req:false,unsure:true,parent:'site_jobs',cond:'Shows when "Sell online" is picked',fn:function(A){return has('site_jobs','Sell online')},short:'Items to sell',
 opts:[{v:'few',t:'A handful, under 20'},{v:'some',t:'Some, 20 to 200'},{v:'many',t:'A lot, more than 200'}],
 note:function(A){return 'Items to sell: '+({few:'under 20',some:'20 to 200',many:'more than 200'}[A.store_items])},
 pts:function(A){return A.store_items==='many'?{t:'More than 200 items',n:2}:A.store_items==='some'?{t:'20 to 200 items',n:1}:null}},
{id:'pay_note',type:'notice',parent:'site_jobs',label:'Local payments: Paystack and Flutterwave. International payments: Stripe, PayPal and Square. You can also bring your own provider. Some setups are limited by the type of site. We will tell you which.',html:'<b>Local payments:</b> Paystack and Flutterwave. <b>International payments:</b> Stripe, PayPal and Square. You can also bring your own provider. Some setups are limited by the type of site. We will tell you which.',cond:'Shows when "Sell online" is picked, or people pay when they book',fn:pays},
{id:'pay_providers',key:'pay_providers',label:'Which payment provider would you like?',type:'multi',req:false,parent:'site_jobs',unsureOpt:UN,cond:'Shows when "Sell online" is picked, or people pay when they book',fn:pays,short:'Payment providers',
 opts:[{v:'Paystack',t:'Paystack',g:'Local'},{v:'Flutterwave',t:'Flutterwave',g:'Local'},{v:'Stripe',t:'Stripe',g:'International'},{v:'PayPal',t:'PayPal',g:'International'},{v:'Square',t:'Square',g:'International'},{v:'own',t:'I will bring my own',g:'Your choice'},{v:'unsure',t:UN,g:'Help'}],
 note:function(A){return 'Payment providers: '+(A.pay_providers||[]).map(function(v){return v==='own'?'client brings their own':v==='unsure'?'client wants advice':v}).join(', ')},
 pts:function(A){var n=(A.pay_providers||[]).filter(function(v){return v!=='unsure'}).length;return n?{t:'Payments',n:n>1?2:1}:null},
 risk:function(A){var r=['Payments: provider terms apply and some setups are limited by the type of site.'];if(has('pay_providers','own'))r.push('Own provider: check it works on the chosen platform.');if(has('pay_providers','unsure'))r.push('Provider not chosen: advise on local and international needs.');return r}},
{id:'pay_own',key:'pay_own',label:'Which provider will you bring?',type:'text',req:false,parent:'pay_providers',cond:'Shows when "I will bring my own" is picked',fn:function(A){return pays(A)&&has('pay_providers','own')},short:'Own provider'},
{id:'book_what',key:'book_what',label:'What will people book?',type:'text',req:false,unsure:true,parent:'site_jobs',ph:'For example fitting sessions or table reservations',cond:'Shows when "Take bookings" is picked',fn:function(A){return has('site_jobs','Take bookings')},short:'What is booked'},
{id:'book_pay',key:'book_pay',label:'Do people pay when they book?',type:'yesno',req:false,parent:'site_jobs',cond:'Shows when "Take bookings" is picked',fn:function(A){return has('site_jobs','Take bookings')},short:'Pay at booking'},
{id:'work_count',key:'work_count',label:'About how many pieces of work will you show?',type:'choice',req:false,unsure:true,parent:'site_jobs',cond:'Shows when "Show our work" is picked',fn:function(A){return has('site_jobs','Show our work')},short:'Work to show',opts:[{v:'few',t:'Up to 10'},{v:'some',t:'10 to 50'},{v:'many',t:'More than 50'}],
 note:function(A){return 'Pieces of work to show: '+({few:'up to 10',some:'10 to 50',many:'more than 50'}[A.work_count])}},
{id:'enquiry_ways',key:'enquiry_ways',label:'How should people get in touch?',type:'multi',req:false,parent:'site_jobs',cond:'Shows when "Get enquiries" is picked',fn:function(A){return has('site_jobs','Get enquiries')},short:'Ways to get in touch',opts:['A contact form','A call button','A WhatsApp button','A quote request form']},
{id:'member_what',key:'member_what',label:'What do members get?',type:'long',req:false,unsure:true,parent:'site_jobs',cond:'Shows when "A members only area" is picked',fn:function(A){return has('site_jobs','A members only area')},short:'Member benefits'},
{id:'member_join',key:'member_join',label:'How do people join?',type:'choice',req:false,unsure:true,parent:'site_jobs',cond:'Shows when "A members only area" is picked',fn:function(A){return has('site_jobs','A members only area')},short:'How people join',opts:[{v:'self',t:'They sign up themselves'},{v:'invite',t:'We invite them'},{v:'pay',t:'They pay to join'}],
 note:function(A){return 'Members join: '+({self:'by signing up themselves',invite:'by invitation',pay:'by paying'}[A.member_join])},pts:function(A){return A.member_join==='pay'?{t:'Paid membership',n:1}:null}},
{id:'page_count',key:'page_count',old:true,label:'About how many pages do you expect?',type:'choice',req:false,unsure:true,short:'Pages',cond:'Always',typeNote:'Choose one. Stored values keep the old range format.',opts:['1 to 5','6 to 15','16 to 40','More than 40'],
 pts:function(A){var n=PG[A.page_count];return n?{t:'Pages ('+A.page_count+')',n:n}:null}},
{id:'content_ready',key:'content_ready',old:true,label:'Do you have the words and pictures?',type:'choice',req:true,short:'Words and pictures',cond:'Always',opts:['They are ready','I have some of them','I need WDC to produce them']},
{id:'content_needed',key:'content_needed',old:true,label:'Which of them do you need from us?',type:'multi',req:false,parent:'content_ready',cond:'Shows when the answer is "I have some of them" or "I need WDC to produce them"',fn:function(A){return A.content_ready==='I have some of them'||A.content_ready==='I need WDC to produce them'},short:'Needed from the studio',opts:['Words','Photography','Both'],
 scope:'Writing and photography are extra to building the site, and quoted separately once we know how many pages there are.',
 risk:function(A){return ['Words or photography wanted from the studio: quote separately. This most often holds a launch date.']}},
{id:'deadline_kind',key:'deadline_kind',label:'When do you need it?',type:'choice',req:true,short:'Timing',cond:'Always',opts:[{v:'none',t:'No fixed date'},{v:'month',t:'Within a month'},{v:'two',t:'Within two weeks'},{v:'set',t:'A set date'}],
 note:function(A){return 'Timing: '+DL[A.deadline_kind]},pts:function(A){return A.deadline_kind==='two'?{t:'Rush',n:1}:null},risk:function(A){return A.deadline_kind==='two'?['Rush date: within two weeks.']:[]}},
{id:'fixed_dates',key:'fixed_dates',old:true,label:'Which date, and what is it for?',type:'long',req:false,parent:'deadline_kind',ph:'A launch, an event, a campaign.',cond:'Shows when timing is "Within two weeks" or "A set date"',fn:function(A){return A.deadline_kind==='two'||A.deadline_kind==='set'},short:'Fixed date',typeNote:'Long text. In the build this is a text box, not the browser date picker.'},
{id:'features',key:'features',old:true,label:'Anything else the site must do?',type:'multi',req:false,unsure:true,short:'Extra features',cond:'Always',hint:'Pick what you need. Skip it if nothing comes to mind.',
 opts:['Blog','Gallery','Multi-language','Newsletter sign up','Live chat','Map','Site search','Other','None yet'],
 pts:function(A){var n=(A.features||[]).filter(function(v){return v!=='None yet'&&v!=='Other'}).length;return n?{t:'Extra features',n:n}:null}},
{id:'features_other',key:'features_other',old:true,label:'What other feature do you need?',type:'text',req:false,parent:'features',cond:'Shows when "Other" is picked',fn:function(A){return has('features','Other')},short:'Other feature'},
{id:'has_hosting',key:'has_hosting',old:true,label:'Do you already have hosting and a domain?',type:'choice',req:true,short:'Hosting and domain',cond:'Always',hint:'A domain is your web address. Hosting is where your website runs.',unsureOpt:UN,
 opts:[{v:'Both',t:'Both'},{v:'Domain only',t:'Domain only'},{v:'Neither',t:'Neither'},{v:'unsure',t:UN}],typeNote:'Choose one. The stored not sure value is the UNSURE text in onboarding.ts.'},
{id:'hosting_details',key:'hosting_details',old:true,label:'Who is it with, and whose name is the account in?',type:'long',req:false,parent:'has_hosting',ph:'For example domain with Namecheap, hosting with Whogohost, both in Tobi’s name',cond:'Shows when the answer is "Both", "Domain only" or the not sure option',fn:function(A){return A.has_hosting==='Both'||A.has_hosting==='Domain only'||A.has_hosting==='unsure'},short:'Provider and account holder',
 hint:'Just the provider and the account holder. Please do not put passwords in this form. We will set access up properly with you when we get there.'},
{id:'domain_ideas',key:'domain_ideas',old:true,label:'Domain names you would like, best first',type:'long',req:false,unsure:true,parent:'has_hosting',ph:'Include the ending, like .com or .com.ng',cond:'Shows when the answer is "Neither"',fn:function(A){return A.has_hosting==='Neither'},short:'Domain ideas',typeNote:'Domain list with an optional availability check (existing control)'},
{id:'hosting_wanted',key:'hosting_wanted',old:true,label:'Would you like us to buy and set them up for you?',type:'yesno',req:false,parent:'has_hosting',cond:'Shows when the answer is "Neither"',fn:function(A){return A.has_hosting==='Neither'},short:'Studio buys domain and hosting',
 scope:'The domain and the hosting are paid to the registrar and the host, not to us. Our time to set them up is extra to the build, and you will see both figures before anything is bought.',
 risk:function(A){return A.hosting_wanted==='yes'?['Studio buys the domain and hosting in the client’s name. Quote the setup time.']:[]}},
{id:'wants_seo',key:'wants_seo',old:true,label:'Should we optimise it for search?',type:'yesno',req:false,short:'Search optimisation',cond:'Always',hint:'Search optimisation makes a site easier to find on Google. It is its own service, quoted separately.',typeNote:'Yes or no. The plan is silent on this question. See Decisions.'},
{id:'inspiration',key:'inspiration',old:true,label:'Sites you like, and what you like about them',type:'links',req:false,ph:'One link per line, then a few words.',short:'Sites liked',cond:'Always',unsure:true},
{id:'platform_preference',key:'platform_preference',label:'I already know what I want',type:'reveal',req:false,short:'Platform preference',revealLabel:'I already know what I want',cond:'Always, but hidden behind a link. Tap "I already know what I want" to open it.',
 opts:[{v:'WordPress',t:'WordPress'},{v:'Shopify',t:'Shopify'},{v:'Custom',t:'Custom built'},{v:'unsure',t:UN}],unsureOpt:UN,typeNote:'Hidden reveal, choose one. Closed by default.',
 risk:function(A){return A.platform_preference&&A.platform_preference!=='unsure'?['Client names a platform ('+A.platform_preference+'). The studio still checks it fits what the site must do.']:[]},
 note:function(A){return 'Platform preference: '+({unsure:'client wants advice'}[A.platform_preference]||A.platform_preference)}}
];
var S2=['features','features_other','has_hosting','hosting_details','domain_ideas','hosting_wanted','wants_seo'],S3=['inspiration','platform_preference'];
Q.forEach(function(q){q.s=S2.indexOf(q.id)>-1?2:S3.indexOf(q.id)>-1?3:1});
var D2=['content_ready','content_needed','features','features_other','has_hosting','hosting_details','domain_ideas','hosting_wanted','wants_seo'],D3=['current_problem','inspiration','platform_preference'];
Q.forEach(function(q){q.d=D3.indexOf(q.id)>-1?3:D2.indexOf(q.id)>-1?2:1});
var jobs=['site_jobs','site_jobs_other','store_items','pay_note','pay_providers','pay_own','book_what','book_pay','work_count','enquiry_ways','member_what','member_join'];
var start=['site_new_or_existing','current_url','current_problem','free_review'];
var tail=['content_ready','content_needed','deadline_kind','fixed_dates'];
var tech=['features','features_other','has_hosting','hosting_details','domain_ideas','hosting_wanted','wants_seo','inspiration','platform_preference'];
window.CFG={shortName:'Web',h1:'Onboarding: Full-Stack Web Development',
 lede:'One form for new sites and rebuilds. The client says what the site must do. The studio picks the platform. Three ways to run it.',
 previewNote:'The shared details step stays as it is today. Maintenance is not asked on this path, and no one is asked WordPress, Shopify or custom unless they open the "I already know what I want" link.',
 flows:[
 {name:'Size first',short:'One opening question about how big the site is.',blurb:'The client says how big the site is, in plain words. A simple site finishes in about 6 to 8 questions. Larger sites open domain, extras and examples.',best:'Mixed clients and many small sites.',head:'size',gate:'s',levels:{S:1,M:2,L:3},levelText:{2:'And the site is "A bigger site" or "A large site", or the client was not sure.',3:'And the site is "A large site".'},
  order:['size'].concat(start,jobs,['page_count'],tail,tech),studioNote:'The size question is the client’s view. The internal Small, Medium or Large label is counted from the picks and the client never sees it.'},
 {name:'Outcome first',short:'Start with what the site must do for them.',blurb:'Open with what the site must do. Each choice opens only the follow ups it needs. Extras, domain and platform come last, and only if they apply.',best:'Clients with no technical knowledge.',head:'site_jobs',tech:tech,
  order:jobs.concat(start,['page_count'],tail,tech),studioNote:'Technical questions come last. The platform link stays hidden unless the client opens it.'},
 {name:'Choose your depth',short:'Same short core, then Quick, Standard or Deep.',blurb:'Everyone answers the same short core. Then they pick Quick, Standard or Deep. Deep adds examples and detail.',best:'Clients who want to spend more time, and clients who do not.',head:'depth',gate:'d',levels:{quick:1,standard:2,deep:3},levelText:{2:'And the depth is Standard or Deep.',3:'And the depth is Deep.'},
  order:jobs.concat(start,['page_count','deadline_kind','fixed_dates','depth','content_ready','content_needed'],tech),studioNote:'Depth only changes how many questions show.'}],
 Q:Q,defaults:{size:'M',depth:'standard'},
 sample:{site_new_or_existing:'Improving an existing site',current_url:'https://yourbusiness.example',free_review:'yes',site_jobs:['Sell online','Take bookings'],store_items:'some',pay_providers:['Paystack','Stripe'],book_what:'Fitting sessions',book_pay:'yes',page_count:'6 to 15',content_ready:'I have some of them',content_needed:['Photography'],deadline_kind:'month',features:['Blog'],has_hosting:'Neither',domain_ideas:'myshop.com.ng',hosting_wanted:'yes'},
 bands:[{max:4,t:'Small'},{max:9,t:'Medium'},{max:999,t:'Large'}],
 sizeRule:'Small is up to 4, Medium is 5 to 9, Large is 10 or more. Points come from what the site must do (sell 3, bookings 2, members area 3, other jobs 1 each), pages (1 to 4), extra features (1 each), payments (1, or 2 for more than one provider), items to sell, a paid membership, an existing site, and a rush date.',
 next:['We read your answers.','We book a short call to go through them with you.','If you asked for a free review, we look at your current site before the quote.','Your quote follows. Owner to confirm when the quote arrives.','You can come back to change your answers until you send them. Your link is saved.'],
 eng:{over:{9:'We work with care. We cannot promise results, such as search rankings, traffic or sales from the site.'},extra:{1:['A free review of your current site is advice. It is not a guarantee of results.'],2:['You give us your words, pictures, domain and hosting details and provider accounts when we ask. Never send passwords through the form.'],5:['Domain, hosting, plugins, themes and payment provider fees are third party costs. You pay them.','Payment providers charge their own fees on every sale. Those fees are between you and the provider, under their terms.'],6:['Hosting and domain are in your name. If we buy them for you, we register them in your name.','Third party plugins and platforms stay under their own licences.'],7:['You promise that you own, or may use, every word, picture, logo and file for the site.'],10:['Platforms, plugins and payment providers can change their terms, fees or features. We are not liable for those changes. Some setups are limited by the type of site.'],12:['If the site collects customer details, you are responsible for how you use and store them.']}},
 decisions:[
 'Pick one flow for Web: Size first, Outcome first or Choose your depth.',
 'Maintenance is removed from the default path. The Services page still shows Maintenance as a step and a deliverable. Move it to a quiet line, or keep it? (plan 13.2)',
 'wants_maintenance, maintenance_after_reading and wants_blogging are no longer asked. Their stored keys stay so old submissions still read. Confirm that wants_blogging can go too, as the plan is silent on it.',
 'wants_seo ("Should we optimise it for search?") is kept as an optional yes or no at Standard depth, because the plan is silent. It could move to the SEO service instead. Keep or drop?',
 'The new "What should the site do for you?" cards replace site_goal and the old Online store, Bookings and Members area options in features. Should the build also write the matching feature values so admin views and exports still read?',
 'page_count stored values use the old range format with a dash character. This page shows "1 to 5" in copy. Keep the stored values and map them on read?',
 'The payment line names Paystack and Flutterwave (local) and Stripe, PayPal and Square (international), or the client’s own provider. Approve the exact wording, including "Some setups are limited by the type of site."',
 'The free review wording and who does it: "A free review is advice. It is not a promise of results." How long does it take, and who sends it?',
 'The "I already know what I want" link stays closed. Only people who open it see WordPress, Shopify or Custom built. Confirm that is the right place.',
 'The opening size question speaks for the client ("A simple site, up to about 5 pages"). The internal Small, Medium or Large label is counted by the studio from the picks. Confirm the thresholds on this page.',
 'Domain and hosting questions keep their existing wording and the optional availability check. No passwords are collected.',
 'The review screen says when the quote arrives. No timing exists in the plan. Owner to give the wording or the number of days.',
 'Engagement text is a draft. It stays off until a Nigerian lawyer has reviewed it. Open item O2 still decides whether ticks replace or sit beside a signed agreement.',
 'Dates are typed in a text box here, not the browser date picker, because native pickers are being replaced.']
};
})();
