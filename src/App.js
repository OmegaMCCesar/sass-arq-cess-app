// src/App.jsx
import React, { useState, useMemo } from "react";
import styles from "./App.module.css";

export default function App() {
  const [form, setForm] = useState({
    largo: "", ancho: "", espAsfalto: "", espEscombro: "",
    unidad: "m", densidad: 2.4
  });
  const [baches, setBaches] = useState([]);
  const [geoStatus, setGeoStatus] = useState("");

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const addBache = coords => {
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
    setBaches(prev => [...prev, nuevo]);
    setForm(prev => ({
      ...prev,
      largo: "", ancho: "", espAsfalto: "", espEscombro: ""
    }));
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
    if ([form.largo, form.ancho, form.espAsfalto, form.espEscombro, form.densidad]
        .some(v => isNaN(parseFloat(v)) || parseFloat(v) <= 0)) {
      alert("Todos los campos deben tener valores positivos válidos.");
      return;
    }

    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" })
        .then(res => {
          setGeoStatus(res.state);
          if (res.state === "granted" || res.state === "prompt") {
            handleGeoRequest(position => {
              addBache({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            });
          } else {
            alert("No se permite uso de GPS.");
          }
        })
        .catch(() => {
          handleGeoRequest(position => {
            addBache({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          });
        });
    } else {
      handleGeoRequest(position => {
        addBache({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      });
    }
  };

  const handleDelete = id => {
    setBaches(prev => prev.filter(b => b.id !== id));
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
    <div className={styles.container}>
      <h1 className={styles.title}>Calculadora de Asfalto con GPS</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Campos de entrada */}
        <div className={styles.row}>
          <label>Largo:<input name="largo" type="number" step="any" value={form.largo} onChange={handleChange} required /></label>
          <label>Ancho:<input name="ancho" type="number" step="any" value={form.ancho} onChange={handleChange} required /></label>
        </div>
        <div className={styles.row}>
          <label>Espesor Asfalto:<input name="espAsfalto" type="number" step="any" value={form.espAsfalto} onChange={handleChange} required /></label>
          <label>Espesor Escombro:<input name="espEscombro" type="number" step="any" value={form.espEscombro} onChange={handleChange} required /></label>
        </div>
        <div className={styles.row}>
          <label>Unidad:
            <select name="unidad" value={form.unidad} onChange={handleChange}>
              <option value="m">Metros</option>
              <option value="cm">Centímetros</option>
            </select>
          </label>
          <label>Densidad (t/m³):<input name="densidad" type="number" step="0.01" value={form.densidad} onChange={handleChange} required /></label>
        </div>
        <button type="submit" className={styles.button}>Agregar bache</button>
        {geoStatus === "denied" && <p className={styles.warning}>Aviso: GPS no está disponible</p>}
      </form>

      {baches.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th><th>Fecha</th><th>Lat,Lon</th>
              <th>Esp. Asfalto</th><th>Esp. Escombro</th><th>Esp. Prom (m)</th>
              <th>Área (m²)</th><th>Vol (m³)</th><th>Ton (t)</th><th>Eliminar</th>
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
                <td><button className={styles.delete} onClick={() => handleDelete(b.id)}>X</button></td>
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
      )}
    </div>
  );
}
