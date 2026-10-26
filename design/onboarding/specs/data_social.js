const PLAT=["Instagram","Facebook","X","TikTok","LinkedIn","YouTube","Pinterest","Snapchat","WhatsApp","Somewhere else","None yet"];
const SVC={
name:"Social Media Marketing and Paid Ads",
size:{key:"social_size",label:"How much help do you want?",help:"A rough feel is enough. The studio confirms it later.",opts:[
{v:"small",t:"Small",d:"One platform and one need"},
{v:"medium",t:"Medium",d:"A few platforms and a regular plan"},
{v:"large",t:"Large",d:"Many platforms, content and ads together"}]},
qs:[
{id:"packages",nk:"social_packages",type:"multi",tier:1,req:true,unsure:true,label:"What do you want us to do?",help:"Pick one, or mix them. Paid ads are a separate package.",
 opts:[{v:"mgmt",t:"Management",d:"We run your accounts day to day"},{v:"content",t:"Content creation",d:"We make the posts, photos and videos"},{v:"ads",t:"Paid ads",d:"We run adverts for you"}]},
{id:"channels",key:"channels",type:"multi",tier:1,req:true,label:"Which platforms are you on?",help:"Pick all that apply. Pick None yet if you are starting fresh.",opts:PLAT.map(function(x){return {v:x,t:x}}),noUnsure:"The client knows where they are."},
{id:"links",nk:"social_links",type:"textarea",tier:1,label:"Paste your links",help:"Put every link in this one box. Your pages, your website, anything we should see. We check them.",hint:"One link on each line"},
{id:"ad_budget",key:"ad_spend",type:"single",tier:1,req:true,unsure:true,parent:"packages",cond:"has('packages','ads')",when:"What do you want us to do includes Paid ads",label:"What monthly media budget have you set aside?",help:"This is media spend, paid to Meta or Google. It is separate from our fee.",
 opts:["Under ₦100k","₦100k to ₦500k","₦500k to ₦2m","Over ₦2m"].map(function(x){return {v:x,t:x}})},
{id:"accounts",nk:"social_accounts",type:"single",tier:1,req:true,unsure:true,label:"Do you already have accounts on these platforms?",opts:[{v:"all",t:"Yes, on all of them"},{v:"some",t:"On some of them"},{v:"none",t:"Not yet"}]},
{id:"access",key:"access_ok",type:"single",tier:1,req:true,parent:"accounts",cond:"any('accounts')||U.accounts",when:"Accounts question is answered",label:"How should we handle account access?",help:"Never send a password. You add us through each platform's own sharing settings. If you have no accounts, we can help you set them up.",
 opts:[{v:"give",t:"I can give WDC access"},{v:"setup",t:"Please help me set up the accounts"},{v:"through",t:"Please work through me"}],noUnsure:"A clear choice keeps the work moving."},
{id:"n_how",type:"notice",tier:1,title:"How we work",text:"We plan a content calendar and schedule posts ahead. We follow trends that suit you. Nothing goes live until you approve it.",sec:6},
{id:"goal",key:"social_goal",type:"single",outcome:true,tier:2,unsure:true,label:"What do you most want social media to achieve?",help:"Pick the closest one.",
 opts:["Awareness","Sales","Bookings","Community","Recruitment","Other"].map(function(x){return {v:x,t:x}})},
{id:"goal_other",key:"social_goal_other",type:"text",tier:2,parent:"goal",cond:"has('goal','Other')",when:"Main result is Other",label:"What other result matters to you?",hint:"Say it in a few words",noUnsure:"The client knows it."},
{id:"content_source",key:"content_source",type:"single",tier:2,unsure:true,cond:"has('packages','mgmt')&&!has('packages','content')",when:"Management is picked and Content creation is not",label:"Who creates your content today?",opts:["Nobody yet","My team","A freelancer","I would like WDC to"].map(function(x){return {v:x,t:x}})},
{id:"approver",nk:"social_approver",type:"text",tier:2,cond:"has('packages','mgmt')||has('packages','content')",when:"Management or Content creation is picked",label:"Who approves posts before they go live?",help:"One person works best.",hint:"Name and role",noUnsure:"The client decides who."},
{id:"speed",nk:"social_approval_speed",type:"single",tier:2,parent:"approver",unsure:true,cond:"has('packages','mgmt')||has('packages','content')",when:"Management or Content creation is picked",label:"How fast can they approve?",opts:[{v:"same",t:"Same day"},{v:"day",t:"Within a day"},{v:"two",t:"Within two days"},{v:"week",t:"Once a week"}]},
{id:"report",nk:"social_report_freq",type:"single",tier:2,unsure:true,label:"How often do you want a report?",opts:[{v:"week",t:"Every week"},{v:"two",t:"Every two weeks"},{v:"month",t:"Every month"}]},
{id:"success",nk:"social_success",type:"textarea",tier:2,unsure:true,label:"What counts as success for you?",hint:"For example: 20 new enquiries a month"},
{id:"results",nk:"social_results",type:"textarea",tier:2,label:"Do you have past results to share?",help:"Numbers are fine. Skip it if you have none.",hint:"For example: 2,000 followers, 40 enquiries a month"},
{id:"results_files",nk:"social_results_files",type:"upload",tier:3,label:"Screenshots of past results",hint:"Up to 8 files, 25 MB each. Images and PDFs."},
{id:"content_types",key:"content_types",type:"multi",tier:3,unsure:true,cond:"has('packages','mgmt')||has('packages','content')",when:"Management or Content creation is picked",label:"Which kinds of content tend to connect with your audience?",
 opts:["Short video","Photos","Carousels","Stories","Live","Written posts","Memes and humour","Behind the scenes","Other"].map(function(x){return {v:x,t:x}})},
{id:"content_types_other",key:"content_types_other",type:"text",tier:3,parent:"content_types",cond:"has('content_types','Other')",when:"Kinds of content includes Other",label:"What other kind of content should we consider?",hint:"Say it in a few words",noUnsure:"The client knows it."},
{id:"themes_yes",key:"themes_yes",type:"textarea",tier:3,unsure:true,label:"Anything you want us to keep coming back to?"},
{id:"themes_no",key:"themes_no",type:"textarea",tier:3,unsure:true,label:"Anything we should stay away from?",help:"Topics, competitors, a tone that is not you."},
{id:"admired",key:"competitors_admired",type:"textarea",tier:3,unsure:true,label:"Any competitor accounts you admire?",help:"Handles are enough."},
{id:"upcoming",key:"upcoming",type:"textarea",tier:3,label:"Any launches, promotions or events coming up we should plan around?"}
],
next:["The studio reads your answers and checks your links.","We may send a few short questions by email.","Your quote arrives by email within [N working days].","We agree the content calendar and how approvals work before anything is posted.","You can open your link again and change answers until you send."],
note:function(c){
 var r=[],f=[],pk=c.A.packages||[],ch=(c.A.channels||[]).filter(function(x){return x!=="None yet"});
 var links=(c.txt("links").match(/https?:\/\/\S+|www\.\S+|@\w+/g)||[]);
 r.push(["Size, as the client sees it",c.t("__size")]);
 r.push(["Packages",c.t("packages")]);
 r.push(["Platforms",ch.length?ch.length+": "+ch.join(", "):c.t("channels")]);
 if(links.length)r.push(["Links to check",links.length+" found in the box"]);
 r.push(["Main result wanted",c.t("goal")]);
 r.push(["Ad budget band",c.t("ad_budget")]);
 r.push(["Accounts today",c.t("accounts")]);
 r.push(["Access plan",c.t("access")]);
 r.push(["Approver",c.txt("approver")]);
 r.push(["Approval speed",c.t("speed")]);
 r.push(["Reporting",c.t("report")]);
 r.push(["Success looks like",c.txt("success").slice(0,140)]);
 r.push(["Past results",c.txt("results").slice(0,140)||(c.n("results_files")?c.n("results_files")+" screenshot file(s)":"")]);
 if(pk.length===3)f.push("All three packages: plan content, management and ads together");
 if(pk.indexOf("ads")>-1)f.push("Ad spend is paid to the platform, separate from the studio fee");
 if(pk.indexOf("ads")>-1&&(c.has("accounts","none")||c.has("access","setup")))f.push("Ads picked and accounts need setting up: open the ad account first");
 if(c.has("access","setup"))f.push("Client wants help setting up accounts");
 if(c.has("access","through"))f.push("Client wants us to work through them: plan for slow approvals");
 if(ch.length>=3)f.push(ch.length+" platforms: plan the calendar per platform");
 if(c.has("speed","week"))f.push("Approvals weekly: schedule in weekly batches");
 if(c.has("content_source","Nobody yet"))f.push("No content supply today: content creation is likely needed");
 if(c.has("ad_budget","Under ₦100k"))f.push("Smallest ad budget band: set modest goals");
 if(c.txt("results")||c.n("results_files"))f.push("Past results given: use them as the starting line");
 return {rows:r,flags:f};
},
eng:{v:{covers:"the social media work in your quote, which is the packages you picked from management, content creation and paid ads",not:"ad spend, tool subscriptions, and any platform not named in the quote",provide:"access to your accounts through each platform's own sharing tools (never a password), brand material, your approvals on time, and your ad budget",costs:"ad spend paid to the platform (Meta, Google and others), tool subscriptions and stock media",supplied:"logos, photos, videos, music, text and testimonials",noguar:"followers, reach, sales, leads, ad performance or that an ad will be approved",platforms:"Meta, Google, TikTok, LinkedIn, X and the other platforms",data:", including the audiences you upload for ads"},
extra:[
["Platform rules and ad approvals","Each platform has its own policies and approves or refuses ads and posts as it chooses. It can suspend an account or an ad. We follow the rules we know, but we cannot control the platform's decision."],
["Ad spend is paid to the platform","Your ad budget is paid straight to the platform and is separate from the studio fee. We spend only the budget you set. The platform's charges are final."],
["Results are not promised","Ad and post performance depends on budget, audience, content and the platform. We improve it as we learn, but we do not promise a result."],
["Approvals before posting","Nothing goes live until your named approver says yes. If approval is late, posts are late or skipped. We are not responsible for that."],
["The accounts are yours","The social and ad accounts belong to you. We work through access you share with us. Never send us a password. You can remove our access at any time."],
["Rights in what you supply","You confirm you may use every photo, video, song and text you give us, and that anyone shown agreed to it. We do not add music or images we cannot license."]]},
decisions:[
"Pick one flow. All three ask the same questions. They differ in how many a client sees and in what order.",
"The old Would you like us to create it question is retired. Content creation is now a package. Confirm.",
"The old handle for each platform questions are retired. The one links box replaces them. Confirm.",
"Who approves posts is a new question. The shared closing step already asks Who signs work off. Should one answer serve both?",
"Access choices now include Please help me set up the accounts, next to the two in today's form. Confirm the wording.",
"The ad budget wording and the four naira bands are kept from today's form. Revisit the bands?",
"A mix is a client picking more than one card. There is no separate Mix card. Confirm.",
"Quote timing: the review screen says [N working days]. Tell us the real promise before build.",
"The not sure wording uses a comma. Today's code uses a semicolon. Change the code constant to match.",
"The engagement text is a DRAFT. A Nigerian lawyer must review it before the flag is switched on."]
};
