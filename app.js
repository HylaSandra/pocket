if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
window.API_BASE = 'https://pocket-be-xt4u.onrender.com/api';

async function getPublicKey() {
  const res = await fetch(`${API_BASE}/vapidPublicKey`);
  const { publicKey } = await res.json();
  return publicKey;
}

(async () => {
  const key = await getPublicKey();
  const swReg = await navigator.serviceWorker.ready;
  const sub = await swReg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key)
  });
  await fetch(`${API_BASE}/save-subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub)
  });
})();

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const b64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(b64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
