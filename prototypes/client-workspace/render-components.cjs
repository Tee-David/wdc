// Actual WDC components, with inert routing and account adapters. Never loads env.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const root=path.resolve(__dirname,'../../frontend'),app=Module.createRequire(path.join(root,'package.json'));
const ts=app('typescript'),React=app('react'),{renderToStaticMarkup:render}=app('react-dom/server');
const resolve=Module._resolveFilename,load=Module._load;
let role='admin';
Module._resolveFilename=function(request,parent,...rest){if(request.startsWith('@/'))request=path.join(root,request.slice(2));return resolve.call(this,request,parent,...rest)};
Module._load=function(request,parent,...rest){
 if(request==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
 if(request==='next/navigation')return {usePathname:()=>role==='admin'?'/admin':'/portal/projects',useRouter:()=>({replace(){},refresh(){},push(){}})};
 if(request==='next-themes')return {useTheme:()=>({resolvedTheme:'light',setTheme(){}})};
 if(request==='@/lib/auth-client')return {authClient:{signOut:async()=>{}}};
 if(request==='@/lib/client-profile-actions')return {saveAppearance:async()=>{}};
 if(request.endsWith('tour-provider'))return {useOptionalAdminTour:()=>null};
 if(request.endsWith('support-context'))return {useSupportReadOnly:()=>false};
 return load.call(this,request,parent,...rest);
};
for(const ext of ['.tsx','.ts'])require.extensions[ext]=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
require.extensions['.css']=()=>{};
const icons=app('lucide-react'),{Panel,DemoNote}=require(path.join(root,'components/admin/bits.tsx'));
const names=['Bell','Users','FolderKanban','CalendarDays','MessageSquare','Mail','Check','CircleCheck','Clock','ArrowRight','ArrowLeft','Plus','X','Sun','Moon','Search','Settings','FileCheck2','Video','Download','TriangleAlert','Send','Globe','ClipboardList','Layers','Banknote','Eye','Info','Menu','LayoutDashboard','ShieldCheck','Megaphone','Palette','Code','Smartphone','ChartNoAxesCombined','ChevronDown','ChevronRight','Lock','ExternalLink'];
const result={icons:Object.fromEntries(names.map(n=>[n,render(React.createElement(icons[n]||icons.CircleHelp,{'aria-hidden':true,width:18,height:18}))])),panel:render(React.createElement(Panel,{title:'__TITLE__'},'__CONTENT__')),demo:render(React.createElement(DemoNote,null,'Design proposal · Fictional sample data. Actions only change this preview.'))};
const Admin=require(path.join(root,'components/admin/shell.tsx')).default;
result.admin=render(React.createElement(Admin,{role:'owner',user:{name:'Studio owner'},counts:{}},'__PAGE__'));
role='client';const Client=require(path.join(root,'components/client/shell.tsx')).default;
result.client=render(React.createElement(Client,{user:{name:'Mira Cole'},clientCompany:'Paper & Pine'},'__PAGE__'));
fs.writeFileSync(path.join(__dirname,'components.js'),'window.WDC_COMPONENTS='+JSON.stringify(result)+';\n');
console.log('Rendered actual AdminShell, ClientShell, Panel, DemoNote and Lucide icons.');

