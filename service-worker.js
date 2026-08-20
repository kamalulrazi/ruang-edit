// Service worker Ruang Edit — bikin tool ini bisa dibuka OFFLINE setelah pertama kali diakses.
// Strategi "cache-first": file utama disimpan di cache pas pertama kali dibuka, lalu dipakai terus
// dari cache setiap kali dibuka lagi (tidak perlu internet) kecuali ada versi baru yang di-deploy.
const CACHE_NAME = 'ruang-edit-cache-v1';
const FILES_TO_CACHE = [
  './ruang-edit.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya urus permintaan file di dalam folder tool ini — biarkan permintaan lain (misal ke CDN
  // FFmpeg/model AI) lewat apa adanya, karena itu memang butuh internet pas dipakai.
  if(event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if(cached) return cached;
      return fetch(event.request).then((response) => {
        // Simpan salinan baru ke cache biar makin lengkap offline-nya, tapi jangan sampai gagal total
        // kalau responsenya bukan tipe yang bisa di-cache (misal cross-origin opaque response).
        if(response && response.status === 200 && response.type === 'basic'){
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
