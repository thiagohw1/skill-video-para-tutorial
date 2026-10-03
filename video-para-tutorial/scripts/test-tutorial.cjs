'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {writePost,validate}=require('./tutorial.cjs');

test('pacote conserva conteúdos independentes, ordem, imagens relativas e contexto',()=>{
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'video-tutorial-'));
 try{
  fs.mkdirSync(path.join(output,'imagens'));
  const steps=[
   {title:'Abra <Produtos>',text:'Escolha o produto de origem.',time:1,crop:[0,0,100,100],marks:[],file:'01-etapa.png',width:1740,height:780},
   {title:'Confira o resultado',text:'Confira o saldo do destino.',time:2,crop:[0,0,100,100],marks:[],file:'02-etapa.png',width:1740,height:780},
  ];
  steps.forEach(s=>fs.writeFileSync(path.join(output,'imagens',s.file),'fixture'));
  const manifest={title:'Transferência',intro:'Contexto geral',note:'Valores do exemplo',conclusion:'Resultado confirmado',steps};
  const meta={duration:3,width:100,height:100,audio:false};
  validate(manifest,meta);
  writePost(output,manifest,steps,meta,'video.mov');
  const pack=JSON.parse(fs.readFileSync(path.join(output,'tutorial.json')));
  assert.equal(pack.kind,'STEPPED');assert.equal(pack.version,1);
  assert.deepEqual(pack.steps.map(s=>s.title),steps.map(s=>s.title));
  const contents=pack.steps.map(s=>fs.readFileSync(path.join(output,s.contentFile),'utf8'));
  assert.ok(contents[0].includes('produto de origem'));
  assert.ok(!contents[0].includes('saldo do destino'));
  assert.ok(contents[1].includes('saldo do destino'));
  assert.ok(!contents[1].includes('produto de origem'));
  assert.ok(contents[0].includes('Contexto geral')&&contents[0].includes('Valores do exemplo'));
  assert.ok(!contents[1].includes('Contexto geral'));
  assert.ok(contents[1].includes('Resultado confirmado')&&!contents[0].includes('Resultado confirmado'));
  contents.forEach((html,i)=>{
   assert.ok(!html.includes('<h2>'));
   const src=html.match(/src="([^"]+)"/)[1];
   assert.ok(fs.existsSync(path.resolve(output,path.dirname(pack.steps[i].contentFile),src)));
  });
  assert.ok(contents[0].includes('alt="Abra &lt;Produtos&gt;'));
 }finally{fs.rmSync(output,{recursive:true,force:true});}
});
