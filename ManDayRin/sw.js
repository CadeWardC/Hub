const CACHE_NAME = "mandayrin-v11";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./vocabulary.js", "./app.js", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"];
const REMINDER_DB = "mandayrin-reminders";
const REMINDER_STORE = "settings";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
      return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("./index.html"))));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SAVE_REMINDER") event.waitUntil(saveReminder(event.data.reminder));
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "mandayrin-daily-reminder") event.waitUntil(checkDailyReminder());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const appUrl = new URL("./", self.registration.scope).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    for (const client of windows) {
      if (client.url.startsWith(self.registration.scope) && "focus" in client) return client.focus();
    }
    return clients.openWindow ? clients.openWindow(appUrl) : undefined;
  }));
});

function openReminderDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(REMINDER_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(REMINDER_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readReminder() {
  const db = await openReminderDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REMINDER_STORE, "readonly");
    const request = transaction.objectStore(REMINDER_STORE).get("daily");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function saveReminder(incoming) {
  const current = await readReminder().catch(() => null);
  const reminder = {
    ...incoming,
    lastNotified: current?.lastNotified > (incoming.lastNotified || "") ? current.lastNotified : (incoming.lastNotified || "")
  };
  const db = await openReminderDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REMINDER_STORE, "readwrite");
    transaction.objectStore(REMINDER_STORE).put(reminder, "daily");
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

async function checkDailyReminder() {
  const reminder = await readReminder();
  if (!reminder?.enabled || !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time || "")) return;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [hours, minutes] = reminder.time.split(":").map(Number);
  if (((now.getHours() * 60) + now.getMinutes()) < ((hours * 60) + minutes) || reminder.lastNotified === today) return;
  const words = Array.isArray(reminder.words) ? reminder.words.join(" · ") : "Your noun, verb, and adjective";
  await self.registration.showNotification("Three new words are waiting", {
    body: `${words} — keep your Mandarin streak moving.`,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: `mandayrin-${today}`,
    data: { url: "./" }
  });
  await saveReminder({ ...reminder, lastNotified: today });
}
