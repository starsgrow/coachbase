"use client";

import { useState, useMemo } from "react";
import {
  Dumbbell,
  Calendar,
  Clock,
  Play,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Zap,
  Layers,
  HeartPulse,
  Award,
} from "lucide-react";
import Link from "next/link";
import BotonDescargaRutinaPDF from "@/components/BotonDescargaRutinaPDF";
import ModalDetalleEjercicio from "@/components/ModalDetalleEjercicio";
import GraficaProgresion from "@/components/GraficaProgresion";
import { SEMANAS_MESOCICLO, proyectarMesociclo4Semanas } from "@/lib/sobrecargaEngine";

export default function StudentRutinasView({
  rutinaActiva,
  nombreCoach,
  tenant,
  coachLogo = null,
  coachColorPrimario = "#2563EB",
  todosEjercicios = [],
}) {
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState(null);
  const [activeTab, setActiveTab] = useState("rutina"); // 'rutina' | 'progresion'
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(1);

  const estructuraBase = rutinaActiva?.estructura_json || rutinaActiva?.estructura_json?.dias || [];
  const historial = rutinaActiva?.historial_sesiones || rutinaActiva?.estructura_json?.historial_sesiones || [];

  // Proyección de la rutina para la semana seleccionada
  const proyeccion = useMemo(() => {
    if (!rutinaActiva) return null;
    return proyectarMesociclo4Semanas({ rutina: rutinaActiva, semanaSeleccionada });
  }, [rutinaActiva, semanaSeleccionada]);

  const semanaInfo = SEMANAS_MESOCICLO.find((s) => s.semana === semanaSeleccionada) || SEMANAS_MESOCICLO[0];
  const diasAMostrar = proyeccion?.dias || estructuraBase;

  const handleOpenExerciseModal = (ej) => {
    const encontrado = todosEjercicios.find((item) => item.slug === ej.slug) || {};
    const ejercicioCompleto = {
      ...encontrado,
      ...ej,
      nombre: ej.nombre || ej.nombre_ejercicio || encontrado.nombre,
      descripcion: ej.descripcion || encontrado.descripcion || ej.notas,
      beneficios: ej.beneficios || encontrado.beneficios,
      errores_comunes: ej.errores_comunes || encontrado.errores_comunes,
      video_demo_url: ej.video_demo_url || encontrado.video_demo_url || ej.hsl_link || encontrado.hsl_link,
      thumbnail_url: ej.thumbnail_url || encontrado.thumbnail_url,
    };
    setEjercicioSeleccionado(ejercicioCompleto);
  };

  return (
    <div className="space-y-8 max-w-full overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Planes Personalizados
          </span>
          <h1 className="text-3xl font-black text-white mt-1">
            Rutinas de Entrenamiento — {nombreCoach}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Plan diseñado por tu coach con apoyo de Inteligencia Artificial para acelerar tus resultados.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          {rutinaActiva && (
            <BotonDescargaRutinaPDF
              rutina={rutinaActiva}
              coachNombre={nombreCoach}
              coachTenant={tenant}
              coachLogo={coachLogo}
              coachColorPrimario={coachColorPrimario}
            />
          )}
          <Link
            href={`/${tenant}/panel/rutinas`}
            className="px-4 py-2.5 rounded-xl font-bold text-white shadow-lg text-xs flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            <Sparkles className="w-4 h-4" /> Administrar Rutinas (Coach)
          </Link>
        </div>
      </div>

      {/* Selector de Pestañas: Rutina vs Gráficas */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("rutina")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "rutina"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Dumbbell className="w-4 h-4" /> Plan de Entrenamiento
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("progresion")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "progresion"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Curvas de Sobrecarga ({historial.length} sesiones)
        </button>
      </div>

      {/* VISTA 1: PLAN DE ENTRENAMIENTO */}
      {activeTab === "rutina" && (
        <>
          {rutinaActiva ? (
            <div className="space-y-6">
              {/* Tarjeta Superior con Selector de Semanas del Mesociclo */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-white">{rutinaActiva.nombre_rutina}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {estructuraBase.length} Sesiones por Semana • Nivel {rutinaActiva.nivel || "Intermedio"} • Objetivo {rutinaActiva.objetivo || "Hipertrofia"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <BotonDescargaRutinaPDF
                      rutina={rutinaActiva}
                      coachNombre={nombreCoach}
                      coachTenant={tenant}
                      coachLogo={coachLogo}
                      coachColorPrimario={coachColorPrimario}
                      compact={true}
                    />
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Rutina Activa
                    </span>
                  </div>
                </div>

                {/* Selector de 4 Semanas del Mesociclo */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Progresión Mensual (Mesociclo de 4 Semanas)
                    </span>
                    <span className="text-xs text-indigo-400 font-bold">
                      {semanaInfo.rirObjetivo}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SEMANAS_MESOCICLO.map((s) => {
                      const isSelected = semanaSeleccionada === s.semana;
                      return (
                        <button
                          key={s.semana}
                          type="button"
                          onClick={() => setSemanaSeleccionada(s.semana)}
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
                            {s.fase === "base" && "🟢 Calibración & Base"}
                            {s.fase === "acumulacion" && "🟡 Acumulación (+Reps)"}
                            {s.fase === "pico" && "🔴 Pico de Carga (+Kg)"}
                            {s.fase === "deload" && "🔵 Descarga / Deload"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl text-xs text-slate-300 leading-relaxed">
                    <strong>Objetivo Semana {semanaSeleccionada}:</strong> {semanaInfo.descripcion}
                  </div>
                </div>
              </div>

              {/* Días de la Rutina Proyectados */}
              <div className="space-y-6">
                {diasAMostrar.map((dia, dIdx) => (
                  <div key={dIdx} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <h4 className="font-bold text-slate-100 text-sm">
                          {dia.nombre_dia || dia.nombre || `Día ${dIdx + 1}`}
                        </h4>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        {dia.ejercicios?.length || 0} Ejercicios
                      </span>
                    </div>

                    {/* Grid de Ejercicios Clicables */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(dia.ejercicios || []).map((ej, eIdx) => {
                        const isCardio =
                          ej.es_cardio ||
                          (ej.tipo_ejercicio || "").toLowerCase() === "cardio" ||
                          (ej.grupo_muscular || "").toLowerCase() === "cardio";

                        return (
                          <div
                            key={eIdx}
                            onClick={() => handleOpenExerciseModal(ej)}
                            className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-3.5 flex gap-3 items-center cursor-pointer transition-all group shadow-md"
                          >
                            <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center border border-slate-800 group-hover:border-indigo-500/40 relative">
                              {ej.thumbnail_url ? (
                                <img src={ej.thumbnail_url} alt={ej.nombre} className="w-full h-full object-cover" />
                              ) : isCardio ? (
                                <HeartPulse className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                              ) : (
                                <Dumbbell className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Play className="w-4 h-4 text-white fill-white" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="font-bold text-slate-200 text-xs truncate group-hover:text-indigo-300 transition-colors">
                                  {ej.nombre}
                                </h5>
                                {isCardio ? (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                                    ⚡ Cardio
                                  </span>
                                ) : ej.peso_proyectado || ej.peso_sugerido_kg ? (
                                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-500/30">
                                    🎯 {ej.peso_proyectado || ej.peso_sugerido_kg} kg
                                  </span>
                                ) : null}
                              </div>

                              {isCardio ? (
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                                  <span className="font-bold text-emerald-400">
                                    ⏱️ {ej.duracion_proyectada != null ? `${ej.duracion_proyectada} min` : `${ej.duracion_min || 15} min`}
                                  </span>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-slate-300 font-medium">
                                    {ej.modalidad_proyectada || ej.modalidad_cardio || "LISS / Zona 1-2"}
                                  </span>
                                  {ej.protocolo_imc && (
                                    <span className="text-[10px] text-indigo-300 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                                      {ej.protocolo_imc.frecuenciaSugerida}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                                  <span className="font-semibold text-indigo-400">
                                    {ej.series_proyectadas || ej.series || 4} Sets × {ej.repeticiones_proyectadas || (Array.isArray(ej.repeticiones) ? ej.repeticiones.join("-") : ej.repeticiones || 10)} reps
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-500" /> {ej.descanso_seg || 90}s
                                  </span>
                                </div>
                              )}

                              {ej.ultimo_registro?.sobrecarga_aplicada ? (
                                <p className="text-[10px] text-amber-400 font-semibold mt-0.5 truncate">
                                  🚀 {ej.ultimo_registro.sobrecarga_aplicada}
                                </p>
                              ) : ej.notas ? (
                                <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">
                                  💡 {ej.notas}
                                </p>
                              ) : null}
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Dumbbell className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No hay rutina activa asignada</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tu coach {nombreCoach} asignará tu plan de entrenamiento personalizado próximamente.
              </p>
            </div>
          )}
        </>
      )}

      {/* VISTA 2: GRÁFICAS DE PROGRESIÓN DEL ALUMNO */}
      {activeTab === "progresion" && (
        <div className="space-y-6 animate-in fade-in">
          <GraficaProgresion
            historial={historial}
            colorPrimario={coachColorPrimario}
            nombreAlumno="Mi Progreso"
          />
        </div>
      )}

      {/* Modal Dinámico con Video & Biomecánica */}
      {ejercicioSeleccionado && (
        <ModalDetalleEjercicio
          ejercicio={ejercicioSeleccionado}
          isOpen={!!ejercicioSeleccionado}
          onClose={() => setEjercicioSeleccionado(null)}
          coachNombre={nombreCoach}
          tenant={tenant}
        />
      )}
    </div>
  );
}
