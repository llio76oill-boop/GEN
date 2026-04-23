import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeneratorProfile {
  id:                     number;
  code:                   string;
  area:                   string;
  power:                  number;
  status:                 'online-grid' | 'online-gen' | 'fault' | 'offline';
  total_hours:            number;
  license_number:         string | null;
  address:                string | null;
  monthly_fuel_quota:     number | null;
  thingspeak_channel_id:  string | null;
  thingspeak_read_key:    string | null;
  thingspeak_fields_map:  Record<string, string> | null;
  owner_name:             string;
  owner_phone:            string;
  owner_initials:         string;
  owned_since:            string;
}

export interface TsFeed {
  entry_id:   number;
  created_at: string;
  field1:     string | null;
}

export interface ThingSpeakData {
  channel: {
    id:            number;
    name:          string;
    last_entry_id: number;
    updated_at:    string;
  };
  feeds: TsFeed[];
}

interface UseGeneratorDataReturn {
  profile:       GeneratorProfile | null;
  tsData:        ThingSpeakData | null;
  loadingProfile: boolean;
  loadingTs:      boolean;
  errorProfile:   string | null;
  errorTs:        string | null;
  refetchTs:      () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGeneratorData(generatorId: string | number): UseGeneratorDataReturn {
  const [profile,        setProfile]        = useState<GeneratorProfile | null>(null);
  const [tsData,         setTsData]         = useState<ThingSpeakData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingTs,      setLoadingTs]      = useState(false);
  const [errorProfile,   setErrorProfile]   = useState<string | null>(null);
  const [errorTs,        setErrorTs]        = useState<string | null>(null);
  const [tsTrigger,      setTsTrigger]      = useState(0);

  // ── 1. Fetch profile from Supabase ─────────────────────────────────────────
  useEffect(() => {
    if (!generatorId) return;
    setLoadingProfile(true);
    setErrorProfile(null);

    (async () => {
      // Try by code string first (e.g. "Genrator 1"), otherwise by numeric id
      const isNumeric = !isNaN(Number(generatorId));

      const { data, error } = await supabase
        .from('owned_generators')
        .select(`
          id,
          code,
          area,
          power,
          status,
          total_hours,
          license_number,
          address,
          monthly_fuel_quota,
          thingspeak_channel_id,
          thingspeak_read_key,
          thingspeak_fields_map,
          owners (
            name,
            phone,
            initials,
            owned_since
          )
        `)
        .eq(isNumeric ? 'id' : 'code', isNumeric ? Number(generatorId) : generatorId)
        .single();

      if (error || !data) {
        // Fallback: fetch basic info from generators table
        if (isNumeric) {
          const { data: gen } = await supabase
            .from('generators')
            .select('id, area, power, status, hours, lat, lng')
            .eq('id', Number(generatorId))
            .single();
          if (gen) {
            setProfile({
              id:                    gen.id,
              code:                  `GEN-${String(gen.id).padStart(3, '0')}`,
              area:                  gen.area,
              power:                 gen.power,
              status:                gen.status as GeneratorProfile['status'],
              total_hours:           gen.hours,
              license_number:        null,
              address:               null,
              monthly_fuel_quota:    null,
              thingspeak_channel_id: null,
              thingspeak_read_key:   null,
              thingspeak_fields_map: null,
              owner_name:            '—',
              owner_phone:           '—',
              owner_initials:        '—',
              owned_since:           '—',
            });
            setLoadingProfile(false);
            return;
          }
        }
        setErrorProfile(error?.message ?? 'المولد غير موجود');
        setLoadingProfile(false);
        return;
      }

      const owner = Array.isArray(data.owners) ? data.owners[0] : data.owners;

      setProfile({
        id:                    data.id,
        code:                  data.code,
        area:                  data.area,
        power:                 data.power,
        status:                data.status as GeneratorProfile['status'],
        total_hours:           data.total_hours,
        license_number:        data.license_number,
        address:               data.address,
        monthly_fuel_quota:    data.monthly_fuel_quota,
        thingspeak_channel_id:  data.thingspeak_channel_id,
        thingspeak_read_key:    data.thingspeak_read_key,
        thingspeak_fields_map:  (data.thingspeak_fields_map as Record<string, string> | null) ?? null,
        owner_name:             owner?.name     ?? '—',
        owner_phone:            owner?.phone    ?? '—',
        owner_initials:         owner?.initials ?? '—',
        owned_since:            owner?.owned_since ?? '—',
      });
      setLoadingProfile(false);
    })();
  }, [generatorId]);

  // ── 2. Fetch ThingSpeak once profile is ready ──────────────────────────────
  useEffect(() => {
    if (!profile?.thingspeak_channel_id || !profile?.thingspeak_read_key) return;

    setLoadingTs(true);
    setErrorTs(null);

    const url = `https://api.thingspeak.com/channels/${profile.thingspeak_channel_id}/fields/1.json?api_key=${profile.thingspeak_read_key}&results=32`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ThingSpeakData>;
      })
      .then((json) => {
        setTsData(json);
        setErrorTs(null);
      })
      .catch((e: Error) => {
        setErrorTs(e.message);
      })
      .finally(() => setLoadingTs(false));
  }, [profile?.thingspeak_channel_id, profile?.thingspeak_read_key, tsTrigger]);

  const refetchTs = () => setTsTrigger((n) => n + 1);

  return { profile, tsData, loadingProfile, loadingTs, errorProfile, errorTs, refetchTs };
}
