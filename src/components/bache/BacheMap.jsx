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

/* ========= Helpers de geometría/render ========= */
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

/* shrinkFactor: reduce el polígono solo visualmente (no toca tus datos) */
function localMetersToLatLng(vertices, centerLat, centerLng, shrinkFactor = 1) {
  const centroid = centroidOf(vertices);
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
  return vertices.map((v) => {
    let dx = v.x - centroid.x;
    let dy = v.y - centroid.y;
    dx *= shrinkFactor;
    dy *= shrinkFactor;
    const dLat = -(dy / mPerDegLat);
    const dLng = dx / mPerDegLng;
    return [centerLat + dLat, centerLng + dLng];
  });
}

function collectBounds(baches, userCoords, shrink) {
  const latlngs = [];
  for (const b of baches || []) {
    const c = b?.coordenadas;
    if (!c) continue;
    if (Array.isArray(b.vertices) && b.vertices.length >= 3) {
      localMetersToLatLng(b.vertices, c.lat, c.lng, shrink).forEach((p) => latlngs.push(p));
    } else {
      latlngs.push([c.lat, c.lng]);
    }
  }
  if (userCoords) latlngs.push([userCoords.lat, userCoords.lng]);
  return latlngs;
}

function FitOnData({ baches, user, shrink }) {
  const map = useMap();
  useEffect(() => {
    const pts = collectBounds(baches, user, shrink);
    if (!pts.length) return;
    const bounds = L.latLngBounds(pts);
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.2));
  }, [baches, user, shrink, map]);
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
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.disableScrollPropagation(btn);
      return btn;
    };
    control.addTo(map);
    return () => { try { control.remove(); } catch {} };
  }, [map, userCoords]);
  return null;
}

/* ========= Iconos tipo pin por color (SVG data URL) ========= */
function makeColoredPin(color = "#1a47ff") {
  const svg = encodeURIComponent(`
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path fill="${color}" d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
      <circle cx="12.5" cy="12.5" r="5.5" fill="#fff"/>
    </svg>
  `);
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -36],
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    shadowSize: [41, 41],
    shadowAnchor: [13, 41],
  });
}

const ICON_NORMAL = makeColoredPin("#3B82F6");   // azul
const ICON_SELECTED = makeColoredPin("#111827"); // gris muy oscuro
const ICON_MOVING = makeColoredPin("#E11D48");   // rojo/rose

export default function BacheMap({
  baches = [],
  userCoords = null,
  selectedBacheId = null,
  onSelectBache,
  onScrollToBache,      // <- usar para "Ver en lista"
  movingBacheId = null, // <- el que se está moviendo
  onMarkerDragEnd,
  shrinkFactor = 0.75,
  usePinMarkers = true, // ya no se usa, mantenido por compat
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
        Modo mover: arrastra el pin rojo y suéltalo para guardar
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

        <CenterControl userCoords={userCoords} />
        <FitOnData baches={baches} user={userCoords} shrink={shrinkFactor} />
        <FlyToSelected id={selectedBacheId} baches={baches} />

        {baches.map((b) => {
          const c = b?.coordenadas;
          if (!c) return null;

          const isMoving = movingBacheId === b.id;
          const isSelected = selectedBacheId === b.id;

          // polígonos (más pequeños visualmente)
          let polyLatLngs = null;
          if (Array.isArray(b.vertices) && b.vertices.length >= 3) {
            polyLatLngs = localMetersToLatLng(b.vertices, c.lat, c.lng, shrinkFactor);
          }

          // banqueta/guarnición (si aplica)
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

          // icono por estado
          const icon = isMoving ? ICON_MOVING : (isSelected ? ICON_SELECTED : ICON_NORMAL);
          const zIndex = isMoving ? 1000 : (isSelected ? 900 : 800);

          return (
            <React.Fragment key={b.id || `${c.lat}-${c.lng}`}>
              {polyLatLngs && (
                <Polygon
                  positions={polyLatLngs}
                  pathOptions={{
                    color: isMoving ? "#E11D48" : (isSelected ? "#111827" : "#1a47ff"),
                    weight: isMoving || isSelected ? 3 : 1.5,
                    fillOpacity: 0.12,
                  }}
                />
              )}
              {curbEdgeLatLngs && (
                <Polyline
                  positions={curbEdgeLatLngs}
                  pathOptions={{ color: "#6b7280", weight: isMoving || isSelected ? 4 : 3, dashArray: "8,6" }}
                />
              )}
              <Marker
                position={[c.lat, c.lng]}
                icon={icon}
                draggable={isMoving}
                zIndexOffset={zIndex}
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
          <Marker position={[userCoords.lat, userCoords.lng]} icon={makeColoredPin("#16A34A")}>
            <Popup>Estás aquí</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
