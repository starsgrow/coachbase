/**
 * Motor Científico de Sobrecarga Progresiva Dinámica para Olympo Coaches
 * Soporta Entrenamiento de Fuerza Multi-Método, Progresión de Cardio Basada en IMC y Objetivo,
 * con Excepción Fisiológica para Atletas con Masa Muscular Alta / Avanzados,
 * y Cascada Multisemana en Tiempo Real (Cambios en Semana K propagan automáticamente a semanas posteriores).
 */

export const METODOS_SOBRECARGA = [
  {
    id: "doble_progresion",
    nombre: "Doble Progresión (Reps → Peso)",
    icono: "📈",
    descripcion: "Aumenta repeticiones hasta el tope del rango (ej. 8-12); al completarlas en todas las series, incrementa peso (+2.5kg) y reinicia en el mínimo.",
    recomendadoPara: "Hipertrofia muscular general, seguridad articular y ejercicios accesorios/compuestos.",
    incrementoDefectoKg: 2.5,
    repsMinDefecto: 8,
    repsMaxDefecto: 12,
  },
  {
    id: "peso",
    nombre: "Carga Lineal (+Peso Directo)",
    icono: "🏋️",
    descripcion: "Incrementa peso directamente (+1.25kg a +5kg) manteniendo repeticiones constantes.",
    recomendadoPara: "Fuerza máxima en básicos (Sentadilla, Press Banca, Peso Muerto).",
    incrementoDefectoKg: 2.5,
  },
  {
    id: "reps",
    nombre: "Volumen de Repeticiones (+Reps)",
    icono: "🔥",
    descripcion: "Mantén el peso y añade 1-2 repeticiones por serie hasta alcanzar la meta de resistencia/fatiga.",
    recomendadoPara: "Mancuernas con saltos de peso grandes o ejercicios con peso corporal.",
  },
  {
    id: "series",
    nombre: "Volumen por Series (+Sets)",
    icono: "🔁",
    descripcion: "Añade 1 serie efectiva adicional de trabajo manteniendo peso y repeticiones.",
    recomendadoPara: "Fases de acumulación de volumen para grupos musculares rezagados.",
  },
  {
    id: "densidad",
    nombre: "Densidad de Descanso (-Tiempo)",
    icono: "⏱️",
    descripcion: "Reduce 10-15s el tiempo de descanso manteniendo el mismo peso y repeticiones para aumentar el estrés metabólico.",
    recomendadoPara: "Acondicionamiento, hipertrofia sarcoplásmica, deloads o atletas con dolor articular.",
    reduccionSegDefecto: 15,
    descansoMinSeg: 45,
  },
  {
    id: "tempo",
    nombre: "Tempo / Tiempo Bajo Tensión (TUT)",
    icono: "⏳",
    descripcion: "Aumenta la fase excéntrica (bajada lenta de 3-4s) o añade pausas isométricas de 1s para maximizar tensión mecánica.",
    recomendadoPara: "Control neuromuscular, técnica estricta y reclutamiento de fibras profundas.",
  },
];

export const METODOS_CARDIO = [
  {
    id: "duracion",
    nombre: "Volumen por Duración (+Tiempo)",
    icono: "⏱️",
    descripcion: "Incrementa minutos semanales según el objetivo fisiológico y el IMC del atleta.",
    incrementoMinutosDefecto: 5,
  },
  {
    id: "inclinacion",
    nombre: "Intensidad / Inclinación (+Nivel)",
    icono: "⛰️",
    descripcion: "Aumenta la inclinación de la caminadora o resistencia de la bici sin desgastar glucógeno excesivo.",
    incrementoNivelDefecto: 1.5,
  },
  {
    id: "hiit_intervalos",
    nombre: "Intervalos HIIT (+Sprints)",
    icono: "🚀",
    descripcion: "Aumenta la cantidad de sprints o reduce el intervalo de recuperación pasiva.",
    incrementoIntervalosDefecto: 2,
  },
  {
    id: "zona_cardio",
    nombre: "Zona Cardíaca / Ritmo",
    icono: "💓",
    descripcion: "Mantiene la sesión en Zona 2 (60-70% FCM) para optimizar salud mitocondrial y transporte de nutrientes.",
  },
];

/**
 * Tabla Científica de Prescripción de Cardio Post-Fuerza según Categoría de IMC
 */
