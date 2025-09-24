// vertices: [{x: ancho_m, y: largo_m}, ...] en metros, ordenados (horario o antihorario)
export function polygonAreaMeters(vertices = []) {
  if (!Array.isArray(vertices) || vertices.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const { x: x1, y: y1 } = vertices[i];
    const { x: x2, y: y2 } = vertices[(i + 1) % vertices.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2; // m²
}

// Convierte offsets en metros (dx=ancho, dy=largo) a delta lat/lng desde lat0
export function metersToLatLng(lat0Deg, dxMeters, dyMeters) {
  const lat0 = (lat0Deg * Math.PI) / 180;
  const dLat = dyMeters / 111320;
  const dLng = dxMeters / (111320 * Math.cos(lat0));
  return { dLat, dLng };
}

// Construye un polígono de latlng a partir del centro y vértices en metros
export function polygonMetersToLatLng(centerLat, centerLng, vertices = []) {
  return (vertices || []).map(({ x, y }) => {
    const { dLat, dLng } = metersToLatLng(centerLat, x, y);
    return [centerLat + dLat, centerLng + dLng];
  });
}


// 4 medidas -> trapecio: [wTop, hRight, wBottom, hLeft]
export function verticesFromMedidas4(m) {
  const wTop = Number(m[0]) || 0;
  const hRight = Number(m[1]) || 0;
  const wBottom = Number(m[2]) || 0;
  const hLeft = Number(m[3]) || 0;
  const offset = (wTop - wBottom) / 2;
  return [
    { x: 0, y: 0 },
    { x: wTop, y: 0 },
    { x: offset + wBottom, y: hRight },
    { x: offset, y: hLeft },
  ];
}

// 3 medidas -> triángulo: [baseTop, hRight, hLeft]
export function verticesFromMedidas3(m) {
  const baseTop = Number(m[0]) || 0;
  const hRight = Number(m[1]) || 0;
  const hLeft = Number(m[2]) || 0;
  const h = Math.max(hRight, hLeft);
  return [
    { x: 0, y: 0 },
    { x: baseTop, y: 0 },
    { x: baseTop / 2, y: h },
  ];
}
