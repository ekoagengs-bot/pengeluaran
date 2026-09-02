const CACHE='monikas-v25-clean';
const APP_ASSETS=['./','./index.html','./manifest.json','./icon.svg'];
const OLD_GAS='https://script.google.com/macros/s/AKfycbxNM8ktGCa85FzdTHhjnynnJAzy1nL-7VXYaPiaKTsY9Xa79AVn3B8n_FcKUj8UDLyW9Q/exec';
const NEW_GAS='https://script.google.com/macros/s/AKfycbz8kXgT4mA_plY2n-g6XVSbqSy57ZVphjdjs4vF8_bo32bWD0YpSqQ0tK3zYB6OmC4_6w/exec';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin==='https://script.google.com'&&url.href.startsWith(OLD_GAS)){
    event.respondWith(fetch(new Request(url.href.replace(OLD_GAS,NEW_GAS),event.request)));
    return;
  }
  const isPage=url.origin===self.location.origin&&(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/pengeluaran'));
  if(isPage){
    event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});