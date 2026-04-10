import { createClient } from '@supabase/supabase-js';
import GeneratorProfilePage from './_client';

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await sb
      .from('owned_generators')
      .select('code')
      .neq('is_mock', true);
    const params = (data ?? []).map((g: { code: string }) => ({ id: g.code }));
    return params.length ? params : [{ id: '_' }];
  } catch {
    return [{ id: '_' }];
  }
}

export default function Page() {
  return <GeneratorProfilePage />;
}
