const VERSION='1.2.0';
const CACHE='little-stars-shell-v3';
const ASSETS=['./','./index.html','./style.css?v=1.2.0','./app.js?v=1.2.0','./core.mjs?v=1.2.0','./icon.svg','./apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./manifest.webmanifest'];
const assetURLs=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('little-stars-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type!=='OFFLINE_STATUS'||!event.ports?.[0])return;event.waitUntil(caches.open(CACHE).then(async cache=>{const found=await Promise.all(ASSETS.map(url=>cache.match(url)));event.ports[0].postMessage({version:VERSION,ready:found.every(Boolean)});}));});
async function fetchPage(request){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),4000);try{const response=await fetch(request,{signal:controller.signal,cache:'no-cache'});if(response.ok&&!response.redirected)return response;throw Error('Page unavailable');}finally{clearTimeout(timer);}}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetchPage(request).catch(async()=>await caches.match(new URL('./index.html',self.registration.scope).href)||Response.error()));return;
 }
 if(!assetURLs.has(url.href))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{const saved=await cache.match(request);if(saved)return saved;const response=await fetch(request);if(response.ok&&!response.redirected)await cache.put(request,response.clone());return response;}));
});
