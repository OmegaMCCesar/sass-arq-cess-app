// src/services/geocodingService.js

// Distancia simple (haversine) en metros
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function normalizeStreetName(name) {
  if (!name) return "";
  return String(name).trim();
}

async function nominatimReverse(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
  const res = await fetch(url, {
    headers: {
      // Nominatim requiere un user-agent identificable
      "User-Agent": "baches-app/1.0 (contacto@example.com)"
    }
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data = await res.json();
  const addr = data.address || {};
  // Candidatos de calle (Nominatim puede dar "road", "residential", etc.)
  const main =
    addr.road ||
    addr.pedestrian ||
    addr.cycleway ||
    addr.footway ||
    addr.path ||
    addr.residential ||
    addr.neighbourhood ||
    addr.suburb ||
    addr.hamlet ||
    addr.village ||
    addr.city_district ||
    addr.city ||
    "";
  return normalizeStreetName(main);
}

async function overpassNearbyStreets(lat, lng, radius = 40) {
  // Buscamos vías con nombre alrededor del punto
  // Nota: filtramos por [highway] y [name]
  const query = `
    [out:json][timeout:25];
    (
      way(around:${radius},${lat},${lng})[highway][name];
    );
    out center;
  `;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "Accept": "application/json"
    },
    body: query
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const json = await res.json();
  const elements = Array.isArray(json.elements) ? json.elements : [];
  // Convertimos a lista de {name, dist}
  const list = [];
  for (const el of elements) {
    const name = normalizeStreetName(el.tags?.name);
    if (!name) continue;
    let latW, lonW;
    if (el.center) {
      latW = el.center.lat;
      lonW = el.center.lon;
    } else if (Array.isArray(el.nodes) && el.nodes.length) {
      // Sin center, ignoramos para no complicar (Overpass suele dar center)
      continue;
    } else {
      continue;
    }
    const dist = haversine(lat, lng, latW, lonW);
    list.push({ name, dist });
  }

  // Unificamos por nombre (menor distancia)
  const bestByName = new Map();
  for (const item of list) {
    const prev = bestByName.get(item.name);
    if (!prev || item.dist < prev.dist) {
      bestByName.set(item.name, item);
    }
  }
  // Ordenamos por distancia ascendente
  return Array.from(bestByName.values()).sort((a, b) => a.dist - b.dist);
}

/**
 * reverseGeocode(lat, lng)
 * Devuelve { calle, entreCalles: [c1, c2] }
 * - calle: de Nominatim
 * - entreCalles: elegimos 2 calles cercanas distintas a la calle principal (si alcanza)
 */
export async function reverseGeocode(lat, lng) {
  try {
    const [calle, nearby] = await Promise.all([
      nominatimReverse(lat, lng).catch(() => ""),     // calle principal
      overpassNearbyStreets(lat, lng, 50).catch(() => []), // calles cercanas (50m)
    ]);

    let entreCalles = [];
    if (nearby.length) {
      // Tomamos hasta 2 distintas a la principal
      for (const item of nearby) {
        if (entreCalles.length >= 2) break;
        if (!calle || item.name.toLowerCase() !== calle.toLowerCase()) {
          if (!entreCalles.find((n) => n.toLowerCase() === item.name.toLowerCase())) {
            entreCalles.push(item.name);
          }
        }
      }
    }

    // Fallback si no hallamos nada para entreCalles
    if (!entreCalles.length && nearby.length) {
      entreCalles = nearby.slice(0, 2).map((x) => x.name);
    }

    return {
      calle: calle || "",
      entreCalles
    };
  } catch (e) {
    console.error("reverseGeocode failed:", e);
    return { calle: "", entreCalles: [] };
  }
}
