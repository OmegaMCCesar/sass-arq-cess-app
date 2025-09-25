// Cola offline simple usando localStorage con UI optimista

const KEY = "baches_offline_queue_v1";

export function loadQueue() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQueue(q) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q || []));
  } catch {}
}

export function enqueue(op) {
  const q = loadQueue();
  q.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, ...op });
  saveQueue(q);
}

export function dequeueFirst() {
  const q = loadQueue();
  const item = q.shift();
  saveQueue(q);
  return item;
}

export async function processQueue(processors = {}) {
  // processors: { create: async (payload)=>serverId, update: async(payload)=>void, delete: async(id)=>void }
  let worked = false;
  while (true) {
    const q = loadQueue();
    if (!q.length) break;
    const item = q[0];
    try {
      if (item.type === "create" && processors.create) {
        const newId = await processors.create(item.payload);
        // mapear tempId->newId si hace falta (el llamador puede encargarse)
      } else if (item.type === "update" && processors.update) {
        await processors.update(item.payload);
      } else if (item.type === "delete" && processors.delete) {
        await processors.delete(item.payloadId);
      }
      dequeueFirst();
      worked = true;
    } catch (e) {
      // Si falla (p.ej. sin conexión), detenemos el ciclo
      break;
    }
  }
  return worked;
}

export function onOnline(handler) {
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
