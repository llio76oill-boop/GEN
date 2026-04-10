'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  ArrowLeft,
  User,
  MapPin,
  Users,
  Fuel,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

import { supabase } from '@/lib/supabase';

const LocationPicker = dynamic(() => import('@/components/owners/LocationPicker'), { ssr: false });

/* ── Types ── */
interface OperatorField {
  name: string;
  phone: string;
  shiftStart: string;
  shiftEnd: string;
}

interface FormValues {
  ownerName: string;
  ownerPhone: string;
  licenseNo: string;
  lat: number;
  lng: number;
  fuelQuota: number;
  operators: OperatorField[];
}

const STEPS = [
  { id: 0, title: 'معلومات المالك', icon: User },
  { id: 1, title: 'الموقع على الخريطة', icon: MapPin },
  { id: 2, title: 'المشغلون', icon: Users },
  { id: 3, title: 'الوقود والأسعار', icon: Fuel },
];

const PRICE_PER_HOUR = 38;

export default function AddGeneratorPage() {
  const router = useRouter();
  const { toggle, isDark } = useTheme();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      ownerName: '',
      ownerPhone: '',
      licenseNo: '',
      lat: 33.4258,
      lng: 43.2994,
      fuelQuota: 0,
      operators: [{ name: '', phone: '', shiftStart: '06:00', shiftEnd: '14:00' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'operators' });

  const lat = watch('lat');
  const lng = watch('lng');
  const fuelQuota = watch('fuelQuota');

  const handleLocationChange = useCallback(
    (newLat: number, newLng: number) => {
      setValue('lat', newLat);
      setValue('lng', newLng);
    },
    [setValue],
  );

  /* Step validation before advancing */
  const validateStep = async () => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    if (step === 0) fieldsToValidate = ['ownerName', 'ownerPhone', 'licenseNo'];
    if (step === 2) fieldsToValidate = ['operators'];
    if (fieldsToValidate.length === 0) return true;
    return trigger(fieldsToValidate);
  };

  const nextStep = async () => {
    const valid = await validateStep();
    if (valid && step < 3) setStep(step + 1);
  };
  const prevStep = () => step > 0 && setStep(step - 1);

  /* Submit */
  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const { data: gen, error: genErr } = await supabase
        .from('generators_pending')
        .insert({
          owner_name: data.ownerName,
          owner_phone: data.ownerPhone,
          license_no: data.licenseNo,
          lat: data.lat,
          lng: data.lng,
          fuel_quota: data.fuelQuota || 0,
          price_per_hour: 38,
          status: 'pending',
        })
        .select('id')
        .single();
      if (genErr) throw genErr;

      const opRows = data.operators.map((op) => ({
        pending_gen_id: gen.id,
        name: op.name,
        phone: op.phone,
        shift_start: op.shiftStart,
        shift_end: op.shiftEnd,
      }));
      const { error: opErr } = await supabase.from('pending_operators').insert(opRows);
      if (opErr) throw opErr;

      setSubmitted(true);
    } catch {
      alert('حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          >
            <CheckCircle2 className="w-20 h-20 mx-auto mb-6 text-emerald-400" />
          </motion.div>
          <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text-1)' }}>
            تم إرسال الطلب بنجاح
          </h2>
          <p className="text-sm mb-2" style={{ color: 'var(--text-3)' }}>
            طلبك الآن
          </p>
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold mb-6"
            style={{
              background: 'rgba(251,191,36,0.12)',
              color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.25)',
            }}
          >
            ⏳ قيد موافقة الإدارة
          </div>
          <p className="text-xs mb-8" style={{ color: 'var(--text-5)' }}>
            سيتم إشعارك فور مراجعة الطلب والموافقة عليه من قبل إدارة المنظومة
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/owners')}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'rgba(59,130,246,0.12)',
                color: '#3b82f6',
                border: '1px solid rgba(59,130,246,0.25)',
              }}
            >
              العودة للبوابة
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setStep(0);
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                color: 'var(--text-3)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              إضافة مولدة أخرى
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Input style helper ── */
  const inputStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    border: '1px solid var(--border-normal)',
    color: 'var(--text-1)',
    borderRadius: '0.75rem',
    padding: '0.65rem 1rem',
    width: '100%',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-ibm-arabic)',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginBottom: '0.4rem',
    color: 'var(--text-2)',
    fontFamily: 'var(--font-ibm-arabic)',
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    color: '#f87171',
    marginTop: '0.25rem',
    fontFamily: 'var(--font-ibm-arabic)',
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 backdrop-blur-xl"
        style={{
          background: isDark ? 'rgba(10,10,20,0.85)' : 'rgba(255,255,255,0.85)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={() => router.push('/owners')}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          رجوع
          <ArrowRight className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
          إضافة مولدة جديدة
        </h1>
        <button
          onClick={toggle}
          className="p-2 rounded-full transition-all"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            color: 'var(--text-1)',
          }}
        >
          {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 py-5 px-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all"
                style={{
                  background: active
                    ? 'rgba(16,185,129,0.15)'
                    : done
                    ? 'rgba(16,185,129,0.08)'
                    : isDark
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.03)',
                  color: active ? '#10b981' : done ? '#10b981' : 'var(--text-5)',
                  border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'transparent'}`,
                  cursor: i < step ? 'pointer' : 'default',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.title}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className="w-6 h-px"
                  style={{ background: done ? '#10b981' : 'var(--border-subtle)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Form body */}
      <div className="flex-1 flex items-start justify-center px-4 pb-32">
        <div className="w-full max-w-xl">
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {/* ── Step 0: Owner info ── */}
              {step === 0 && (
                <motion.div
                  key="s0"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="glass-card p-6 sm:p-8 space-y-5"
                >
                  <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                    <User className="w-5 h-5 text-blue-400" />
                    معلومات المالك والترخيص
                  </h2>
                  <div>
                    <label style={labelStyle}>اسم صاحب المولدة</label>
                    <input
                      {...register('ownerName', { required: 'الاسم مطلوب' })}
                      placeholder="مثال: أحمد عبد الله"
                      style={inputStyle}
                    />
                    {errors.ownerName && <p style={errorStyle}>{errors.ownerName.message}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>رقم الهاتف</label>
                    <input
                      {...register('ownerPhone', {
                        required: 'رقم الهاتف مطلوب',
                        pattern: { value: /^07[0-9]{9}$/, message: 'يجب أن يبدأ بـ 07 ويحتوي 11 رقم' },
                      })}
                      placeholder="07XXXXXXXXX"
                      dir="ltr"
                      style={{ ...inputStyle, textAlign: 'left' }}
                    />
                    {errors.ownerPhone && <p style={errorStyle}>{errors.ownerPhone.message}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>رقم إجازة التشغيل</label>
                    <input
                      {...register('licenseNo', { required: 'رقم الإجازة مطلوب' })}
                      placeholder="مثال: LIC-2024-001"
                      dir="ltr"
                      style={{ ...inputStyle, textAlign: 'left' }}
                    />
                    {errors.licenseNo && <p style={errorStyle}>{errors.licenseNo.message}</p>}
                  </div>
                </motion.div>
              )}

              {/* ── Step 1: Location ── */}
              {step === 1 && (
                <motion.div
                  key="s1"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="glass-card p-6 sm:p-8 space-y-5"
                >
                  <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    موقع المولدة
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                    انقر على الخريطة لتحديد موقع المولدة في مدينة الرمادي
                  </p>
                  <LocationPicker lat={lat} lng={lng} onChange={handleLocationChange} />
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label style={labelStyle}>خط العرض</label>
                      <input
                        value={lat.toFixed(6)}
                        readOnly
                        dir="ltr"
                        style={{ ...inputStyle, textAlign: 'left', opacity: 0.7 }}
                      />
                    </div>
                    <div className="flex-1">
                      <label style={labelStyle}>خط الطول</label>
                      <input
                        value={lng.toFixed(6)}
                        readOnly
                        dir="ltr"
                        style={{ ...inputStyle, textAlign: 'left', opacity: 0.7 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Operators ── */}
              {step === 2 && (
                <motion.div
                  key="s2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="glass-card p-6 sm:p-8 space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                      <Users className="w-5 h-5 text-purple-400" />
                      المشغلون
                    </h2>
                    <button
                      type="button"
                      onClick={() => append({ name: '', phone: '', shiftStart: '06:00', shiftEnd: '14:00' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
                      style={{
                        background: 'rgba(16,185,129,0.12)',
                        color: '#10b981',
                        border: '1px solid rgba(16,185,129,0.25)',
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة مشغل
                    </button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="rounded-2xl p-4 space-y-3"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
                            مشغل {index + 1}
                          </span>
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2 sm:col-span-1">
                            <label style={labelStyle}>الاسم</label>
                            <input
                              {...register(`operators.${index}.name`, { required: 'مطلوب' })}
                              placeholder="اسم المشغل"
                              style={inputStyle}
                            />
                            {errors.operators?.[index]?.name && (
                              <p style={errorStyle}>{errors.operators[index].name?.message}</p>
                            )}
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <label style={labelStyle}>رقم الهاتف</label>
                            <input
                              {...register(`operators.${index}.phone`, {
                                required: 'مطلوب',
                                pattern: { value: /^07[0-9]{9}$/, message: '07XXXXXXXXX' },
                              })}
                              placeholder="07XXXXXXXXX"
                              dir="ltr"
                              style={{ ...inputStyle, textAlign: 'left' }}
                            />
                            {errors.operators?.[index]?.phone && (
                              <p style={errorStyle}>{errors.operators[index].phone?.message}</p>
                            )}
                          </div>
                          <div>
                            <label style={labelStyle}>بداية الوردية</label>
                            <input
                              type="time"
                              {...register(`operators.${index}.shiftStart`, { required: 'مطلوب' })}
                              style={{ ...inputStyle, textAlign: 'left' }}
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>نهاية الوردية</label>
                            <input
                              type="time"
                              {...register(`operators.${index}.shiftEnd`, { required: 'مطلوب' })}
                              style={{ ...inputStyle, textAlign: 'left' }}
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Fuel & Pricing ── */}
              {step === 3 && (
                <motion.div
                  key="s3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="glass-card p-6 sm:p-8 space-y-5"
                >
                  <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
                    <Fuel className="w-5 h-5 text-amber-400" />
                    حصة الوقود والتسعيرة
                  </h2>

                  <div>
                    <label style={labelStyle}>حصة الوقود الشهرية (لتر)</label>
                    <input
                      type="number"
                      {...register('fuelQuota', {
                        required: 'حصة الوقود مطلوبة',
                        min: { value: 0, message: 'يجب أن تكون أكبر من 0' },
                        valueAsNumber: true,
                      })}
                      placeholder="مثال: 5000"
                      dir="ltr"
                      style={{ ...inputStyle, textAlign: 'left' }}
                    />
                    {errors.fuelQuota && <p style={errorStyle}>{errors.fuelQuota.message}</p>}
                  </div>

                  {/* Official rate display */}
                  <div
                    className="rounded-2xl p-5 space-y-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.05))',
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}
                  >
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: '#10b981' }}>
                      📋 التسعيرة الرسمية
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-4)' }}>سعر الأمبير / ساعة</p>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }} dir="ltr">
                          {PRICE_PER_HOUR} <span className="text-xs font-normal" style={{ color: 'var(--text-4)' }}>د.ع</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-4)' }}>الحصة الشهرية</p>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-1)' }} dir="ltr">
                          {(fuelQuota || 0).toLocaleString()} <span className="text-xs font-normal" style={{ color: 'var(--text-4)' }}>لتر</span>
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: 'var(--text-5)' }}>
                      * التسعيرة محددة بموجب قرار محافظة الأنبار — لا يمكن تعديلها
                    </p>
                  </div>

                  {/* Summary */}
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-2)' }}>
                      ملخص الطلب
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-4)' }}>عدد المشغلين</span>
                        <span style={{ color: 'var(--text-1)' }}>{fields.length}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-4)' }}>إحداثيات الموقع</span>
                        <span style={{ color: 'var(--text-1)' }} dir="ltr">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-4)' }}>التسعيرة الرسمية</span>
                        <span style={{ color: '#10b981' }}>{PRICE_PER_HOUR} د.ع/أمبير/ساعة</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="fixed bottom-0 inset-x-0 z-40 px-4 py-4 backdrop-blur-xl" style={{
              background: isDark ? 'rgba(10,10,20,0.9)' : 'rgba(255,255,255,0.9)',
              borderTop: '1px solid var(--border-subtle)',
            }}>
              <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      color: 'var(--text-3)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <ArrowRight className="w-4 h-4" />
                    السابق
                  </button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                    }}
                  >
                    التالي
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: submitting
                        ? 'rgba(16,185,129,0.5)'
                        : 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      boxShadow: submitting ? 'none' : '0 4px 14px rgba(16,185,129,0.3)',
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        إرسال الطلب
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
