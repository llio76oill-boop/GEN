import { GeneratorStatus } from './generators';

export interface Operator {
  id: number;
  name: string;
  phone: string;
  shift: 'صباحي' | 'مسائي' | 'ليلي';
  shiftStart: string;
  shiftEnd: string;
  active: boolean;
}

export interface OwnedGenerator {
  code: string;
  area: string;
  power: number;
  status: GeneratorStatus;
  totalHours: number;
  operators: Operator[];
}

export interface Owner {
  id: number;
  name: string;
  phone: string;
  initials: string;
  ownedSince: string;
  generators: OwnedGenerator[];
}

// Static data removed — use Supabase `owners` table directly.
export const OWNERS: Owner[] = [];
