const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('PWA: serving from service worker cache.');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('PWA: new content available, will load on next visit.');
              if (config && config.onUpdate) config.onUpdate(registration);
            } else {
              console.log('PWA: content cached for offline use.');
              if (config && config.onSuccess) config.onSuccess(registration);
            }
          }
        };
      };
    })
    .catch((error) => console.error('SW registration failed:', error));
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => window.location.reload());
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => console.log('PWA: no internet, running in offline mode.'));
}

// Kiosk tablets/Pis leave this app open for days without navigating away,
// so a previously-installed service worker can keep serving a stale
// cached build indefinitely (its update check only runs on navigation or
// a ~24h background timer). This app has no real offline use case — it's
// useless without live Firestore/Clover calls anyway — so on any device
// that still has the old service worker installed, tear it down, wipe its
// Workbox caches, and reload once to guarantee the latest code takes over.
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        if (registrations.length === 0) return;
        return Promise.all(registrations.map((r) => r.unregister()))
          .then(() => 'caches' in window ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) : null)
          .then(() => window.location.reload());
      })
      .catch((error) => console.error(error.message));
  }
}
