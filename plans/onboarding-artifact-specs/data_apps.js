const FEAT=[
{g:"Accounts",items:["Sign up and log in","Log in with Google or Apple","Profiles","Roles and permissions","Password reset by email"]},
{g:"Payments",items:["Take payments","Subscriptions","Wallet or credits","Invoices and receipts","Refunds"]},
{g:"Chat and community",items:["Messaging","Group chat","Comments and likes","Voice or video calls","Share to other apps"]},
{g:"Maps and places",items:["Maps","Find places near me","Live location tracking","Delivery tracking","Bookings by place"]},
{g:"Notifications",items:["Push notifications","Email alerts","SMS alerts","Reminders"]},
{g:"Offline and speed",items:["Works offline","Syncs when back online","Live updates","Installs from the browser"]},
{g:"Content and files",items:["Photos and video upload","Search","Feeds and lists","Documents and files","Reads text aloud"]},
{g:"Admin and data",items:["Admin panel","Reports and charts","Export to Excel","Import data","History of who changed what"]},
{g:"Smart features",items:["AI assistant","Scan with the camera","QR codes and barcodes","Recommendations"]},
{g:"Other",items:["More than one language","Dark mode","Something else"]}];
const SVC={
name:"Apps",
size:{key:"app_size",label:"How big is the app?",help:"A rough feel is enough. The studio confirms it later.",opts:[
{v:"small",t:"Small",d:"One main job and a handful of screens"},
{v:"medium",t:"Medium",d:"Several jobs, accounts and a few connections"},
{v:"large",t:"Large",d:"A full product with roles, payments and an admin side"}]},
qs:[
{id:"n_kind",type:"notice",tier:1,title:"Before we start",text:"We do not build games, anything deceptive, or apps that need heavy hardware. Everything else, tell us about it.",when:"",sec:6},
{id:"platforms",key:"platforms",type:"multi",tier:1,req:true,unsure:true,label:"Where will people use it?",help:"Pick all that apply. We can build for several from one shared base.",
 opts:[{v:"iphone",t:"iPhone"},{v:"android",t:"Android phone"},{v:"web",t:"Web browser"},{v:"desktop",t:"Desktop",d:"Windows or Mac"}],
 noteKey:"Old values were iOS and Android. They keep reading."},
{id:"stage",nk:"app_stage",type:"single",tier:1,req:true,unsure:true,label:"Where are you with the app today?",
 opts:[{v:"idea",t:"Only an idea"},{v:"designs",t:"Designs are ready"},{v:"prototype",t:"A prototype exists"},{v:"rebuild",t:"An app to rebuild or extend"}]},
{id:"existing",nk:"app_existing",type:"textarea",tier:1,parent:"stage",cond:"has('stage','rebuild')",when:"Stage is An app to rebuild or extend",label:"Where can we see the app today?",hint:"A store link, a web address, or a short description"},
{id:"design_files",nk:"app_files",type:"upload",tier:1,parent:"stage",cond:"has('stage','designs')||has('stage','prototype')",when:"Stage is Designs are ready or A prototype exists",label:"Upload your designs or prototype",hint:"Up to 8 files, 25 MB each. Images, PDFs and design files."},
{id:"main_job",key:"one_job",type:"text",tier:1,req:true,unsure:true,label:"In one sentence, what is the main job of the app?",hint:"For example: lets customers book a visit and pay"},
{id:"features",nk:"app_features",type:"search",tier:1,unsure:true,label:"Which features do you need?",help:"Search or scroll. Pick everything that sounds right. We confirm the list with you.",groups:FEAT},
{id:"n_proto",type:"notice",tier:1,title:"A first version comes first",text:"We show you a first version, called a prototype, before the full build. You can change direction early.",sec:6},
{id:"outcome",nk:"app_outcome",type:"single",outcome:true,only:[2],tier:2,unsure:true,label:"What should the app do for people?",help:"Pick the closest one. You can add detail next.",
 opts:[{v:"sell",t:"Let customers buy or book"},{v:"team",t:"Help my team do their work"},{v:"connect",t:"Keep people connected"},{v:"info",t:"Share information or content"},{v:"track",t:"Track or manage things"},{v:"other",t:"Something else"}]},
{id:"roles",key:"accounts",type:"textarea",tier:2,unsure:true,label:"Who uses the app, and what should each person be allowed to do?",help:"For example: customers place orders, staff update them. Tell us if people need to sign in.",hint:"Customers, staff, an owner..."},
{id:"offline",key:"offline",type:"single",tier:2,unsure:true,label:"Must it work without a connection?",opts:[{v:"yes",t:"Yes"},{v:"some",t:"Only some parts"},{v:"no",t:"No"}]},
{id:"offline_parts",nk:"app_offline_parts",type:"textarea",tier:2,parent:"offline",cond:"has('offline','some')",when:"Offline is Only some parts",label:"Which parts must work without a connection?",hint:"For example: reading the price list"},
{id:"connects",nk:"app_connects",type:"textarea",tier:2,unsure:true,label:"Is there anything it must connect to?",help:"For example accounting software, a payment provider or a database you already have.",hint:"Name the tools or systems"},
{id:"store",key:"store_accounts",type:"single",tier:2,unsure:true,cond:"has('platforms','iphone')||has('platforms','android')",when:"Where is Used on iPhone or Android",label:"Do you have developer accounts for the stores?",help:"Apple and Google both require a paid developer account in your name to publish. If you have neither, we walk you through it. It is not a blocker.",opts:[{v:"both",t:"Both"},{v:"one",t:"One of them"},{v:"neither",t:"Neither"}]},
{id:"store_wanted",key:"store_accounts_wanted",type:"yesno",tier:2,parent:"store",cond:"has('store','one')||has('store','neither')||U.store",when:"Store accounts is One of them, Neither or Not sure",label:"Would you like us to set up the ones you are missing?",help:"Apple and Google charge their own developer fees, paid to them and in your name. Our time to open the accounts and get the app through review is extra to the build, and quoted before we start.",opts:[{v:"yes",t:"Yes"},{v:"no",t:"No"}],noUnsure:"A simple yes or no."},
{id:"scale",nk:"app_users_count",type:"single",tier:3,unsure:true,label:"How many people do you expect in the first year?",opts:[{v:"u100",t:"Under 100"},{v:"u1k",t:"100 to 1,000"},{v:"u10k",t:"1,000 to 10,000"},{v:"o10k",t:"More than 10,000"}]},
{id:"privacy",nk:"app_data",type:"textarea",tier:3,unsure:true,label:"What personal information will the app hold, and about whom?",help:"For example: names and phone numbers of customers.",hint:"Say what and about whom"},
{id:"backend",key:"backend",type:"single",tier:3,unsure:true,label:"Does the app already have a system behind it?",help:"This is the system behind the app that stores information and handles requests. You do not need to know how it is built.",opts:[{v:"exists",t:"One exists"},{v:"build",t:"Build it"}]},
{id:"know",nk:"app_know",tech:true,type:"yesno",tier:3,label:"Do you already know which tools you want us to use?",help:"Most people say no, and that is fine. The studio picks for you.",opts:[{v:"yes",t:"Yes, I know"},{v:"no",t:"No, you choose"}],noUnsure:"No is the default answer."},
{id:"tools",nk:"app_tools",tech:true,type:"multi",tier:3,parent:"know",cond:"has('know','yes')",when:"I already know is Yes",label:"Which tools do you want?",opts:[{v:"rn",t:"React Native"},{v:"flutter",t:"Flutter and Dart"},{v:"native",t:"Native iPhone and Android"},{v:"pwa",t:"A web app that installs"},{v:"db",t:"A database I already use"}],unsure:true},
{id:"tools_other",nk:"app_tools_other",tech:true,type:"text",tier:3,parent:"know",cond:"has('know','yes')",when:"I already know is Yes",label:"Any other tool we should use?",hint:"Name it"}
],
next:["The studio reads your answers and files.","We may send a few short questions by email.","Your quote arrives by email within [N working days].","After the quote we show a first version, a prototype, before the full build.","You can open your link again and change answers until you send."],
note:function(c){
 var r=[],f=[],feats=c.A.features||[];
 var groups=FEAT.filter(function(g){return g.items.some(function(i){return feats.indexOf(i)>-1})}).map(function(g){return g.g});
 var pl=c.A.platforms||[];
 r.push(["Size, as the client sees it",c.t("__size")]);
 r.push(["Outcome picked",c.t("outcome")]);
 r.push(["Used on",c.t("platforms")]);
 r.push(["Stage",c.t("stage")]);
 r.push(["Main job",c.txt("main_job").slice(0,160)]);
 if(feats.length)r.push(["Features picked",feats.length+" in "+groups.length+" groups: "+groups.join(", ")]);
 r.push(["Offline",c.t("offline")]);
 r.push(["Connects to",c.txt("connects").slice(0,120)]);
 r.push(["Store accounts",c.t("store")]);
 r.push(["First year users",c.t("scale")]);
 if(pl.length>=3)f.push(pl.length+" platforms: plan each store and each screen size");
 if(c.has("stage","rebuild"))f.push("Existing app: review the code before quoting");
 if(groups.indexOf("Payments")>-1)f.push("Payments picked: confirm the provider and store rules");
 if(c.has("offline","yes")||c.has("offline","some")||feats.indexOf("Works offline")>-1)f.push("Offline work: needs a sync plan");
 if(feats.indexOf("Live updates")>-1||feats.indexOf("Voice or video calls")>-1)f.push("Live updates or calls: more moving parts");
 if(groups.indexOf("Smart features")>-1&&feats.indexOf("AI assistant")>-1)f.push("AI assistant: agree data rules, see Software and AI");
 if(groups.length>=6)f.push("Wide feature list ("+groups.length+" groups): likely large");
 if(c.has("store","neither")||c.U.store)f.push("Developer accounts missing: quote extra time");
 if(c.has("store_wanted","yes"))f.push("Client wants us to open store accounts");
 if(c.txt("privacy"))f.push("Personal data held: privacy duties apply");
 if(c.has("know","yes"))f.push("Client named tools: check they fit");
 return {rows:r,flags:f};
},
eng:{v:{covers:"the app described in your quote, as a first version (a prototype) and then the full build of the agreed features",not:"features not on the agreed list, store and running costs, and support after launch unless we agree it",provide:"your designs or notes, access given through safe sharing tools (never a password), store account details, test users, and your feedback",costs:"Apple and Google developer fees, hosting and servers, payment provider fees, and any paid tools the app uses",supplied:"logos, images, fonts, music, text, data and designs",noguar:"app store approval, downloads, user numbers, reviews or revenue",platforms:"Apple, Google, payment providers and the other services the app depends on",data:", and for telling your users how the app uses their data"},
extra:[
["App stores decide, not us","Apple and Google review every app and can refuse or remove it. Their rules change. We prepare the app for the rules we know, but we cannot control their decision."],
["Apps we do not build","We do not build games, anything deceptive or fraudulent, or apps that need heavy hardware work. We may decline or stop work if the app turns out to be one of these."],
["Prototype first","We show a first version, called a prototype, before the full build. You review it and approve it in writing. The full build starts after that approval."],
["Store accounts are yours","The Apple and Google developer accounts are opened in your name and you own them. We use access shared through each store's own tools. Never send us a password."],
["Data and privacy duties","If the app holds personal information, you must tell users how it is used and follow the data law that applies to you. We build the safeguards we agree, and you decide what is collected."]]},
decisions:[
"Pick one flow. All three ask the same questions. They differ in how many a client sees and in what order.",
"Plan 7.4 uses Who uses it twice. I split it: Where will people use it (iPhone, Android, web, desktop) and Who uses the app and what may each person do. Is that right?",
"The old Will customers pay through the app question and its follow up are retired. The Payments group in the feature list replaces them. Confirm, or keep the old question.",
"The store accounts question and its follow up are kept from today's form because the plan is silent. Confirm they stay.",
"Quote timing: the review screen says [N working days]. Tell us the real promise before build.",
"Fixed dates and the approver are already asked in the shared closing step, so they are not repeated here.",
"The platforms key keeps its name but now holds iphone, android, web and desktop. Old submissions with iOS and Android must still display.",
"The feature list has 45 items in 10 groups. Trim or add before build.",
"The not sure wording here is I'm not sure, please advise me with a comma. Today's code uses a semicolon. Change the code constant to match.",
"The engagement text is a DRAFT. A Nigerian lawyer must review it before the flag is switched on."]
};
