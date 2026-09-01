const CACHE='monikas-v2-sheet-sync-1';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./manifest.json','./sheet-sync.js'])))});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(async res=>{const text=await res.text();const patched=text.includes('sheet-sync.js')?text:text.replace('</body>','<script src="./sheet-sync.js"></script></body>');return new Response(patched,{status:res.status,statusText:res.statusText,headers:{'Content-Type':'text/html; charset=utf-8'}})}).catch(()=>caches.match('./index.html')))}else{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))}});
