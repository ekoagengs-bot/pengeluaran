const CACHE='monikas-v9-cloud-watchdog-1';
const APP_ASSETS=['./','./index.html','./dashboard.html','./manifest.json','./icon.svg','./backend-config.js','./sheet-sync.js','./monitoring.js','./monitoring-fix.js'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(APP_ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  const url=new URL(event.request.url);
  const isPage=url.origin===self.location.origin &&
    (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/pengeluaran'));

  if(isPage){
    event.respondWith(
      fetch(event.request)
        .then(async response=>{
          const type=response.headers.get('content-type')||'';
          if(!type.includes('text/html')) return response;
          const html=await response.text();
          const marker='monitoring-fix.js';
          if(html.includes(marker)) return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
          const injected=html.replace('</body>','<script src="./monitoring-fix.js?v=9"></script></body>');
          const headers=new Headers(response.headers);
          headers.set('Content-Type','text/html; charset=utf-8');
          return new Response(injected,{status:response.status,statusText:response.statusText,headers});
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
        return response;
      })
      .catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html')))
  );
});
