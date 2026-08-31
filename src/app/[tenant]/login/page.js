import { getCoachBySlug } from "@/lib/coachUtils";
import TenantLoginView from "./TenantLoginView";

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const coach = await getCoachBySlug(tenant);
  const nombre = coach?.nombre_marca || tenant.toUpperCase();

  return {
    title: `Acceso — ${nombre}`,
    description: `Inicia sesión en tu portal de entrenamiento y nutrición con ${nombre}`,
  };
}

export default async function TenantLoginPage({ params }) {
  const { tenant } = await params;
  const coach = await getCoachBySlug(tenant);

  return <TenantLoginView tenant={tenant} coach={coach} />;
}
