const CACHE_NAME = "dt-lift-v3";
const ASSETS_TO_CACHE = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                }),
            );
        }),
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Only handle standard HTTP/HTTPS requests.
    if (!request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip Supabase API and other data requests.
    if (request.url.includes("/auth/v1") || request.url.includes("/rest/v1")) {
        return;
    }

    // Skip non-GET requests and browser-extension/network probes.
    if (request.method !== "GET") {
        return;
    }

    // Avoid caching navigation requests aggressively during development-like environments.
    if (request.mode === "navigate") {
        event.respondWith(fetch(request).catch(() => caches.match("/")));
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                fetch(request)
                    .then((networkResponse) => {
                        if (networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, networkResponse);
                            });
                        }
                    })
                    .catch(() => {});
                return cachedResponse;
            }

            return fetch(request)
                .then((response) => {
                    const isStatic =
                        request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ico)$/) ||
                        request.url.includes("/_next/static/");

                    if (response.status === 200 && isStatic) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => caches.match(request));
        }),
    );
});
