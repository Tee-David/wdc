const fs=require('node:fs'),path=require('node:path');
const here=__dirname,root=path.resolve(here,'../..');
let html=fs.readFileSync(path.join(here,'index.html'),'utf8');
let css=fs.readFileSync(path.join(root,'frontend/components/admin/admin.css'),'utf8')+'\n'+fs.readFileSync(path.join(here,'preview.css'),'utf8');
for(const [url,name] of [['/body.woff2','SpaceGrotesk-Medium.woff2'],['/heading.woff2','SpaceGrotesk-Bold.woff2']])css=css.replaceAll(url,'data:font/woff2;base64,'+fs.readFileSync(path.join(root,'frontend/assets/fonts',name)).toString('base64'));
html=html.replace('<link rel="stylesheet" href="/admin.css"><link rel="stylesheet" href="/preview.css">','<style>'+css+'</style>');
for(const name of ['components','communications','services','preview'])html=html.replace('<script src="/'+name+'.js"></script>','<script>'+fs.readFileSync(path.join(here,name+'.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
fs.writeFileSync(path.join(here,'artifact.html'),html.trimEnd()+'\n');
console.log('Portable artifact built with real dashboard styles, components, icons and local fonts. No network or credentials needed.');
