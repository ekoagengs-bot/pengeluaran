const CACHE='monikas-v24-sync-1';
const APP_ASSETS=['./','./index.html','./manifest.json','./icon.svg','./backend-config.js','./sheet-sync.js','./monitoring.js'];
const OLD_GAS='https://script.google.com/macros/s/AKfycbxNM8ktGCa85FzdTHhjnynnJAzy1nL-7VXYaPiaKTsY9Xa79AVn3B8n_FcKUj8UDLyW9Q/exec';
const NEW_GAS='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin==='https://script.google.com'&&url.href.startsWith(OLD_GAS)){
    const target=new URL(url.href.replace(OLD_GAS,NEW_GAS));
    event.respondWith(fetch(target));
    return;
  }
  const isPage=url.origin===self.location.origin&&(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/pengeluaran'));
  if(isPage){
    event.respondWith(fetch(event.request).then(async response=>{
      const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))return response;
      let html=await response.text();
      html=html.replace(/<script[^>]+pos-dana\\.js[^>]*><\\/script>/gi,'').replace(/<script[^>]+funds-v5\\.js[^>]*><\\/script>/gi,'').replace(/<script[^>]+funds-final\\.js[^>]*><\\/script>/gi,'').replace(/<script[^>]+monitoring\\.js[^>]*><\\/script>/gi,'').replace(/<script[^>]+form-restore-v1\\.js[^>]*><\\/script>/gi,'').replace(/<script[^>]+form-bridge-v2\\.js[^>]*><\\/script>/gi,'').replace(/<script[^>]+form-fix-v3\\.js[^>]*><\\/script>/gi,'').replace(/<script[^>]+ui-repair-v4\\.js[^>]*><\\/script>/gi,'');
      html=html.replace('</body>','<script src="./monitoring.js?v=24"></script></body>');
      const headers=new Headers(response.headers);headers.set('Content-Type','text/html; charset=utf-8');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});return response;}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});