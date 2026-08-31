import { getCoachRutinas, getCoachClientes, getEjerciciosGlobales, getEjerciciosCoach } from '@/lib/coachUtils';
import { getAuthenticatedCoach } from '@/lib/supabaseAuth';
import { redirect } from 'next/navigation';
import RutinasManager from './RutinasManager';
import { Dumbbell } from 'lucide-react';

export default async function PanelRutinasPage({ params }) {
  const { tenant } = await params;

  // Auth Guard: solo el coach dueño de este tenant puede acceder
  const auth = await getAuthenticatedCoach(tenant);
  if (!auth) {
    redirect('/auth/login');
  }

  const { coach } = auth;
  const coachId = coach.id;
  const nombreCoach = coach.nombre_marca || `Coach ${tenant}`;

  const [rutinas, clientes, ejerciciosGlobales, ejerciciosCoach] = await Promise.all([
    getCoachRutinas(coach.id),
    getCoachClientes(coach.id),
    getEjerciciosGlobales(),
    getEjerciciosCoach(coach.id)
  ]);

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Administración de Entrenamiento
          </span>
          <h1 className="text-3xl font-black text-white mt-1 flex items-center gap-3">
            <Dumbbell className="w-8 h-8 text-indigo-500" /> Creador de Rutinas Inteligentes
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl">
            Diseña, dicta por voz o genera con IA rutinas personalizadas para los alumnos de {nombreCoach}.
          </p>
        </div>
      </div>

      <RutinasManager
        rutinasIniciales={rutinas}
        clientes={clientes}
        ejerciciosGlobales={ejerciciosGlobales}
        ejerciciosCoach={ejerciciosCoach}
        coachId={coachId}
        coachNombre={nombreCoach}
        coachTenant={tenant}
        coachLogo={coach.logo_url || null}
        coachColorPrimario={coach.color_primario || "#2563EB"}
      />
    </div>
  );
}
