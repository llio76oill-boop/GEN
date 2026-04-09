import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  totalGenerators: number;
  totalAreas:      number;
  totalOperators:  number;
  faultCount:      number;
  offlineCount:    number;
  onlineGridCount: number;
  onlineGenCount:  number;
  avgHours:        number;
  totalPowerKW:    number;
  onlinePowerKW:   number;
}

const EMPTY: DashboardStats = {
  totalGenerators: 0,
  totalAreas:      0,
  totalOperators:  0,
  faultCount:      0,
  offlineCount:    0,
  onlineGridCount: 0,
  onlineGenCount:  0,
  avgHours:        0,
  totalPowerKW:    0,
  onlinePowerKW:   0,
};

export function useDashboardStats() {
  const [stats,   setStats]   = useState<DashboardStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Run all counts in parallel
        const [
          { count: totalGenerators },
          { count: totalAreas },
          { count: totalOperators },
          { count: faultCount },
          { count: offlineCount },
          { count: onlineGridCount },
          { count: onlineGenCount },
          { data: powerData },
        ] = await Promise.all([
          supabase.from('generators').select('*', { count: 'exact', head: true }),
          supabase.from('areas').select('*', { count: 'exact', head: true }),
          supabase.from('operators').select('*', { count: 'exact', head: true }),
          supabase.from('generators').select('*', { count: 'exact', head: true }).eq('status', 'fault'),
          supabase.from('generators').select('*', { count: 'exact', head: true }).eq('status', 'offline'),
          supabase.from('generators').select('*', { count: 'exact', head: true }).eq('status', 'online-grid'),
          supabase.from('generators').select('*', { count: 'exact', head: true }).eq('status', 'online-gen'),
          supabase.from('generators').select('power, hours, status'),
        ]);

        const rows        = powerData ?? [];
        const totalPowerKW  = rows.reduce((s: number, r: { power: number }) => s + (r.power ?? 0), 0);
        const onlinePowerKW = rows
          .filter((r: { status: string }) => r.status === 'online-grid' || r.status === 'online-gen')
          .reduce((s: number, r: { power: number }) => s + (r.power ?? 0), 0);
        const avgHours = rows.length
          ? Math.round(rows.reduce((s: number, r: { hours: number }) => s + (r.hours ?? 0), 0) / rows.length)
          : 0;

        setStats({
          totalGenerators: totalGenerators ?? 0,
          totalAreas:      totalAreas      ?? 0,
          totalOperators:  totalOperators  ?? 0,
          faultCount:      faultCount      ?? 0,
          offlineCount:    offlineCount    ?? 0,
          onlineGridCount: onlineGridCount ?? 0,
          onlineGenCount:  onlineGenCount  ?? 0,
          avgHours,
          totalPowerKW,
          onlinePowerKW,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { stats, loading };
}
