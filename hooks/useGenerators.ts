import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type GeneratorStatus = 'online-grid' | 'online-gen' | 'fault' | 'offline';

export interface Generator {
  id: number;
  lat: number;
  lng: number;
  status: GeneratorStatus;
  power: number;
  area: string;
  hours: number;
}

export const STATUS_COLOR: Record<GeneratorStatus, string> = {
  'online-grid': '#10b981',
  'online-gen':  '#3b82f6',
  'fault':       '#f97316',
  'offline':     '#ef4444',
};

export const STATUS_LABEL: Record<GeneratorStatus, string> = {
  'online-grid': 'شبكة وطنية',
  'online-gen':  'مولد نشط',
  'fault':       'عطل',
  'offline':     'غير متصل',
};

export const STATUS_BG: Record<GeneratorStatus, string> = {
  'online-grid': 'rgba(16,185,129,0.12)',
  'online-gen':  'rgba(59,130,246,0.12)',
  'fault':       'rgba(249,115,22,0.12)',
  'offline':     'rgba(107,114,128,0.12)',
};

export function useGenerators() {
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    supabase
      .from('generators')
      .select('id, lat, lng, status, power, area, hours')
      .then(({ data }) => {
        setGenerators((data ?? []) as Generator[]);
        setLoading(false);
      });
  }, []);

  return { generators, loading };
}
