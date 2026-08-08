const CACHE='player-db-supabase-v1';
const ASSETS=['./','./index.html','./styles.css','./app.js','./config.js','./assets/fiorentina-logo.webp','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>{
  if(e.request.url.includes('supabase.co') || e.request.url.includes('jsdelivr.net')) return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
