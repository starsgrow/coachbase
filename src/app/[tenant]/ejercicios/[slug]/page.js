import { getCoachBySlug, getEjerciciosCoach, getEjerciciosGlobales } from "@/lib/coachUtils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Dumbbell, Sparkles } from "lucide-react";
import ModalDetalleEjercicio from "@/components/ModalDetalleEjercicio";

export default async function PublicExercisePage({ params }) {
  const { tenant, slug } = await params;
  const coach = await getCoachBySlug(tenant);
  const nombreCoach = coach?.nombre_marca || `Coach ${tenant}`;

  let ejercicio = null;

  // 1. Buscar en ejercicios propios del coach
  if (coach) {
    const coachEjercicios = await getEjerciciosCoach(coach.id);
    ejercicio = coachEjercicios.find((e) => e.slug === slug);
  }

  // 2. Si no se encontró, buscar en el catálogo global
  if (!ejercicio) {
    const globales = await getEjerciciosGlobales();
    ejercicio = globales.find((e) => e.slug === slug);
  }

  // 3. Fallback de búsqueda aproximada si el slug tiene sufijo numérico
  if (!ejercicio) {
    const cleanSlug = slug.replace(/-\d+$/, "");
    const globales = await getEjerciciosGlobales();
    ejercicio = globales.find(
      (e) => (e.slug || "").toLowerCase().includes(cleanSlug) || (e.nombre || "").toLowerCase().includes(cleanSlug.replace(/-/g, " "))
    );
  }

  if (!ejercicio) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
          <Dumbbell className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Ejercicio no encontrado</h1>
        <p className="text-xs text-slate-400 max-w-sm">
          El ejercicio solicitado no está disponible o el enlace ha cambiado.
        </p>
        <Link
          href={`/${tenant}/rutinas`}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
        >
          Volver a las Rutinas de {nombreCoach}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Botón de regreso a rutinas */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${tenant}/rutinas`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Plan de Entrenamiento
        </Link>

        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg">
          {nombreCoach}
        </span>
      </div>

      {/* Renderizado del Visualizador de Ejercicio */}
      <ModalDetalleEjercicio
        ejercicio={ejercicio}
        isOpen={true}
        coachNombre={nombreCoach}
        tenant={tenant}
      />
    </div>
  );
}
