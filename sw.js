/* MoniKas lightweight service worker v46
   Fast startup: shell loads from cache first, latest HTML refreshes in background. */
const CACHE='monikas-v46-lite';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg','./gold-native-v5.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function staleWhileRevalidate(req){
  const cache=await caches.open(CACHE);
  const cached=await cache.match(req);
  const network=fetch(req,{cache:'no-store'}).then(r=>{if(r&&r.ok)cache.put(req,r.clone());return r}).catch(()=>null);
  if(cached){network.catch(()=>{});return cached;}
  const fresh=await network;
  return fresh||cache.match('./index.html');
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.href.includes('tesseract.min.js')){
    const shim=`(()=>{if(window.__mkTessShim)return;window.__mkTessShim=1;window.__mkLoadTesseract=()=>new Promise((res,rej)=>{if(window.__mkTessLoading){window.__mkTessLoading.then(res,rej);return}if(window.Tesseract&&typeof window.Tesseract.recognize==='function'&&!window.Tesseract.__mkShim){res();return}window.__mkTessLoading=new Promise((r,j)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=()=>r();s.onerror=j;document.head.appendChild(s)});window.__mkTessLoading.then(res,rej)});window.Tesseract={recognize:async(...a)=>{await window.__mkLoadTesseract();return window.Tesseract.recognize(...a)},__mkShim:true}})();`;
    event.respondWith(new Response(shim,{status:200,headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'}}));
    return;
  }
  if(url.origin!==self.location.origin) return;
  if(event.request.mode==='navigate'){
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  const staticAsset=/(index\.html|gold-native-v5\.js|manifest\.json|icon\.svg|^\/$)/.test(url.pathname);
  if(staticAsset){event.respondWith(staleWhileRevalidate(event.request));return;}
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});