export const PROTOCOLOS_CARDIO_IMC = [
  {
    id: "infrapeso_severo",
    categoria: "Infrapeso Severo",
    rangoIMC: "< 17.0",
    minIMC: 0,
    maxIMC: 16.99,
    volumenSemanalMin: 0,
    duracionSesionMin: 0,
    frecuenciaSugerida: "N/A (Pausado)",
    frecuenciaDias: 0,
    intensidad: "N/A (Solo activación / movilidad articular)",
    color: "rose",
    icono: "🛑",
    descripcion: "Cardio pausado para preservar reservas calóricas y evitar degradación de masa muscular o tejido óseo.",
  },
  {
    id: "infrapeso_leve",
    categoria: "Infrapeso Leve",
    rangoIMC: "17.0 - 18.4",
    minIMC: 17.0,
    maxIMC: 18.49,
    volumenSemanalMin: 20,
    duracionSesionMin: 10,
    frecuenciaSugerida: "10 min x 2 días",
    frecuenciaDias: 2,
    intensidad: "Caminata digestiva muy suave",
    color: "amber",
    icono: "🚶",
    descripcion: "Cardio suave para promover vaciamiento gástrico y sensibilidad a la insulina sin elevar el gasto calórico.",
  },
  {
    id: "ectomorfo_limite",
    categoria: "Límite / Ectomorfo",
    rangoIMC: "18.5 - 20.0",
    minIMC: 18.5,
    maxIMC: 20.0,
    volumenSemanalMin: 45,
    duracionSesionMin: 15,
    frecuenciaSugerida: "15 min x 3 días",
    frecuenciaDias: 3,
    intensidad: "LISS / Zona 1-2",
    color: "emerald",
    icono: "⚡",
    descripcion: "Volumen moderado de 15 min para salud mitocondrial y oxigenación sin interferencia anabólica en hipertrofia.",
  },
  {
    id: "normopeso",
    categoria: "Normopeso",
    rangoIMC: "20.1 - 24.9",
    minIMC: 20.1,
    maxIMC: 24.99,
    volumenSemanalMin: 75,
    duracionSesionMin: 25,
    frecuenciaSugerida: "20-30 min x 3 días",
    frecuenciaDias: 3,
    intensidad: "LISS / Zona 2",
    color: "indigo",
    icono: "🏃",
    descripcion: "Volumen óptimo de 20 a 30 min para equilibrio entre capacidad aeróbica y preservación de masa magra.",
  },
  {
    id: "sobrepeso",
    categoria: "Sobrepeso (Opcional)",
    rangoIMC: "≥ 25.0",
    minIMC: 25.0,
    maxIMC: 99.0,
    volumenSemanalMin: 105,
    duracionSesionMin: 30,
    frecuenciaSugerida: "30 min x 3-4 días",
    frecuenciaDias: 3.5,
    intensidad: "LISS / Zona 2 alta",
    color: "sky",
    icono: "🔥",
    descripcion: "Volumen elevado de 30 min por sesión para maximizar la oxidación de grasas y acelerar el déficit calórico.",
  },
];

/**
 * Calcula el IMC (Índice de Masa Corporal)
 */
export function calcularIMC(pesoKg, alturaCm) {
  const p = Number(pesoKg);
  const a = Number(alturaCm);
  if (!p || !a || a <= 0) return null;
  const alturaM = a / 100;
  return Math.round((p / (alturaM * alturaM)) * 10) / 10;
}

/**
 * Obtiene el protocolo exacto de cardio según el IMC
 */
export function obtenerProtocoloCardioPorIMC(imc, tieneMasaMuscularAlta = false) {
  const val = Number(imc);
  if (!val || val <= 0) return PROTOCOLOS_CARDIO_IMC[2];

  let encontrado = PROTOCOLOS_CARDIO_IMC.find((p) => val >= p.minIMC && val <= p.maxIMC);
  if (!encontrado) {
    encontrado = val >= 25 ? PROTOCOLOS_CARDIO_IMC[4] : PROTOCOLOS_CARDIO_IMC[3];
  }

  if (encontrado.id === "sobrepeso" && Boolean(tieneMasaMuscularAlta)) {
    const baseNormopeso = PROTOCOLOS_CARDIO_IMC[3];
    return {
      ...baseNormopeso,
      ajusteMasaMuscular: true,
      categoria: "Normopeso (Ajuste Masa Muscular Alta)",
      descripcion: "Ajuste Atleta Avanzado: IMC ≥ 25 reclasificado como Normopeso por alta densidad muscular para no interferir con la hipertrofia.",
    };
  }

  return encontrado;
}

