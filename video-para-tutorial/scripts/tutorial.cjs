#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const run=(bin,args,options={})=>cp.execFileSync(bin,args,{maxBuffer:128*1024*1024,...options});
const stamp=t=>{const rounded=Math.round(t*10)/10;return `${Math.floor(rounded/60)}:${(rounded%60).toFixed(Number.isInteger(rounded)?0:1).padStart(Number.isInteger(rounded)?2:4,'0')}`;};
const num=n=>String(n).padStart(2,'0');
function inspect(video){
 const p=JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',video]));
 const v=p.streams.find(s=>s.codec_type==='video');
 if(!v||!Number.isFinite(Number(p.format.duration)))throw Error('Vídeo sem resolução ou duração utilizável.');
 return {duration:Number(p.format.duration),width:v.width,height:v.height,audio:p.streams.some(s=>s.codec_type==='audio')};
}
function frame(video,time,file,reduced=false){run('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(time),'-i',video,'-frames:v','1',...(reduced?['-vf','scale=960:-1']:[]),'-y',file]);}
function wrap(text,width){
 const words=String(text).split(/\s+/).flatMap(w=>w.length>width?w.match(new RegExp(`.{1,${width}}`,'gu')):[w]);
 const lines=[];let line='';for(const word of words){if((line+' '+word).trim().length>width&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);return lines;
}
function txt(lines,x,y,size,color,weight=400){return lines.map((s,i)=>`<text x="${x}" y="${y+i*size*1.35}" font-family="Arial,sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(s)}</text>`).join('');}
function checkRect(rect,w,h,label){if(!Array.isArray(rect)||rect.length!==4||rect.some(v=>!Number.isInteger(v))||rect[0]<0||rect[1]<0||rect[2]<=0||rect[3]<=0||rect[0]+rect[2]>w||rect[1]+rect[3]>h)throw Error(`${label}: coordenadas fora da imagem ou inválidas.`);}
function validate(m,meta){
 for(const k of ['title','intro'])if(typeof m[k]!=='string'||!m[k].trim()||(k==='title'&&m[k].length>200))throw Error(`Campo obrigatório: ${k}`);
 if(!Array.isArray(m.steps)||!m.steps.length||m.steps.length>100)throw Error('O manifesto precisa de 1 a 100 etapas por pacote.');
 for(const [i,s] of m.steps.entries()){
   if(typeof s.title!=='string'||!s.title.trim()||s.title.length>200||typeof s.text!=='string'||!s.text.trim())throw Error(`Etapa ${i+1}: título e texto obrigatórios.`);
   if(!Number.isFinite(s.time)||s.time<0||s.time>=meta.duration)throw Error(`Etapa ${i+1}: timestamp fora do vídeo.`);
   checkRect(s.crop,meta.width,meta.height,`Etapa ${i+1}, recorte`);
   if(s.marks!==undefined&&!Array.isArray(s.marks))throw Error('marks deve ser uma lista.');
   if((s.marks||[]).length>3)throw Error(`Etapa ${i+1}: divida os destaques em mais imagens.`);
   for(const mark of s.marks||[]){checkRect(mark.rect,s.crop[2],s.crop[3],`Etapa ${i+1}, destaque`);if(typeof mark.title!=='string'||typeof mark.body!=='string')throw Error('Destaque precisa de título e texto.');}
 }
}
async function sample(video,work,intervalArg){
 const sharp=require('sharp'),meta=inspect(video),interval=intervalArg===undefined?Math.max(2,Math.floor(meta.duration/32)):Number(intervalArg);
 if(!Number.isFinite(interval)||interval<=0)throw Error('Intervalo precisa ser positivo.');
 fs.mkdirSync(work,{recursive:true});const samples=[];
 for(let t=0;t<meta.duration;t+=interval)samples.push({time:t,file:`amostra-${num(samples.length+1)}.png`});
 const last=Math.max(0,meta.duration-Math.min(.5,meta.duration/2));if(last>samples.at(-1).time+.5)samples.push({time:last,file:`amostra-${num(samples.length+1)}.png`});
 for(const s of samples)frame(video,s.time,path.join(work,s.file),true);
 for(let start=0;start<samples.length;start+=12){
   const items=samples.slice(start,start+12),H=Math.ceil(items.length/3)*360,inputs=[];let labels='';
   for(const [i,s] of items.entries()){const x=i%3*480,y=Math.floor(i/3)*360;inputs.push({input:await sharp(path.join(work,s.file)).resize(470,320,{fit:'inside'}).png().toBuffer(),left:x,top:y+30});labels+=txt([`${s.file} · ${stamp(s.time)}`],x+7,y+23,19,'#142b45');}
   inputs.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="${H}">${labels}</svg>`),left:0,top:0});
   await sharp({create:{width:1440,height:H,channels:3,background:'#eef1f5'}}).composite(inputs).jpeg({quality:90}).toFile(path.join(work,`contato-${num(start/12+1)}.jpg`));
 }
 fs.writeFileSync(path.join(work,'amostras.json'),JSON.stringify({video:path.basename(video),...meta,interval,samples},null,2));
 console.log(JSON.stringify({directory:work,frames:samples.length,contactSheets:Math.ceil(samples.length/12),...meta}));
}
async function annotated(sharp,source,s,index,destination){
 const [left,top,width,height]=s.crop,scale=Math.min(1280/width,1),iw=Math.round(width*scale),ih=Math.round(height*scale),W=1740;
 const title=wrap(s.title,62),head=Math.max(112,48+title.length*46),x0=35,y0=head+33;
 const cards=(s.marks||[]).map(m=>({title:wrap(m.title,22),body:wrap(m.body,26)}));
 const cardHeight=cards.reduce((n,c)=>n+c.title.length*34+21+c.body.length*34+48,0);
 const H=Math.max(y0+ih+85,y0+cardHeight+60,780);
 const shot=await sharp(source).extract({left,top,width,height}).resize(iw,ih).png().toBuffer();
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><marker id="tip" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#e35d24"/></marker></defs><rect width="${W}" height="${head}" fill="#142b45"/><rect x="35" y="28" width="65" height="59" rx="13" fill="#fb773c"/>${txt([num(index+1)],46,69,36,'white',700)}${txt(title,124,70,35,'white',700)}<rect x="1329" y="${y0}" width="380" height="${H-y0-80}" rx="18" fill="white"/>`;
 let cy=y0+39;
 (s.marks||[]).forEach((m,i)=>{
   const [a,b,c,d]=m.rect,x=x0+a*scale,y=y0+b*scale,w=c*scale,h=d*scale,bx=Math.max(x0+20,x-5),by=Math.max(y0+20,y-6);
   svg+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="none" stroke="white" stroke-width="9"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="none" stroke="#e35d24" stroke-width="5"/><circle cx="${bx}" cy="${by}" r="19" fill="#e35d24" stroke="white" stroke-width="3"/>${txt([i+1],bx-7,by+8,23,'white',700)}`;
   if(i===(s.marks.length-1)&&y+h+12<y0+ih){const ax=Math.min(x+w+65,x0+iw-20),ay=Math.min(y+h+72,y0+ih-18);svg+=`<path d="M${ax} ${ay}L${x+w-12} ${y+h+7}" fill="none" stroke="white" stroke-width="10"/><path d="M${ax} ${ay}L${x+w-12} ${y+h+7}" fill="none" stroke="#e35d24" stroke-width="5" marker-end="url(#tip)"/>`;}
   svg+=`<circle cx="1361" cy="${cy-7}" r="18" fill="#e35d24"/>${txt([i+1],1354,cy+1,23,'white',700)}${txt(cards[i].title,1390,cy,25,'#142b45',700)}`;
   cy+=cards[i].title.length*34+21;svg+=txt(cards[i].body,1350,cy,25,'#45556c');cy+=cards[i].body.length*34+48;
 });
 svg+=txt(['TUTORIAL PASSO A PASSO'],35,H-34,20,'#45556c',700)+txt([`Captura do vídeo · ${stamp(s.time)}`],1370,H-34,20,'#45556c')+'</svg>';
 await sharp({create:{width:W,height:H,channels:3,background:'#f4f6fa'}}).composite([{input:shot,left:x0,top:y0},{input:Buffer.from(svg),left:0,top:0}]).png({compressionLevel:9}).toFile(destination);
 return {width:W,height:H};
}
function writePost(output,m,results,meta,video){
 const alt=s=>s.title+'. '+(s.marks||[]).map(m=>m.title+': '+m.body).join(' ');
 const sections=results.map((s,i)=>`<section id="passo-${i+1}" class="step"><div class="step-heading"><span class="step-number">${num(i+1)}</span><h2>${esc(s.title)}</h2></div><p>${esc(s.text)}</p><figure><a href="imagens/${s.file}" target="_blank" rel="noopener" title="Ampliar captura"><img src="imagens/${s.file}" width="${s.width}" height="${s.height}" alt="${esc(alt(s))}" ${i>1?'loading="lazy"':''}></a><figcaption>Etapa ${i+1} · Captura em ${stamp(s.time)} do vídeo. <a href="imagens/${s.file}" download>Baixar imagem</a></figcaption></figure></section>`).join('\n');
 const article=`<article><header><div class="eyebrow">${esc(m.subtitle||'GUIA PASSO A PASSO')}</div><h1>${esc(m.title)}</h1><p class="lead">${esc(m.intro)}</p><div class="meta">${results.length} etapas · Capturas reais anotadas</div></header>${m.note?`<aside class="note"><strong>Antes de começar</strong><p>${esc(m.note)}</p></aside>`:''}${sections}${m.conclusion?`<section class="finish"><h2>Confira o resultado</h2><p>${esc(m.conclusion)}</p></section>`:''}</article>`;
 const toc=results.map((s,i)=>`<a href="#passo-${i+1}"><span>${num(i+1)}</span>${esc(s.title)}</a>`).join('');
 const css=fs.readFileSync(path.join(__dirname,'../assets/article.css'),'utf8');
 fs.writeFileSync(path.join(output,'tutorial.html'),`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.title)}</title><style>${css}</style></head><body><div class="topbar">TUTORIAL / PASSO A PASSO</div><div class="layout"><nav aria-label="Etapas"><strong>NESTE TUTORIAL</strong><div class="links">${toc}</div></nav><main>${article}</main></div><footer>Elaborado a partir do vídeo fornecido. Os destaques foram adicionados às capturas reais.</footer></body></html>`);
 fs.writeFileSync(path.join(output,'conteudo-para-site.html'),article.replaceAll('<img ','<img style="max-width:100%;height:auto" '));
 fs.writeFileSync(path.join(output,'texto-da-postagem.txt'),`${m.title}\n\n${m.intro}\n\n${m.note?m.note+'\n\n':''}`+results.map((s,i)=>`${i+1}. ${s.title}\n\n${s.text}\n\nImagem: imagens/${s.file}\nTexto alternativo: ${alt(s)}\n`).join('\n')+(m.conclusion?'\nRESULTADO\n'+m.conclusion+'\n':''));
 fs.writeFileSync(path.join(output,'fonte.json'),JSON.stringify({video:path.basename(video),...meta,steps:results.map(s=>({title:s.title,time:s.time,file:s.file}))},null,2));
 const stepsDir=path.join(output,'passos');fs.mkdirSync(stepsDir,{recursive:true});
 const packageSteps=results.map((s,i)=>{
   const file=`${num(i+1)}-etapa.html`;
   const context=i===0?`<p>${esc(m.intro)}</p>${m.note?`<h3>Antes de começar</h3><p>${esc(m.note)}</p>`:''}`:'';
   const finish=i===results.length-1&&m.conclusion?`<h3>Confira o resultado</h3><p>${esc(m.conclusion)}</p>`:'';
   const html=`<article>${context}<p>${esc(s.text)}</p><figure><img src="../imagens/${s.file}" width="${s.width}" height="${s.height}" alt="${esc(alt(s))}"><figcaption>Captura em ${stamp(s.time)} do vídeo.</figcaption></figure>${finish}</article>`;
   fs.writeFileSync(path.join(stepsDir,file),html);
   return {title:s.title,contentFile:`passos/${file}`};
 });
 fs.writeFileSync(path.join(output,'tutorial.json'),JSON.stringify({format:'macacapp-tutorial',version:1,kind:'STEPPED',title:m.title,summary:m.intro.slice(0,500),steps:packageSteps},null,2));
 fs.writeFileSync(path.join(output,'LEIA-ME.txt'),'MACACAPP — PASSO A PASSO\n\nNo macacapp, use Importar ZIP, mantenha tutorial.json como conteúdo selecionado e confira o formato Passo a passo e a quantidade de etapas. Crie o rascunho e revise: cada etapa terá título, texto e imagem próprios no editor.\n\nO manifesto tutorial.json referencia os arquivos individuais de passos/. As imagens ficam em imagens/. Contexto e observações aparecem no primeiro passo; a conferência final, no último. Mantenha a estrutura de pastas no ZIP.\n\nPARA OUTROS SITES\nAbra tutorial.html mantendo imagens/ ao lado. Para um editor HTML, use conteudo-para-site.html. Para preencher passos manualmente, use o título de cada entrada de tutorial.json e o HTML correspondente em passos/. Envie os PNGs à biblioteca de mídia e substitua os caminhos relativos pelos endereços obtidos. O texto editável e os textos alternativos ficam em texto-da-postagem.txt.\n\nOs valores e telas refletem o exemplo gravado. Nenhum post foi criado ou publicado automaticamente.\n');
}
async function build(video,manifestFile,output,work){
 const sharp=require('sharp'),meta=inspect(video),m=JSON.parse(fs.readFileSync(manifestFile,'utf8'));validate(m,meta);
 output=path.resolve(output);work=path.resolve(work);
 const archive=output+'.zip';if(fs.existsSync(archive))throw Error('O ZIP já existe; preserve-o e escolha outro destino.');
 if(output===work||work.startsWith(output+path.sep))throw Error('A pasta de trabalho precisa ficar fora da pasta final.');
 if(fs.existsSync(output)&&fs.readdirSync(output).length)throw Error('Destino contém arquivos. Use uma nova pasta para preservar a entrega anterior.');
 fs.mkdirSync(path.join(output,'imagens'),{recursive:true});fs.mkdirSync(work,{recursive:true});
 const results=[];
 for(const [i,s] of m.steps.entries()){
   const original=path.join(work,`selecionado-${num(i+1)}.png`),file=`${num(i+1)}-etapa.png`;
   frame(video,s.time,original);const dimensions=await annotated(sharp,original,s,i,path.join(output,'imagens',file));
   results.push({...s,file,...dimensions});console.log(`Imagem ${i+1}/${m.steps.length}: ${stamp(s.time)}`);
 }
 writePost(output,m,results,meta,video);
 run('zip',['-q','-r',archive,path.basename(output)],{cwd:path.dirname(output)});
 console.log(JSON.stringify({directory:output,archive,images:results.length}));
}
async function main(){
 const [mode,video,...args]=process.argv.slice(2);
 if(!mode||!video)throw Error('Uso: tutorial.cjs inspect VIDEO | sample VIDEO WORK [INTERVALO] | build VIDEO MANIFESTO OUTPUT WORK');
 if(mode==='inspect')console.log(JSON.stringify(inspect(video),null,2));
 else if(mode==='sample'&&args[0])await sample(video,path.resolve(args[0]),args[1]);
 else if(mode==='build'&&args.length===3)await build(video,args[0],args[1],args[2]);
 else throw Error('Comando ou argumentos inválidos.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={inspect,validate,wrap,stamp,writePost};
