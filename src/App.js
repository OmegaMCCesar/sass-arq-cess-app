import React, { useState, useMemo } from "react";
import styles from "./App.module.css";

export default function App() {
  const [form, setForm] = useState({
    largo: "", ancho: "", altura: "", unidad: "m", densidad: 2.4
  });
  const [baches, setBaches] = useState([]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    const { largo, ancho, altura, unidad, densidad } = form;
    const lv = parseFloat(largo), av = parseFloat(ancho), hv = parseFloat(altura), dv = parseFloat(densidad);
    if ([lv, av, hv, dv].some(v => isNaN(v) || v <= 0)) {
      alert("Todos los valores deben ser números positivos");
      return;
    }
    const factor = unidad === "cm" ? 0.01 : 1;
    const lm = lv * factor, am = av * factor, hm = hv * factor;
    const volumen = lm * am * hm;
    const toneladas = volumen * dv;
    const area = lm * am;
    const nuevo = {
      id: baches.length + 1,
      largo: lv, ancho: av, altura: hv, unidad, densidad: dv,
      volumen, toneladas, area
    };
    setBaches(prev => [...prev, nuevo]);
    setForm({ ...form, largo: "", ancho: "", altura: "" });
  };

  const totals = useMemo(() => {
    return baches.reduce(
      (acc, b) => {
        acc.toneladas += b.toneladas;
        acc.area += b.area;
        return acc;
      }, { toneladas: 0, area: 0 }
    );
  }, [baches]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Calculadora de Asfalto</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <label>
            Largo:
            <input name="largo" type="number" step="any" value={form.largo} onChange={handleChange} required />
          </label>
          <label>
            Ancho:
            <input name="ancho" type="number" step="any" value={form.ancho} onChange={handleChange} required />
          </label>
          <label>
            Altura / Espesor:
            <input name="altura" type="number" step="any" value={form.altura} onChange={handleChange} required />
          </label>
        </div>
        <div className={styles.row}>
          <label>
            Unidad:
            <select name="unidad" onChange={handleChange} value={form.unidad}>
              <option value="m">Metros</option>
              <option value="cm">Centímetros</option>
            </select>
          </label>
          <label>
            Densidad (t/m³):
            <input name="densidad" type="number" step="0.01" value={form.densidad} onChange={handleChange} required />
          </label>
        </div>
        <button type="submit" className={styles.button}>Agregar bache</button>
      </form>

      {baches.length > 0 && (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Largo</th><th>Ancho</th><th>Altura</th>
                <th>Unidad</th><th>Densidad</th>
                <th>Área (m²)</th><th>Volumen (m³)</th><th>Toneladas</th>
              </tr>
            </thead>
            <tbody>
              {baches.map(b => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.largo}</td><td>{b.ancho}</td><td>{b.altura}</td>
                  <td>{b.unidad}</td><td>{b.densidad.toFixed(2)}</td>
                  <td>{b.area.toFixed(3)}</td>
                  <td>{b.volumen.toFixed(4)}</td>
                  <td>{b.toneladas.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="6">Totales:</td>
                <td>{totals.area.toFixed(3)}</td>
                <td>—</td>
                <td>{totals.toneladas.toFixed(3)}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}