export const SEMANAS_MESOCICLO = [
  {
    semana: 1,
    nombre: "Semana 1: Adaptación & Carga Base",
    fase: "base",
    rirObjetivo: "RIR 3",
    color: "emerald",
    descripcion: "Calibración de pesos iniciales (100% carga base), perfeccionamiento de técnica y preparación articular.",
    factorCarga: 1.0,
    factorVolumen: 1.0,
    deltaKg: 0,
    deltaReps: 0,
  },
  {
    semana: 2,
    nombre: "Semana 2: Acumulación & Sobrecarga",
    fase: "acumulacion",
    rirObjetivo: "RIR 2",
    color: "indigo",
    descripcion: "Primera sobrecarga progresiva: +2.5kg sobre base o +1 repetición.",
    factorCarga: 1.025,
    factorVolumen: 1.0,
    deltaKg: 2.5,
    deltaReps: 1,
  },
  {
    semana: 3,
    nombre: "Semana 3: Pico de Intensidad",
    fase: "pico",
    rirObjetivo: "RIR 1-0",
    color: "rose",
    descripcion: "Máximo estímulo neuromuscular (+5kg sobre base y +1 serie) antes de la descarga.",
    factorCarga: 1.05,
    factorVolumen: 1.25,
    deltaKg: 5.0,
    deltaReps: 2,
  },
  {
    semana: 4,
    nombre: "Semana 4: Descarga / Deload",
    fase: "deload",
    rirObjetivo: "RIR 4-5",
    color: "sky",
    descripcion: "Reducción estratégica del volumen (-40% series) y carga ligera (-10% peso) para disipar fatiga del SNC.",
    factorCarga: 0.9,
    factorVolumen: 0.6,
    deltaKg: -2.5,
    deltaReps: -2,
  },
];

/**
 * Calcula el 1RM estimado (Fórmula de Epley)
 */
export function calcular1RMEstimado(pesoKg, reps) {
  const p = Number(pesoKg) || 0;
  const r = Number(reps) || 0;
  if (p <= 0 || r <= 0) return 0;
  if (r === 1) return p;
  return Math.round(p * (1 + r / 30) * 10) / 10;
}

/**
 * Calcula el Tonnage (Volumen total de carga)
 */
export function calcularTonnage(series = []) {
  if (!Array.isArray(series)) return 0;
  return series.reduce((acc, s) => {
    const p = Number(s.peso_kg || s.peso || 0);
    const r = Number(s.reps || s.repeticiones || 0);
    return acc + p * r;
  }, 0);
}

/**
 * Sobrecarga Progresiva para Ejercicios de Cardio
 */
export function calcularSobrecargaCardio({
  ejercicio,
  duracionMin = null,
  nivelInclinacion = 0,
  modalidad = null,
  semana = 1,
  metodoCardio = "duracion",
  objetivo = "hipertrofia",
  pesoKg = null,
  alturaCm = null,
  imc = null,
  tieneMasaMuscularAlta = false,
  esAvanzado = false,
}) {
  const masaAlta = Boolean(
    tieneMasaMuscularAlta ||
    esAvanzado ||
    ejercicio?.tiene_masa_muscular_alta ||
    ejercicio?.es_avanzado
  );

  const imcCalculado = imc || calcularIMC(pesoKg, alturaCm);
  const protocoloIMC = obtenerProtocoloCardioPorIMC(imcCalculado, masaAlta);

  const duracionBase = Number(
    duracionMin != null ? duracionMin : ejercicio.duracion_min || protocoloIMC.duracionSesionMin
  );
  const nivelBase = Number(nivelInclinacion || ejercicio.inclinacion_pct || ejercicio.nivel_resistencia || 0);

  let proximaDuracion = duracionBase;
  let proximoNivel = nivelBase;
  let mensaje = "";

  if (protocoloIMC.id === "infrapeso_severo") {
    proximaDuracion = 0;
    mensaje = `🛑 Infrapeso Severo (IMC < 17.0): Cardio pausado para evitar catabolismo muscular y priorizar balance calórico positivo.`;
  } else if (protocoloIMC.id === "infrapeso_leve") {
    if (semana === 1) proximaDuracion = 10;
    else if (semana === 2) proximaDuracion = 10;
    else if (semana === 3) proximaDuracion = 12;
    else proximaDuracion = 10;
    mensaje = `🚶 Infrapeso Leve (IMC ${imcCalculado || "17-18.4"}): Mantener ${proximaDuracion} min (2 días/sem) en caminata digestiva suave.`;
  } else if (protocoloIMC.id === "ectomorfo_limite") {
    if (semana === 1) proximaDuracion = 15;
    else if (semana === 2) proximaDuracion = 15;
    else if (semana === 3) proximaDuracion = 18;
    else proximaDuracion = 12;
    mensaje = `⚡ Ectomorfo / Límite (IMC ${imcCalculado || "18.5-20"}): ${proximaDuracion} min (3 días/sem) LISS Zona 1-2 (sin interferencia en hipertrofia).`;
  } else if (protocoloIMC.id === "normopeso") {
    if (semana === 1) proximaDuracion = 20;
    else if (semana === 2) proximaDuracion = 25;
    else if (semana === 3) proximaDuracion = 30;
    else proximaDuracion = 15;

    if (protocoloIMC.ajusteMasaMuscular) {
      mensaje = `💪 Atleta Muscular (IMC ${imcCalculado}): Ajustado a Normopeso — ${proximaDuracion} min (3 días/sem) LISS Zona 2 para hipertrofia.`;
    } else {
      mensaje = `🏃 Normopeso (IMC ${imcCalculado || "20.1-24.9"}): ${proximaDuracion} min (3 días/sem) LISS Zona 2 para equilibrio metabólico.`;
    }
  } else {
    if (semana === 1) proximaDuracion = 30;
    else if (semana === 2) proximaDuracion = 35;
    else if (semana === 3) proximaDuracion = 40;
    else proximaDuracion = 20;
    mensaje = `🔥 Sobrepeso (IMC ${imcCalculado || "> 25"}): ${proximaDuracion} min (3-4 días/sem) LISS Zona 2 alta para acelerar gasto calórico.`;
  }

  return {
    duracionProximaMin: proximaDuracion,
    nivelProximo: proximoNivel,
    modalidad: modalidad || protocoloIMC.intensidad,
    mensaje,
    protocoloIMC,
    imc: imcCalculado,
    tieneMasaMuscularAlta: masaAlta,
    tipoCambio: `cardio_${metodoCardio}`,
  };
}

