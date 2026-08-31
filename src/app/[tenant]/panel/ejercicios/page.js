import { getEjerciciosGlobales, getEjerciciosCoach } from '@/lib/coachUtils';
import { getAuthenticatedCoach } from '@/lib/supabaseAuth';
import { redirect } from 'next/navigation';
import EjerciciosManager from './EjerciciosManager';
import { Dumbbell } from 'lucide-react';

export default async function EjerciciosPage({ params }) {
  const { tenant } = await params;

  // Auth Guard: solo el coach dueño de este tenant puede acceder
  const auth = await getAuthenticatedCoach(tenant);
  if (!auth) {
    redirect('/auth/login');
  }

  const { coach } = auth;
  const coachId = coach.id;
  const nombreCoach = coach.nombre_marca || `Coach ${tenant}`;

  const [ejerciciosGlobales, ejerciciosCoach] = await Promise.all([
    getEjerciciosGlobales(),
    getEjerciciosCoach(coach.id)
  ]);

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
          Contenido
        </span>
        <h1 className="text-3xl font-black text-white mt-1 flex items-center gap-3">
          <Dumbbell className="w-8 h-8 text-indigo-500" /> Banco de Ejercicios
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-2xl">
          Explora la biblioteca global de {ejerciciosGlobales.length} ejercicios de alta calidad listos para usar, 
          o añade tus propios ejercicios personalizados exclusivos para la app de {nombreCoach}.
        </p>
      </div>

      <EjerciciosManager 
        ejerciciosGlobales={ejerciciosGlobales} 
        ejerciciosCoach={ejerciciosCoach} 
        coachId={coachId} 
      />
    </div>
  );
}
