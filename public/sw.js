self.addEventListener("push", function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || "UrusPOS";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "uruspos",
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: data.url ? { url: data.url } : {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});
