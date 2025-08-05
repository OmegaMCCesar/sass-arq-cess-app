import React, { useState } from "react";
import styles from "./App.module.css";

export default function App() {
  const [form, setForm] = useState({
    largo: "", ancho: "", altura: "", unidad: "m", densidad: 2.4
  });
  const [resultado, setResultado] = useState(null);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    const { largo, ancho, altura, unidad, densidad } = form;
    const lv = parseFloat(largo), av = parseFloat(ancho), hv = parseFloat(altura);
    const dv = parseFloat(densidad);
    if ([lv, av, hv, dv].some(v => isNaN(v) || v <= 0)) {
      alert("Todos los valores deben ser positivos y válidos");
      return;
    }
    // convertir a metros
    const factor = unidad === "cm" ? 0.01 : 1;
    const lm = lv * factor, am = av * factor, hm = hv * factor;
    const volumen = lm * am * hm;           // m³  
    const toneladas = volumen * dv;        // t  
    setResultado({ volumen, toneladas });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Calculadora de Asfalto SAAS-ARQ-Cess</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <label>
            Largo:
            <input name="largo" type="number" step="any" onChange={handleChange} required />
          </label>
          <label>
            Ancho:
            <input name="ancho" type="number" step="any" onChange={handleChange} required />
          </label>
          <label>
            Altura / Espesor:
            <input name="altura" type="number" step="any" onChange={handleChange} required />
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
            <input name="densidad" type="number" step="0.01" onChange={handleChange} value={form.densidad} required />
          </label>
        </div>
        <button type="submit" className={styles.button}>Calcular</button>
      </form>

      {resultado && (
        <div className={styles.result}>
          <p><strong>Volumen:</strong> {resultado.volumen.toFixed(4)} m³</p>
          <p><strong>Asfalto requerido:</strong> {resultado.toneladas.toFixed(3)} toneladas</p>
        </div>
      )}
    </div>
  );
}
