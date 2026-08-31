import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: listado, error: err1 } = await supabase.from('listado_ejercicios').select('id, nombre').limit(2);
  console.log('listado_ejercicios:', listado, err1?.message || 'OK');
  
  const { data: coachEj, error: err2 } = await supabase.from('coach_ejercicios').select('id, nombre').limit(2);
  console.log('coach_ejercicios:', coachEj, err2?.message || 'OK');
}

check();
