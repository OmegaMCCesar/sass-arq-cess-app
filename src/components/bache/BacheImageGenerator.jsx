import React, { useRef, useEffect } from "react";

/**
 * Props:
 * - largo (m), ancho (m)
 * - forma: "cuadrado" | "rectangulo" | "triangulo" | "poligono" | "irregular"
 * - lados: number (para poligono, >=3)
 * - vertices: [{x: number, y: number}, ...] (para irregular, en metros relativos a largo/ancho; (0,0) = esquina sup izq)
 * - width, height: tamaño CSS del canvas (px). El componente maneja DPR para nitidez.
 * - showDownload: boolean (muestra botón "Descargar PNG")
 * - fillColor, strokeColor: colores opcionales
 */
export default function BacheImageGenerator({
  largo = 1,
  ancho = 1,
  forma = "rectangulo",
  lados = 5,
  vertices = null,
  width = 400,
  height = 400,
  showDownload = false,
  fillColor = "#d0d8ff",
  strokeColor = "#1a47ff",
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // HiDPI: escalar por devicePixelRatio para nitidez
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // dibujar en coordenadas CSS
    ctx.clearRect(0, 0, width, height);

    // Parámetros de dibujo
    const PAD = 40; // padding para cotas y texto
    const innerW = width - PAD * 2;
    const innerH = height - PAD * 2;

    // “Modelo” en metros que debemos encajar en innerW x innerH (en px)
    // Largo lo tomamos como ALTO (vertical) y Ancho como ANCHO (horizontal), como en tu versión.
    const mW = Math.max(0.01, ancho);
    const mH = Math.max(0.01, largo);

    // Escala (m -> px) para encajar manteniendo proporción
    const scale = Math.min(innerW / mW, innerH / mH);

    // Dimensiones finales en px
    const pxW = mW * scale;
    const pxH = mH * scale;

    // Origen (para centrar la figura)
    const startX = (width - pxW) / 2;
    const startY = (height - pxH) / 2;

    // Estilos base
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;

    // Utilidad: flecha con texto (cotas)
    const drawArrow = (x1, y1, x2, y2, text, offset = 0) => {
      const head = 8;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Cabezas de flecha
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const drawHead = (x, y, ang) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - head * Math.cos(ang - Math.PI / 6), y - head * Math.sin(ang - Math.PI / 6));
        ctx.lineTo(x - head * Math.cos(ang + Math.PI / 6), y - head * Math.sin(ang + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = strokeColor;
        ctx.fill();
      };
      drawHead(x1, y1, angle + Math.PI);
      drawHead(x2, y2, angle);

      // Texto
      ctx.fillStyle = "#111";
      ctx.font = "14px Arial";
      const tx = (x1 + x2) / 2 + (offset ? offset * Math.cos(angle + Math.PI / 2) : 0);
      const ty = (y1 + y2) / 2 + (offset ? offset * Math.sin(angle + Math.PI / 2) : 0);
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(text, tx, ty - 4);
      ctx.restore();
    };

    // Dibujo según forma
    if (forma === "cuadrado" || forma === "rectangulo") {
      // Rectángulo centrado
      ctx.fillRect(startX, startY, pxW, pxH);
      ctx.strokeRect(startX, startY, pxW, pxH);

      // Cotas (horizontal = ancho, vertical = largo)
      // Horizontal bajo la figura
      drawArrow(startX, startY + pxH + 20, startX + pxW, startY + pxH + 20, `Ancho: ${ancho} m`);
      // Vertical a la izquierda
      drawArrow(startX - 20, startY, startX - 20, startY + pxH, `Largo: ${largo} m`);

    } else if (forma === "triangulo") {
      // Triángulo isósceles: base abajo, altura = largo, base = ancho
      const x1 = startX;
      const y1 = startY + pxH;
      const x2 = startX + pxW;
      const y2 = startY + pxH;
      const x3 = startX + pxW / 2;
      const y3 = startY;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cotas: base (ancho) abajo, altura (largo) a la izquierda
      drawArrow(x1, y1 + 20, x2, y2 + 20, `Base: ${ancho} m`);
      drawArrow(startX - 20, y3, startX - 20, y1, `Altura: ${largo} m`);

    } else if (forma === "poligono") {
      const n = Math.max(3, parseInt(lados || 5, 10));
      // Polígono regular que “ocupa” el rectángulo pxW x pxH
      const cx = startX + pxW / 2;
      const cy = startY + pxH / 2;
      const rx = pxW / 2;
      const ry = pxH / 2;

      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 - Math.PI / 2; // vértice arriba
        const x = cx + Math.cos(ang) * rx;
        const y = cy + Math.sin(ang) * ry;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cotas “globales” del polígono (rectángulo envolvente)
      drawArrow(startX, startY + pxH + 20, startX + pxW, startY + pxH + 20, `Ancho aprox: ${ancho} m`);
      drawArrow(startX - 20, startY, startX - 20, startY + pxH, `Largo aprox: ${largo} m`);

      // Nota de lados
      ctx.fillStyle = "#111";
      ctx.font = "13px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${n} lados`, cx, startY - 8);

    } else if (forma === "irregular" && Array.isArray(vertices) && vertices.length >= 3) {
      // Vertices esperados en metros relativos (0..ancho, 0..largo)
      ctx.beginPath();
      vertices.forEach((v, i) => {
        const x = startX + (v.x / mW) * pxW;
        const y = startY + (v.y / mH) * pxH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cotas del envolvente
      drawArrow(startX, startY + pxH + 20, startX + pxW, startY + pxH + 20, `Ancho máx: ${ancho} m`);
      drawArrow(startX - 20, startY, startX - 20, startY + pxH, `Largo máx: ${largo} m`);

    } else {
      // Fallback a tu mensaje original
      ctx.fillStyle = "#111";
      ctx.font = "16px Arial";
      ctx.fillText("Figura no soportada", 20, 40);
    }

    // Información en esquina
    ctx.fillStyle = "#444";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Escala visual: ${(scale).toFixed(1)} px/m`, 10, height - 10);
  }, [largo, ancho, forma, lados, vertices, width, height, fillColor, strokeColor]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `bache_${forma}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div>
      <canvas ref={canvasRef} style={{ border: "1px solid #ccc", borderRadius: 6 }} />
      {showDownload && (
        <div style={{ marginTop: 8 }}>
          <button onClick={handleDownload}>Descargar PNG</button>
        </div>
      )}
    </div>
  );
}
