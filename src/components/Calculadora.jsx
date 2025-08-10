import React, { useState, useMemo } from "react";
import styles from "../styles/Calculadora.module.css";
import { useAuth } from "../hooks/useAuth";
import { logCalcUsage } from "../services/calcLogsService";
import { createBache } from "../services/bachesService";

export default function Calculadora() {
  const { user, role } = useAuth();

  const [form, setForm] = useState({
    largo: "", ancho: "", espAsfalto: "", espEscombro: "",
    unidad: "m", densidad: 2.4
  });
  const [baches, setBaches] = useState([]);
  const [geoStatus, setGeoStatus] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const addBache = async (coords) => {
    setMsg(""); setErr("");
    const { largo, ancho, espAsfalto, espEscombro, unidad, densidad } = form;
    const lv = parseFloat(largo), av = parseFloat(ancho);
    const ea = parseFloat(espAsfalto), ee = parseFloat(espEscombro);
    const dv = parseFloat(densidad);
    const factor = unidad === "cm" ? 0.01 : 1;
    const lm = lv * factor, am = av * factor;
    const espProm = ((ea + ee) / 2) * factor;
    const volumen = lm * am * espProm;
    const toneladas = volumen * dv;
    const fecha = new Date().toLocaleDateString();

    const nuevo = {
      id: Date.now(),
      largo: lv,
      ancho: av,
      espAsfalto: ea,
      espEscombro: ee,
      espProm,
      unidad,
      densidad: dv,
      area: lm * am,
      volumen,
      toneladas,
      fecha,
      coords
    };

    // 1) push local
    setBaches(prev => [...prev, nuevo]);

    // 2) limpiar inputs (mantiene unidad/densidad)
    setForm(prev => ({
      ...prev,
      largo: "", ancho: "", espAsfalto: "", espEscombro: ""
    }));

    // 3) LOG de uso (no bloquea la UI)
    try {
      await logCalcUsage({
        usedByUid: user?.uid || null,
        usedByEmail: user?.email || null,
        usedByRole: role || null,
        params: { largo: lv, ancho: av, espAsfalto: ea, espEscombro: ee, unidad, densidad: dv, coords },
        result: { area: nuevo.area, volumen: nuevo.volumen, toneladas: nuevo.toneladas }
      });
    } catch (e) {
      // no rompemos el flujo por el log
      console.error("logCalcUsage error:", e);
    }
  };

  const handleGeoRequest = successCallback => {
    if (!navigator.geolocation) {
      alert("Geolocalización no soportada por este navegador");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      successCallback,
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          alert("Permiso de ubicación denegado.");
          setGeoStatus("denied");
        } else {
          alert("Error obteniendo ubicación: " + err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = e => {
    e.preventDefault();
    setMsg(""); setErr("");
    if ([form.largo, form.ancho, form.espAsfalto, form.espEscombro, form.densidad]
      .some(v => isNaN(parseFloat(v)) || parseFloat(v) <= 0)) {
      setErr("Todos los campos deben tener valores positivos válidos.");
      return;
    }

    const tryWithPosition = () => handleGeoRequest(position => {
      addBache({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    });

    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" })
        .then(res => {
          setGeoStatus(res.state);
          if (res.state === "granted" || res.state === "prompt") {
            tryWithPosition();
          } else {
            setErr("No se permite uso de GPS. Otorga permiso para capturar coordenadas.");
          }
        })
        .catch(() => {
          tryWithPosition();
        });
    } else {
      tryWithPosition();
    }
  };

  const handleDelete = id => {
    setBaches(prev => prev.filter(b => b.id !== id));
  };

  // Guardar en Firestore un bache ya calculado (estado inicial: registrado)
  const handleSaveBache = async (b) => {
    setMsg(""); setErr("");
    if (!user) {
      setErr("Debes iniciar sesión para guardar baches.");
      return;
    }
    try {
      const title = `Bache ${b.id}`;
      const description =
        `Calc: largo=${b.largo}${b.unidad}, ancho=${b.ancho}${b.unidad}, ` +
        `espAsfalto=${b.espAsfalto}${b.unidad}, espEscombro=${b.espEscombro}${b.unidad}, ` +
        `densidad=${b.densidad} t/m³, area=${b.area.toFixed(3)} m², volumen=${b.volumen.toFixed(4)} m³, ` +
        `toneladas=${b.toneladas.toFixed(3)} t, coords=(${b.coords.latitude.toFixed(5)}, ${b.coords.longitude.toFixed(5)})`;

      await createBache({
        title,
        description,
        projectId: null,              // puedes setear un projectId real aquí
        residenteUid: user.uid,       // quién registró con la calculadora
        cuadrillaId: null,            // podrás asignarlo luego en la UI de baches
        encargadoId: null,
        status: "registrado"
      });

      setMsg("Bache registrado en Firestore.");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "No se pudo guardar el bache en Firestore.");
    }
  };

  const totals = useMemo(
    () => baches.reduce((acc, b) => {
      acc.area += b.area;
      acc.toneladas += b.toneladas;
      return acc;
    }, { area: 0, toneladas: 0 }),
    [baches]
  );

  return (
    <section id="calculadora" className={styles.container}>
      <h2>Calculadora de Asfalto con GPS</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <label>Largo:
            <input name="largo" type="number" step="any" value={form.largo} onChange={handleChange} required />
          </label>
          <label>Ancho:
            <input name="ancho" type="number" step="any" value={form.ancho} onChange={handleChange} required />
          </label>
        </div>

        <div className={styles.row}>
          <label>Espesor Asfalto:
            <input name="espAsfalto" type="number" step="any" value={form.espAsfalto} onChange={handleChange} required />
          </label>
          <label>Espesor Escombro:
            <input name="espEscombro" type="number" step="any" value={form.espEscombro} onChange={handleChange} required />
          </label>
        </div>

        <div className={styles.row}>
          <label>Unidad:
            <select name="unidad" value={form.unidad} onChange={handleChange}>
              <option value="m">Metros</option>
              <option value="cm">Centímetros</option>
            </select>
          </label>
          <label>Densidad (t/m³):
            <input name="densidad" type="number" step="0.01" value={form.densidad} onChange={handleChange} required />
          </label>
        </div>

        <button type="submit" className={styles.button}>Agregar bache</button>
        {geoStatus === "denied" && <p className={styles.warning}>Aviso: GPS no está disponible</p>}
      </form>

      {msg && <p style={{ color: "green", marginTop: 8 }}>{msg}</p>}
      {err && <p style={{ color: "crimson", marginTop: 8 }}>{err}</p>}

      {baches.length > 0 && (
        <div id="tabla" className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Lat, Lon</th>
                <th>Esp. Asfalto</th>
                <th>Esp. Escombro</th>
                <th>Esp. Prom (m)</th>
                <th>Área (m²)</th>
                <th>Vol (m³)</th>
                <th>Ton (t)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {baches.map((b,i) => (
                <tr key={b.id}>
                  <td>{i+1}</td>
                  <td>{b.fecha}</td>
                  <td>{b.coords.latitude.toFixed(5)}, {b.coords.longitude.toFixed(5)}</td>
                  <td>{b.espAsfalto} {b.unidad}</td>
                  <td>{b.espEscombro} {b.unidad}</td>
                  <td>{b.espProm.toFixed(3)}</td>
                  <td>{b.area.toFixed(3)}</td>
                  <td>{b.volumen.toFixed(4)}</td>
                  <td>{b.toneladas.toFixed(3)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className={styles.delete} onClick={() => handleDelete(b.id)}>Eliminar</button>
                    <button
                      className={styles.button}
                      style={{ marginLeft: 8 }}
                      onClick={() => handleSaveBache(b)}
                    >
                      Guardar en Firestore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="6">Totales:</td>
                <td>{totals.area.toFixed(3)}</td>
                <td>—</td>
                <td>{totals.toneladas.toFixed(3)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
