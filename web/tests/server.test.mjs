import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';

test('production server supports callbacks, secure assets, and health checks',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'familytable-web-'));
 await writeFile(path.join(root,'index.html'),'<title>Family Table</title>');
 await mkdir(path.join(root,'_expo/static'),{recursive:true});
 await writeFile(path.join(root,'_expo/static/app.js'),'console.log("test")');
 await writeFile(path.join(root,'sw.js'),'// worker');
 await writeFile(path.join(root,'manifest.webmanifest'),'{}');
 const app=createApp(root);await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${app.address().port}`;
 try{
  const callback=await fetch(base+'/callback?code=example&state=example');assert.equal(callback.status,200);assert.match(await callback.text(),/Family Table/);assert.equal(callback.headers.get('cache-control'),'no-cache');assert.equal(callback.headers.get('x-frame-options'),'DENY');
  const asset=await fetch(base+'/_expo/static/app.js');assert.equal(asset.status,200);assert.match(asset.headers.get('cache-control'),/immutable/);
  const manifest=await fetch(base+'/manifest.webmanifest');assert.equal(manifest.status,200);assert.equal(manifest.headers.get('content-type'),'application/manifest+json');assert.equal(manifest.headers.get('cache-control'),'no-cache');
  const worker=await fetch(base+'/sw.js');assert.equal(worker.status,200);assert.equal(worker.headers.get('content-type'),'application/javascript; charset=utf-8');assert.equal(worker.headers.get('cache-control'),'no-cache');
  assert.equal((await fetch(base+'/assets/missing.ttf')).status,404);
  assert.equal((await fetch(base+'/.env')).status,404);
  assert.equal((await fetch(base+'/%2e%2e%2f.env')).status,404);
  assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
  assert.deepEqual(await (await fetch(base+'/health')).json(),{status:'ready'});
 }finally{await new Promise(resolve=>app.close(resolve));await rm(root,{recursive:true,force:true})}
});