/**
 * Motor Principal de Sobrecarga para Fuerza y Cardio
 */
export function calcularSiguienteSobrecarga({
  ejercicio,
  seriesCompletadas = [],
  metodo = "doble_progresion",
  habilitada = true,
  config = {},
  semana = 1,
  objetivo = "hipertrofia",
  pesoKg = null,
  alturaCm = null,
  imc = null,
  tieneMasaMuscularAlta = false,
  esAvanzado = false,
}) {
  const isCardio =
    ejercicio.es_cardio ||
    (ejercicio.tipo_ejercicio || "").toLowerCase() === "cardio" ||
    (ejercicio.grupo_muscular || "").toLowerCase() === "cardio";

  if (isCardio) {
    return calcularSobrecargaCardio({
      ejercicio,
      duracionMin: config.duracion_min || ejercicio.duracion_min,
      nivelInclinacion: config.nivel || ejercicio.inclinacion_pct,
      modalidad: ejercicio.modalidad_cardio,
      semana,
      metodoCardio: config.metodo_cardio || "duracion",
      objetivo,
      pesoKg,
      alturaCm,
      imc,
      tieneMasaMuscularAlta,
      esAvanzado,
    });
  }

  if (!habilitada || !seriesCompletadas || seriesCompletadas.length === 0) {
    return {
      aplicada: false,
      mensaje: "Sobrecarga desactivada. Se mantienen las metas actuales.",
      proximoPesoKg: ejercicio.peso_sugerido_kg || null,
      proximasReps: ejercicio.repeticiones || 10,
      proximasSeries: ejercicio.series || seriesCompletadas.length || 3,
      proximoDescansoSeg: ejercicio.descanso_seg || 90,
      proximoTempo: ejercicio.tempo || "2-0-1-0",
      tipoCambio: "ninguno",
    };
  }

  const pesoActual = Number(seriesCompletadas[0]?.peso_kg || ejercicio.peso_sugerido_kg || 0);
  const numSeriesActual = seriesCompletadas.length || Number(ejercicio.series) || 3;
  const repsMin = Number(config.reps_min || 8);
  const repsMax = Number(config.reps_max || 12);
  const incrementoKg = Number(config.incremento_kg || 2.5);
  const reduccionDescansoSeg = Number(config.reduccion_descanso_seg || 15);
  const descansoActual = Number(ejercicio.descanso_seg || 90);
  const descansoMinSeg = 45;

  const repsRealizadas = seriesCompletadas.map((s) => Number(s.reps || 0));
  const minRepsLogradas = Math.min(...repsRealizadas);
  const promedioReps = repsRealizadas.reduce((a, b) => a + b, 0) / (repsRealizadas.length || 1);

  switch (metodo) {
    case "doble_progresion": {
      const todasCompletaronMax = minRepsLogradas >= repsMax;
      if (todasCompletaronMax) {
        const nuevoPeso = Math.round((pesoActual + incrementoKg) * 10) / 10;
        return {
          aplicada: true,
          mensaje: `¡Objetivo cumplido (${minRepsLogradas} reps)! Subir peso a ${nuevoPeso} kg (+${incrementoKg}kg) y reiniciar en ${repsMin} reps.`,
          proximoPesoKg: nuevoPeso,
          proximasReps: repsMin,
          proximasSeries: numSeriesActual,
          proximoDescansoSeg: descansoActual,
          proximoTempo: ejercicio.tempo || "2-0-1-0",
          tipoCambio: "subir_peso_doble_prog",
        };
      } else {
        const siguienteMetaReps = Math.min(repsMax, Math.round(promedioReps + 1));
        return {
          aplicada: true,
          mensaje: `Mantener ${pesoActual} kg y buscar ${siguienteMetaReps} reps en todas las series (rango ${repsMin}-${repsMax}).`,
          proximoPesoKg: pesoActual,
          proximasReps: siguienteMetaReps,
          proximasSeries: numSeriesActual,
          proximoDescansoSeg: descansoActual,
          proximoTempo: ejercicio.tempo || "2-0-1-0",
          tipoCambio: "subir_reps_doble_prog",
        };
      }
    }

    case "peso": {
      const nuevoPeso = Math.round((pesoActual + incrementoKg) * 10) / 10;
      return {
        aplicada: true,
        mensaje: `Sobrecarga lineal: Incrementar carga a ${nuevoPeso} kg (+${incrementoKg} kg).`,
        proximoPesoKg: nuevoPeso,
        proximasReps: typeof ejercicio.repeticiones === "number" ? ejercicio.repeticiones : 10,
        proximasSeries: numSeriesActual,
        proximoDescansoSeg: descansoActual,
        proximoTempo: ejercicio.tempo || "2-0-1-0",
        tipoCambio: "subir_peso_lineal",
      };
    }

    case "reps": {
      const nuevaMetaReps = Math.round(promedioReps + 2);
      return {
        aplicada: true,
        mensaje: `Sobrecarga de volumen: Mantener ${pesoActual} kg y buscar ${nuevaMetaReps} reps.`,
        proximoPesoKg: pesoActual,
        proximasReps: nuevaMetaReps,
        proximasSeries: numSeriesActual,
        proximoDescansoSeg: descansoActual,
        proximoTempo: ejercicio.tempo || "2-0-1-0",
        tipoCambio: "subir_reps",
      };
    }

    case "series": {
      const nuevasSeries = numSeriesActual + 1;
      return {
        aplicada: true,
        mensaje: `Acumulación de volumen: Añadir 1 serie efectiva (${nuevasSeries} series en total).`,
        proximoPesoKg: pesoActual,
        proximasReps: typeof ejercicio.repeticiones === "number" ? ejercicio.repeticiones : 10,
        proximasSeries: nuevasSeries,
        proximoDescansoSeg: descansoActual,
        proximoTempo: ejercicio.tempo || "2-0-1-0",
        tipoCambio: "subir_series",
      };
    }

    case "densidad": {
      const nuevoDescanso = Math.max(descansoMinSeg, descansoActual - reduccionDescansoSeg);
      return {
        aplicada: true,
        mensaje: `Densidad metabólica: Reducir descanso de ${descansoActual}s a ${nuevoDescanso}s (-${reduccionDescansoSeg}s).`,
        proximoPesoKg: pesoActual,
        proximasReps: typeof ejercicio.repeticiones === "number" ? ejercicio.repeticiones : 10,
        proximasSeries: numSeriesActual,
        proximoDescansoSeg: nuevoDescanso,
        proximoTempo: ejercicio.tempo || "2-0-1-0",
        tipoCambio: "reducir_descanso",
      };
    }

    case "tempo": {
      return {
        aplicada: true,
        mensaje: "Tensión mecánica: Aumentar control excéntrico a 3s bajada + 1s pausa isométrica (Tempo 3-1-1-0).",
        proximoPesoKg: pesoActual,
        proximasReps: typeof ejercicio.repeticiones === "number" ? ejercicio.repeticiones : 10,
        proximasSeries: numSeriesActual,
        proximoDescansoSeg: descansoActual,
        proximoTempo: "3-1-1-0",
        tipoCambio: "aumentar_tempo",
      };
    }

    default:
      return {
        aplicada: false,
        mensaje: "Mantener metas actuales.",
        proximoPesoKg: pesoActual,
        proximasReps: ejercicio.repeticiones || 10,
        proximasSeries: numSeriesActual,
        proximoDescansoSeg: descansoActual,
        proximoTempo: ejercicio.tempo || "2-0-1-0",
        tipoCambio: "ninguno",
      };
  }
}

