export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();

  const addr = (data && data.address) || {};
  const callePrincipal =
    addr.road ||
    addr.pedestrian ||
    addr.cycleway ||
    addr.footway ||
    addr.residential ||
    addr.path ||
    addr.neighbourhood ||
    "";

  let entreCalles = [];
  if (data?.extratags?.crossroads) {
    try {
      entreCalles = JSON.parse(data.extratags.crossroads);
    } catch {}
  }

  return {
    callePrincipal,
    entreCalles: entreCalles.length ? entreCalles : undefined,
    colonia: addr.suburb || addr.neighbourhood || addr.village || "",
    municipio: addr.city || addr.town || addr.county || "",
    estado: addr.state || "",
    cp: addr.postcode || "",
  };
}
