'use strict';
const CACHE='kas-keluarga-shell-v2.0.0';
const ASSETS=['./','./index.html','./style.css','./core.js','./app.js','./pwa.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
// Activate updates only after old application tabs close; avoid mixed shell versions.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kas-keluarga-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const known=ASSETS.map(p=>new URL(p,self.registration.scope).href);
 if(event.request.mode!=='navigate'&&!known.includes(url.href))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  const hit=await cache.match(event.request);if(hit)return hit;
  if(event.request.mode==='navigate')return await cache.match('./index.html');
  return fetch(event.request);
 }));
});
