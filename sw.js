const CACHE='monikas-v7-cloud-monitor-1';
const MONITOR_SCRIPT='./monitoring.js?v=7';

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll([
      './','./index.html','./dashboard.html','./manifest.json','./icon.svg','./backend-config.js','./sheet-sync.js','./monitoring.js'
    ])).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
  );
});

async function injectMonitoring(response){
  try{
    const contentType=response.headers.get('content-type')||'';
    if(!contentType.includes('text/html')) return response;
    const html=await response.text();
    if(html.includes('data-monikas-monitoring="1"')) return new Response(html,{headers:{'Content-Type':'text/html;charset=UTF-8'}});
    const injected=html.replace('</body>',`<script data-monikas-monitoring="1" src="${MONITOR_SCRIPT}"></script></body>`);
    return new Response(injected,{headers:{'Content-Type':'text/html;charset=UTF-8'}});
  }catch(e){return response;}
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  const sameOrigin=url.origin===self.location.origin;
  const wantsPage=sameOrigin && (event.request.mode==='navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/pengeluaran/'));

  event.respondWith((async()=>{
    try{
      const network=await fetch(event.request,{cache:'no-store'});
      if(wantsPage){
        const transformed=await injectMonitoring(network.clone());
        caches.open(CACHE).then(c=>c.put(event.request,transformed.clone())).catch(()=>{});
        return transformed;
      }
      const copy=network.clone();
      caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});
      return network;
    }catch(e){
      const cached=await caches.match(event.request);
      return cached || caches.match('./index.html');
    }
  })());
});
