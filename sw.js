const urlsToCache = ["index.html"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open("cache-name").then((cache) => cache.addAll(urlsToCache))
	);
});
