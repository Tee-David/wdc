const SVC={
name:"Software and AI",
size:{key:"sw_size",label:"How big is the job?",help:"A rough feel is enough. The studio confirms it later.",opts:[
{v:"small",t:"Small",d:"One task to automate, or one small tool"},
{v:"medium",t:"Medium",d:"A tool or assistant with a few connections"},
{v:"large",t:"Large",d:"Several connected parts, with data and many users"}]},
qs:[
{id:"problem",key:"process",type:"textarea",tier:1,req:true,unsure:true,label:"What slows your team down most? Or tell us the idea.",help:"Plain words are perfect. Tell it like you would to a friend.",hint:"For example: we copy orders from WhatsApp into a spreadsheet by hand"},
{id:"files",nk:"sw_files",type:"upload",tier:1,label:"Show us what you have",hint:"Up to 8 files, 25 MB each. Documents, spreadsheets, screenshots and PDFs.",help:"Add as much detail as you like. Examples of the work today help most."},
{id:"type",nk:"sw_type",type:"multi",tier:1,req:true,unsure:true,label:"What kind of help do you need?",help:"Pick all that fit.",
 opts:[{v:"tool",t:"An internal tool",d:"A system your team uses every day"},{v:"auto",t:"An automation",d:"Work that happens on its own"},{v:"ai",t:"An AI assistant or chatbot",d:"Answers questions or does tasks for you"},{v:"connect",t:"Connecting systems",d:"Make your tools talk to each other"},{v:"pipeline",t:"A data pipeline",d:"Collects, cleans and moves your data"},{v:"other",t:"Something else"}]},
{id:"type_other",nk:"sw_type_other",type:"text",tier:1,parent:"type",cond:"has('type','other')",when:"Kind of help includes Something else",label:"What else do you have in mind?",hint:"Say it in a few words"},
{id:"tools",key:"systems",type:"textarea",tier:1,unsure:true,label:"Which tools must it connect to?",help:"Any tool with an API can be connected. An API is a way for software to talk to other software. If you are not sure, list the tool anyway.",hint:"For example: accounting software, WhatsApp, a payment provider, an existing database"},
{id:"ai_data",nk:"sw_ai_data",type:"textarea",tier:1,parent:"type",unsure:true,cond:"has('type','ai')",when:"Kind of help includes An AI assistant or chatbot",label:"Do you have rules about the data? Where may it go, and who may see it?",help:"This is where you tell us your terms for AI and data. Write them in your own words.",hint:"For example: customer data must stay in Nigeria, only managers see salaries"},
{id:"n_demo",type:"notice",tier:1,title:"Want to see past work first?",text:"We show demos of past work on the discovery call.",sec:6},
{id:"outcome",nk:"sw_outcome",type:"single",outcome:true,only:[2],tier:2,unsure:true,label:"What do you want to happen?",help:"Pick the closest one. You can add detail next.",
 opts:[{v:"time",t:"Save my team time"},{v:"answer",t:"Answer customer questions automatically"},{v:"copy",t:"Stop copying data between tools"},{v:"insight",t:"Understand my data better"},{v:"build",t:"Build a tool my team will use"},{v:"other",t:"Something else"}]},
{id:"users",key:"users_count",type:"text",tier:2,unsure:true,label:"How many people will use it, and who are they?",hint:"For example: 8 staff in the office"},
{id:"data_home",key:"data_home",type:"single",tier:2,unsure:true,label:"Where does that information live now?",opts:["Spreadsheets","WhatsApp","Paper","An existing system","Nowhere yet","Other"].map(function(x){return {v:x,t:x}})},
{id:"data_home_other",key:"data_home_other",type:"text",tier:2,parent:"data_home",cond:"has('data_home','Other')",when:"Where it lives is Other",label:"Where else is the information kept?",hint:"Say where",noUnsure:"The client knows where it is."},
{id:"success",key:"success_metric",type:"text",tier:2,unsure:true,label:"What number tells us this worked?",hint:"For example: hours saved a week, orders processed a day"},
{id:"steps",nk:"sw_steps",type:"textarea",tier:3,unsure:true,label:"Walk us through how the work is done today, step by step",hint:"First this happens, then that..."},
{id:"rules",key:"compliance",type:"textarea",tier:3,unsure:true,label:"Any regulation or data rule we must design around?",hint:"For example: industry rules or contract terms"},
{id:"ai_review",nk:"sw_ai_review",type:"single",tier:3,parent:"rules",unsure:true,cond:"has('type','ai')",when:"Kind of help includes An AI assistant or chatbot",label:"Should a person check what the AI says before it reaches anyone?",opts:[{v:"always",t:"Always"},{v:"sometimes",t:"Sometimes"},{v:"never",t:"Never"}]},
{id:"liked",nk:"sw_liked",type:"textarea",tier:3,label:"Have you seen something like this that you liked?",hint:"Paste a link or describe it"},
{id:"know",nk:"sw_know",tech:true,type:"yesno",tier:3,label:"Do you already know which tools you want us to use?",help:"Most people say no, and that is fine. The studio picks for you.",opts:[{v:"yes",t:"Yes, I know"},{v:"no",t:"No, you choose"}],noUnsure:"No is the default answer."},
{id:"known_tools",nk:"sw_known_tools",tech:true,type:"textarea",tier:3,parent:"know",cond:"has('know','yes')",when:"I already know is Yes",label:"Which tools or languages do you want?",hint:"For example: Python, Zapier, Postgres"}
],
next:["The studio reads your answers and files.","We may send a few short questions by email.","Your quote arrives by email within [N working days].","We book a discovery call. We show demos of past work there.","You can open your link again and change answers until you send."],
note:function(c){
 var r=[],f=[],ty=c.A.type||[];
 var tools=c.txt("tools").split(/[\n,;]+/).map(function(x){return x.trim()}).filter(Boolean);
 r.push(["Size, as the client sees it",c.t("__size")]);
 r.push(["Outcome picked",c.t("outcome")]);
 r.push(["Kind of help",c.t("type")]);
 r.push(["In their words",c.txt("problem").slice(0,160)]);
 if(c.n("files"))r.push(["Files shared",c.n("files")+" file"+(c.n("files")===1?"":"s")]);
 if(tools.length)r.push(["Tools to connect",tools.length+" named: "+tools.slice(0,6).join(", ")]);
 r.push(["AI data rules",c.has("type","ai")?(c.txt("ai_data").trim()?"Client gave rules":(c.U.ai_data?"Client not sure":"")):""]);
 r.push(["Users",c.txt("users")||(c.U.users?"Client not sure":"")]);
 r.push(["Information lives in",c.t("data_home")]);
 r.push(["Success measure",c.txt("success")]);
 if(ty.indexOf("pipeline")>-1)f.push("Pipeline: in scope when orchestrated. Check it is not very heavy");
 if(tools.length>=3)f.push(tools.length+" tools to connect: check each one has an API");
 if(c.has("type","ai")&&c.U.ai_data)f.push("AI work and no data rules yet: ask on the discovery call");
 if(c.has("type","ai")&&c.txt("ai_data").trim())f.push("Client set data terms: copy them into the engagement record");
 if(c.has("ai_review","never"))f.push("Client wants no human check on AI output: advise against it");
 if(c.n("files")>=5)f.push("Many files: read them before quoting");
 if(c.has("__size","large"))f.push("Large: confirm it is not very heavy software");
 if(c.has("type","other")||c.U.type)f.push("Kind of help unclear: settle it on the discovery call");
 if(c.has("know","yes"))f.push("Client named tools: check they fit");
 return {rows:r,flags:f};
},
eng:{v:{covers:"the software, automation or AI assistant described in your quote",not:"work outside the agreed list, running costs, and support after launch unless we agree it",provide:"access to the tools and data we need through safe sharing (never a password), sample documents, test users, your data rules, and your feedback",costs:"AI model usage, API and tool subscriptions, hosting and servers, and the fees of the tools we connect",supplied:"documents, data, text, images, code and access to your systems",noguar:"that AI answers are always correct, that a connected tool keeps working, or any saving of time or money",platforms:"AI providers and the tools we connect through their APIs",data:", and for the rules on where data may go and who may see it"},
extra:[
["AI can be wrong","AI outputs can be wrong. A person must check them before they are used or sent on. You stay responsible for decisions made from them."],
["You set the data terms","You tell us where data may go and who may see it. We build to those rules. If you give no rules, we tell you what we recommend and you decide."],
["Other tools change","Tools and AI services we connect can change or stop their APIs, prices or limits. We are not responsible for that. We will tell you and quote any rework."],
["What we do not build","Very heavy software is outside our scope. Orchestrated pipelines and connected tools are in scope. We tell you early if your idea is outside it."],
["Lawful use of the system","You are responsible for using the system lawfully, including data law, and for how your team and your customers use it."]]},
decisions:[
"Pick one flow. All three ask the same questions. They differ in how many a client sees and in what order.",
"The plan asks for a big upload area with many files. Today's upload allows 8 files of 25 MB each. Keep that limit, or raise it?",
"The AI data rules question shows only when An AI assistant or chatbot is picked. Plan 7.5 says AI work. Should data pipelines also see it?",
"The old regulation question (compliance) is kept as a Deep question. Merge it into the AI data rules question, or keep both?",
"The note that very heavy software is out of scope is not shown to the client up front. It is in the agreement and in the studio note only. Show an early notice as well?",
"Quote timing: the review screen says [N working days]. Tell us the real promise before build.",
"Tools to connect is one free text box, as the plan says. Add tool chips later if clients struggle to list them.",
"The not sure wording uses a comma. Today's code uses a semicolon. Change the code constant to match.",
"The engagement text is a DRAFT. A Nigerian lawyer must review it before the flag is switched on."]
};
