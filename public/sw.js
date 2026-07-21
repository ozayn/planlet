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

async function focusOrOpenTimer(targetUrl) {
  const windowClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    if ("focus" in client) {
      await client.focus();
      if ("navigate" in client) {
        try {
          await client.navigate(targetUrl);
          return;
        } catch {
          // Fall through to postMessage / openWindow.
        }
      }

      client.postMessage({
        type: "planlet-open-timer",
        url: targetUrl,
      });
      return;
    }
  }

  if (clients.openWindow) {
    await clients.openWindow(targetUrl);
  }
}

async function stopActiveTimerFromNotification() {
  const response = await fetch("/api/activity-timer/active/stop", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const windowClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    client.postMessage({
      type: "planlet-timer-stopped",
      ok: response.ok,
      result: payload,
    });
  }

  return { ok: response.ok, result: payload };
}

self.addEventListener("notificationclick", (event) => {
  const action = event.action || "default";
  const targetPath =
    event.notification.data?.url || "/timer?active=1";
  const targetUrl = new URL(targetPath, self.location.origin).href;
  const kind = event.notification.data?.kind || "generic";

  event.notification.close();

  if (action === "stop-timer") {
    event.waitUntil(stopActiveTimerFromNotification());
    return;
  }

  if (kind === "complete" || action === "open-timer" || action === "default") {
    event.waitUntil(focusOrOpenTimer(targetUrl));
  }
});

self.addEventListener("notificationclose", (event) => {
  if (event.notification.data?.kind === "complete") {
    return;
  }
});
