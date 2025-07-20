const CACHE_NAME = 'geegong-calendar-v1'
const urlsToCache = [
  '/',
  '/calendar.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  // OAuth 관련 요청은 캐시하지 않음
  if (event.request.url.includes('/api/auth/')) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 반환, 없으면 네트워크 요청
        return response || fetch(event.request)
      })
  )
})
