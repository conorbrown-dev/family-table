import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {buildPwa} from '../scripts/build-pwa.mjs';

test('web export includes install metadata and valid Android icons',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'familytable-pwa-'));
 try{
  await cp(new URL('../public/',import.meta.url),root,{recursive:true});
  await writeFile(path.join(root,'index.html'),'<html><head><title>Family Table</title></head><body></body></html>');
  await buildPwa(root);
  const html=await readFile(path.join(root,'index.html'),'utf8');
  assert.match(html,/<link rel="manifest" href="\/manifest.webmanifest"/);
  assert.match(html,/serviceWorker.register\('\/sw.js'/);
  const manifest=JSON.parse(await readFile(path.join(root,'manifest.webmanifest'),'utf8'));
  assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');
  assert.equal(manifest.prefer_related_applications,false);
  for(const size of [192,512]){
   const icon=manifest.icons.find(icon=>icon.sizes===`${size}x${size}`);
   assert.ok(icon);assert.match(icon.purpose,/maskable/);
   const png=await readFile(path.join(root,icon.src));
   assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
  }
  assert.doesNotMatch(await readFile(path.join(root,'sw.js'),'utf8'),/__CACHE_NAME__|__PUBLIC_ASSETS__/);
 }finally{await rm(root,{recursive:true,force:true})}
});

test('offline worker leaves auth, API, and writes untouched and never reloads open forms',async()=>{
 const listeners={},requestedCaches=[],deleted=[],preloaded=[];
 const cache={addAll:async urls=>preloaded.push(...urls),match:async url=>url==='/offline.html'?new Response('offline page'):undefined};
 let offline=false,claimed=false;
 const self={location:{origin:'https://familytable.example'},clients:{claim:async()=>{claimed=true}},addEventListener:(name,listener)=>{listeners[name]=listener}};
 const template=await readFile(new URL('../service-worker.js',import.meta.url),'utf8');
 vm.runInNewContext(template.replace('__CACHE_NAME__',JSON.stringify('family-table-pwa-new')).replace('__PUBLIC_ASSETS__',JSON.stringify(['/offline.html','/icons/app-192.png'])),{
  self,URL,Response,
  caches:{open:async name=>{requestedCaches.push(name);return cache},keys:async()=>['family-table-pwa-old','family-table-pwa-new','unrelated-cache'],delete:async key=>deleted.push(key)},
  fetch:async()=>{if(offline)throw new Error('offline');return new Response('live response')},
 });
 const lifecycle=async name=>{let work;listeners[name]({waitUntil:promise=>{work=promise}});await work};
 await lifecycle('install');assert.deepEqual(preloaded,['/offline.html','/icons/app-192.png']);
 assert.equal(claimed,false);assert.equal(self.skipWaiting,undefined);
 await lifecycle('activate');assert.equal(claimed,true);assert.deepEqual(deleted,['family-table-pwa-old']);
 const request=async(url,method='GET',mode='cors')=>{
  let response;listeners.fetch({request:{url,method,mode},respondWith:promise=>{response=promise}});return response?await response:undefined;
 };
 assert.equal(await request('https://api.example/api/families'),undefined);
 assert.equal(await request('https://keycloak.example/realms/familytable'),undefined);
 assert.equal(await request('https://familytable.example/api/families'),undefined);
 assert.equal(await request('https://familytable.example/','POST'),undefined);
 assert.equal(await request('https://familytable.example/icons/app-192.png?code=secret'),undefined);
 assert.equal(await (await request('https://familytable.example/callback?code=secret&state=example','GET','navigate')).text(),'live response');
 offline=true;
 assert.equal(await (await request('https://familytable.example/','GET','navigate')).text(),'offline page');
 assert.deepEqual(preloaded,['/offline.html','/icons/app-192.png']);
 assert.ok(requestedCaches.every(name=>name==='family-table-pwa-new'));
});
