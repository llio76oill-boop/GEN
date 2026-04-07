import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE() {
  const tables = ['operators', 'owned_generators', 'owners', 'faults', 'notifications', 'generators'];
  const results: Record<string, number> = {};

  for (const table of tables) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('is_mock', true)
      .select('id');

    if (error) {
      return NextResponse.json(
        { error: `Failed to delete from ${table}: ${error.message}` },
        { status: 500 }
      );
    }
    results[table] = data?.length ?? 0;
  }

  return NextResponse.json({ deleted: results });
}
