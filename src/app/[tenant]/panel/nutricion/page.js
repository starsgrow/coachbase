import { getAuthenticatedCoach } from "@/lib/supabaseAuth";
import { getCoachClientes } from "@/lib/coachUtils";
import { supabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import NutricionManager from "@/components/NutricionManager";

export const metadata = {
  title: "Nutrición & Dietas | Panel Coach",
};

export default async function NutricionPage({ params }) {
  const { tenant } = await params;

  // Auth Guard
  const auth = await getAuthenticatedCoach(tenant);
  if (!auth) {
    redirect("/auth/login");
  }

  const coachId = auth.coach?.id || auth.id;

  // Fetch clientes
  const clientes = await getCoachClientes(coachId);

  // Fetch planes de alimentación
  let planes = [];
  try {
    const { data } = await supabaseServer
      .from("coach_planes_alimentacion")
      .select("*, coach_clientes(nombre, email)")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });

    planes = data || [];
  } catch (e) {
    planes = [];
  }

  // Si hay planes guardados en notas de clientes que no están en la tabla, extraerlos
  clientes.forEach((cl) => {
    if (cl.notas && typeof cl.notas === "string" && cl.notas.includes("plan_alimentacion_activo")) {
      try {
        const extra = JSON.parse(cl.notas);
        if (extra.plan_alimentacion_activo) {
          const planFromClient = {
            id: `plan-cliente-${cl.id}`,
            cliente_id: cl.id,
            coach_clientes: { nombre: cl.nombre, email: cl.email },
            ...extra.plan_alimentacion_activo,
          };
          if (!planes.some((p) => p.cliente_id === cl.id)) {
            planes.push(planFromClient);
          }
        }
      } catch (err) {}
    }
  });

  const coachNombre = auth.coach?.nombre_marca || auth.coach?.nombre || auth.nombre || "Coach Olympo";
  const coachLogo = auth.coach?.logo_url || null;
  const coachColorPrimario = auth.coach?.color_primario || "#10B981";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <NutricionManager
        clientes={clientes}
        planesIniciales={planes}
        coachId={coachId}
        coachNombre={coachNombre}
        coachTenant={tenant}
        coachLogo={coachLogo}
        coachColorPrimario={coachColorPrimario}
      />
    </div>
  );
}
