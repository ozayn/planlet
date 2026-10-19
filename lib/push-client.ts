export type PushSupportIssue =
  | "no-window"
  | "no-service-worker"
  | "no-push-manager"
  | "no-notification"
  | "requires-https"
  | "ios-requires-install";

export function isSecurePushContext(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.isSecureContext ||
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

export function getPushSupportIssue(): PushSupportIssue | null {
  if (typeof window === "undefined") {
    return "no-window";
  }

  if (!isSecurePushContext()) {
    return "requires-https";
  }

  if (!("serviceWorker" in navigator)) {
    return "no-service-worker";
  }

  if (!("PushManager" in window)) {
    return "no-push-manager";
  }

  if (!("Notification" in window)) {
    return "no-notification";
  }

  if (isIosDevice() && !isInstalledPwa()) {
    return "ios-requires-install";
  }

  return null;
}

export function isPushApiSupported(): boolean {
  return getPushSupportIssue() === null;
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isInstalledPwa(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

/**
 * Register `/sw.js` at root scope and wait until an active worker is ready.
 * Prefer this over `getRegistration()` before `showNotification()`.
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });

  const ready = await navigator.serviceWorker.ready;

  if (ready.active) {
    return ready;
  }

  if (registration.active) {
    return registration;
  }

  const pending = registration.installing ?? registration.waiting;
  if (pending) {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("Service worker activation timed out."));
      }, 8_000);

      pending.addEventListener("statechange", () => {
        if (pending.state === "activated" || registration.active) {
          window.clearTimeout(timeout);
          resolve();
        }
        if (pending.state === "redundant") {
          window.clearTimeout(timeout);
          reject(new Error("Service worker became redundant."));
        }
      });
    });
  }

  const activeRegistration = await navigator.serviceWorker.ready;
  if (!activeRegistration.active) {
    throw new Error("Service worker is registered but not active.");
  }

  return activeRegistration;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  const registration =
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.getRegistration());

  if (!registration) {
    return null;
  }

  return registration.pushManager.getSubscription();
}

export type ServiceWorkerRegistrationState = {
  supported: boolean;
  controller: boolean;
  registration: boolean;
  active: boolean;
  scope: string | null;
};

export async function getServiceWorkerRegistrationState(): Promise<ServiceWorkerRegistrationState> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return {
      supported: false,
      controller: false,
      registration: false,
      active: false,
      scope: null,
    };
  }

  const registration =
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.getRegistration());

  return {
    supported: true,
    controller: Boolean(navigator.serviceWorker.controller),
    registration: Boolean(registration),
    active: Boolean(registration?.active),
    scope: registration?.scope ?? null,
  };
}

export function subscriptionToJson(subscription: PushSubscription) {
  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Push subscription is missing required keys.");
  }

  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
}
