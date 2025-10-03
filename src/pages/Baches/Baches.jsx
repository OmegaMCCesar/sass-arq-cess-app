import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import AppLayout from "../../components/layout/AppLayout";
import BacheForm from "../../components/bache/BacheForm";
import BacheList from "../../components/bache/BacheList";
import BacheMap from "../../components/bache/BacheMap";
import { useGeolocated } from "react-geolocated";
import { exportToExcel } from "../../utils/excelUtils";
import { reverseGeocode } from "../../services/geocodingService";
import styles from "../../styles/BachesPage.module.css";

import {
  createBache,
  listBachesByResidente,
  listAllBaches,
  deleteBache as deleteBacheServer,
  updateBache as updateBacheServer,
} from "../../services/bachesService";

import { enqueue, processQueue, onOnline } from "../../utils/offlineQueue";

/* ===== Helpers geométricos ===== */
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

/* ============================== Componente ============================== */
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

  const [autoFilledCalle, setAutoFilledCalle] = useState(false);
  const [autoFilledEntre, setAutoFilledEntre] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [selectedBacheId, setSelectedBacheId] = useState(null);
  const [movingBacheId, setMovingBacheId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Ubicación (botón) */
  const onGetLocation = useCallback(() => {
    if (!isGeolocationAvailable) return;
    setLocating(true);
    getPosition();
    setTimeout(() => {
      if (!coords && !positionError) setLocating(false);
    }, 15000);
  }, [getPosition, isGeolocationAvailable, coords, positionError]);

  /* Autorrelleno calle/entreCalles */
  useEffect(() => {
    if (!coords) return;
    setLocating(false);
    (async () => {
      try {
        const result = await reverseGeocode(coords.latitude, coords.longitude);
        const calle = result?.calle || "";
        const entre = Array.isArray(result?.entreCalles)
          ? result.entreCalles.filter(Boolean)
          : (result?.entreCalles
              ? String(result.entreCalles).split(",").map((s) => s.trim()).filter(Boolean)
              : []);
        setBacheData((prev) => ({
          ...prev,
          calle: calle || prev.calle || "",
          entreCalles: (entre.length ? entre : prev.entreCalles) || [],
        }));
        setAutoFilledCalle(Boolean(calle));
        setAutoFilledEntre(Boolean(entre.length));
      } catch (e) { console.error(e); }
    })();
  }, [coords]);

  useEffect(() => {
    if (!positionError) return;
    setLocating(false);
    setErr(positionError.message || "No se pudo obtener la ubicación.");
  }, [positionError]);

  /* Listado */
  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true); setErr(""); setMsg("");
    try {
      const data = canSeeAll ? await listAllBaches() : await listBachesByResidente(user.uid);
      setRows(data);
      setSelectedBacheId((prev) => (data.some((d) => d.id === prev) ? prev : null));
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar los baches.");
    } finally {
      setLoading(false);
    }
  }, [user, canSeeAll]);

  useEffect(() => { refresh(); }, [refresh]);

  /* Cola offline */
  useEffect(() => {
    const off = onOnline(async () => {
      await processQueue({
        create: async (payload) => {
          const { id: newId } = await createBache(payload);
          return newId;
        },
        update: async (payload) => {
          await updateBacheServer(payload.id, payload.partial);
        },
        delete: async (id) => {
          await deleteBacheServer(id);
        },
      });
      refresh();
    });
    return off;
  }, [refresh]);

  /* Numeración visual */
  const numberedRows = useMemo(
    () => rows.map((r, i) => ({ ...r, idx: i + 1 })),
    [rows]
  );

  /* Utils */
  function nextNoBacheForStreet(calle) {
    const list = rows.filter(
      (r) => (r.calle || "").trim().toLowerCase() === (calle || "").trim().toLowerCase()
    );
    const nums = list.map((r) => Number(r.noBache) || 0);
    return (nums.length ? Math.max(...nums) : 0) + 1;
  }
  function parseMedidas(text) {
    return (text || "")
      .split("\n").map((s) => s.trim()).filter(Boolean)
      .map((n) => parseFloat(n.replace(",", "."))).filter((v) => !isNaN(v));
  }

  /* Crear */
  const onCreate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr(""); setMsg("");

    if (!user) { setIsSubmitting(false); return setErr("Debes iniciar sesión."); }
    if (!coords) { setIsSubmitting(false); return setErr("Primero obtén la ubicación (botón)."); }

    const medidas = parseMedidas(bacheData.medidasText);
    if (medidas.length < 3) { setIsSubmitting(false); return setErr("Ingresa 3 medidas (triángulo) o 4 medidas (trapecio)."); }

    const forma = (medidas.length === 3) ? "triangulo" : "trapecio";
    const vertices = (medidas.length === 3) ? verticesFromMedidas3(medidas) : verticesFromMedidas4(medidas);
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
      coordenadas: { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy || null },
      residenteUid: user.uid,
      noBache,
      createdAt: new Date(),          // útil para filtros en cliente
      pendingSync: !navigator.onLine, // marca local
    };

    try {
      if (navigator.onLine) {
        await createBache(payload);
        setMsg(`Bache #${noBache} creado en ${bacheData.calle || "calle"}.`);
        refresh();
      } else {
        const tempId = `temp_${Date.now()}`;
        setRows((prev) => [...prev, { id: tempId, ...payload }]);
        enqueue({ type: "create", payload });
        setMsg("Bache en cola para sincronizar (offline).");
      }
      setBacheData((prev) => ({ ...prev, medidasText: "", curbSide: "" }));
      setAutoFilledCalle(false);
      setAutoFilledEntre(false);
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "No se pudo crear el bache.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Eliminar */
  const onDelete = async (id) => {
    if (!id) return;
    const ok = window.confirm("¿Eliminar este bache? Esta acción no se puede deshacer.");
    if (!ok) return;
    try {
      if (navigator.onLine) {
        await deleteBacheServer(id);
        setRows((prev) => prev.filter((r) => r.id !== id));
        setMsg("Bache eliminado.");
      } else {
        setRows((prev) => prev.filter((r) => r.id !== id));
        enqueue({ type: "delete", payloadId: id });
        setMsg("Eliminación en cola para sincronizar (offline).");
      }
    } catch (e) {
      console.error(e);
      setErr(e?.message || "No se pudo eliminar el bache.");
    }
  };

  /* Update genérico (edición inline + mover pin) */
  const onUpdateRow = async (id, partial) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...partial, pendingSync: !navigator.onLine || r.pendingSync } : r)));
    try {
      if (navigator.onLine) {
        await updateBacheServer(id, partial);
        setMsg("Bache actualizado.");
      } else {
        enqueue({ type: "update", payload: { id, partial } });
        setMsg("Actualización en cola para sincronizar (offline).");
      }
    } catch (e) {
      console.error(e);
      setErr(e?.message || "No se pudo actualizar el bache.");
      refresh();
    }
  };

  /* Mover pin en mapa */
  const onRequestMove = (id) => {
    setSelectedBacheId(id);
    setMovingBacheId(id);
  };
  const handleMarkerDragEnd = async (id, lat, lng) => {
    setMovingBacheId(null);
    await onUpdateRow(id, { coordenadas: { lat, lng } });
  };

  /* Export */
  const handleExport = () => {
    exportToExcel(rows, "Reporte de Baches");
    setMsg("Exportando a Excel...");
  };

  /* Scroll explícito desde mapa */
  const onRequestScrollTo = (id) => {
    setSelectedBacheId(id);
    const el = document.getElementById(`bache-card-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <AppLayout>
      <div className={styles.wrapper}>
        <h2 className={styles.header}>Levantamiento de Baches</h2>

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
          isSubmitting={isSubmitting}
        />

        {msg && <p className={`${styles.flash} ${styles.flashSuccess}`}>{msg}</p>}
        {err && <p className={`${styles.flash} ${styles.flashError}`}>{err}</p>}

        <div className={styles.split}>
          <div className={styles.card}>
            <BacheMap
              baches={numberedRows}
              userCoords={coords ? { lat: coords.latitude, lng: coords.longitude } : null}
              selectedBacheId={selectedBacheId}
              onSelectBache={(id) => setSelectedBacheId(id)}
              onScrollToBache={onRequestScrollTo}
              movingBacheId={movingBacheId}
              onMarkerDragEnd={handleMarkerDragEnd}
            />
          </div>
          <div>
            <BacheList
              rows={numberedRows}
              loading={loading}
              onDelete={onDelete}
              onUpdate={onUpdateRow}
              selectedBacheId={selectedBacheId}
              onSelectBache={(id) => setSelectedBacheId(id)}
              onRequestMove={onRequestMove}
            />
            <div className={styles.exportWrap}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handleExport}>
                Exportar a Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
