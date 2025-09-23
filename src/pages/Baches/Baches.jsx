import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  createBache,
  listBachesByResidente,
  listAllBaches,
  deleteBache,
} from "../../services/bachesService";
import { useGeolocated } from "react-geolocated";

import AppLayout from "../../components/layout/AppLayout";
import BacheForm from "../../components/bache/BacheForm";
import BacheList from "../../components/bache/BacheList";
import BacheMap from "../../components/bache/BacheMap";
import BacheCroquis from "../../components/bache/BacheCroquis";

import { exportToExcel } from "../../utils/excelUtils";
import { reverseGeocode } from "../../services/geocodingService";

export default function BachesPage() {
  const { user, role } = useAuth();
  const canSeeAll = useMemo(
    () => ["admin", "superadmin"].includes(role),
    [role]
  );

  const {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    getPosition,
  } = useGeolocated({
    positionOptions: { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    watchPosition: true,
    userDecisionTimeout: 8000,
  });

  const [geoAccuracy, setGeoAccuracy] = useState(null);

  const [bacheData, setBacheData] = useState({
    calle: "",
    entreCalles: [],
    largo: 0,
    ancho: 0,
    forma: "cuadrado",
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (coords && coords.accuracy != null) setGeoAccuracy(coords.accuracy);
  }, [coords]);

  useEffect(() => {
    (async () => {
      if (coords?.latitude && coords?.longitude) {
        try {
          const result = await reverseGeocode(coords.latitude, coords.longitude);
          if (result) {
            setBacheData((prev) => ({
              ...prev,
              calle: result.callePrincipal || prev.calle,
              entreCalles: result.entreCalles || prev.entreCalles,
            }));
          }
        } catch {
          setErr("No se pudo obtener la dirección de las coordenadas.");
        }
      }
    })();
  }, [coords]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const data = canSeeAll
        ? await listAllBaches()
        : await listBachesByResidente(user.uid);
      setRows(data);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar los baches.");
    } finally {
      setLoading(false);
    }
  }, [user, canSeeAll]);

  useEffect(() => {
    refresh();
  }, [refresh, user, role]);

  const nextNoBacheForStreet = useCallback(
    (calle) => {
      const nums = rows
        .filter(
          (r) =>
            (r.calle || "").trim().toLowerCase() ===
            (calle || "").trim().toLowerCase()
        )
        .map((r) => r.noBache || 0);
      const max = nums.length ? Math.max(...nums) : 0;
      return max + 1;
    },
    [rows]
  );

  const validate = () => {
    if (!user) return "Debes iniciar sesión.";
    if (!isGeolocationAvailable) return "Tu dispositivo no soporta geolocalización.";
    if (!isGeolocationEnabled) return "Activa la geolocalización en tu dispositivo.";
    if (!coords) return "No se obtuvo ubicación. Toca 'Mejorar ubicación' e intenta de nuevo.";
    if (geoAccuracy != null && geoAccuracy > 50)
      return `Precisión baja (~${Math.round(
        geoAccuracy
      )} m). Muévete al aire libre o usa 'Mejorar ubicación'.`;
    if (!bacheData.calle?.trim()) return "La calle principal es obligatoria.";
    if ((bacheData.largo || 0) <= 0) return "El largo debe ser mayor a 0.";
    if ((bacheData.ancho || 0) <= 0) return "El ancho debe ser mayor a 0.";
    return null;
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    const coordenadas = { lat: coords.latitude, lng: coords.longitude };
    const area = (bacheData.largo || 0) * (bacheData.ancho || 0);
    const noBache = nextNoBacheForStreet(bacheData.calle);

    try {
      await createBache({
        ...bacheData,
        noBache,
        area,
        coordenadas,
        residenteUid: user.uid,
        createdAt: new Date(),
      });
      setMsg(`Bache #${noBache} agregado en ${bacheData.calle}.`);
      setBacheData({
        calle: bacheData.calle,
        entreCalles: bacheData.entreCalles || [],
        largo: 0,
        ancho: 0,
        forma: "cuadrado",
      });
      await refresh();
    } catch (e2) {
      console.error(e2);
      setErr(e2?.message || "No se pudo crear el bache.");
    }
  };

  const handleDelete = async (id) => {
    setErr("");
    setMsg("");
    try {
      await deleteBache(id);
      setMsg("Bache eliminado.");
      await refresh();
    } catch (e3) {
      console.error(e3);
      setErr(e3?.message || "No se pudo eliminar el bache.");
    }
  };

  const handleExport = () => {
    exportToExcel(rows, "Reporte de Baches");
    setMsg("Exportando a Excel...");
  };

  const retryLocation = () => {
    try {
      getPosition();
    } catch {}
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: "30px auto", padding: 16 }}>
        <h2>Levantamiento de Baches</h2>

        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {coords && (
            <span>
              Precisión: {geoAccuracy != null ? `${Math.round(geoAccuracy)} m` : "—"} ·
              Lat/Lng: {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}{" "}
              <button onClick={retryLocation} style={{ marginLeft: 8 }}>
                Mejorar ubicación
              </button>
            </span>
          )}
        </div>

        <BacheForm
          data={bacheData}
          onChange={setBacheData}
          onSubmit={onCreate}
          isGeolocationAvailable={isGeolocationAvailable}
          isGeolocationEnabled={isGeolocationEnabled}
          coords={coords}
        />

        {msg && <p style={{ color: "green" }}>{msg}</p>}
        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginTop: 20,
          }}
        >
          <div>
            <BacheMap baches={rows} />
          </div>
          <div>
            <BacheList rows={rows} loading={loading} onDelete={handleDelete} />
            <button onClick={handleExport} style={{ marginTop: 10 }}>
              Exportar a Excel
            </button>
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <h3>Croquis por calle</h3>
          <BacheCroquis baches={rows} />
        </div>
      </div>
    </AppLayout>
  );
}
