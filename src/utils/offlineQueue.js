const KEY = "baches_offline_queue_v1";

function loadQueue() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveQueue(q) {
  try { localStorage.setItem(KEY, JSON.stringify(q)); } catch {}
}

export function enqueue(item) {
  const q = loadQueue();
  q.push({ ...item, ts: Date.now() });
  saveQueue(q);
}

export async function processQueue(handlers) {
  let q = loadQueue();
  if (!q.length) return;

  const rest = [];
  for (const it of q) {
    try {
      if (it.type === "create") {
        await handlers.create(it.payload);
      } else if (it.type === "update") {
        await handlers.update(it.payload);
      } else if (it.type === "delete") {
        await handlers.delete(it.payloadId);
      }
    } catch (e) {
      console.error("queue error", it, e);
      rest.push(it); // reintenta luego
    }
  }
  saveQueue(rest);
}

export function onOnline(cb) {
  const handler = () => cb && cb();
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
