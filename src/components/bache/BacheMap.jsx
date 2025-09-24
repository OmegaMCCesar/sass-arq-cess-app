import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix iconos por defecto si quieres usar el default en otros lados
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ===== Helpers =====

function centroidOf(vertices) {
  let a = 0, cx = 0, cy = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const p = vertices[i], q = vertices[(i + 1) % n];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-6) {
    const sx = vertices.reduce((s, v) => s + v.x, 0) / n;
    const sy = vertices.reduce((s, v) => s + v.y, 0) / n;
    return { x: sx, y: sy };
  }
  cx /= (6 * a);
  cy /= (6 * a);
  return { x: cx, y: cy };
}

function localMetersToLatLng(vertices, centerLat, centerLng) {
  const centroid = centroidOf(vertices);
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

  return vertices.map((v) => {
    const dx = v.x - centroid.x; // +derecha => +lng
    const dy = v.y - centroid.y; // +abajo   => -lat
    const dLat = -(dy / mPerDegLat);
    const dLng = dx / mPerDegLng;
    return [centerLat + dLat, centerLng + dLng];
  });
}

function collectBounds(baches, userCoords) {
  const latlngs = [];
  for (const b of baches || []) {
    const c = b?.coordenadas;
    if (c && typeof c.lat === "number" && typeof c.lng === "number") {
      const verts = Array.isArray(b.vertices) && b.vertices.length >= 3 ? b.vertices : null;
      if (verts) {
        const poly = localMetersToLatLng(verts, c.lat, c.lng);
        poly.forEach((p) => latlngs.push(p));
      } else {
        latlngs.push([c.lat, c.lng]);
      }
    }
  }
  if (userCoords) latlngs.push([userCoords.lat, userCoords.lng]);
  return latlngs;
}

function FitOnData({ baches, user }) {
  const map = useMap();
  useEffect(() => {
    const pts = collectBounds(baches, user);
    if (!pts.length) return;
    const bounds = L.latLngBounds(pts);
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2));
    }
  }, [baches, user, map]);
  return null;
}

function GoToMyLocationButton({ user }) {
  const map = useMap();
  if (!user) return null;
  const go = () => {
    map.setView([user.lat, user.lng], 18, { animate: true });
  };
  return (
    <div
      style={{ position: "absolute", right: 12, bottom: 12, zIndex: 1000 }}
    >
      <button
        onClick={go}
        style={{
          background: "#fff", border: "1px solid #ccc", padding: "8px 10px",
          borderRadius: 6, boxShadow: "0 2px 6px rgba(0,0,0,0.15)", cursor: "pointer",
        }}
        title="Ir a mi ubicación"
      >
        📍 Ir a mi ubicación
      </button>
    </div>
  );
}

// Icono HTML con número (DivIcon)
function makeNumberIcon(n, selected) {
  return L.divIcon({
    className: "bache-marker",
    html: `
      <div class="pin ${selected ? "sel" : ""}">
        ${n}
      </div>
    `,
    iconSize: [30, 38],
    iconAnchor: [15, 34],
    popupAnchor: [0, -30],
  });
}

