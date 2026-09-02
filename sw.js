const CACHE='monikas-v40-gold-native';
const APP_ASSETS=['./','./index.html','./manifest.json','./icon.svg','./gold-v1.js','./gold-native-v5.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 const isPage=url.origin===self.location.origin&&(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/pengeluaran'));
 if(isPage){event.respondWith(fetch(event.request).then(async r=>{
   const text=await r.clone().text();
   let patched=text.replace(/<script[^>]*gold-force-v4\.js[^>]*><\/script>/gi,'').replace(/<script[^>]*gold-v1\.js[^>]*><\/script>/gi,'').replace(/<script[^>]*gold-native-v5\.js[^>]*><\/script>/gi,'');
   patched=patched.replace('</body>','<script src="./gold-native-v5.js?v=5"></script></body>');
   return new Response(patched,{status:r.status,statusText:r.statusText,headers:r.headers});
 }).catch(()=>caches.match('./index.html').then(async r=>{
   if(!r)return new Response('MoniKas offline',{status:503});
   const text=await r.text();
   let patched=text.replace(/<script[^>]*gold-force-v4\.js[^>]*><\/script>/gi,'').replace(/<script[^>]*gold-v1\.js[^>]*><\/script>/gi,'').replace(/<script[^>]*gold-native-v5\.js[^>]*><\/script>/gi,'');
   patched=patched.replace('</body>','<script src="./gold-native-v5.js?v=5"></script></body>');
   return new Response(patched,{headers:{'Content-Type':'text/html; charset=utf-8'}});
 }));return;}
 event.respondWith(fetch(event.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(event.request,c)).catch(()=>{});return r}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});