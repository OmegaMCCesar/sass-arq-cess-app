import React, { useMemo } from "react";
import { MapContainer, TileLayer, Polygon, Polyline, Tooltip, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Convierte desplazamientos en metros (dx=Este/Oeste, dy=Norte/Sur) a delta lat/lng
 * lat0 en grados
 */
function metersToLatLng(lat0Deg, dxMeters, dyMeters) {
  const lat0 = (lat0Deg * Math.PI) / 180;
  const dLat = dyMeters / 111320;                    // aprox m -> lat
  const dLng = dxMeters / (111320 * Math.cos(lat0)); // aprox m -> lng
  return { dLat, dLng };
}

/**
 * Genera un polígono rectángulo centrado en (lat, lng) con tamaño largo (N-S) y ancho (E-O)
 */
function rectanglePolygon(lat, lng, largo, ancho) {
  const halfX = ancho / 2; // Este/Oeste
  const halfY = largo / 2; // Norte/Sur

  // Esquinas (E,O,N,S), ordenando sentido horario
  const corners = [
    { dx: -halfX, dy: -halfY }, // SO
    { dx:  halfX, dy: -halfY }, // SE
    { dx:  halfX, dy:  halfY }, // NE
    { dx: -halfX, dy:  halfY }, // NO
  ];

  return corners.map(({ dx, dy }) => {
    const { dLat, dLng } = metersToLatLng(lat, dx, dy);
    return [lat + dLat, lng + dLng];
  });
}

/**
 * Triángulo isósceles con base horizontal centrada y vértice al Norte
 * largo = altura (N-S), ancho = base (E-O)
 */
function trianglePolygon(lat, lng, largo, ancho) {
  const halfBase = ancho / 2;

  const pts = [
    { dx: -halfBase, dy:  largo / 2 }, // base O (sur)
    { dx:  halfBase, dy:  largo / 2 }, // base E (sur)
    { dx:        0, dy: -largo / 2 },  // vértice norte
  ];

  return pts.map(({ dx, dy }) => {
    const { dLat, dLng } = metersToLatLng(lat, dx, dy);
    return [lat + dLat, lng + dLng];
  });
}

/**
 * Polígono regular de N lados “inscrito” en el rectángulo (ancho x largo)
 * Orientado con un vértice hacia el Norte
 */
function regularPolygon(lat, lng, largo, ancho, lados = 5) {
  const n = Math.max(3, parseInt(lados || 5, 10));
  const rx = ancho / 2;
  const ry = largo / 2;

  const pts = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2; // vértice arriba
    const dx = Math.cos(ang) * rx;
    const dy = Math.sin(ang) * ry;
    const { dLat, dLng } = metersToLatLng(lat, dx, dy);
    pts.push([lat + dLat, lng + dLng]);
  }
  return pts;
}

/**
 * Polígono irregular desde vertices en metros relativos:
 * vertices: [{x, y}] donde x∈[0..ancho], y∈[0..largo], (0,0)=esquina NO; centramos en (lat,lng).
 */
function irregularPolygon(lat, lng, largo, ancho, vertices = []) {
  if (!Array.isArray(vertices) || vertices.length < 3) return rectanglePolygon(lat, lng, largo, ancho);

  return vertices.map(({ x, y }) => {
    // Convertimos (x,y) a offset respecto al centro:
    const dx = (x - ancho / 2); // metros hacia Este (+) u Oeste (-)
    const dy = (y - largo / 2); // metros hacia Sur (+) o Norte (-)
    const { dLat, dLng } = metersToLatLng(lat, dx, dy);
    return [lat + dLat, lng + dLng];
  });
}

/**
 * Trazo de la “calle” (opcional): une baches consecutivos de la misma calle (por estética)
 */
function streetPolyline(baches) {
  const pts = baches
    .filter(b => b?.coordenadas?.lat != null && b?.coordenadas?.lng != null)
    .map(b => [b.coordenadas.lat, b.coordenadas.lng]);
  return pts.length >= 2 ? pts : null;
}

export default function BacheMap({ baches = [], height = 420, zoom = 18 }) {
  const center = useMemo(() => {
    const first = baches.find(b => b?.coordenadas?.lat != null && b?.coordenadas?.lng != null);
    return first ? [first.coordenadas.lat, first.coordenadas.lng] : [19.4326, -99.1332]; // CDMX fallback
  }, [baches]);

  // Agrupa por calle para dibujar líneas de referencia
  const groupedByStreet = useMemo(() => {
    const m = new Map();
    baches.forEach(b => {
      const key = (b.calle || "").trim().toLowerCase();
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(b);
    });
    return m;
  }, [baches]);

  return (
    <div style={{ height }}>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%", borderRadius: 8, overflow: "hidden" }}>
        <TileLayer
          // Puedes usar otro proveedor si gustas
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Calles como polilíneas suaves (opcional) */}
        {[...groupedByStreet.values()].map((arr, idx) => {
          const line = streetPolyline(arr);
          return line ? (
            <Polyline key={`street-${idx}`} positions={line} pathOptions={{ color: "#888", weight: 3, opacity: 0.6 }} />
          ) : null;
        })}

        {/* Figuras de baches */}
        {baches.map((b, i) => {
          const lat = b?.coordenadas?.lat;
          const lng = b?.coordenadas?.lng;
          if (lat == null || lng == null) return null;

          const largo = Number(b.largo) || 0.8; // defaults visuales
          const ancho = Number(b.ancho) || 0.8;
          const forma = (b.forma || "rectangulo").toLowerCase();
          const lados = Number(b.lados) || 5;

          let points = null;
          if (forma === "cuadrado" || forma === "rectangulo") {
            points = rectanglePolygon(lat, lng, largo, ancho);
          } else if (forma === "triangulo") {
            points = trianglePolygon(lat, lng, largo, ancho);
          } else if (forma === "poligono") {
            points = regularPolygon(lat, lng, largo, ancho, lados);
          } else if (forma === "irregular" && Array.isArray(b.vertices)) {
            points = irregularPolygon(lat, lng, largo, ancho, b.vertices);
          } else {
            points = rectanglePolygon(lat, lng, largo, ancho);
          }

          // Cerramos el polígono si no viene cerrado
          if (points.length && (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1])) {
            points = [...points, points[0]];
          }

          return (
            <Polygon
              key={b.id || `bache-${i}`}
              positions={points}
              pathOptions={{ color: "#c62828", weight: 2, fillColor: "#e57373", fillOpacity: 0.6 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                #{b.noBache} · {b.calle || "calle"} {b.entreCalles?.length ? `(${b.entreCalles.join(" y ")})` : ""}
              </Tooltip>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div><strong>Bache #{b.noBache}</strong></div>
                  <div>{b.calle || "calle"}</div>
                  {b.entreCalles?.length ? <div>Entre: {b.entreCalles.join(" y ")}</div> : null}
                  <div>Medidas: {b.largo} m × {b.ancho} m</div>
                  <div>Forma: {b.forma}{forma === "poligono" ? ` (${lados} lados)` : ""}</div>
                  {b.area != null && <div>Área: {b.area} m²</div>}
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                    Lat/Lng: {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
}
