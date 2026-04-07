require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = url.replace('https://', '').replace('.supabase.co', '');

console.log('Project ref:', projectRef);
console.log('');
console.log('=== Cannot create table programmatically ===');
console.log('The Supabase REST API (PostgREST) does not support DDL (CREATE TABLE).');
console.log('The Management API requires a personal access token, not the service role key.');
console.log('');
console.log('Please run the following SQL in your Supabase Dashboard SQL Editor:');
console.log('Dashboard URL: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
console.log('');
console.log('--- COPY BELOW ---');
console.log(`
CREATE TABLE IF NOT EXISTS operating_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  generator_code text NOT NULL,
  owner_name text NOT NULL,
  area text NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  total_minutes numeric,
  total_cost numeric,
  price_per_hour numeric NOT NULL DEFAULT 38,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE operating_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON operating_sessions FOR ALL USING (true) WITH CHECK (true);
`);
console.log('--- COPY ABOVE ---');
