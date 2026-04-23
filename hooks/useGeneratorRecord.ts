import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenRecord {
  id:            number;
  area:          string;
  power:         number;
  status:        'online-grid' | 'online-gen' | 'fault' | 'offline';
  hours:         number;
  owner_name:    string;
  owner_phone:   string;
  address:       string;
  capacity_amps: number;
  price_per_amp: number;
  fuel_quota:    number;
  notes:         string;
}

export interface GenOperator {
  id:          number;
  gen_id:      number;
  name:        string;
  phone:       string;
  shift:       'صباحي' | 'مسائي' | 'ليلي';
  shift_start: string;
  shift_end:   string;
  active:      boolean;
}

export interface GenSubscriber {
  id:          number;
  gen_id:      number;
  full_name:   string;
  phone:       string | null;
  amps:        number;
  sub_type:    'residential' | 'commercial';
  monthly_fee: number;
  active:      boolean;
  notes:       string | null;
  created_at:  string;
}

export interface GenLog {
  id:        number;
  gen_id:    number;
  event:     'start' | 'stop' | 'fault' | 'refuel' | 'maintenance';
  note:      string | null;
  fuel_added:number;
  logged_at: string;
  logged_by: string;
}

export interface UseGeneratorRecordReturn {
  record:      GenRecord | null;
  operators:   GenOperator[];
  subscribers: GenSubscriber[];
  logs:        GenLog[];
  loading:     boolean;
  error:       string | null;
  refresh:     () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeneratorRecord(genId: number): UseGeneratorRecordReturn {
  const [record,      setRecord]      = useState<GenRecord | null>(null);
  const [operators,   setOperators]   = useState<GenOperator[]>([]);
  const [subscribers, setSubscribers] = useState<GenSubscriber[]>([]);
  const [logs,        setLogs]        = useState<GenLog[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [tick,        setTick]        = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!genId) return;
    setLoading(true);
    setError(null);

    (async () => {
      const [genRes, opsRes, subsRes, logsRes] = await Promise.all([
        supabase.from('generators')
          .select('id, area, power, status, hours, owner_name, owner_phone, address, capacity_amps, price_per_amp, fuel_quota, notes')
          .eq('id', genId)
          .single(),
        supabase.from('generator_operators')
          .select('*')
          .eq('gen_id', genId)
          .order('shift'),
        supabase.from('generator_subscribers')
          .select('*')
          .eq('gen_id', genId)
          .order('full_name'),
        supabase.from('generator_logs')
          .select('*')
          .eq('gen_id', genId)
          .order('logged_at', { ascending: false })
          .limit(500),
      ]);

      if (genRes.error) { setError(genRes.error.message); setLoading(false); return; }
      setRecord(genRes.data as GenRecord);
      setOperators((opsRes.data ?? []) as GenOperator[]);
      setSubscribers((subsRes.data ?? []) as GenSubscriber[]);
      setLogs((logsRes.data ?? []) as GenLog[]);
      setLoading(false);
    })();
  }, [genId, tick]);

  return { record, operators, subscribers, logs, loading, error, refresh };
}
