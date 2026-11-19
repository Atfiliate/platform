importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config comes from this site (env config via project/root/cloud/swConfig), never hardcoded.
importScripts(self.location.origin + '/project/site/cloud/swConfig');
if(!self.firebaseConfig)
  throw new Error('Missing site Firebase config: project/root/cloud/swConfig (env config)');

firebase.initializeApp(self.firebaseConfig);

const messaging = firebase.messaging();
// 3/4/2026
// messaging.onBackgroundMessage(payload => {
//   const { title, body } = payload.notification;
//   self.registration.showNotification(title, {
//     body: body,
//     icon: '/icon.png'
//   });
// });

// messaging.onBackgroundMessage(payload => {
//   const title = payload.notification?.title || 'New Notification';
//   const body = payload.notification?.body || '';
//   const icon = '/icon.png';

//   const click_action =
//     payload.data?.click_action ||
//     payload.fcmOptions?.link ||
//     null;

//   self.registration.showNotification(title, {
//     body,
//     icon,
//     data: {
//       click_action
//     }
//   });
// });

// self.addEventListener('notificationclick', event => {
//   const click_action = event.notification?.data?.click_action;
//   if (click_action) {
//     event.notification.close();
//     event.waitUntil(
//       clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
//         for (const client of windowClients) {
//           if (client.url === click_action && 'focus' in client) {
//             return client.focus();
//           }
//         }
//         return clients.openWindow(click_action);
//       })
//     );
//   }
// });