export default function BacheMap({ baches = [], userCoords = null, selectedBacheId = null, onSelectBache }) {
  const points = useMemo(() => {
    return (baches || [])
      .map((b) => b?.coordenadas)
      .filter((c) => c && typeof c.lat === "number" && typeof c.lng === "number");
  }, [baches]);

  const center = useMemo(() => {
    if (userCoords) return [userCoords.lat, userCoords.lng];
    if (points.length) return [points[0].lat, points[0].lng];
    return [19.432608, -99.133209];
  }, [userCoords, points]);

  // CSS para el pin numerado
  const css = `
    .bache-marker .pin {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      background: #1a47ff; color: #fff; font-weight: 700; font-size: 13px;
      border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      transform: translateY(4px);
    }
    .bache-marker .pin.sel {
      background: #111; color: #ffcc00;
    }
  `;

  // Cuando cambia el seleccionado, haz flyTo a ese punto
  function FlyToSelected({ id }) {
    const map = useMap();
    useEffect(() => {
      if (!id) return;
      const b = baches.find((x) => x.id === id);
      const c = b?.coordenadas;
      if (!c) return;
      map.flyTo([c.lat, c.lng], 18, { animate: true, duration: 0.6 });
    }, [id, map]);
    return null;
  }

  return (
    <div style={{ height: 420, position: "relative", borderRadius: 8, overflow: "hidden" }}>
      <style>{css}</style>
      <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitOnData baches={baches} user={userCoords} />
        <FlyToSelected id={selectedBacheId} />

        {/* Polígonos y lados resaltados */}
        {baches.map((b) => {
          const c = b?.coordenadas;
          const verts = Array.isArray(b?.vertices) && b.vertices.length >= 3 ? b.vertices : null;
          if (!c || typeof c.lat !== "number" || typeof c.lng !== "number") return null;

          let polyLatLngs = null;
          let curbEdgeLatLngs = null;

          if (verts) {
            polyLatLngs = localMetersToLatLng(verts, c.lat, c.lng);

            const curb = b.curbSide || "";
            if (curb) {
              if (verts.length === 3) {
                const mapTri = { base: 0, derecha: 1, izquierda: 2 };
                const idx = mapTri[curb];
                if (idx != null) {
                  const edges = [
                    [polyLatLngs[0], polyLatLngs[1]],
                    [polyLatLngs[1], polyLatLngs[2]],
                    [polyLatLngs[2], polyLatLngs[0]],
                  ];
                  curbEdgeLatLngs = edges[idx];
                }
              } else if (verts.length === 4) {
                const mapTrap = { arriba: 0, derecha: 1, abajo: 2, izquierda: 3 };
                const idx = mapTrap[curb];
                if (idx != null) {
                  const edges = [
                    [polyLatLngs[0], polyLatLngs[1]],
                    [polyLatLngs[1], polyLatLngs[2]],
                    [polyLatLngs[2], polyLatLngs[3]],
                    [polyLatLngs[3], polyLatLngs[0]],
                  ];
                  curbEdgeLatLngs = edges[idx];
                }
              }
            }
          }

          const selected = b.id === selectedBacheId;

          return (
            <React.Fragment key={b.id || `${c.lat}-${c.lng}`}>
              {polyLatLngs && (
                <Polygon
                  positions={polyLatLngs}
                  pathOptions={{ color: selected ? "#111" : "#1a47ff", weight: selected ? 3 : 2, fillOpacity: 0.2 }}
                />
              )}
              {curbEdgeLatLngs && (
                <Polyline
                  positions={curbEdgeLatLngs}
                  pathOptions={{
                    color: "#6b7280",
                    weight: selected ? 6 : 4,
                    dashArray: "8,6",
                  }}
                />
              )}

              <Marker
                position={[c.lat, c.lng]}
                icon={makeNumberIcon(b.idx, selected)}
                eventHandlers={{
                  click: () => onSelectBache && onSelectBache(b.id),
                  mouseover: () => onSelectBache && onSelectBache(b.id),
                }}
              >
                <Popup>
                  <div>
                    <div><strong>#{b.noBache}</strong> {b.calle || ""}</div>
                    {Array.isArray(b.entreCalles) && b.entreCalles.length ? (
                      <div>Entre: {b.entreCalles.join(" y ")}</div>
                    ) : null}
                    <div>Área: {b.area?.toFixed ? b.area.toFixed(2) : b.area} m²</div>
                    {b.curbSide ? <div>Banqueta: <em>{b.curbSide}</em></div> : null}
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                      Índice: {b.idx}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {userCoords && (
          <Marker position={[userCoords.lat, userCoords.lng]}>
            <Popup>Estás aquí</Popup>
          </Marker>
        )}

        <GoToMyLocationButton user={userCoords} />
      </MapContainer>
    </div>
  );
}
