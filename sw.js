self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("gamehub-cache").then(cache => {
      return cache.addAll([
        "./",
        "index.html",
        "menu.css",
        "Hangman/hangman.html",
        "Yahtzee/yahtzee.html",
        "Wordle/wordle.html"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
