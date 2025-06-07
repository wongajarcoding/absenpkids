const CACHE_NAME = 'absensi-pkids-cache-v4'; // Ubah versi jika ada pembaruan aset
const urlsToCache = [
  '/', // Halaman utama/HTML Anda
  'manifest.json',
  'https://absensipkids.netlify.app/img/mahanaim.png', // Logo Anda
  // Tambahkan aset statis penting lainnya di sini jika ada (misalnya file CSS atau JS lokal)
  // Aset dari CDN (Tailwind, qrcodejs, dll.) biasanya tidak di-cache secara eksplisit
  // di sini untuk PWA dasar karena kompleksitas caching opaque response dan pembaruan versi.
  // Firebase SDK juga dari CDN, dan Firestore sudah punya kapabilitas offline sendiri.
];

// Event install: dijalankan saat service worker pertama kali diinstal
self.addEventListener('install', event => {
  console.log('Service Worker: Menginstal...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Membuka cache dan menambahkan aset inti');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Semua aset inti berhasil di-cache.');
        return self.skipWaiting(); // Aktifkan service worker baru segera
      })
      .catch(error => {
        console.error('Service Worker: Gagal melakukan pre-caching aset:', error);
      })
  );
});

// Event activate: dijalankan setelah service worker diinstal dan service worker lama (jika ada) sudah tidak aktif
self.addEventListener('activate', event => {
  console.log('Service Worker: Mengaktifkan...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Menghapus cache lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Siap untuk menangani fetch!');
        return self.clients.claim(); // Ambil kontrol halaman yang terbuka segera
    })
  );
});

// Event fetch: dijalankan setiap kali halaman membuat permintaan jaringan (misalnya, untuk gambar, script, data)
self.addEventListener('fetch', event => {
  // Kita akan menggunakan strategi "cache-first" untuk aset yang sudah di-cache.
  // Untuk permintaan API atau data dinamis, Anda mungkin memerlukan strategi lain.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Aset ditemukan di cache, kirim dari cache
          // console.log('Service Worker: Mengambil dari cache:', event.request.url);
          return response;
        }
        // Aset tidak ada di cache, coba ambil dari jaringan
        // console.log('Service Worker: Mengambil dari jaringan:', event.request.url);
        return fetch(event.request).then(
            // Opsional: Cache aset yang baru diambil jika perlu (untuk aset non-inti)
            // Namun, hati-hati agar tidak memenuhi cache dengan data dinamis yang tidak perlu.
            networkResponse => {
                // Contoh sederhana untuk tidak meng-cache permintaan non-GET atau dari ekstensi chrome
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' || event.request.method !== 'GET' ) {
                    return networkResponse;
                }
                // Jika ingin meng-cache permintaan yang berhasil secara dinamis:
                /*
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                */
                return networkResponse;
            }
        ).catch(error => {
            console.error('Service Worker: Gagal mengambil dari jaringan dan cache:', error, event.request.url);
            // Anda bisa menampilkan halaman offline kustom di sini jika mau
            // return caches.match('offline.html'); // jika Anda punya halaman offline.html
        });
      })
  );
});