/**
 * Inicializa el estado completo de las 4 semanas del mesociclo
 */
export function inicializarEstadoMesociclo({ dia, rutina, protocoloIMC }) {
  if (!dia || !dia.ejercicios) return { 1: {}, 2: {}, 3: {}, 4: {} };

  const estado = { 1: {}, 2: {}, 3: {}, 4: {} };

  dia.ejercicios.forEach((ej, ejIdx) => {
    const key = ej.ejercicio_id || ej.nombre || `ej_${ejIdx}`;
    const isCardio =
      ej.es_cardio ||
      (ej.tipo_ejercicio || "").toLowerCase() === "cardio" ||
      (ej.grupo_muscular || "").toLowerCase() === "cardio";

    if (isCardio) {
      const durBase = ej.duracion_min != null ? Number(ej.duracion_min) : (protocoloIMC?.duracionSesionMin ?? 15);
      estado[1][key] = {
        es_cardio: true,
        duracion_min: durBase,
        nivel: Number(ej.nivel_resistencia || ej.inclinacion_pct || 0),
        modalidad: ej.modalidad_cardio || protocoloIMC?.intensidad || "LISS",
        completada: false,
        metodo_cardio: ej.metodo_cardio || "duracion",
      };
      estado[2][key] = { ...estado[1][key], duracion_min: durBase > 0 ? durBase + 5 : 15 };
      estado[3][key] = { ...estado[1][key], duracion_min: durBase > 0 ? durBase + 10 : 20 };
      estado[4][key] = { ...estado[1][key], duracion_min: Math.max(10, durBase - 5) };
    } else {
      const numSeries = Number(ej.series) || (Array.isArray(ej.repeticiones) ? ej.repeticiones.length : 4);
      const pesoBase = Number(ej.peso_sugerido_kg || ej.ultimo_registro?.series?.[0]?.peso_kg || 0);

      let repVal = 10;
      if (Array.isArray(ej.repeticiones) && ej.repeticiones[0]) {
        repVal = Number(ej.repeticiones[0]);
      } else if (typeof ej.repeticiones === "number") {
        repVal = ej.repeticiones;
      } else if (typeof ej.repeticiones === "string" && ej.repeticiones.includes("-")) {
        repVal = Number(ej.repeticiones.split("-")[1]) || 10;
      }

      // Semana 1 Base
      const s1Series = [];
      for (let s = 0; s < numSeries; s++) {
        s1Series.push({ set: s + 1, peso_kg: pesoBase, reps: repVal, completada: false, rpe: 8 });
      }
      estado[1][key] = {
        es_cardio: false,
        series: s1Series,
        metodo: ej.sobrecarga?.metodo || "doble_progresion",
        habilitada: ej.sobrecarga?.habilitada ?? true,
        incremento_kg: ej.sobrecarga?.incremento_kg || 2.5,
        reps_min: ej.sobrecarga?.reps_min || 8,
        reps_max: ej.sobrecarga?.reps_max || 12,
      };

      // Semana 2: +2.5kg
      const pesoS2 = pesoBase > 0 ? Math.round((pesoBase + 2.5) * 10) / 10 : 2.5;
      const s2Series = s1Series.map((s) => ({ ...s, peso_kg: pesoS2 }));
      estado[2][key] = { ...estado[1][key], series: s2Series };

      // Semana 3: +5kg y +1 serie
      const pesoS3 = pesoBase > 0 ? Math.round((pesoBase + 5.0) * 10) / 10 : 5.0;
      const s3Series = s1Series.map((s) => ({ ...s, peso_kg: pesoS3 }));
      s3Series.push({ set: s3Series.length + 1, peso_kg: pesoS3, reps: repVal, completada: false, rpe: 9 });
      estado[3][key] = { ...estado[1][key], series: s3Series };

      // Semana 4 Deload: -10% peso y 2 series
      const pesoS4 = pesoBase > 0 ? Math.round(pesoBase * 0.9 * 2) / 2 : 0;
      const s4Series = [
        { set: 1, peso_kg: pesoS4, reps: Math.max(6, repVal - 2), completada: false, rpe: 6 },
        { set: 2, peso_kg: pesoS4, reps: Math.max(6, repVal - 2), completada: false, rpe: 6 },
      ];
      estado[4][key] = { ...estado[1][key], series: s4Series };
    }
  });

  return estado;
}

