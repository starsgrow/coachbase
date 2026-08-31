"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dumbbell,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Check,
  Clock,
  Flame,
  Award,
  Zap,
  Save,
  Loader2,
  Users,
  ChevronRight,
  Plus,
  Trash2,
  Info,
  Calendar,
  Layers,
  HeartPulse,
  Activity,
  ArrowUpRight,
  Sliders,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  METODOS_SOBRECARGA,
  METODOS_CARDIO,
  SEMANAS_MESOCICLO,
  PROTOCOLOS_CARDIO_IMC,
  calcularIMC,
  obtenerProtocoloCardioPorIMC,
  calcular1RMEstimado,
  calcularTonnage,
  calcularSiguienteSobrecarga,
  calcularSobrecargaCardio,
  proyectarMesociclo4Semanas,
  inicializarEstadoMesociclo,
  propagarCascadaMesociclo,
} from "@/lib/sobrecargaEngine";
import GraficaProgresion from "@/components/GraficaProgresion";
import ModalDetalleEjercicio from "@/components/ModalDetalleEjercicio";

export default function ModoEntrenadorView({
  clientes = [],
  rutinas = [],
  coachId,
  coachNombre = "Coach Olympo",
  coachTenant = "",
  colorPrimario = "#6366F1",
}) {
  // 1. Estados de Selección
  const [selectedClienteId, setSelectedClienteId] = useState(clientes[0]?.id || "");
  const clienteActual = clientes.find((c) => c.id === selectedClienteId) || null;

  // Rutinas asignadas a este alumno
  const rutinasDelCliente = useMemo(() => {
    if (!selectedClienteId) return [];
    return rutinas.filter((r) => r.cliente_id === selectedClienteId);
  }, [rutinas, selectedClienteId]);

  const [selectedRutinaId, setSelectedRutinaId] = useState(rutinasDelCliente[0]?.id || "");

  useEffect(() => {
    if (rutinasDelCliente.length > 0) {
      setSelectedRutinaId(rutinasDelCliente[0].id);
    } else {
      setSelectedRutinaId("");
    }
  }, [selectedClienteId, rutinasDelCliente]);

  const rutinaActual =
    rutinasDelCliente.find((r) => r.id === selectedRutinaId) ||
    rutinasDelCliente[0] ||
    null;

  const [selectedDiaIdx, setSelectedDiaIdx] = useState(0);
  const [activeViewTab, setActiveViewTab] = useState("sesion"); // 'sesion' | 'mesociclo' | 'graficas'
  const [semanaActiva, setSemanaActiva] = useState(1); // 1 | 2 | 3 | 4

  // 2. Configuración Global de Sobrecarga
  const [sobrecargaHabilitada, setSobrecargaHabilitada] = useState(true);
  const [metodoSobrecargaGlobal, setMetodoSobrecargaGlobal] = useState("doble_progresion");
  const [mostrarExplicacionMetodo, setMostrarExplicacionMetodo] = useState(false);

  // 3. Estado Completo del Mesociclo en Vivo (Semanas 1, 2, 3 y 4)
  // mesocicloState: { [semana]: { [ejercicioKey]: { series: [{ peso_kg, reps, completada, rpe }], duracion_min, nivel, metodo, habilitada } } }
  const [mesocicloState, setMesocicloState] = useState({ 1: {}, 2: {}, 3: {}, 4: {} });
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionElapsedTime, setSessionElapsedTime] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [guardandoSesion, setGuardandoSesion] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  // Estado activo de la sesión según la semana seleccionada
  const workoutState = useMemo(() => {
    return mesocicloState[semanaActiva] || {};
  }, [mesocicloState, semanaActiva]);

  // 4. Temporizador de Descanso
  const [restTimerSeconds, setRestTimerSeconds] = useState(90);
  const [restTimerTotal, setRestTimerTotal] = useState(90);
  const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);

  // Modal de Video de Ejercicio
  const [ejercicioVideoModal, setEjercicioVideoModal] = useState(null);

  // Estructura de días de la rutina actual
  const diasRutina = useMemo(() => {
    if (!rutinaActual) return [];
    if (Array.isArray(rutinaActual.estructura_json)) {
      return rutinaActual.estructura_json;
    }
    return rutinaActual.estructura_json?.dias || [];
  }, [rutinaActual]);

  const diaActual = diasRutina[selectedDiaIdx] || diasRutina[0] || null;

  // Detección de Atleta Avanzado / Alta Masa Muscular
  const tieneMasaMuscularAlta = useMemo(() => {
    return Boolean(
      clienteActual?.tiene_masa_muscular_alta ||
      clienteActual?.es_avanzado ||
      clienteActual?.nivel === "Avanzado" ||
      clienteActual?.notas_privadas?.includes("masa_alta")
    );
  }, [clienteActual]);

  // Cálculo de IMC del Cliente Actual
  const imcActual = useMemo(() => {
    return calcularIMC(clienteActual?.peso_kg, clienteActual?.altura_cm);
  }, [clienteActual]);

  const protocoloIMCActual = useMemo(() => {
    return obtenerProtocoloCardioPorIMC(imcActual, tieneMasaMuscularAlta);
  }, [imcActual, tieneMasaMuscularAlta]);

  // Proyección de la rutina para las 4 semanas del mesociclo (conectada a mesocicloState en tiempo real)
  const proyeccionMesociclo = useMemo(() => {
    if (!rutinaActual) return null;
    return proyectarMesociclo4Semanas({
      rutina: rutinaActual,
      semanaSeleccionada: semanaActiva,
      pesoKg: clienteActual?.peso_kg,
      alturaCm: clienteActual?.altura_cm,
      imc: imcActual,
      tieneMasaMuscularAlta,
      semanasState: mesocicloState,
    });
  }, [rutinaActual, semanaActiva, clienteActual, imcActual, tieneMasaMuscularAlta, mesocicloState]);

  // Manejador para cambiar de semana (reactivo e instantáneo)
  const handleSelectSemana = (nuevaSemana) => {
    setSemanaActiva(nuevaSemana);
  };

  // Inicializar estado completo de las 4 semanas cuando cambia el día o la rutina
  useEffect(() => {
    if (!diaActual || !diaActual.ejercicios) return;

    const initialEstado = inicializarEstadoMesociclo({
      dia: diaActual,
      rutina: rutinaActual,
      protocoloIMC: protocoloIMCActual,
    });

    setMesocicloState(initialEstado);
    setSemanaActiva(1);
  }, [diaActual, rutinaActual, protocoloIMCActual]);

  // Cronómetro de Duración de Sesión
  useEffect(() => {
    let interval = null;
    if (isSessionActive) {
      interval = setInterval(() => {
        setSessionElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  // Cronómetro de Descanso
  useEffect(() => {
    let timer = null;
    if (isRestTimerRunning && restTimerSeconds > 0) {
      timer = setInterval(() => {
        setRestTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (restTimerSeconds === 0 && isRestTimerRunning) {
      setIsRestTimerRunning(false);
      try {
        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate([200, 100, 200]);
        }
      } catch (e) {}
    }
    return () => clearInterval(timer);
  }, [isRestTimerRunning, restTimerSeconds]);

  const handleStartRestTimer = (segundos = 90) => {
    setRestTimerSeconds(segundos);
    setRestTimerTotal(segundos);
    setIsRestTimerRunning(true);
  };

  // Manejador de Series de Fuerza con propagación inteligente
  const handleUpdateSet = (ejKey, setIdx, field, value) => {
    setMesocicloState((prev) => {
      const next = JSON.parse(JSON.stringify(prev || { 1: {}, 2: {}, 3: {}, 4: {} }));
      const currWeekMap = next[semanaActiva] || {};
      const ejState = currWeekMap[ejKey];
      if (!ejState || !Array.isArray(ejState.series) || !ejState.series[setIdx]) return prev;

      const valNum = field === "peso_kg" || field === "reps" ? (parseFloat(value) || 0) : value;

      // 1. Actualizar ÚNICAMENTE el set específico modificado (cada serie es 100% independiente)
      ejState.series[setIdx] = {
        ...ejState.series[setIdx],
        [field]: valNum,
      };

      // 2. Propagación en Cascada hacia semanas posteriores en tiempo real
      return propagarCascadaMesociclo({
        semanaModificada: semanaActiva,
        semanasState: next,
        ejKey,
      });
    });
  };

  const handleToggleSetComplete = (ejKey, setIdx, descansoSeg = 90) => {
    if (!isSessionActive) setIsSessionActive(true);

    setMesocicloState((prev) => {
      const next = JSON.parse(JSON.stringify(prev || { 1: {}, 2: {}, 3: {}, 4: {} }));
      const currWeekMap = next[semanaActiva] || {};
      const ejState = currWeekMap[ejKey];
      if (!ejState || !Array.isArray(ejState.series) || !ejState.series[setIdx]) return prev;

      const isNowCompleted = !ejState.series[setIdx].completada;
      ejState.series[setIdx].completada = isNowCompleted;

      if (isNowCompleted) {
        handleStartRestTimer(descansoSeg);
      }

      // Propagar en cascada: al marcar series completadas, evalúa si cumplió el rango de reps para subir peso o reps
      return propagarCascadaMesociclo({
        semanaModificada: semanaActiva,
        semanasState: next,
        ejKey,
      });
    });
  };

  // Manejadores para Cardio con propagación en cascada
  const handleUpdateCardio = (ejKey, field, value) => {
    setMesocicloState((prev) => {
      const next = JSON.parse(JSON.stringify(prev || { 1: {}, 2: {}, 3: {}, 4: {} }));
      const currWeekMap = next[semanaActiva] || {};
      const ejState = currWeekMap[ejKey];
      if (!ejState) return prev;

      ejState[field] = value;

      if (field === "duracion_min") {
        return propagarCascadaMesociclo({
          semanaModificada: semanaActiva,
          semanasState: next,
          ejKey,
          nuevoPeso: Number(value) || 0,
        });
      }

      return next;
    });
  };

  const handleToggleCardioComplete = (ejKey) => {
    if (!isSessionActive) setIsSessionActive(true);
    setMesocicloState((prev) => {
      const next = JSON.parse(JSON.stringify(prev || { 1: {}, 2: {}, 3: {}, 4: {} }));
      const currWeekMap = next[semanaActiva] || {};
      const ejState = currWeekMap[ejKey];
      if (!ejState) return prev;
      ejState.completada = !ejState.completada;
      return next;
    });
  };

  const handleAddSet = (ejKey) => {
    setMesocicloState((prev) => {
      const next = JSON.parse(JSON.stringify(prev || { 1: {}, 2: {}, 3: {}, 4: {} }));
      const currWeekMap = next[semanaActiva] || {};
      const ejState = currWeekMap[ejKey];
      if (!ejState || ejState.es_cardio) return prev;
      const lastSet = ejState.series[ejState.series.length - 1];
      const newSet = {
        set: ejState.series.length + 1,
        peso_kg: lastSet?.peso_kg || 0,
        reps: lastSet?.reps || 10,
        completada: false,
        rpe: 8,
      };
      ejState.series.push(newSet);
      return next;
    });
  };

  const handleDeleteSet = (ejKey, setIdx) => {
    setMesocicloState((prev) => {
      const next = JSON.parse(JSON.stringify(prev || { 1: {}, 2: {}, 3: {}, 4: {} }));
      const currWeekMap = next[semanaActiva] || {};
      const ejState = currWeekMap[ejKey];
      if (!ejState || ejState.series.length <= 1) return prev;
      ejState.series = ejState.series.filter((_, i) => i !== setIdx).map((s, idx) => ({ ...s, set: idx + 1 }));
      return next;
    });
  };

  // Cálculo en Vivo de Métricas de la Sesión
  const liveSessionMetrics = useMemo(() => {
    let totalTonnage = 0;
    let totalRepsCompleted = 0;
    let totalSetsCompleted = 0;
    let totalCardioMin = 0;

    Object.values(workoutState).forEach((ej) => {
      if (ej.es_cardio) {
        if (ej.completada) totalCardioMin += Number(ej.duracion_min || 0);
      } else {
        (ej.series || []).forEach((s) => {
          if (s.completada) {
            totalSetsCompleted += 1;
            totalRepsCompleted += Number(s.reps || 0);
            totalTonnage += Number(s.peso_kg || 0) * Number(s.reps || 0);
          }
        });
      }
    });

    return { totalTonnage, totalRepsCompleted, totalSetsCompleted, totalCardioMin };
  }, [workoutState]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Guardar Sesión de Entrenamiento en Supabase
  const handleGuardarSesion = async () => {
    if (!rutinaActual) return;
    setGuardandoSesion(true);
    setMensajeExito("");

    try {
      const ejerciciosLogs = (diaActual.ejercicios || []).map((ej, ejIdx) => {
        const key = ej.ejercicio_id || ej.nombre || `ej_${ejIdx}`;
        const ejState = workoutState[key] || {};

        if (ejState.es_cardio) {
          const sobrecargaCardio = calcularSobrecargaCardio({
            ejercicio: ej,
            duracionMin: ejState.duracion_min,
            nivelInclinacion: ejState.nivel,
            modalidad: ejState.modalidad,
            semana: semanaActiva,
            objetivo: rutinaActual?.objetivo || clienteActual?.objetivo || "Hipertrofia",
          });

          return {
            ejercicio_id: ej.ejercicio_id || ej.id || null,
            nombre: ej.nombre,
            grupo_muscular: "Cardio",
            es_cardio: true,
            duracion_min: ejState.duracion_min,
            nivel: ejState.nivel,
            modalidad: ejState.modalidad,
            sobrecarga_proxima: sobrecargaCardio,
            sobrecarga_aplicada: sobrecargaCardio.mensaje,
          };
        }

        const sobrecargaProxima = calcularSiguienteSobrecarga({
          ejercicio: ej,
          seriesCompletadas: ejState.series || [],
          metodo: ejState.metodo || metodoSobrecargaGlobal,
          habilitada: sobrecargaHabilitada && ejState.habilitada !== false,
          config: {
            incremento_kg: ejState.incremento_kg || 2.5,
            reps_min: ejState.reps_min || 8,
            reps_max: ejState.reps_max || 12,
          },
          semana: semanaActiva,
        });

        return {
          ejercicio_id: ej.ejercicio_id || ej.id || null,
          nombre: ej.nombre,
          grupo_muscular: ej.grupo_muscular || "General",
          es_cardio: false,
          series: ejState.series,
          tonnage: calcularTonnage(ejState.series),
          sobrecarga_proxima: sobrecargaProxima,
          sobrecarga_aplicada: sobrecargaProxima.mensaje,
        };
      });

      const sesionPayload = {
        fecha: new Date().toISOString().split("T")[0],
        timestamp: new Date().toISOString(),
        semana_mesociclo: semanaActiva,
        dia_nombre: diaActual.nombre_dia || `Día ${selectedDiaIdx + 1}`,
        duracion_segundos: sessionElapsedTime,
        tonnage_total: liveSessionMetrics.totalTonnage,
        reps_totales: liveSessionMetrics.totalRepsCompleted,
        series_totales: liveSessionMetrics.totalSetsCompleted,
        cardio_min_totales: liveSessionMetrics.totalCardioMin,
        ejercicios: ejerciciosLogs,
      };

      const res = await fetchWithAuth("/api/rutinas/guardar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: selectedClienteId,
          rutina_id: rutinaActual.id,
          dia_idx: selectedDiaIdx,
          sesion_log: sesionPayload,
          actualizar_rutina: true,
          coach_id: coachId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al guardar sesión");

      setMensajeExito("✨ ¡Sesión registrada y metas de sobrecarga actualizadas con éxito!");
      setIsSessionActive(false);
      setTimeout(() => setMensajeExito(""), 4000);
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar la sesión: " + err.message);
    } finally {
      setGuardandoSesion(false);
    }
  };

  const historialCompleto = useMemo(() => {
    if (!rutinaActual) return [];
    if (Array.isArray(rutinaActual.historial_sesiones)) {
      return rutinaActual.historial_sesiones;
    }
    if (Array.isArray(rutinaActual.estructura_json?.historial_sesiones)) {
      return rutinaActual.estructura_json.historial_sesiones;
    }
    return [];
  }, [rutinaActual]);

  const metodoActualInfo = METODOS_SOBRECARGA.find((m) => m.id === metodoSobrecargaGlobal);
  const semanaInfoActual = SEMANAS_MESOCICLO.find((s) => s.semana === semanaActiva) || SEMANAS_MESOCICLO[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-full overflow-hidden">
      {/* 1. Header del Modo Entrenador */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-400" /> Modo Entrenador en Vivo
            </span>
            <span className="text-xs text-slate-400">Coach {coachNombre}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Control de Entrenamiento & Sobrecarga
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Registra cargas en tiempo real, aplica sobrecarga progresiva científica y analiza curvas de fuerza.
          </p>
        </div>

        {/* Selectores de Alumno y Rutina */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <select
            value={selectedClienteId}
            onChange={(e) => setSelectedClienteId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 flex-1 sm:flex-none shadow-sm"
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                👤 {c.nombre}
              </option>
            ))}
          </select>

          <select
            value={selectedRutinaId}
            onChange={(e) => setSelectedRutinaId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 flex-1 sm:flex-none shadow-sm"
          >
            {rutinasDelCliente.length > 0 ? (
              rutinasDelCliente.map((r) => (
                <option key={r.id} value={r.id}>
                  📋 {r.nombre_rutina}
                </option>
              ))
            ) : (
              <option value="">Sin rutina asignada</option>
            )}
          </select>
        </div>
      </div>

      {/* 2. Selector de Semanas del Mesociclo (4 Semanas del Mes) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Mesociclo Mensual (Periodización de 4 Semanas)
          </span>
          <span className="text-xs text-indigo-400 font-bold">
            Meta: {semanaInfoActual.rirObjetivo} ({semanaInfoActual.fase.toUpperCase()})
          </span>
        </div>

        {/* 4 Botones de Semanas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SEMANAS_MESOCICLO.map((s) => {
            const isSelected = semanaActiva === s.semana;
            return (
              <button
                key={s.semana}
                type="button"
                onClick={() => handleSelectSemana(s.semana)}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? "bg-indigo-600/20 border-indigo-500 shadow-md"
                    : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${isSelected ? "text-indigo-300" : "text-white"}`}>
                    Semana {s.semana}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {s.rirObjetivo}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">
                  {s.fase === "base" && "🟢 Adaptación & Base"}
                  {s.fase === "acumulacion" && "🟡 Acumulación (+Reps)"}
                  {s.fase === "pico" && "🔴 Pico de Carga (+Kg)"}
                  {s.fase === "deload" && "🔵 Descarga / Deload"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Barra de Navegación de Vistas: Sesión en Vivo vs Mesociclo vs Gráficas */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-slate-800 pb-2">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveViewTab("sesion")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeViewTab === "sesion"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Dumbbell className="w-4 h-4" /> Sesión en Vivo
          </button>
          <button
            type="button"
            onClick={() => setActiveViewTab("mesociclo")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeViewTab === "mesociclo"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" /> Proyección 4 Semanas
          </button>
          <button
            type="button"
            onClick={() => setActiveViewTab("graficas")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeViewTab === "graficas"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Curvas de Fuerza ({historialCompleto.length} sesiones)
          </button>
        </div>

        {/* Selector de Días de la Rutina */}
        {diasRutina.length > 0 && activeViewTab === "sesion" && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
            {diasRutina.map((dia, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDiaIdx(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedDiaIdx === idx
                    ? "bg-slate-800 text-indigo-400 border border-indigo-500/40 shadow"
                    : "bg-slate-950 text-slate-400 border border-slate-900 hover:text-slate-200"
                }`}
              >
                {dia.nombre_dia || `Día ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VISTA 1: SESIÓN EN VIVO */}
      {activeViewTab === "sesion" && (
        <div className="space-y-6">
          {/* Panel de Control de Sobrecarga & Timer */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Tarjeta 1: Motor de Sobrecarga Master */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> Sobrecarga Progresiva
                </span>
                <button
                  type="button"
                  onClick={() => setSobrecargaHabilitada(!sobrecargaHabilitada)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    sobrecargaHabilitada ? "bg-emerald-600" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      sobrecargaHabilitada ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400">Método de Progresión Activo:</label>
                <select
                  disabled={!sobrecargaHabilitada}
                  value={metodoSobrecargaGlobal}
                  onChange={(e) => setMetodoSobrecargaGlobal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  {METODOS_SOBRECARGA.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.icono} {m.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMostrarExplicacionMetodo(!mostrarExplicacionMetodo)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <Info className="w-3 h-3" /> Ver fundamentación del método
                </button>
              </div>
            </div>

            {/* Tarjeta 2: Cronómetro de Descanso */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" /> Timer de Descanso
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {isRestTimerRunning ? "🟢 EN CURSO" : "⚪ PAUSA"}
                </span>
              </div>

              <div className="flex items-center justify-between my-1">
                <div className="text-3xl font-black font-mono text-white tracking-wider">
                  {formatTime(restTimerSeconds)}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsRestTimerRunning(!isRestTimerRunning)}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow"
                  >
                    {isRestTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartRestTimer(restTimerTotal)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-1">
                {[45, 60, 90, 120].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStartRestTimer(s)}
                    className="flex-1 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300"
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>

            {/* Tarjeta 3: Métricas de la Sesión en Vivo */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" /> Tonnage & Rendimiento
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {formatTime(sessionElapsedTime)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 my-1">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Tonnage Total</span>
                  <span className="text-lg font-black text-white font-mono">
                    {Math.round(liveSessionMetrics.totalTonnage)} <span className="text-xs font-normal text-slate-400">kg</span>
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Sets / Cardio</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    {liveSessionMetrics.totalSetsCompleted}s • {liveSessionMetrics.totalCardioMin}m
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGuardarSesion}
                disabled={guardandoSesion}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {guardandoSesion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Guardar Sesión & Aplicar Metas</span>
              </button>
            </div>
          </div>

          {/* Modal / Explicación del Método de Sobrecarga */}
          {mostrarExplicacionMetodo && metodoActualInfo && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-3xl p-5 text-xs text-indigo-200 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                  {metodoActualInfo.icono} {metodoActualInfo.nombre}
                </h4>
                <button
                  type="button"
                  onClick={() => setMostrarExplicacionMetodo(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="leading-relaxed">{metodoActualInfo.descripcion}</p>
              <div className="pt-2 border-t border-indigo-500/20 text-[11px] text-slate-300">
                <strong>💡 Recomendado para:</strong> {metodoActualInfo.recomendadoPara}
              </div>
            </div>
          )}

          {/* Mensaje de Éxito al Guardar */}
          {mensajeExito && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{mensajeExito}</span>
            </div>
          )}

          {/* Lista de Ejercicios del Día */}
          <div className="space-y-5">
            {diaActual ? (
              (diaActual.ejercicios || []).map((ej, ejIdx) => {
                const ejKey = ej.ejercicio_id || ej.nombre || `ej_${ejIdx}`;
                const ejState = workoutState[ejKey] || {};
                const isCardio =
                  ej.es_cardio ||
                  (ej.tipo_ejercicio || "").toLowerCase() === "cardio" ||
                  (ej.grupo_muscular || "").toLowerCase() === "cardio";

                if (isCardio) {
                  // ==========================================
                  // TARJETA DE EJERCICIO DE CARDIO
                  // ==========================================
                  const sobrecargaCardio = calcularSobrecargaCardio({
                    ejercicio: ej,
                    duracionMin: ejState.duracion_min,
                    nivelInclinacion: ejState.nivel,
                    modalidad: ejState.modalidad,
                    semana: semanaActiva,
                    objetivo: rutinaActual?.objetivo || clienteActual?.objetivo || "Hipertrofia",
                    pesoKg: clienteActual?.peso_kg,
                    alturaCm: clienteActual?.altura_cm,
                    imc: imcActual,
                    tieneMasaMuscularAlta,
                  });

                  return (
                    <div
                      key={ejIdx}
                      className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-emerald-600/20 text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/30">
                            ⚡
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-extrabold text-white text-base">{ej.nombre}</h3>
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
                                CARDIO
                              </span>
                              <button
                                type="button"
                                onClick={() => setEjercicioVideoModal(ej)}
                                className="text-[11px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-500/20 font-bold transition-colors flex items-center gap-1"
                              >
                                <Play className="w-3 h-3 text-indigo-400" /> Video
                              </button>
                            </div>
                            <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>Modalidad: {ejState.modalidad || "LISS"}</span>
                              <span>•</span>
                              <span>Semana {semanaActiva}</span>
                            </span>
                          </div>
                        </div>

                        {/* Botón de Completado de Cardio */}
                        <button
                          type="button"
                          onClick={() => handleToggleCardioComplete(ejKey)}
                          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow ${
                            ejState.completada
                              ? "bg-emerald-600 text-white shadow-emerald-600/30"
                              : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>{ejState.completada ? "Completado" : "Marcar Completado"}</span>
                        </button>
                      </div>

                      {/* Ficha de Prescripción de Cardio según IMC */}
                      {protocoloIMCActual && (
                        <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{protocoloIMCActual.icono}</span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-white text-xs">
                                  Categoría IMC: <span className="text-indigo-400">{protocoloIMCActual.categoria}</span> {imcActual ? `(${imcActual} kg/m²)` : ""}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                                  Rango: {protocoloIMCActual.rangoIMC}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Prescripción: <strong className="text-emerald-400">{protocoloIMCActual.frecuenciaSugerida}</strong> ({protocoloIMCActual.intensidad})
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 italic hidden lg:block max-w-xs text-right">
                            {protocoloIMCActual.descripcion}
                          </span>
                        </div>
                      )}

                      {/* Controles de Cardio Táctiles */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Control 1: Minutos de Duración */}
                        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-400" /> Duración Real
                          </span>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCardio(ejKey, "duracion_min", Math.max(0, (ejState.duracion_min || 15) - 5))
                              }
                              className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 font-black text-white hover:bg-slate-800 text-sm"
                            >
                              -5
                            </button>
                            <span className="text-lg font-black text-white font-mono">
                              {ejState.duracion_min || 0} <span className="text-xs text-slate-400 font-normal">min</span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCardio(ejKey, "duracion_min", (ejState.duracion_min || 0) + 5)
                              }
                              className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 font-black text-emerald-400 hover:bg-slate-800 text-sm"
                            >
                              +5
                            </button>
                          </div>
                        </div>

                        {/* Control 2: Nivel o Inclinación */}
                        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Sliders className="w-3 h-3 text-indigo-400" /> Inclinación / Nivel
                          </span>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCardio(ejKey, "nivel", Math.max(0, (ejState.nivel || 0) - 1))
                              }
                              className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 font-black text-white hover:bg-slate-800 text-sm"
                            >
                              -1
                            </button>
                            <span className="text-lg font-black text-indigo-400 font-mono">
                              Nivel {ejState.nivel || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCardio(ejKey, "nivel", (ejState.nivel || 0) + 1)}
                              className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 font-black text-indigo-400 hover:bg-slate-800 text-sm"
                            >
                              +1
                            </button>
                          </div>
                        </div>

                        {/* Control 3: Modalidad */}
                        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <HeartPulse className="w-3 h-3 text-rose-400" /> Modalidad Cardio
                          </span>
                          <select
                            value={ejState.modalidad || "LISS"}
                            onChange={(e) => handleUpdateCardio(ejKey, "modalidad", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none"
                          >
                            <option value="LISS / Zona 1-2">LISS / Zona 1-2 (Caminata Suave)</option>
                            <option value="Caminata digestiva muy suave">Caminata Digestiva Suave</option>
                            <option value="Caminadora Inclinada">Caminadora Inclinada</option>
                            <option value="Bici Estática">Bici Estática</option>
                            <option value="Elíptica">Elíptica</option>
                            <option value="LISS / Zona 2 alta">LISS / Zona 2 Alta</option>
                            <option value="HIIT (Intervalos)">HIIT (Alta Intensidad)</option>
                          </select>
                        </div>
                      </div>

                      {/* Banner de Progresión de Cardio */}
                      <div className="bg-slate-950 border border-emerald-500/30 px-3.5 py-2 rounded-2xl text-xs flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">🎯 Progresión Semanal:</span>
                        <span className="text-white font-semibold">{sobrecargaCardio.mensaje}</span>
                      </div>
                    </div>
                  );
                }

                // ==========================================
                // TARJETA DE EJERCICIO DE FUERZA (MÓVIL + DESKTOP)
                // ==========================================
                const ejProyectado = proyeccionMesociclo?.dias?.[selectedDiaIdx]?.ejercicios?.[ejIdx] || ej;

                const sobrecargaPrediccion = calcularSiguienteSobrecarga({
                  ejercicio: ej,
                  seriesCompletadas: ejState.series || [],
                  metodo: ejState.metodo || metodoSobrecargaGlobal,
                  habilitada: sobrecargaHabilitada && ejState.habilitada !== false,
                  config: {
                    incremento_kg: ejState.incremento_kg || 2.5,
                    reps_min: ejState.reps_min || 8,
                    reps_max: ejState.reps_max || 12,
                  },
                  semana: semanaActiva,
                  pesoKg: clienteActual?.peso_kg,
                  alturaCm: clienteActual?.altura_cm,
                  imc: imcActual,
                  tieneMasaMuscularAlta,
                });

                return (
                  <div
                    key={ejIdx}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4 transition-all"
                  >
                    {/* Header del Ejercicio */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-500/30">
                          {ejIdx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-white text-base">{ej.nombre}</h3>
                            {semanaActiva === 1 ? (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                                🟢 S1: Calibración & Testeo Base ({semanaInfoActual.rirObjetivo})
                              </span>
                            ) : (
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-0.5 rounded-lg border border-indigo-500/30 flex items-center gap-1">
                                🎯 Meta S{semanaActiva}: {semanaActiva === 2 ? "+2.5kg Acumulación" : semanaActiva === 3 ? "+5.0kg Pico" : "Deload -10%"} ({semanaInfoActual.rirObjetivo})
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setEjercicioVideoModal(ej)}
                              className="text-[11px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-500/20 font-bold transition-colors flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 text-indigo-400" /> Ver Video
                            </button>
                          </div>
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono flex-wrap">
                            <span>{ej.grupo_muscular || "General"}</span>
                            <span>•</span>
                            <span>Tempo: {ej.tempo || "2-0-1-0"}</span>
                            <span>•</span>
                            <span>Descanso: {ej.descanso_seg || 90}s</span>
                          </span>
                        </div>
                      </div>

                      {/* Selector de Método Individual */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <select
                          value={ejState.metodo || metodoSobrecargaGlobal}
                          onChange={(e) =>
                            setMesocicloState((prev) => {
                              const next = JSON.parse(JSON.stringify(prev || { 1: {}, 2: {}, 3: {}, 4: {} }));
                              for (let s = 1; s <= 4; s++) {
                                if (next[s]?.[ejKey]) {
                                  next[s][ejKey].metodo = e.target.value;
                                }
                              }
                              return next;
                            })
                          }
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-300 focus:outline-none focus:border-indigo-500"
                        >
                          {METODOS_SOBRECARGA.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.icono} {m.nombre.split(" ")[0]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* VISTA MÓVIL (< 640px): Tarjetas de Series Táctiles sin Scroll Lateral */}
                    <div className="block sm:hidden space-y-2.5">
                      {(ejState.series || []).map((s, sIdx) => {
                        const rm = calcular1RMEstimado(s.peso_kg, s.reps);
                        const sProy = mesocicloState?.[semanaActiva]?.[ejKey]?.series?.[sIdx];
                        return (
                          <div
                            key={sIdx}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              s.completada
                                ? "bg-emerald-950/30 border-emerald-500/40"
                                : "bg-slate-950 border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-xs text-white flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-md bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-[10px]">
                                  {s.set}
                                </span>
                                Serie {s.set}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {semanaActiva === 1 ? (
                                  <span className="text-emerald-400 font-semibold">Línea Base Inicial</span>
                                ) : (
                                  <>Meta S{semanaActiva}: <strong className="text-indigo-400">{sProy?.peso_kg || s.peso_kg}kg × {sProy?.reps || s.reps}</strong></>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSet(ejKey, sIdx)}
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 my-2">
                              {/* Control Peso (kg) */}
                              <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSet(ejKey, sIdx, "peso_kg", Math.max(0, Number(s.peso_kg || 0) - 2.5))
                                  }
                                  className="w-7 h-7 rounded-lg bg-slate-950 text-slate-300 font-bold text-xs flex items-center justify-center"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-black text-white">
                                  {s.peso_kg} <span className="text-[9px] text-slate-400">kg</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSet(ejKey, sIdx, "peso_kg", Number(s.peso_kg || 0) + 2.5)
                                  }
                                  className="w-7 h-7 rounded-lg bg-slate-950 text-indigo-400 font-bold text-xs flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>

                              {/* Control Reps */}
                              <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSet(ejKey, sIdx, "reps", Math.max(0, Number(s.reps || 0) - 1))
                                  }
                                  className="w-7 h-7 rounded-lg bg-slate-950 text-slate-300 font-bold text-xs flex items-center justify-center"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-black text-emerald-400">
                                  {s.reps} <span className="text-[9px] text-slate-400">reps</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSet(ejKey, sIdx, "reps", Number(s.reps || 0) + 1)
                                  }
                                  className="w-7 h-7 rounded-lg bg-slate-950 text-emerald-400 font-bold text-xs flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Botón Completar Set */}
                            <button
                              type="button"
                              onClick={() => handleToggleSetComplete(ejKey, sIdx, ej.descanso_seg || 90)}
                              className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                s.completada
                                  ? "bg-emerald-600 text-white shadow-md"
                                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{s.completada ? "Completada ✓" : "Completar Serie"}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* VISTA DESKTOP (>= 640px): Tabla de Series */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-800/80 text-[10px] uppercase font-bold text-center">
                            <th className="py-2 text-left pl-2">SET</th>
                            <th className="py-2">{semanaActiva === 1 ? "ESTADO S1" : `META S${semanaActiva}`}</th>
                            <th className="py-2">PESO (KG)</th>
                            <th className="py-2">REPS LOGRADAS</th>
                            <th className="py-2">1RM ESTIMADO</th>
                            <th className="py-2">LISTO</th>
                            <th className="py-2 pr-2">ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 font-mono">
                          {(ejState.series || []).map((s, sIdx) => {
                            const rm = calcular1RMEstimado(s.peso_kg, s.reps);
                            const sProy = mesocicloState?.[semanaActiva]?.[ejKey]?.series?.[sIdx];
                            const metaPeso = sProy?.peso_kg || s.peso_kg || "-";
                            const metaReps = sProy?.reps || s.reps || 10;
                            return (
                              <tr
                                key={sIdx}
                                className={`transition-colors text-center ${
                                  s.completada
                                    ? "bg-emerald-950/20 text-emerald-300"
                                    : "hover:bg-slate-950/60 text-slate-200"
                                }`}
                              >
                                <td className="py-2.5 pl-2 text-left font-bold text-slate-400">
                                  Serie {s.set}
                                </td>

                                <td className="py-2.5 text-slate-300 text-[11px] font-bold font-mono">
                                  {semanaActiva === 1 ? (
                                    <span className="text-emerald-400 font-semibold">🟢 Calibración</span>
                                  ) : (
                                    <>
                                      <span className="text-indigo-400">{metaPeso}{metaPeso !== "-" ? "kg" : ""}</span>{" "}
                                      × {metaReps}
                                    </>
                                  )}
                                </td>

                                <td className="py-2.5">
                                  <div className="inline-flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-1.5 py-0.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSet(
                                          ejKey,
                                          sIdx,
                                          "peso_kg",
                                          Math.max(0, Number(s.peso_kg || 0) - 2.5)
                                        )
                                      }
                                      className="text-slate-500 hover:text-white px-1 font-bold text-xs"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      step="0.5"
                                      value={s.peso_kg}
                                      onChange={(e) =>
                                        handleUpdateSet(ejKey, sIdx, "peso_kg", parseFloat(e.target.value) || 0)
                                      }
                                      className="w-12 bg-transparent text-center font-bold text-white text-xs focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSet(
                                          ejKey,
                                          sIdx,
                                          "peso_kg",
                                          Number(s.peso_kg || 0) + 2.5
                                        )
                                      }
                                      className="text-slate-500 hover:text-white px-1 font-bold text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>

                                <td className="py-2.5">
                                  <div className="inline-flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-1.5 py-0.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSet(
                                          ejKey,
                                          sIdx,
                                          "reps",
                                          Math.max(0, Number(s.reps || 0) - 1)
                                        )
                                      }
                                      className="text-slate-500 hover:text-white px-1 font-bold text-xs"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      step="1"
                                      value={s.reps}
                                      onChange={(e) =>
                                        handleUpdateSet(ejKey, sIdx, "reps", parseInt(e.target.value) || 0)
                                      }
                                      className="w-10 bg-transparent text-center font-bold text-emerald-400 text-xs focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSet(
                                          ejKey,
                                          sIdx,
                                          "reps",
                                          Number(s.reps || 0) + 1
                                        )
                                      }
                                      className="text-slate-500 hover:text-white px-1 font-bold text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>

                                <td className="py-2.5 font-bold text-indigo-400">
                                  {rm} kg
                                </td>

                                <td className="py-2.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleSetComplete(
                                        ejKey,
                                        sIdx,
                                        ej.descanso_seg || 90
                                      )
                                    }
                                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all mx-auto ${
                                      s.completada
                                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                                        : "bg-slate-950 border border-slate-800 text-slate-600 hover:border-slate-700"
                                    }`}
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                </td>

                                <td className="py-2.5 pr-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSet(ejKey, sIdx)}
                                    className="text-slate-600 hover:text-rose-400 p-1 transition-colors"
                                    title="Eliminar serie"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer del Ejercicio */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleAddSet(ejKey)}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir Serie
                      </button>

                      {sobrecargaPrediccion && (
                        <div className="bg-slate-950 border border-indigo-500/30 px-3.5 py-2 rounded-2xl text-xs flex items-center gap-2 flex-1 sm:flex-none">
                          <span className="text-amber-400 font-bold">🎯 Meta Siguiente Sesión:</span>
                          <span className="text-white font-semibold">
                            {sobrecargaPrediccion.mensaje}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                No hay ejercicios configurados para este día de entrenamiento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: PROYECCIÓN DEL MESOCICLO DE 4 SEMANAS */}
      {activeViewTab === "mesociclo" && proyeccionMesociclo && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Proyección Dinámica de Cargas
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  Estructura Proyectada — Semana {semanaActiva} ({semanaInfoActual.fase.toUpperCase()})
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                {semanaInfoActual.rirObjetivo}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {semanaInfoActual.descripcion}
            </p>

            {/* Días y Ejercicios Proyectados */}
            <div className="space-y-4 pt-2">
              {proyeccionMesociclo.dias.map((dia, dIdx) => (
                <div key={dIdx} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      {dia.nombre_dia || `Día ${dIdx + 1}`}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {dia.ejercicios?.length || 0} Ejercicios
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {(dia.ejercicios || []).map((ej, eIdx) => {
                      const isCardio =
                        ej.es_cardio ||
                        (ej.tipo_ejercicio || "").toLowerCase() === "cardio" ||
                        (ej.grupo_muscular || "").toLowerCase() === "cardio";

                      return (
                        <div
                          key={eIdx}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{ej.nombre}</span>
                            <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                              {isCardio ? (
                                <strong className="text-emerald-400">
                                  ⏱️ {ej.duracion_proyectada || ej.duracion_min || 20} min ({ej.modalidad_cardio || "LISS"})
                                </strong>
                              ) : (
                                <>
                                  <strong className="text-indigo-400">
                                    {ej.series_proyectadas || ej.series || 3} sets
                                  </strong>{" "}
                                  × {ej.repeticiones_proyectadas || ej.repeticiones || 10} reps @{" "}
                                  <strong className="text-amber-400">
                                    {ej.peso_proyectado || ej.peso_sugerido_kg || "-"} kg
                                  </strong>
                                </>
                              )}
                            </span>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-950 text-indigo-300 border border-slate-800">
                            {ej.rir_proyectado || "RIR 2"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: GRÁFICAS Y EVOLUCIÓN DE CARGAS */}
      {activeViewTab === "graficas" && (
        <div className="space-y-6 animate-in fade-in">
          <GraficaProgresion
            historial={historialCompleto}
            colorPrimario={colorPrimario}
            nombreAlumno={clienteActual?.nombre || "Alumno"}
          />
        </div>
      )}

      {/* Modal de Video y Biomecánica */}
      {ejercicioVideoModal && (
        <ModalDetalleEjercicio
          ejercicio={ejercicioVideoModal}
          isOpen={true}
          onClose={() => setEjercicioVideoModal(null)}
          coachNombre={coachNombre}
          tenant={coachTenant}
        />
      )}
    </div>
  );
}
