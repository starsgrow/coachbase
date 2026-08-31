import { supabaseServer } from './supabaseServer';
import { supabase } from './supabaseClient';

/**
 * Obtener un coach por su slug (subdominio)
 */
export async function getCoachBySlug(slug) {
  if (!slug) return null;
  try {
    const { data, error } = await supabaseServer
      .from('coaches')
      .select('*')
      .eq('slug', slug.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error buscando coach por slug:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Excepción buscando coach por slug:', err);
    return null;
  }
}

/**
 * Obtener perfil de coach por user_id autenticado
 */
export async function getCoachByUserId(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabaseServer
      .from('coaches')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error buscando coach por user_id:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Excepción buscando coach por user_id:', err);
    return null;
  }
}

/**
 * Obtener estadísticas reales del coach para su panel
 */
export async function getCoachStats(coachId) {
  if (!coachId) return null;
  try {
    const { data, error } = await supabaseServer.rpc('get_coach_stats', {
      coach_uuid: coachId,
    });

    if (error) {
      console.error('Error obteniendo stats del coach:', error);
      // Fallback manual si el RPC falla
      const [clientes, videos, rutinas] = await Promise.all([
        supabaseServer.from('coach_clientes').select('id', { count: 'exact' }).eq('coach_id', coachId),
        supabaseServer.from('coach_videos').select('id', { count: 'exact' }).eq('coach_id', coachId).eq('estado', 'listo'),
        supabaseServer.from('coach_rutinas').select('id', { count: 'exact' }).eq('coach_id', coachId).eq('activa', true),
      ]);

      return {
        total_clientes: clientes.count || 0,
        total_videos: videos.count || 0,
        total_rutinas: rutinas.count || 0,
      };
    }
    return data;
  } catch (err) {
    console.error('Excepción obteniendo stats:', err);
    return { total_clientes: 0, total_videos: 0, total_rutinas: 0 };
  }
}

/**
 * Obtener videos públicos/listos de un coach
 */
export async function getCoachVideos(coachId) {
  if (!coachId) return [];
  try {
    const { data, error } = await supabaseServer
      .from('coach_videos')
      .select('*')
      .eq('coach_id', coachId)
      .eq('estado', 'listo')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo videos:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Excepción obteniendo videos:', err);
    return [];
  }
}

/**
 * Obtener rutinas asociadas a un coach
 */
export async function getCoachRutinas(coachId) {
  if (!coachId) return [];
  try {
    const { data, error } = await supabaseServer
      .from('coach_rutinas')
      .select('*, coach_clientes(nombre, email)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo rutinas:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Excepción obteniendo rutinas:', err);
    return [];
  }
}

/**
 * Obtener una rutina específica por su ID
 */
export async function getRutinaById(rutinaId) {
  if (!rutinaId) return null;
  try {
    const { data, error } = await supabaseServer
      .from('coach_rutinas')
      .select('*, coach_clientes(nombre, email)')
      .eq('id', rutinaId)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo rutina:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Excepción obteniendo rutina:', err);
    return null;
  }
}

/**
 * Obtener lista de clientes de un coach
 */
export async function getCoachClientes(coachId) {
  if (!coachId) return [];
  try {
    const { data, error } = await supabaseServer
      .from('coach_clientes')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo clientes:', error);
      return [];
    }

    const parseCliente = (c) => {
      let extra = {};
      if (c.notas && typeof c.notas === 'string' && (c.notas.startsWith('{') || c.notas.startsWith('['))) {
        try {
          extra = JSON.parse(c.notas);
        } catch (e) {
          extra = { notas_privadas: c.notas };
        }
      } else if (c.notas) {
        extra = { notas_privadas: c.notas };
      }
      return {
        ...c,
        objetivo: extra.objetivo || 'Hipertrofia',
        nivel: extra.nivel || 'Intermedio',
        peso_kg: extra.peso_kg || null,
        altura_cm: extra.altura_cm || null,
        grasa_corporal: extra.grasa_corporal || null,
        tiene_masa_muscular_alta: Boolean(extra.tiene_masa_muscular_alta || extra.es_avanzado),
        lesiones: extra.lesiones || '',
        rutina_activa_id: extra.rutina_activa_id || null,
        rutina_nombre: extra.rutina_nombre || null,
        plan_suscripcion: extra.plan_suscripcion || 'Mensual',
        fecha_vencimiento: extra.fecha_vencimiento || null,
        calorias_meta: extra.calorias_meta || null,
        proteinas_meta: extra.proteinas_meta || null,
        carbohidratos_meta: extra.carbohidratos_meta || null,
        grasas_meta: extra.grasas_meta || null,
        notas_privadas: extra.notas_privadas || '',
        historial_medidas: Array.isArray(extra.historial_medidas) ? extra.historial_medidas : [],
      };
    };

    return (data || []).map(parseCliente);
  } catch (err) {
    console.error('Excepción obteniendo clientes:', err);
    return [];
  }
}

/**
 * Obtener ejercicios de la base global (tabla_ejercicios)
 */
export async function getEjerciciosGlobales() {
  try {
    const { data, error } = await supabaseServer
      .from('tabla_ejercicios')
      .select('*')
      .order('nombre_ejercicio', { ascending: true });

    if (error) {
      console.error('Error obteniendo ejercicios globales:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Excepción obteniendo ejercicios globales:', err);
    return [];
  }
}

/**
 * Obtener ejercicios personalizados creados por el coach
 */
export async function getEjerciciosCoach(coachId) {
  if (!coachId) return [];
  try {
    const { data, error } = await supabaseServer
      .from('coach_ejercicios')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo ejercicios del coach:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Excepción obteniendo ejercicios del coach:', err);
    return [];
  }
}
