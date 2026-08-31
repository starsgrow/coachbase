import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Limpia cualquier caracter especial, emoji, bullet o símbolo no compatible con fuentes estándar PDF (Helvetica).
 */
function limpiarTextoPDF(texto) {
  if (!texto) return "";
  return String(texto)
    // Eliminar emojis y surrogate pairs
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/[\uE000-\uF8FF]/g, "")
    // Reemplazar bullets, guiones largos, comillas tipográficas
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "-")
    .replace(/[\u2014\u2015\u2012\u2013]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Reemplazar tildes/caracteres raros si no son estándar Latin-1
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hexToRgb(hex, defaultRgb = [37, 99, 235]) {
  if (!hex || typeof hex !== "string") return defaultRgb;
  const cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return [r, g, b];
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return [r, g, b];
  }
  return defaultRgb;
}

async function cargarImagenBase64(url) {
  if (!url || typeof window === "undefined") return null;
  if (url.startsWith("data:image")) return url;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 120;
          canvas.height = img.naturalHeight || img.height || 120;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL("image/png");
          resolve(dataURL);
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch (err) {
      resolve(null);
    }
  });
}

/**
 * Genera y descarga un PDF profesional del plan de entrenamiento con enlaces interactivos a videos,
 * logotipo único del coach y esquema de colores de marca.
 *
 * @param {Object} rutina - Objeto completo de la rutina { nombre_rutina, objetivo, nivel, dias: [...] }
 * @param {Object} opciones - { coachNombre, coachTenant, coachLogo, coachColorPrimario, clienteNombre, peso, altura, gimnasio }
 */
