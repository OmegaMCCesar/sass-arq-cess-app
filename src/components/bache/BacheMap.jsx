import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "../../styles/BacheMap.module.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

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
    const dx = v.x - centroid.x; // +x => +lng
    const dy = v.y - centroid.y; // +y => -lat
    const dLat = -(dy / mPerDegLat);
    const dLng = dx / mPerDegLng;
    return [centerLat + dLat, centerLng + dLng];
  });
}
function collectBounds(baches, userCoords) {
  const latlngs = [];
  for (const b of baches || []) {
    const c = b?.coordenadas;
    if (!c) continue;
    if (Array.isArray(b.vertices) && b.vertices.length >= 3) {
      localMetersToLatLng(b.vertices, c.lat, c.lng).forEach((p) => latlngs.push(p));
    } else {
      latlngs.push([c.lat, c.lng]);
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
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.2));
  }, [baches, user, map]);
  return null;
}
function FlyToSelected({ id, baches }) {
  const map = useMap();
  useEffect(() => {
    if (!id) return;
    const b = baches.find((x) => x.id === id);
    const c = b?.coordenadas;
    if (!c) return;
    map.flyTo([c.lat, c.lng], 20, { animate: true, duration: 0.6 });
  }, [id, baches, map]);
  return null;
}
function makeNumberIcon(n, highlight) {
  return L.divIcon({
    className: "bache-marker",
    html: `<div class="${styles.markerPin} ${highlight ? styles.markerPinSel : ""}">${n}</div>`,
    iconSize: [30, 38],
    iconAnchor: [15, 34],
    popupAnchor: [0, -30],
  });
}

/** Control Leaflet para centrar en la ubicación del usuario */
function CenterControl({ userCoords }) {
  const map = useMap();
  useEffect(() => {
    if (!userCoords) return;

    const control = L.control({ position: "bottomleft" });
    control.onAdd = () => {
      const btn = L.DomUtil.create("button", styles.centerBtn);
      btn.type = "button";
      btn.innerText = "Ir a mi ubicación";
      btn.onclick = () => {
        map.flyTo([userCoords.lat, userCoords.lng], 20, { animate: true, duration: 0.5 });
      };
      // Evitar que el mapa capture el drag/scroll cuando se usa el botón
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.disableScrollPropagation(btn);
      return btn;
    };
    control.addTo(map);
    return () => {
      try { control.remove(); } catch {}
    };
  }, [map, userCoords]);
  return null;
}

export default function BacheMap({
  baches = [],
  userCoords = null,
  selectedBacheId = null,
  onSelectBache,
  onScrollToBache,
  movingBacheId = null,
  onMarkerDragEnd,
}) {
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

  const MoveBanner = ({ active }) => {
    if (!active) return null;
    return (
      <div className={styles.moveBanner}>
        Modo mover: arrastra el pin y suéltalo para guardar
      </div>
    );
  };

  return (
    <div className={styles.mapWrap}>
      <MoveBanner active={Boolean(movingBacheId)} />

      <MapContainer
        center={center}
        zoom={17}
        minZoom={3}
        maxZoom={22}
        zoomControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        zoomSnap={0.25}
        zoomDelta={0.25}
        style={{ height: "100%", width: "100%" }}
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={22}
        />

        {/* Control personalizado DENTRO del MapContainer */}
        <CenterControl userCoords={userCoords} />

        <FitOnData baches={baches} user={userCoords} />
        <FlyToSelected id={selectedBacheId} baches={baches} />

        {baches.map((b) => {
          const c = b?.coordenadas;
          if (!c) return null;

          let polyLatLngs = null;
          if (Array.isArray(b.vertices) && b.vertices.length >= 3) {
            polyLatLngs = localMetersToLatLng(b.vertices, c.lat, c.lng);
          }

          let curbEdgeLatLngs = null;
          if (polyLatLngs && b.curbSide) {
            const edges3 = [
              [polyLatLngs[0], polyLatLngs[1]],
              [polyLatLngs[1], polyLatLngs[2]],
              [polyLatLngs[2], polyLatLngs[0]],
            ];
            const edges4 = [
              [polyLatLngs[0], polyLatLngs[1]],
              [polyLatLngs[1], polyLatLngs[2]],
              [polyLatLngs[2], polyLatLngs[3]],
              [polyLatLngs[3], polyLatLngs[0]],
            ];
            if (polyLatLngs.length === 3) {
              const idx = ({ base:0, derecha:1, izquierda:2 })[b.curbSide];
              if (idx != null) curbEdgeLatLngs = edges3[idx];
            } else if (polyLatLngs.length === 4) {
              const idx = ({ arriba:0, derecha:1, abajo:2, izquierda:3 })[b.curbSide];
              if (idx != null) curbEdgeLatLngs = edges4[idx];
            }
          }

          const isMoving = movingBacheId === b.id;
          const selected = selectedBacheId === b.id;
          const icon = makeNumberIcon(b.idx, selected || isMoving);

          return (
            <React.Fragment key={b.id || `${c.lat}-${c.lng}`}>
              {polyLatLngs && (
                <Polygon
                  positions={polyLatLngs}
                  pathOptions={{ color: selected ? "#111" : "#1a47ff", weight: selected ? 3 : 2, fillOpacity: 0.2 }}
                />
              )}
              {curbEdgeLatLngs && (
                <Polyline positions={curbEdgeLatLngs} pathOptions={{ color: "#6b7280", weight: selected ? 6 : 4, dashArray: "8,6" }} />
              )}
              <Marker
                position={[c.lat, c.lng]}
                icon={icon}
                draggable={isMoving}
                eventHandlers={{
                  click: () => onSelectBache && onSelectBache(b.id),
                  dragend: (e) => {
                    const ll = e.target.getLatLng();
                    onMarkerDragEnd && onMarkerDragEnd(b.id, ll.lat, ll.lng);
                  },
                }}
              >
                <Popup>
                  <div>
                    <div><strong>#{b.noBache}</strong> {b.calle || ""}</div>
                    {Array.isArray(b.entreCalles) && b.entreCalles.length ? (
                      <div>Entre: {b.entreCalles.join(" y ")}</div>
                    ) : null}
                    <div>Área: {b.area?.toFixed ? b.area.toFixed(2) : b.area} m²</div>
                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => onScrollToBache && onScrollToBache(b.id)}>
                        Ver en lista
                      </button>
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
      </MapContainer>
    </div>
  );
}
