// Render the real WDC components for the standalone design artifact.
// Routing, auth and tour services are inert here; this process never loads env.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '../../frontend');
const fromApp = Module.createRequire(path.join(root, 'package.json'));
const ts = fromApp('typescript');
const React = fromApp('react');
const { renderToStaticMarkup } = fromApp('react-dom/server');
const originalLoad = Module._load;
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  if(request.startsWith('@/')) request = path.join(root, request.slice(2));
  return originalResolve.call(this, request, parent, ...rest);
};
Module._load = function(request, parent, ...rest) {
  if(request === 'next/link') return { __esModule:true, default: ({children, ...props}) => React.createElement('a',props,children) };
  if(request === 'next/navigation') return {usePathname:()=>'/admin/meetings',useRouter:()=>({replace(){},refresh(){},push(){}})};
  if(request === 'next-themes') return {useTheme:()=>({resolvedTheme:'light',setTheme(){}})};
  if(request === '@/lib/auth-client') return {authClient:{signOut:async()=>{}}};
  if(request.endsWith('tour-provider')) return {useOptionalAdminTour:()=>null};
  return originalLoad.call(this, request, parent, ...rest);
};
for(const ext of ['.tsx','.ts']) require.extensions[ext] = function(module, filename) {
  const source=fs.readFileSync(filename,'utf8');
  module._compile(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
};
require.extensions['.css']=()=>{};
const icons=fromApp('lucide-react');
const {WdcMark}=require(path.join(root,'components/brand/logo.tsx'));
const {Panel,DemoNote}=require(path.join(root,'components/admin/bits.tsx'));
const {Pager}=require(path.join(root,'components/admin/pager.tsx'));
const {FileDrop}=require(path.join(root,'components/admin/file-drop.tsx'));
const {Dialog}=require(path.join(root,'components/admin/dialog.tsx'));
const AdminShell=require(path.join(root,'components/admin/shell.tsx')).default;
const svg=name=>renderToStaticMarkup(React.createElement(icons[name],{'aria-hidden':true,width:18,height:18,strokeWidth:2}));
const components={icons:Object.fromEntries(['CalendarDays','CalendarClock','Clock','Video','ChevronLeft','ChevronRight','ArrowRight','ArrowLeft','Check','Plus','X','Link','Globe','Settings','LayoutDashboard','Users','FolderKanban','Banknote','ClipboardList','Newspaper','Bell','Search','Sun','Moon','MoreHorizontal','Mail','CircleCheck','CircleHelp','Download','Archive'].map(n=>[n,svg(n)])),logo:renderToStaticMarkup(React.createElement(WdcMark,{className:'ad__brandMark'})),panel:renderToStaticMarkup(React.createElement(Panel,{title:'__TITLE__'},'__CONTENT__')),demo:renderToStaticMarkup(React.createElement(DemoNote,null,'Sample meetings for design review. No bookings or messages are sent.'))};
components.userPager=renderToStaticMarkup(React.createElement(Pager,{label:'Users pagination',total:3,page:1,per:10,noun:'users',perOptions:[10,25,50,100],href:({per})=>'#user-size:'+per}));
components.backupPager=renderToStaticMarkup(React.createElement(Pager,{label:'Backups pagination',total:3,page:1,per:10,noun:'backups',perOptions:[10,25,50,100],href:({per})=>'#backup-size:'+per}));
components.archiveDrop=renderToStaticMarkup(React.createElement(FileDrop,{id:'archive-file',label:'Upload a WDC archive',hint:'ZIP archive. Nothing is uploaded in this design preview.',accept:'.zip'}));
components.backupDialog=renderToStaticMarkup(React.createElement(Dialog,{open:false,onClose(){},title:'__TITLE__'},'__CONTENT__'));
components.shell=renderToStaticMarkup(React.createElement(AdminShell,{role:'owner',user:{name:'Studio owner'},counts:{}},'__PAGE__'));
components.shell=components.shell.replace('<p class="ad__topTitle">Admin</p>','<p class="ad__topTitle">Meetings</p>');
const meetingLink=`<div class="ad__navItem"><a href="#" class="ad__link is-on" aria-current="page" data-action="calendar">${svg('CalendarDays')}<span>Meetings</span></a></div>`;
if(!components.shell.includes('href="/admin/meetings"')) components.shell=components.shell.replace('<div class="ad__navItem"><a href="/admin/blog"',meetingLink+'<div class="ad__navItem"><a href="/admin/blog"');
fs.writeFileSync(path.join(__dirname,'components.js'),`window.WDC_COMPONENTS = ${JSON.stringify(components)};\n`);
console.log('Rendered WDC shell, Panel, DemoNote, logo and Lucide icons.');
