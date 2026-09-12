// Firebase Cloud Messaging Service Worker
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDM26b2V_Ig4E-pKORWkbjg-f9qntQt-FU",
  authDomain: "shtab-web.firebaseapp.com",
  projectId: "shtab-web",
  storageBucket: "shtab-web.firebasestorage.app",
  messagingSenderId: "927392406550",
  appId: "1:927392406550:web:f1100b434382279487a937",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message:", payload);

  const title = payload.notification?.title || "Домашний штаб";
  const options = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});