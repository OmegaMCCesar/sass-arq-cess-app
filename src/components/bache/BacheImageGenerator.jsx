import React, { useRef, useEffect } from "react";

/* Área con shoelace (m²) */
function polygonAreaMeters(vertices = []) {
  if (!Array.isArray(vertices) || vertices.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

/* 4 medidas -> trapecio: [wTop, hRight, wBottom, hLeft] */
function verticesFromMedidas4(m) {
  const wTop = Number(m[0]) || 0;
  const hRight = Number(m[1]) || 0;
  const wBottom = Number(m[2]) || 0;
  const hLeft = Number(m[3]) || 0;
  const offset = (wTop - wBottom) / 2; // centrar base inferior
  return [
    { x: 0, y: 0 },                     // top-left
    { x: wTop, y: 0 },                  // top-right
    { x: offset + wBottom, y: hRight }, // bottom-right
    { x: offset, y: hLeft },            // bottom-left
  ];
}

/* 3 medidas -> triángulo: [baseTop, hRight, hLeft] */
function verticesFromMedidas3(m) {
  const baseTop = Number(m[0]) || 0;
  const hRight = Number(m[1]) || 0;
  const hLeft = Number(m[2]) || 0;
  const h = Math.max(hRight, hLeft);
  return [
    { x: 0, y: 0 },               // top-left
    { x: baseTop, y: 0 },         // top-right
    { x: baseTop / 2, y: h },     // vértice inferior centrado
  ];
}

export default function BacheImageGenerator({
  // Formas clásicas opcionales (se mantienen)
  forma = "rectangulo",
  largo = 1,
  ancho = 1,
  lados = 5,
  vertices = null,

  // NUEVO: medidas por línea (3 = triángulo, 4+ = trapecio con las primeras 4)
  medidas = null,

  // Estética y opciones
  width = 400,
  height = 400,
  showDownload = false,
  fillColor = "#d0d8ff",
  strokeColor = "#1a47ff",

  // NUEVO: lado pegado a banqueta/guarnición
  // Triángulo: "base" | "derecha" | "izquierda"
  // Trapecio:  "arriba" | "derecha" | "abajo" | "izquierda"
  curbSide = null,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const PAD = 40;
    const innerW = width - PAD * 2;
    const innerH = height - PAD * 2;

    // Estilos base
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;

    const drawArrow = (x1, y1, x2, y2, text) => {
      const head = 8;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const headAt = (x, y, a) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - head * Math.cos(a - Math.PI / 6), y - head * Math.sin(a - Math.PI / 6));
        ctx.lineTo(x - head * Math.cos(a + Math.PI / 6), y - head * Math.sin(a + Math.PI / 6));
        ctx.closePath(); ctx.fillStyle = strokeColor; ctx.fill();
      };
      headAt(x1, y1, ang + Math.PI); headAt(x2, y2, ang);
      ctx.fillStyle = "#111"; ctx.font = "14px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(text, (x1 + x2) / 2, (y1 + y2) / 2 - 4);
      ctx.restore();
    };

    // Borde especial para banqueta/guarnición
    const drawCurbEdge = (p1, p2, color = "#6b7280") => {
      ctx.save();
      // línea punteada gruesa
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.setLineDash([8, 5]);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.restore();

      // ticks perpendiculares
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      const steps = Math.max(2, Math.floor(len / 22));
      const nx = -dy / len; // normal unitaria
      const ny = dx / len;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const x = p1.x + dx * t;
        const y = p1.y + dy * t;
        const l = 6;
        ctx.beginPath();
        ctx.moveTo(x - nx * l, y - ny * l);
        ctx.lineTo(x + nx * l, y + ny * l);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const drawPolyAndReturnPoints = (verts, minX, minY, scale, startX, startY) => {
      const pts = verts.map(v => ({
        x: startX + (v.x - minX) * scale,
        y: startY + (v.y - minY) * scale,
      }));
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return pts;
    };

    // ===== MODO MEDIDAS (3 o 4) =====
    if (Array.isArray(medidas) && medidas.length >= 3) {
      const verts = medidas.length === 3
        ? verticesFromMedidas3(medidas)
        : verticesFromMedidas4(medidas);

      // bbox y escalado
      const xs = verts.map(v => v.x), ys = verts.map(v => v.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const spanX = Math.max(0.0001, maxX - minX);
      const spanY = Math.max(0.0001, maxY - minY);
      const scale = Math.min(innerW / spanX, innerH / spanY);
      const pxW = spanX * scale, pxH = spanY * scale;
      const startX = (width - pxW) / 2, startY = (height - pxH) / 2;

      // dibujar polígono
      const pts = drawPolyAndReturnPoints(verts, minX, minY, scale, startX, startY);

      // cotas bbox
      drawArrow(startX, startY + pxH + 20, startX + pxW, startY + pxH + 20, `Ancho máx: ${spanX.toFixed(2)} m`);
      drawArrow(startX - 20, startY, startX - 20, startY + pxH, `Largo máx: ${spanY.toFixed(2)} m`);

      // área
      const area = polygonAreaMeters(verts);
      ctx.fillStyle = "#111"; ctx.font = "13px Arial"; ctx.textAlign = "left";
      ctx.fillText(`Área: ${area.toFixed(2)} m²`, startX, startY - 8);
      ctx.fillText(`Vértices: ${verts.length}`, startX, startY - 24);

      // resaltar lado de banqueta (si aplica)
      if (curbSide) {
        if (verts.length === 3) {
          // triángulo: 0=base(top), 1=derecha, 2=izquierda
          const mapTri = { base: 0, derecha: 1, izquierda: 2 };
          const idx = mapTri[curbSide] ?? null;
          if (idx != null) {
            const edges = [
              [pts[0], pts[1]],
              [pts[1], pts[2]],
              [pts[2], pts[0]],
            ];
            const e = edges[idx];
            if (e) drawCurbEdge(e[0], e[1]);
          }
        } else if (verts.length === 4) {
          // trapecio: 0=arriba, 1=derecha, 2=abajo, 3=izquierda
          const mapTrap = { arriba: 0, derecha: 1, abajo: 2, izquierda: 3 };
          const idx = mapTrap[curbSide] ?? null;
          if (idx != null) {
            const edges = [
              [pts[0], pts[1]],
              [pts[1], pts[2]],
              [pts[2], pts[3]],
              [pts[3], pts[0]],
            ];
            const e = edges[idx];
            if (e) drawCurbEdge(e[0], e[1]);
          }
        }
      }

      // pie
      ctx.fillStyle = "#444"; ctx.font = "12px Arial"; ctx.textAlign = "left";
      ctx.fillText(`Escala visual: ${Math.min(innerW / spanX, innerH / spanY).toFixed(1)} px/m`, 10, height - 10);
      return;
    }

    // ===== Formas clásicas (opcional, se mantienen) =====
    const mW = Math.max(0.01, ancho);
    const mH = Math.max(0.01, largo);
    const scale = Math.min(innerW / mW, innerH / mH);
    const pxW = mW * scale, pxH = mH * scale;
    const startX = (width - pxW) / 2, startY = (height - pxH) / 2;

    if (forma === "cuadrado" || forma === "rectangulo") {
      ctx.fillRect(startX, startY, pxW, pxH);
      ctx.strokeRect(startX, startY, pxW, pxH);
      drawArrow(startX, startY + pxH + 20, startX + pxW, startY + pxH + 20, `Ancho: ${ancho} m`);
      drawArrow(startX - 20, startY, startX - 20, startY + pxH, `Largo: ${largo} m`);
    } else if (forma === "triangulo") {
      const x1 = startX, y1 = startY + pxH;
      const x2 = startX + pxW, y2 = startY + pxH;
      const x3 = startX + pxW / 2, y3 = startY;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); ctx.stroke();
      drawArrow(x1, y1 + 20, x2, y2 + 20, `Base: ${ancho} m`);
      drawArrow(startX - 20, y3, startX - 20, y1, `Altura: ${largo} m`);
    } else if (forma === "poligono") {
      const n = Math.max(3, parseInt(lados || 5, 10));
      const cx = startX + pxW / 2, cy = startY + pxH / 2, rx = pxW / 2, ry = pxH / 2;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(ang) * rx, y = cy + Math.sin(ang) * ry;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      drawArrow(startX, startY + pxH + 20, startX + pxW, startY + pxH + 20, `Ancho aprox: ${ancho} m`);
      drawArrow(startX - 20, startY, startX - 20, startY + pxH, `Largo aprox: ${largo} m`);
      ctx.fillStyle = "#111"; ctx.font = "13px Arial"; ctx.textAlign = "center";
      ctx.fillText(`${n} lados`, cx, startY - 8);
    } else if (forma === "irregular" && Array.isArray(vertices) && vertices.length >= 3) {
      const xs = vertices.map(v => v.x), ys = vertices.map(v => v.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const spanX = Math.max(0.0001, maxX - minX), spanY = Math.max(0.0001, maxY - minY);
      const scaleIr = Math.min(innerW / spanX, innerH / spanY);
      const pxWIr = spanX * scaleIr, pxHIr = spanY * scaleIr;
      const startXIr = (width - pxWIr) / 2, startYIr = (height - pxHIr) / 2;
      ctx.beginPath();
      vertices.forEach((v, i) => {
        const x = startXIr + (v.x - minX) * scaleIr, y = startYIr + (v.y - minY) * scaleIr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath(); ctx.fill(); ctx.stroke();
      drawArrow(startXIr, startYIr + pxHIr + 20, startXIr + pxWIr, startYIr + pxHIr + 20, `Ancho máx: ${spanX.toFixed(2)} m`);
      drawArrow(startXIr - 20, startYIr, startXIr - 20, startYIr + pxHIr, `Largo máx: ${spanY.toFixed(2)} m`);
      const area = polygonAreaMeters(vertices);
      ctx.fillStyle = "#111"; ctx.font = "13px Arial"; ctx.textAlign = "left";
      ctx.fillText(`Área: ${area.toFixed(2)} m²`, startXIr, startYIr - 8);
      ctx.fillText(`Vértices: ${vertices.length}`, startXIr, startYIr - 24);
    } else {
      ctx.fillStyle = "#111"; ctx.font = "16px Arial";
      ctx.fillText("Figura no soportada", 20, 40);
    }

    ctx.fillStyle = "#444"; ctx.font = "12px Arial"; ctx.textAlign = "left";
    ctx.fillText(`Escala visual: ${Math.min(innerW / Math.max(0.01, ancho), innerH / Math.max(0.01, largo)).toFixed(1)} px/m`, 10, height - 10);
  }, [forma, largo, ancho, lados, vertices, medidas, width, height, fillColor, strokeColor, curbSide]);

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
