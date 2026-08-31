"use client";

import { useState, useMemo } from "react";
import { TrendingUp, Award, Flame, Dumbbell, Calendar, ChevronRight, Activity } from "lucide-react";
import { calcular1RMEstimado, calcularTonnage } from "@/lib/sobrecargaEngine";

export default function GraficaProgresion({
  historial = [],
  ejerciciosDisponibles = [],
  colorPrimario = "#6366F1",
  nombreAlumno = "Alumno",
  compact = false,
}) {
  // Lista de ejercicios presentes en el historial
  const ejerciciosUnicos = useMemo(() => {
    const map = new Map();
    (historial || []).forEach((sesion) => {
      (sesion.ejercicios || []).forEach((ej) => {
        const id = ej.ejercicio_id || ej.nombre;
        if (id && !map.has(id)) {
          map.set(id, ej.nombre);
        }
      });
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [historial]);

  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState(
    ejerciciosUnicos[0]?.id || ""
  );
  const [tipoGrafica, setTipoGrafica] = useState("peso_1rm"); // 'peso_1rm' | 'tonnage'

  // Si cambia la lista de ejercicios y el seleccionado ya no existe, actualizar al primero
  const ejActivoId = ejerciciosUnicos.some((e) => e.id === ejercicioSeleccionado)
    ? ejercicioSeleccionado
    : ejerciciosUnicos[0]?.id || "";

  // Extraer serie temporal de datos del ejercicio seleccionado
  const serieTemporal = useMemo(() => {
    if (!ejActivoId || !historial) return [];

    const puntos = [];
    historial.forEach((sesion) => {
      const ejEnSesion = (sesion.ejercicios || []).find(
        (e) => (e.ejercicio_id || e.nombre) === ejActivoId
      );

      if (ejEnSesion && ejEnSesion.series && ejEnSesion.series.length > 0) {
        // Encontrar peso máximo de la sesión y 1RM estimado más alto
        let maxPeso = 0;
        let max1RM = 0;
        let totalReps = 0;
        const seriesData = ejEnSesion.series.map((s) => {
          const p = Number(s.peso_kg || 0);
          const r = Number(s.reps || 0);
          if (p > maxPeso) maxPeso = p;
          totalReps += r;
          const rm = calcular1RMEstimado(p, r);
          if (rm > max1RM) max1RM = rm;
          return { peso_kg: p, reps: r, rm_estimado: rm };
        });

        const tonnage = calcularTonnage(ejEnSesion.series);

        puntos.push({
          fecha: sesion.fecha || new Date().toISOString().split("T")[0],
          maxPeso,
          max1RM,
          totalReps,
          tonnage,
          series: seriesData,
          metodo_sobrecarga: ejEnSesion.sobrecarga_aplicada || "Doble Progresión",
        });
      }
    });

    // Ordenar cronológicamente
    return puntos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [historial, ejActivoId]);

  // Cálculos estadísticos
  const stats = useMemo(() => {
    if (serieTemporal.length === 0) {
      return { max1RM: 0, maxPeso: 0, tonnageTotal: 0, gananciaPct: 0 };
    }

    const primerPunto = serieTemporal[0];
    const ultimoPunto = serieTemporal[serieTemporal.length - 1];

    let max1RM = 0;
    let maxPeso = 0;
    let tonnageTotal = 0;

    serieTemporal.forEach((p) => {
      if (p.max1RM > max1RM) max1RM = p.max1RM;
      if (p.maxPeso > maxPeso) maxPeso = p.maxPeso;
      tonnageTotal += p.tonnage;
    });

    const pesoInicial = primerPunto.maxPeso || 1;
    const pesoFinal = ultimoPunto.maxPeso || 1;
    const gananciaPct = Math.round(((pesoFinal - pesoInicial) / pesoInicial) * 100);

    return { max1RM, maxPeso, tonnageTotal, gananciaPct };
  }, [serieTemporal]);

  if (ejerciciosUnicos.length === 0 || serieTemporal.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 border-dashed rounded-3xl p-8 text-center space-y-2">
        <TrendingUp className="w-10 h-10 text-slate-600 mx-auto mb-1" />
        <h4 className="text-sm font-bold text-white">Sin datos de sobrecarga registrados</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Inicia el <strong>Modo Entrenador</strong> y completa series para visualizar la progresión de carga y fuerza de {nombreAlumno}.
        </p>
      </div>
    );
  }

  // Dimensiones del gráfico SVG
  const width = 600;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;

  // Escalas matemáticas
  const dataPoints = serieTemporal.map((p) =>
    tipoGrafica === "peso_1rm" ? p.max1RM : p.tonnage
  );
  const minVal = Math.max(0, Math.min(...dataPoints) * 0.85);
  const maxVal = Math.max(10, Math.max(...dataPoints) * 1.15);
  const valRange = maxVal - minVal || 1;

  const numPoints = serieTemporal.length;
  const stepX = numPoints > 1 ? (width - paddingX * 2) / (numPoints - 1) : 0;

  const coordinates = serieTemporal.map((p, idx) => {
    const val = tipoGrafica === "peso_1rm" ? p.max1RM : p.tonnage;
    const x = numPoints > 1 ? paddingX + idx * stepX : width / 2;
    const y = height - paddingY - ((val - minVal) / valRange) * (height - paddingY * 2);
    return { x, y, val, fecha: p.fecha, peso: p.maxPeso, reps: p.totalReps };
  });

  const pathD = coordinates.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const areaD =
    coordinates.length > 0
      ? `${pathD} L ${coordinates[coordinates.length - 1].x} ${height - paddingY} L ${coordinates[0].x} ${height - paddingY} Z`
      : "";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-5">
      {/* Header & Selector de Ejercicio */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-800">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Curva de Sobrecarga Progresiva
          </span>
          <h3 className="text-lg font-black text-white mt-0.5">
            Evolución de Fuerza & Cargas — {nombreAlumno}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Selector de Ejercicio */}
          <select
            value={ejActivoId}
            onChange={(e) => setEjercicioSeleccionado(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 flex-1 sm:flex-none"
          >
            {ejerciciosUnicos.map((e) => (
              <option key={e.id} value={e.id}>
                🏋️ {e.nombre}
              </option>
            ))}
          </select>

          {/* Toggle de Tipo de Métrica */}
          <div className="flex bg-slate-950 border border-slate-800 p-0.5 rounded-xl text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setTipoGrafica("peso_1rm")}
              className={`px-3 py-1 rounded-lg transition-all ${
                tipoGrafica === "peso_1rm"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              1RM Estimado
            </button>
            <button
              type="button"
              onClick={() => setTipoGrafica("tonnage")}
              className={`px-3 py-1 rounded-lg transition-all ${
                tipoGrafica === "tonnage"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Tonnage (Volumen)
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI de Rendimiento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Award className="w-3 h-3 text-amber-400" /> 1RM Máximo
          </span>
          <div className="text-xl font-black text-white mt-1">
            {stats.max1RM} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-indigo-400 uppercase flex items-center gap-1">
            <Dumbbell className="w-3 h-3 text-indigo-400" /> Carga Máx. Sesión
          </span>
          <div className="text-xl font-black text-indigo-400 mt-1">
            {stats.maxPeso} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
            📈 Progreso Neto
          </span>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {stats.gananciaPct >= 0 ? `+${stats.gananciaPct}%` : `${stats.gananciaPct}%`}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-[10px] font-bold text-sky-400 uppercase flex items-center gap-1">
            <Flame className="w-3 h-3 text-sky-400" /> Tonnage Acumulado
          </span>
          <div className="text-xl font-black text-sky-400 mt-1">
            {Math.round(stats.tonnageTotal)}{" "}
            <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
        </div>
      </div>

      {/* Gráfico SVG Reactivo */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48 sm:h-56 overflow-visible"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Líneas Guía Horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * (height - paddingY * 2);
            const valLabel = Math.round(minVal + ratio * valRange);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="9"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Área con gradiente */}
          {areaD && <path d={areaD} fill="url(#chartGradient)" />}

          {/* Línea Principal del Gráfico */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#6366F1"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Puntos de Datos */}
          {coordinates.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r="5"
                fill="#0F172A"
                stroke="#6366F1"
                strokeWidth="3"
                className="transition-all hover:scale-150"
              />
              <circle cx={pt.x} cy={pt.y} r="2" fill="#FFFFFF" />

              {/* Tooltip / Valor del punto */}
              <text
                x={pt.x}
                y={pt.y - 10}
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                className="drop-shadow"
              >
                {pt.val} {tipoGrafica === "peso_1rm" ? "kg" : ""}
              </text>

              {/* Etiqueta de Fecha */}
              <text
                x={pt.x}
                y={height - 10}
                fill="#94a3b8"
                fontSize="8.5"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {pt.fecha.slice(5)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Historial Detallado de Sesiones */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase block">
          Registro Histórico por Sesión:
        </span>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {serieTemporal.map((ses, sIdx) => (
            <div
              key={sIdx}
              className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-indigo-400 font-bold text-[11px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {ses.fecha}
                </span>
                <span className="text-slate-300 font-semibold">
                  {ses.series.length} series • {ses.totalReps} reps totales
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className="text-slate-400">
                  Carga: <strong className="text-white">{ses.maxPeso}kg</strong>
                </span>
                <span className="text-emerald-400 font-bold">
                  1RM: {ses.max1RM}kg
                </span>
                <span className="text-sky-400 font-bold hidden sm:inline">
                  Tonnage: {ses.tonnage}kg
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
