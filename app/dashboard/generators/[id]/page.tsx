import { createClient } from '@supabase/supabase-js';
import GeneratorProfilePage from './_client';

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    // owned_generators by code
    const { data: owned } = await sb.from('owned_generators').select('code').neq('is_mock', true);
    const codeParams = (owned ?? []).map((g: { code: string }) => ({ id: g.code }));

    // generators by numeric id (1-10)
    const { data: gens } = await sb.from('generators').select('id');
    const idParams = (gens ?? []).map((g: { id: number }) => ({ id: String(g.id) }));

    const all = [...codeParams, ...idParams];
    return all.length ? all : [{ id: '_' }];
  } catch {
    return [{ id: '_' }];
  }
}

export default function Page() {
  return <GeneratorProfilePage />;
}
