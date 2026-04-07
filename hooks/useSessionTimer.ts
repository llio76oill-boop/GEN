'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SessionRecord {
  id?: string;
  generator_code: string;
  owner_name: string;
  area: string;
  start_time: string;
  end_time?: string | null;
  total_minutes?: number | null;
  total_cost?: number | null;
  price_per_hour: number;
  status: 'running' | 'completed';
}

interface UseSessionTimerReturn {
  isRunning: boolean;
  elapsedSeconds: number;
  liveCost: number;
  sessionId: string | null;
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  error: string | null;
}

export const RATE_PER_HOUR = 38; // IQD per ampere per hour (official governorate rate)

export function useSessionTimer(generatorCode: string, ownerName: string, area: string): UseSessionTimerReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live cost based on elapsed time
  const liveCost = (elapsedSeconds / 3600) * RATE_PER_HOUR;

  // Check for any active session on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('operating_sessions')
          .select('*')
          .eq('generator_code', generatorCode)
          .eq('status', 'running')
          .order('start_time', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const session = data[0];
          const startMs = new Date(session.start_time).getTime();
          const nowMs = Date.now();
          const elapsed = Math.floor((nowMs - startMs) / 1000);

          setSessionId(session.id);
          setIsRunning(true);
          startTimeRef.current = startMs;
          setElapsedSeconds(elapsed);
        }
      } catch {
        // Table might not exist yet — work offline
      }
    })();
  }, [generatorCode]);

  // Timer tick every second
  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const startSession = useCallback(async () => {
    setError(null);
    const now = new Date().toISOString();
    startTimeRef.current = Date.now();
    setIsRunning(true);
    setElapsedSeconds(0);

    try {
      const { data, error: dbError } = await supabase
        .from('operating_sessions')
        .insert({
          generator_code: generatorCode,
          owner_name: ownerName,
          area,
          start_time: now,
          price_per_hour: RATE_PER_HOUR,
          status: 'running',
        })
        .select('id')
        .single();

      if (dbError) throw dbError;
      if (data) setSessionId(data.id);
    } catch (e: unknown) {
      // Optimistic — UI already started, log error
      const msg = e instanceof Error ? e.message : 'خطأ في الاتصال بقاعدة البيانات';
      setError(msg);
    }
  }, [generatorCode, ownerName, area]);

  const stopSession = useCallback(async () => {
    setError(null);
    const endTime = new Date().toISOString();
    const totalMinutes = Math.round((elapsedSeconds / 60) * 100) / 100;
    const totalCost = Math.round(liveCost * 100) / 100;

    // Stop UI immediately
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (sessionId) {
      try {
        const { error: dbError } = await supabase
          .from('operating_sessions')
          .update({
            end_time: endTime,
            total_minutes: totalMinutes,
            total_cost: totalCost,
            status: 'completed',
          })
          .eq('id', sessionId);

        if (dbError) throw dbError;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'خطأ في تحديث السجل';
        setError(msg);
      }
    }

    setSessionId(null);
  }, [sessionId, elapsedSeconds, liveCost]);

  return {
    isRunning,
    elapsedSeconds,
    liveCost,
    sessionId,
    startSession,
    stopSession,
    error,
  };
}
