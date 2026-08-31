import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseServer } from './supabaseServer';

/**
 * Crear un cliente Supabase que lee las cookies de sesión del usuario.
 * Para usar en Server Components, Route Handlers, y Server Actions.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll puede fallar en Server Components (son read-only).
            // Esto es seguro de ignorar si el middleware refresca la sesión.
          }
        },
      },
    }
  );
}

/**
 * Obtener el usuario autenticado actual desde las cookies de sesión.
 * Retorna { user } o null si no hay sesión válida.
 */
export async function getSessionUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Verificar que el usuario autenticado es el coach dueño del tenant.
 * Retorna { user, coach } o null si no autorizado.
 * 
 * @param {string} tenantSlug - El slug del tenant (subdominio)
 */
export async function getAuthenticatedCoach(tenantSlug) {
  const user = await getSessionUser();
  if (!user) return null;

  // Buscar el coach con ese slug y verificar que pertenece al usuario autenticado
  const { data: coach, error } = await supabaseServer
    .from('coaches')
    .select('*')
    .eq('slug', tenantSlug.toLowerCase())
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !coach) return null;

  return { user, coach, id: coach.id, coachId: coach.id };
}

/**
 * Validar autenticación en API Route Handlers.
 * Extrae el token del header Authorization: Bearer <token>
 * y valida con Supabase. Retorna { user, coach } o null.
 * 
 * @param {Request} request - La request de la API route
 */
export async function authenticateApiRequest(request) {
  try {
    // 1. Intentar obtener el token del header Authorization
    const authHeader = request.headers.get('Authorization');
    let user = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      // Crear un cliente temporal con el token del usuario
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseWithToken = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` }
          }
        }
      );
      
      const { data, error } = await supabaseWithToken.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    }

    // 2. Fallback: intentar desde cookies (para fetch desde el mismo dominio)
    if (!user) {
      user = await getSessionUser();
    }

    if (!user) return null;

    // 3. Buscar el perfil de coach del usuario autenticado
    const { data: coach, error: coachError } = await supabaseServer
      .from('coaches')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (coachError || !coach) return null;

    return {
      user,
      coach,
      coachId: coach.id,
      isAuthorized: true,
    };
  } catch (err) {
    console.error('Error en authenticateApiRequest:', err);
    return null;
  }
}