/**
 * Propaga en Cascada inteligente los cambios de peso, reps logradas o completadas
 * de la Semana K a las semanas posteriores (> K), respetando las series individuales
 * y aplicando la lógica científica según el método (Doble Progresión, Carga Lineal, Reps, etc.).
 */
export function propagarCascadaMesociclo({
  semanaModificada,
  semanasState,
  ejKey,
}) {
  const semMod = Number(semanaModificada);
  const nuevoEstado = JSON.parse(JSON.stringify(semanasState || {}));

  if (!nuevoEstado[semMod] || !nuevoEstado[semMod][ejKey]) return nuevoEstado;

  const ejStateMod = nuevoEstado[semMod][ejKey];

  // Caso Cardio
  if (ejStateMod.es_cardio) {
    const durMod = Number(ejStateMod.duracion_min) || 0;
    for (let s = semMod + 1; s <= 4; s++) {
      if (nuevoEstado[s] && nuevoEstado[s][ejKey]) {
        let dur = durMod;
        if (s === 2) dur = durMod > 0 ? durMod + 5 : 15;
        else if (s === 3) dur = durMod > 0 ? durMod + 10 : 20;
        else dur = Math.max(10, durMod - 5);
        nuevoEstado[s][ejKey].duracion_min = dur;
      }
    }
    return nuevoEstado;
  }

  // Caso Fuerza: Analizar método y series semana por semana
  for (let s = semMod + 1; s <= 4; s++) {
    const ejPrevio = nuevoEstado[s - 1]?.[ejKey];
    const currEj = nuevoEstado[s]?.[ejKey];
    if (!ejPrevio || !currEj || ejPrevio.es_cardio) continue;

    const seriesPrev = ejPrevio.series || [];
    const seriesCompletadas = seriesPrev.filter((set) => set.completada);
    const repsMin = Number(currEj.reps_min || 8);
    const repsMax = Number(currEj.reps_max || 12);
    const incrementoKg = Number(currEj.incremento_kg || 2.5);
    const metodo = currEj.metodo || "doble_progresion";

    // Peso de trabajo de referencia del ejercicio en la semana previa (pico de volumen/fuerza)
    const pesoTrabajoRef = Math.max(...seriesPrev.map((st) => Number(st.peso_kg || 0)), 0);

    // SEMANA 4: DELOAD (Descarga estratégica del 10% y 2 series uniformes)
    if (s === 4) {
      const s3Series = nuevoEstado[3]?.[ejKey]?.series || seriesPrev;
      const pesoPico = Math.max(...s3Series.map((st) => Number(st.peso_kg || 0)), pesoTrabajoRef);
      const pesoDeload = pesoPico > 0 ? Math.round(pesoPico * 0.9 * 2) / 2 : 0;
      const repsDeload = Math.max(6, Number(s3Series[0]?.reps || 10) - 2);

      currEj.series = [
        { set: 1, peso_kg: pesoDeload, reps: repsDeload, completada: false, rpe: 6 },
        { set: 2, peso_kg: pesoDeload, reps: repsDeload, completada: false, rpe: 6 },
      ];
      continue;
    }

    // SEMANAS 2 y 3: Calcular peso UNIFORME para todo el ejercicio
    const todasCompletaronMax =
      seriesCompletadas.length > 0 &&
      seriesCompletadas.every((set) => Number(set.reps) >= repsMax);

    let pesoUniforme = pesoTrabajoRef;
    let repsMeta = repsMin;

    if (metodo === "doble_progresion") {
      if (seriesCompletadas.length > 0 && !todasCompletaronMax) {
        pesoUniforme = pesoTrabajoRef;
        const promReps = seriesCompletadas.reduce((a, b) => a + Number(b.reps || 0), 0) / seriesCompletadas.length;
        repsMeta = Math.min(repsMax, Math.round(promReps + 1));
      } else {
        pesoUniforme = pesoTrabajoRef > 0 ? Math.round((pesoTrabajoRef + incrementoKg) * 10) / 10 : incrementoKg;
        repsMeta = s === 2 ? 10 : 8;
      }
    } else if (metodo === "peso") {
      pesoUniforme = pesoTrabajoRef > 0 ? Math.round((pesoTrabajoRef + incrementoKg) * 10) / 10 : incrementoKg;
      repsMeta = Number(seriesPrev[0]?.reps || 10);
    } else if (metodo === "reps") {
      pesoUniforme = pesoTrabajoRef;
      repsMeta = Number(seriesPrev[0]?.reps || 10) + 2;
    } else {
      pesoUniforme = pesoTrabajoRef;
      repsMeta = Number(seriesPrev[0]?.reps || 10);
    }

    const numSets = seriesPrev.length || 3;
    const newSets = [];
    for (let idx = 0; idx < numSets; idx++) {
      newSets.push({
        set: idx + 1,
        peso_kg: pesoUniforme,
        reps: repsMeta,
        completada: false,
        rpe: s === 2 ? 8 : 9,
      });
    }

    if (metodo === "series" && s === 3) {
      newSets.push({
        set: newSets.length + 1,
        peso_kg: pesoUniforme,
        reps: repsMeta,
        completada: false,
        rpe: 9,
      });
    }

    currEj.series = newSets;
  }

  return nuevoEstado;
}

