/* The build replaces these values. Only public install assets are cached. */
const CACHE_NAME=__CACHE_NAME__;
const PUBLIC_ASSETS=__PUBLIC_ASSETS__;

self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(PUBLIC_ASSETS)));
 // Keep updates waiting until existing windows close; never reload an active form.
});

self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('family-table-pwa-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});

self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){
  // Never store authenticated pages, callback URLs, or API responses.
  event.respondWith(fetch(request).catch(()=>caches.open(CACHE_NAME).then(cache=>cache.match('/offline.html'))));
 }else if(!url.search&&PUBLIC_ASSETS.includes(url.pathname)){
  event.respondWith(caches.open(CACHE_NAME).then(async cache=>(await cache.match(url.pathname))??fetch(request)));
 }
});
