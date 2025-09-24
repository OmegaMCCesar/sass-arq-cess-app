import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import AppLayout from "../../components/layout/AppLayout";
import BacheForm from "../../components/bache/BacheForm";
import BacheList from "../../components/bache/BacheList";
import BacheMap from "../../components/bache/BacheMap";
import { useGeolocated } from "react-geolocated";
import { exportToExcel } from "../../utils/excelUtils";
import { reverseGeocode } from "../../services/geocodingService";

import {
  createBache,
  listBachesByResidente,
  listAllBaches,
  deleteBache,
} from "../../services/bachesService";

// Helpers geométricos mínimos locales
function polygonAreaMeters(vertices = []) {
  if (!Array.isArray(vertices) || vertices.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}
function verticesFromMedidas4(m) {
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
function verticesFromMedidas3(m) {
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

export default function BachesPage() {
  const { user, role } = useAuth();
  const canSeeAll = useMemo(() => ["admin", "superadmin"].includes(role), [role]);

  const {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    getPosition,
    positionError,
  } = useGeolocated({
    positionOptions: { enableHighAccuracy: true },
    userDecisionTimeout: 10000,
    watchPosition: false,
    suppressLocationOnMount: true,
  });

  const [locating, setLocating] = useState(false);

  const [bacheData, setBacheData] = useState({
    calle: "",
    entreCalles: [],
    medidasText: "",
    curbSide: "",
  });

  // badges “autocompletado”
  const [autoFilledCalle, setAutoFilledCalle] = useState(false);
  const [autoFilledEntre, setAutoFilledEntre] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // NUEVO: selección sincronizada lista <-> mapa
  const [selectedBacheId, setSelectedBacheId] = useState(null);

  // Botón "Obtener ubicación"
  const onGetLocation = useCallback(() => {
    if (!isGeolocationAvailable) return;
    setLocating(true);
    getPosition(); // no retorna promesa
    setTimeout(() => {
      if (!coords && !positionError) setLocating(false);
    }, 15000);
  }, [getPosition, isGeolocationAvailable, coords, positionError]);

  // Llega coords -> autollenar calle/entreCalles
  useEffect(() => {
    if (!coords) return;
    setLocating(false);

    (async () => {
      try {
        const result = await reverseGeocode(coords.latitude, coords.longitude);
        const calle = result?.calle || "";
        const entre = Array.isArray(result?.entreCalles)
          ? result.entreCalles.filter(Boolean)
          : (result?.entreCalles ? String(result.entreCalles).split(",").map(s => s.trim()).filter(Boolean) : []);
        setBacheData(prev => ({
          ...prev,
          calle: calle || prev.calle || "",
          entreCalles: (entre.length ? entre : prev.entreCalles) || [],
        }));
        setAutoFilledCalle(Boolean(calle));
        setAutoFilledEntre(Boolean(entre.length));
      } catch (e) {
        console.error("reverseGeocode error:", e);
      }
    })();
  }, [coords]);

  // Error geolocalización
  useEffect(() => {
    if (!positionError) return;
    setLocating(false);
    setErr(positionError.message || "No se pudo obtener la ubicación (permiso denegado o GPS inactivo).");
  }, [positionError]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true); setErr(""); setMsg("");
    try {
      const data = canSeeAll ? await listAllBaches() : await listBachesByResidente(user.uid);
      setRows(data);
      // reset selección si el item ya no está
      setSelectedBacheId(prev => (data.some(d => d.id === prev) ? prev : null));
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar los baches.");
    } finally {
      setLoading(false);
    }
  }, [user, canSeeAll]);

  useEffect(() => { refresh(); }, [refresh]);

  // Numeración estable basada en el orden actual
  const numberedRows = useMemo(() => {
    return rows.map((r, i) => ({ ...r, idx: i + 1 }));
  }, [rows]);

  // Al seleccionar (desde mapa o lista), hacer scroll a la tarjeta
  useEffect(() => {
    if (!selectedBacheId) return;
    const el = document.getElementById(`bache-card-${selectedBacheId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedBacheId]);

  function nextNoBacheForStreet(calle) {
    const list = rows.filter(r => (r.calle || "").trim().toLowerCase() === (calle || "").trim().toLowerCase());
    const nums = list.map(r => Number(r.noBache) || 0);
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return next;
  }

  function parseMedidas(text) {
    return (text || "")
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean)
      .map(n => parseFloat(n.replace(",", ".")))
      .filter(v => !isNaN(v));
  }

  const onCreate = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");

    if (!user) return setErr("Debes iniciar sesión.");
    if (!coords) return setErr("Primero obtén la ubicación (botón).");

    const medidas = parseMedidas(bacheData.medidasText);
    if (medidas.length < 3) {
      return setErr("Ingresa 3 medidas (triángulo) o 4 medidas (trapecio).");
    }

    let forma, vertices;
    if (medidas.length === 3) {
      forma = "triangulo";
      vertices = verticesFromMedidas3(medidas);
    } else {
      forma = "trapecio";
      vertices = verticesFromMedidas4(medidas);
    }

    const area = polygonAreaMeters(vertices);
    const noBache = nextNoBacheForStreet(bacheData.calle);

    const payload = {
      calle: bacheData.calle,
      entreCalles: bacheData.entreCalles || [],
      forma,
      vertices,
      area,
      medidas,
      curbSide: bacheData.curbSide || "",
      coordenadas: { lat: coords.latitude, lng: coords.longitude },
      residenteUid: user.uid,
      noBache,
    };

    try {
      await createBache(payload);
      setMsg(`Bache #${noBache} creado en ${bacheData.calle || "calle"}.`);
      setBacheData(prev => ({
        ...prev,
        medidasText: "",
        curbSide: "",
      }));
      setAutoFilledCalle(false);
      setAutoFilledEntre(false);
      refresh();
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "No se pudo crear el bache.");
    }
  };

  const handleExport = () => {
    exportToExcel(rows, "Reporte de Baches");
    setMsg("Exportando a Excel...");
  };

  const onDelete = async (id) => {
    if (!id) return;
    const ok = window.confirm("¿Eliminar este bache? Esta acción no se puede deshacer.");
    if (!ok) return;
    try {
      await deleteBache(id);
      setMsg("Bache eliminado.");
      refresh();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "No se pudo eliminar el bache (revisa permisos).");
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 1100, margin: "30px auto", padding: 16 }}>
        <h2>Levantamiento de Baches</h2>

        <BacheForm
          data={bacheData}
          onChange={setBacheData}
          onSubmit={onCreate}
          isGeolocationAvailable={isGeolocationAvailable}
          isGeolocationEnabled={isGeolocationEnabled}
          coords={coords}
          locating={locating}
          onGetLocation={onGetLocation}
          autoFilledCalle={autoFilledCalle}
          setAutoFilledCalle={setAutoFilledCalle}
          autoFilledEntre={autoFilledEntre}
          setAutoFilledEntre={setAutoFilledEntre}
        />

        {msg && <p style={{ color: "green" }}>{msg}</p>}
        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
          <div style={{ flex: 1 }}>
            <BacheMap
              baches={numberedRows}
              userCoords={coords ? { lat: coords.latitude, lng: coords.longitude } : null}
              selectedBacheId={selectedBacheId}
              onSelectBache={(id) => setSelectedBacheId(id)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <BacheList
              rows={numberedRows}
              loading={loading}
              onDelete={onDelete}
              selectedBacheId={selectedBacheId}
              onSelectBache={(id) => setSelectedBacheId(id)}
            />
            <button onClick={handleExport} style={{ marginTop: 10 }}>
              Exportar a Excel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
