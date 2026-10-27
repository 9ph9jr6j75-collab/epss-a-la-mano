'use strict';
const CACHE='epss-dripssha-20261027-v12';
const CORE=['./','index.html','styles.css','full-reader.js','app-v2.js','manifest.webmanifest','assets/icon.svg','assets/icon-180.png','assets/icon-192.png','assets/icon-512.png','assets/social-preview.png','assets/catalogo.json','assets/mr.json','assets/config.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('epss-dripssha-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(url.pathname.endsWith('.pdf')){event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request)));return;}
 event.respondWith(fetch(event.request).then(response=>{if(response.ok&&response.type==='basic'){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?caches.match('index.html'):Response.error()))));
});
self.addEventListener('message',event=>{
 if(event.data?.type!=='CACHE_DOCUMENTS')return;
 event.waitUntil((async()=>{
  const port=event.ports[0],cache=await caches.open(CACHE);
  const files=[...new Set(event.data.files||[])].filter(file=>/^assets\/[a-zA-Z0-9/_-]+\.pdf$/.test(file));
  try{let count=0;for(const file of files){await cache.add(file);count++;port?.postMessage({progress:count,total:files.length});}port?.postMessage({ok:true,count});}
  catch{port?.postMessage({ok:false,error:'No se guardaron todos los documentos. Compruebe la conexión y el espacio del dispositivo.'});}
 })());
});
