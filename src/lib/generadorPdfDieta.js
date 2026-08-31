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

/**
 * Convierte color hexadecimal (#10B981) a array RGB [r, g, b]
 */
function hexToRgb(hex, defaultRgb = [16, 185, 129]) {
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

/**
 * Carga una imagen de URL o base64 para jsPDF
 */
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
 * Generador de PDF de Planes Nutricionales y Dietas Personalizadas
 * para Olympo Coaches con soporte para Logotipo Personalizado y Color de Marca.
 */
export async function generarPDFDieta({
  plan,
  coachNombre = "Coach Olympo",
  coachTenant = "",
  coachLogo = null,
  coachColorPrimario = "#10B981",
  clienteNombre = "",
}) {
  if (!plan) throw new Error("No se proporcionó información del plan nutricional");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // Cargar logotipo del coach si existe
  let logoDataUrl = null;
  if (coachLogo) {
    logoDataUrl = await cargarImagenBase64(coachLogo);
  }

  // Paleta de colores de marca del coach
  const brandRgb = hexToRgb(coachColorPrimario, [16, 185, 129]);

  // 1. BANNER CABECERA CORPORATIVO (Slate 900 con acento del Coach)
  const headerHeight = 30;
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, headerHeight, 3, 3, "F");

  // Barra de acento con el color del coach
  doc.setFillColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.roundedRect(margin, currentY, 4, headerHeight, 2, 2, "F");

  // Si hay logotipo del Coach, insertarlo a la izquierda
  let textStartX = margin + 10;
  if (logoDataUrl) {
    try {
      const logoSize = 20;
      const logoY = currentY + (headerHeight - logoSize) / 2;
      doc.addImage(logoDataUrl, "PNG", margin + 8, logoY, logoSize, logoSize, undefined, "FAST");
      textStartX = margin + 32;
    } catch (e) {
      console.warn("No se pudo incrustar el logo en el PDF:", e);
    }
  }

  // Textos Cabecera
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(limpiarTextoPDF(plan.titulo || "PLAN NUTRICIONAL PERSONALIZADO").toUpperCase(), textStartX, currentY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  const subCabecera = `Disenado por ${limpiarTextoPDF(coachNombre)} - Plataforma Olympo`;
  doc.text(subCabecera, textStartX, currentY + 18);

  const fechaHoy = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFontSize(7.5);
  doc.setTextColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.text(`Fecha: ${fechaHoy}`, pageWidth - margin - 8, currentY + 18, { align: "right" });

  currentY += headerHeight + 5;

  // 2. FICHA DEL ALUMNO Y METAS DE MACROS
  const nombreEstudiante = limpiarTextoPDF(clienteNombre || plan.cliente_nombre || "Alumno Olympo");
  const objetivo = limpiarTextoPDF(plan.metas_objetivo?.objetivo || plan.objetivo || "Composicion Corporal");

  const kcalTotal = plan.totales_calculados?.kcal || plan.calorias_totales || plan.metas_objetivo?.calorias || 2000;
  const protTotal = plan.totales_calculados?.proteinas || plan.proteinas_g || plan.metas_objetivo?.proteinas || 150;
  const carbsTotal = plan.totales_calculados?.carbohidratos || plan.carbohidratos_g || plan.metas_objetivo?.carbohidratos || 200;
  const grasaTotal = plan.totales_calculados?.grasas || plan.grasas_g || plan.metas_objetivo?.grasas || 60;

  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 2, 2, "FD");

  // Columna Izquierda: Datos del Atleta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`ATLETA: ${nombreEstudiante.toUpperCase()}`, margin + 6, currentY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`OBJETIVO: ${objetivo}`, margin + 6, currentY + 15);

  // Columna Derecha: Tarjetas de Macros Totales (Espaciado limpio y holgado sin emojis)
  const macroX = pageWidth - margin - 84;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.text(`ENERGIA TOTAL: ${kcalTotal} kcal`, macroX, currentY + 8);

  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // Verde
  doc.text(`Prot: ${protTotal}g`, macroX, currentY + 15);

  doc.setTextColor(2, 132, 199); // Sky Blue
  doc.text(`Carbs: ${carbsTotal}g`, macroX + 26, currentY + 15);

  doc.setTextColor(217, 119, 6); // Amber
  doc.text(`Grasas: ${grasaTotal}g`, macroX + 54, currentY + 15);

  currentY += 27;

  // 3. TABLAS DE COMIDAS
  const comidas = plan.comidas || [];

  for (let cIdx = 0; cIdx < comidas.length; cIdx++) {
    const comida = comidas[cIdx];
    const nombreComida = limpiarTextoPDF(comida.nombre || `Comida ${cIdx + 1}`);
    const hora = comida.hora_sugerida ? ` (${limpiarTextoPDF(comida.hora_sugerida)})` : "";
    const cKcal = comida.macros?.kcal || 0;
    const cProt = comida.macros?.proteina || 0;
    const cCarbs = comida.macros?.carbohidratos || 0;
    const cGrasa = comida.macros?.grasa || 0;

    const tituloComida = `${cIdx + 1}. ${nombreComida.toUpperCase()}${hora}  -  [${cKcal} kcal | ${cProt}g P | ${cCarbs}g C | ${cGrasa}g G]`;

    const tableRows = (comida.ingredientes || []).map((ing) => {
      const nom = limpiarTextoPDF(ing.nombre || "Alimento");
      const cant = limpiarTextoPDF(ing.unidad_texto || (ing.cantidad ? `${ing.cantidad}g` : "Al gusto"));
      const kcal = ing.macros?.kcal != null ? `${ing.macros.kcal} kcal` : "-";
      const p = ing.macros?.proteina != null ? `${ing.macros.proteina}g` : "-";
      const c = ing.macros?.carbohidratos != null ? `${ing.macros.carbohidratos}g` : "-";
      const g = ing.macros?.grasa != null ? `${ing.macros.grasa}g` : "-";

      return [nom, cant, kcal, p, c, g];
    });

    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = margin;
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [
        [
          {
            content: tituloComida,
            colSpan: 6,
            styles: {
              fillColor: brandRgb,
              textColor: [255, 255, 255],
              halign: "left",
              fontStyle: "bold",
              fontSize: 8.5,
              cellPadding: 2.2,
            },
          },
        ],
        ["ALIMENTO / INGREDIENTE", "PORCION / CANTIDAD", "ENERGIA", "PROTEINA", "CARBOS", "GRASAS"],
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
        0: { cellWidth: "auto", fontStyle: "bold" },
        1: { cellWidth: 38, halign: "center", fontStyle: "bold", textColor: brandRgb },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 18, halign: "center", textColor: [16, 185, 129], fontStyle: "bold" },
        4: { cellWidth: 18, halign: "center", textColor: [14, 165, 233], fontStyle: "bold" },
        5: { cellWidth: 18, halign: "center", textColor: [245, 158, 11], fontStyle: "bold" },
      },
    });

    currentY = doc.lastAutoTable.finalY + 6;
  }

  // 4. RECOMENDACIONES Y ADHERENCIA
  if (plan.recomendaciones && plan.recomendaciones.length > 0) {
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFillColor(241, 245, 249); // Slate 100
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 14 + plan.recomendaciones.length * 4.5, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("CONSEJOS DE ADHERENCIA Y RECOMENDACIONES DEL COACH:", margin + 6, currentY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    let recY = currentY + 11;
    plan.recomendaciones.forEach((rec) => {
      doc.text(`- ${limpiarTextoPDF(rec)}`, margin + 6, recY);
      recY += 4.5;
    });

    currentY = recY + 6;
  }

  // 5. PIE DE PÁGINA EN TODAS LAS PÁGINAS
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Plan Nutricional Personalizado - ${limpiarTextoPDF(coachNombre)} - Pagina ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: "center" }
    );
  }

  // Descargar archivo PDF
  const nombreLimpio = (plan.titulo || "Dieta")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_");
  const filename = `plan_nutricion_${nombreLimpio}.pdf`;
  doc.save(filename);

  return true;
}
