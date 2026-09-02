const CACHE='monikas-v16-source-authority-1';
const APP_ASSETS=['./','./index.html','./manifest.json','./icon.svg','./backend-config.js','./sheet-sync.js','./monitoring.js','./funds-final.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 const isPage=url.origin===self.location.origin&&(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/pengeluaran'));
 if(isPage){
  event.respondWith(fetch(event.request).then(async response=>{
   const type=response.headers.get('content-type')||''; if(!type.includes('text/html'))return response;
   const html=await response.text();
   let injected=html.replace(/<script[^>]+pos-dana\\.js[^>]*><\\/script>/gi,'').replace(/<script[^>]+funds-v5\\.js[^>]*><\\/script>/gi,'').replace(/<script[^>]+funds-final\\.js[^>]*><\\/script>/gi,'');
   if(!injected.includes('monitoring.js'))injected=injected.replace('</body>','<script src="./monitoring.js?v=16"></script></body>');
   const headers=new Headers(response.headers);headers.set('Content-Type','text/html; charset=utf-8');
   return new Response(injected,{status:response.status,statusText:response.statusText,headers});
  }).catch(()=>caches.match('./index.html')));return;
 }
 event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});return response;}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});