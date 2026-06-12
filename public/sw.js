self.addEventListener("push", (event) => {
  let payload = {
    title: "Planlet",
    body: "",
    url: "/",
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    // Use defaults when payload parsing fails.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath = event.notification.data?.url || "/today";
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
