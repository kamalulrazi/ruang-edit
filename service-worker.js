// Service worker Ruang Edit — bikin tool ini bisa dibuka OFFLINE setelah pertama kali diakses.
//
// Strategi:
// - HTML utama (ruang-edit.html) pakai "network-first": tiap dibuka, coba ambil versi TERBARU dari
//   server dulu. Kalau berhasil, langsung dipakai (dan cache-nya ikut diupdate). Kalau gagal (lagi
//   offline), baru jatuh ke versi cache biar tool tetap bisa dibuka tanpa internet. Ini yang bikin
//   update kode langsung kepake begitu dibuka lagi — gak perlu buka-tutup-buka berkali-kali.
// - File statis (ikon, manifest) tetap "cache-first" seperti sebelumnya, karena jarang berubah dan
//   lebih hemat kuota/lebih cepat dimuat dari cache.
const CACHE_NAME = 'ruang-edit-cache-v2';
const APP_SHELL = './ruang-edit.html';
const STATIC_FILES = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([APP_SHELL, ...STATIC_FILES]))
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

  const url = new URL(event.request.url);
  const isAppShell = event.request.mode === 'navigate' || url.pathname.endsWith('/ruang-edit.html');

  if(isAppShell){
    event.respondWith(
      fetch(event.request).then((response) => {
        if(response && response.status === 200){
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(APP_SHELL, clone));
        }
        return response;
      }).catch(() => caches.match(APP_SHELL))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if(cached) return cached;
      return fetch(event.request).then((response) => {
        if(response && response.status === 200 && response.type === 'basic'){
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
