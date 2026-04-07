import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ownerName, ownerPhone, licenseNo, lat, lng, fuelQuota, operators } = body;

    /* Basic server-side validation */
    if (!ownerName || !ownerPhone || !licenseNo || lat == null || lng == null) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }
    if (!/^07[0-9]{9}$/.test(ownerPhone)) {
      return NextResponse.json({ error: 'رقم هاتف غير صالح' }, { status: 400 });
    }
    if (!Array.isArray(operators) || operators.length === 0) {
      return NextResponse.json({ error: 'يجب إضافة مشغل واحد على الأقل' }, { status: 400 });
    }

    /* Insert the pending generator */
    const { data: gen, error: genErr } = await supabaseAdmin
      .from('generators_pending')
      .insert({
        owner_name: ownerName,
        owner_phone: ownerPhone,
        license_no: licenseNo,
        lat,
        lng,
        fuel_quota: fuelQuota || 0,
        price_per_hour: 38,
        status: 'pending',
      })
      .select('id')
      .single();

    if (genErr) throw genErr;

    /* Insert operators */
    const opRows = operators.map((op: { name: string; phone: string; shiftStart: string; shiftEnd: string }) => ({
      pending_gen_id: gen.id,
      name: op.name,
      phone: op.phone,
      shift_start: op.shiftStart,
      shift_end: op.shiftEnd,
    }));

    const { error: opErr } = await supabaseAdmin.from('pending_operators').insert(opRows);
    if (opErr) throw opErr;

    return NextResponse.json({ id: gen.id, status: 'pending' }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'خطأ غير معروف';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('generators_pending')
      .select('*, pending_operators(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'خطأ غير معروف';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
