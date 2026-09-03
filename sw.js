/* MoniKas lightweight service worker v44
   Fast startup: lazy-shim the heavy Tesseract library until OCR is actually used. */
const CACHE='monikas-v44-lite';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg','./gold-native-v5.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
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
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});