/**
 * Proyecta la estructura completa de la rutina para las 4 semanas leyendo semanasState
 */
export function proyectarMesociclo4Semanas({
  rutina,
  semanaSeleccionada = 1,
  pesoKg = null,
  alturaCm = null,
  imc = null,
  tieneMasaMuscularAlta = false,
  esAvanzado = false,
  semanasState = null,
}) {
  if (!rutina) return null;

  const numSemana = Number(semanaSeleccionada) || 1;
  const infoSemana = SEMANAS_MESOCICLO.find((s) => s.semana === numSemana) || SEMANAS_MESOCICLO[0];
  const objetivo = rutina.objetivo || "Hipertrofia";
  const masaAlta = Boolean(
    tieneMasaMuscularAlta ||
    esAvanzado ||
    rutina.tiene_masa_muscular_alta ||
    rutina.es_avanzado
  );
  const imcCalculado = imc || calcularIMC(pesoKg, alturaCm);
  const protocoloIMC = obtenerProtocoloCardioPorIMC(imcCalculado, masaAlta);

  const diasBase = Array.isArray(rutina.estructura_json)
    ? rutina.estructura_json
    : rutina.estructura_json?.dias || [];

  const semanaActualState = semanasState?.[numSemana] || {};

  const diasProyectados = diasBase.map((dia, dIdx) => {
    const ejerciciosProyectados = (dia.ejercicios || []).map((ej, eIdx) => {
      const ejKey = ej.ejercicio_id || ej.nombre || `ej_${eIdx}`;
      const isCardio =
        ej.es_cardio ||
        (ej.tipo_ejercicio || "").toLowerCase() === "cardio" ||
        (ej.grupo_muscular || "").toLowerCase() === "cardio";

      const ejLive = semanaActualState[ejKey] || {};

      if (isCardio) {
        const duracion = Number(
          ejLive.duracion_min != null
            ? ejLive.duracion_min
            : ej.duracion_min || protocoloIMC.duracionSesionMin
        );

        return {
          ...ej,
          duracion_proyectada: duracion,
          modalidad_proyectada: ejLive.modalidad || protocoloIMC.intensidad,
          rir_proyectado: infoSemana.rirObjetivo,
          fase_mesociclo: infoSemana.nombre,
          protocolo_imc: protocoloIMC,
          imc: imcCalculado,
          tiene_masa_muscular_alta: masaAlta,
        };
      }

      // Fuerza
      const seriesArr = ejLive.series || [];
      const pesoProyectado = Number(seriesArr[0]?.peso_kg != null ? seriesArr[0].peso_kg : (ej.peso_sugerido_kg || 0));
      const repsProyectadas = Number(seriesArr[0]?.reps != null ? seriesArr[0].reps : (ej.repeticiones || 10));
      const seriesProyectadas = Number(seriesArr.length || ej.series || 3);

      let cambioMensaje = "";
      if (numSemana === 1) cambioMensaje = "Calibración base de cargas (100%).";
      else if (numSemana === 2) cambioMensaje = `Sobrecarga: ${pesoProyectado} kg (${repsProyectadas} reps @ RIR 2).`;
      else if (numSemana === 3) cambioMensaje = `Pico de carga: ${pesoProyectado} kg (${seriesProyectadas} sets @ RIR 1-0).`;
      else cambioMensaje = `Deload: ${pesoProyectado} kg (${seriesProyectadas} sets @ RIR 4-5) para recuperar SNC.`;

      return {
        ...ej,
        peso_proyectado: pesoProyectado,
        series_proyectadas: seriesProyectadas,
        repeticiones_proyectadas: repsProyectadas,
        rir_proyectado: infoSemana.rirObjetivo,
        fase_mesociclo: infoSemana.nombre,
        cambio_mensaje: cambioMensaje,
      };
    });

    return {
      ...dia,
      ejercicios: ejerciciosProyectados,
    };
  });

  return {
    semana: infoSemana.semana,
    infoSemana,
    objetivo,
    protocoloIMC,
    imc: imcCalculado,
    tieneMasaMuscularAlta: masaAlta,
    dias: diasProyectados,
  };
}
