import { getCoachBySlug, getCoachRutinas, getEjerciciosCoach, getEjerciciosGlobales } from '@/lib/coachUtils';
import StudentRutinasView from '@/components/StudentRutinasView';

export default async function StudentRutinasPage({ params }) {
  const { tenant } = await params;
  const coach = await getCoachBySlug(tenant);
  const nombreCoach = coach?.nombre_marca || `Coach ${tenant}`;

  const [rutinas, coachEjercicios, globales] = await Promise.all([
    coach ? getCoachRutinas(coach.id) : [],
    coach ? getEjerciciosCoach(coach.id) : [],
    getEjerciciosGlobales(),
  ]);

  const rutinaActiva = rutinas.find((r) => r.activa !== false) || rutinas[0];
  const todosEjercicios = [...(coachEjercicios || []), ...(globales || [])];

  return (
    <StudentRutinasView
      rutinaActiva={rutinaActiva}
      nombreCoach={nombreCoach}
      tenant={tenant}
      coachLogo={coach?.logo_url || null}
      coachColorPrimario={coach?.color_primario || "#2563EB"}
      todosEjercicios={todosEjercicios}
    />
  );
}