export async function exportarRutinaPDF(rutina, opciones = {}) {
  if (!rutina) {
    alert("No hay datos de rutina para exportar a PDF.");
    return null;
  }

  const {
    coachNombre = "Coach Olympo",
    coachTenant = "olympocoach",
    coachLogo = null,
    coachColorPrimario = "#2563EB",
    clienteNombre = "Atleta",
    peso = null,
    altura = null,
    gimnasio = "OLYMPO COACHES & FITNESS",
    descargar = true,
  } = opciones;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Cargar logotipo del coach
  let logoDataUrl = null;
  if (coachLogo) {
    logoDataUrl = await cargarImagenBase64(coachLogo);
  }

  const brandRgb = hexToRgb(coachColorPrimario, [37, 99, 235]);

  // ==========================================
  // 1. ENCABEZADO CORPORATIVO
  // ==========================================
  const headerH = 32;
  doc.setFillColor(15, 23, 42); // #0f172a (Slate 900)
  doc.rect(0, 0, pageWidth, headerH, "F");

  // Barra de acento con el color del coach
  doc.setFillColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.rect(0, headerH - 1.5, pageWidth, 1.5, "F");

  let startX = margin;
  if (logoDataUrl) {
    try {
      const logoSize = 20;
      const logoY = (headerH - 1.5 - logoSize) / 2;
      doc.addImage(logoDataUrl, "PNG", margin, logoY, logoSize, logoSize, undefined, "FAST");
      startX = margin + 26;
    } catch (e) {
      console.warn("No se pudo incrustar el logo en la rutina:", e);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(245, 158, 11); // Amber 500
  doc.text(limpiarTextoPDF(gimnasio).toUpperCase(), startX, 11);

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const tituloRutina = rutina.nombre_rutina || rutina.nombre || "PLAN DE ENTRENAMIENTO PERSONALIZADO";
  doc.text(limpiarTextoPDF(tituloRutina).toUpperCase(), startX, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  const fechaStr = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Fecha: ${fechaStr}`, startX, 25);
  doc.text(`Coach: ${limpiarTextoPDF(coachNombre)}`, pageWidth - margin - 55, 25);

  // ==========================================
  // 2. TARJETA DE INFORMACIÓN DEL ATLETA
  // ==========================================
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, headerH + 4, pageWidth - margin * 2, 22, 2, 2, "FD");

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`ATLETA: ${limpiarTextoPDF(clienteNombre).toUpperCase()}`, margin + 4, headerH + 11);

  doc.setFontSize(8);
  doc.setTextColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  const objetivoTexto = `Objetivo: ${limpiarTextoPDF(rutina.objetivo || "Acondicionamiento / Hipertrofia").toUpperCase()} - Nivel: ${limpiarTextoPDF(rutina.nivel || "Intermedio").toUpperCase()}`;
  doc.text(objetivoTexto, margin + 4, headerH + 17.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const infoExtra = [];
  if (peso) infoExtra.push(`Peso: ${peso} kg`);
  if (altura) infoExtra.push(`Talla: ${altura} cm`);

  // Extraer lista de días de forma robusta admitiendo estructura_json, dias, objetos o strings
  let diasLista = [];
  if (Array.isArray(rutina.dias)) {
    diasLista = rutina.dias;
  } else if (Array.isArray(rutina.estructura_json)) {
    diasLista = rutina.estructura_json;
  } else if (rutina.estructura_json && Array.isArray(rutina.estructura_json.dias)) {
    diasLista = rutina.estructura_json.dias;
  } else if (rutina.dias && Array.isArray(rutina.dias.dias)) {
    diasLista = rutina.dias.dias;
  } else if (Array.isArray(rutina.dias_rutina)) {
    diasLista = rutina.dias_rutina;
  } else if (Array.isArray(rutina.dias_entrenamiento)) {
    diasLista = rutina.dias_entrenamiento;
  } else if (typeof rutina.estructura_json === "string") {
    try {
      const parsed = JSON.parse(rutina.estructura_json);
      diasLista = Array.isArray(parsed) ? parsed : (parsed?.dias || []);
    } catch (e) {
      diasLista = [];
    }
  } else if (typeof rutina.dias === "string") {
    try {
      const parsed = JSON.parse(rutina.dias);
      diasLista = Array.isArray(parsed) ? parsed : (parsed?.dias || []);
    } catch (e) {
      diasLista = [];
    }
  }

  if (!Array.isArray(diasLista)) {
    diasLista = [];
  }

  infoExtra.push(`Frecuencia: ${diasLista.length} dias/semana`);
  doc.text(infoExtra.join("   |   "), margin + 4, headerH + 22.5);

  let currentY = headerH + 30;

  // ==========================================
  // 3. TABLAS POR CADA DÍA DE ENTRENAMIENTO
  // ==========================================
  const baseOrigin = typeof window !== "undefined" ? window.location.host : "app.olympofit.com";

  diasLista.forEach((dia, diaIdx) => {
    if (!dia) return;
    const nombreDia = limpiarTextoPDF(dia.nombre_dia || dia.dia || dia.nombre || `Dia ${diaIdx + 1}`);
    const enfoque = limpiarTextoPDF(dia.enfoque || dia.musculos || dia.grupo_muscular || "Fuerza y Rendimiento");
    const tituloDia = `DIA ${diaIdx + 1}: ${nombreDia.toUpperCase()}  -  [${enfoque.toUpperCase()}]`;

    const ejercicios = Array.isArray(dia.ejercicios)
      ? dia.ejercicios
      : dia.ejercicios?.ejercicios || [];
    const linkMap = {};

    const tableRows = ejercicios.map((ej, ejIdx) => {
      const slug = ej.slug || (ej.nombre ? ej.nombre.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") : null);
      if (slug) {
        linkMap[ejIdx] = `https://${baseOrigin}/${coachTenant}/ejercicios/${slug}`;
      }

      const nLow = (ej.nombre || "").toLowerCase();
      const isCardio =
        ej.es_cardio ||
        (ej.tipo_ejercicio || "").toLowerCase() === "cardio" ||
        (ej.grupo_muscular || "").toLowerCase() === "cardio" ||
        nLow.includes("cardio") ||
        nLow.includes("bici") ||
        nLow.includes("caminadora") ||
        nLow.includes("eliptica") ||
        nLow.includes("trotadora");

      // Detección robusta de Músculo / Grupo Muscular
      let musculoRaw =
        ej.grupo_muscular ||
        (Array.isArray(ej.musculos_principales) ? ej.musculos_principales.join(", ") : ej.musculos_principales) ||
        ej.musculo_principal ||
        ej.musculo ||
        ej.grupo ||
        ej.categoria ||
        "";

      if (!musculoRaw || musculoRaw === "-") {
        if (isCardio) musculoRaw = "Cardio";
        else if (nLow.includes("banca") || nLow.includes("pecho") || nLow.includes("chest") || nLow.includes("push-up") || nLow.includes("apertura") || nLow.includes("cruce")) musculoRaw = "Pecho";
        else if (nLow.includes("pull") || nLow.includes("dominada") || nLow.includes("remo") || nLow.includes("dorsal") || nLow.includes("espalda") || nLow.includes("jalon")) musculoRaw = "Espalda";
        else if (nLow.includes("press militar") || nLow.includes("arnold") || nLow.includes("hombro") || nLow.includes("lateral") || nLow.includes("deltoid") || nLow.includes("pajaro")) musculoRaw = "Hombros";
        else if (nLow.includes("bicep") || nLow.includes("curl") || nLow.includes("martillo")) musculoRaw = "Bíceps";
        else if (nLow.includes("tricep") || nLow.includes("frances") || nLow.includes("fondo") || nLow.includes("extension codo")) musculoRaw = "Tríceps";
        else if (nLow.includes("sentadilla") || nLow.includes("squat") || nLow.includes("prensa") || nLow.includes("cuadricep") || nLow.includes("estocada") || nLow.includes("zancada")) musculoRaw = "Cuádriceps";
        else if (nLow.includes("muerto") || nLow.includes("femoral") || nLow.includes("isquio") || nLow.includes("hip thrust") || nLow.includes("gluteo")) musculoRaw = "Isquios / Glúteos";
        else if (nLow.includes("gemelo") || nLow.includes("pantorrilla")) musculoRaw = "Pantorrillas";
        else if (nLow.includes("abdomen") || nLow.includes("crunch") || nLow.includes("plank") || nLow.includes("core")) musculoRaw = "Abdomen";
        else musculoRaw = "General";
      }

      const musculo = limpiarTextoPDF(musculoRaw);
      const nombre = limpiarTextoPDF(ej.nombre || ej.nombre_ejercicio || `Ejercicio ${ejIdx + 1}`);

      let series = "";
      let reps = "";
      let descanso = "";
      let rpe = "";
      let notas = "";

      if (isCardio) {
        series = limpiarTextoPDF(ej.series || "1 sesion");
        reps = limpiarTextoPDF(ej.duracion_min ? `${ej.duracion_min} min` : (ej.repeticiones || "15-20 min"));
        descanso = limpiarTextoPDF(ej.descanso ? `${ej.descanso}s` : "Continuo");
        rpe = limpiarTextoPDF(ej.modalidad || ej.zona_cardio || "Zona 2");
        notas = limpiarTextoPDF(ej.notas || ej.instrucciones || "Mantener ritmo aerobico constante.");
      } else {
        series = limpiarTextoPDF(ej.series || ej.sets || "3-4");
        reps = limpiarTextoPDF(ej.repeticiones || ej.reps || "10-12");
        rpe = limpiarTextoPDF(ej.rpe ? `@${ej.rpe}` : ej.rir ? `RIR ${ej.rir}` : "RIR 2");
        descanso = limpiarTextoPDF(ej.descanso || ej.descanso_segundos ? `${ej.descanso || ej.descanso_segundos}s` : "90s");
        notas = limpiarTextoPDF(ej.notas || ej.instrucciones || "Control excentrico.");
      }

      return [musculo, `${nombre} [Ver Video]`, series, reps, descanso, rpe, notas];
    });

    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 16;
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [
        [
          {
            content: tituloDia,
            colSpan: 7,
            styles: {
              fillColor: brandRgb,
              textColor: [255, 255, 255],
              halign: "left",
              fontStyle: "bold",
              fontSize: 8.5,
              cellPadding: 2,
            },
          },
        ],
        ["MUSCULO", "EJERCICIO (Clic: Video)", "SERIES", "REPS", "DESCANSO", "INTENS.", "NOTAS / TECNICA"],
      ],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        halign: "center",
        cellPadding: 1.8,
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: "bold" },
        1: { cellWidth: "auto", textColor: brandRgb, fontStyle: "bold" },
        2: { cellWidth: 15, halign: "center", fontStyle: "bold" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 24, halign: "center" },
        5: { cellWidth: 14, halign: "center" },
        6: { cellWidth: 40 },
      },
      didDrawCell: function (data) {
        if (data.section === "body" && data.column.index === 1 && linkMap[data.row.index]) {
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
            url: linkMap[data.row.index],
          });
        }
      },
    });

    currentY = doc.lastAutoTable.finalY + 6;
  });

  // ==========================================
  // 4. NOTAS FINALES Y RECOMENDACIONES
  // ==========================================
  if (currentY > pageHeight - 32) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 17, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("CONSEJOS Y PAUTAS DEL COACH:", margin + 3, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "1. Calienta 5-10 minutos antes de comenzar y realiza series de aproximacion progresivas.\n2. Haz clic en el nombre de cualquier ejercicio en este PDF para abrir directamente su video demostrativo.\n3. Mantente hidratado y respeta los descansos pautados para maximizar la intensidad y recuperacion.",
    margin + 3,
    currentY + 9.5
  );

  // ==========================================
  // 5. FOOTER EN TODAS LAS PÁGINAS
  // ==========================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${limpiarTextoPDF(gimnasio)} - Coach ${limpiarTextoPDF(coachNombre)} - Pagina ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  if (descargar) {
    const safeName = (rutina.nombre_rutina || rutina.nombre || "Rutina").replace(/[^a-zA-Z0-9]/g, "_");
    const safeAtleta = limpiarTextoPDF(clienteNombre).replace(/\s+/g, "_");
    doc.save(`Rutina_${safeName}_${safeAtleta}.pdf`);
  }

  return doc;
}
