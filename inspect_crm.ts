import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env.local manually
const envLocal = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
envLocal.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function inspectCrmCutoff() {
  const cutoffDates = ['2024-05-31', '2025-05-31', '2026-05-31'];
  
  for (const date of cutoffDates) {
    const { data, error } = await supabase
      .from('crm_profiling')
      .select('lokasi_store')
      .lte('tanggal_input', date);
      
    if (error) {
      console.error("Error for date", date, ":", error);
      continue;
    }
    
    const counts: Record<string, number> = { PI: 0, PS: 0, Bali: 0, Others: 0 };
    data.forEach((row: any) => {
      const loc = (row.lokasi_store || '').toLowerCase();
      if (loc.includes('intermark') || loc === 'pi' || loc.includes('indonesia')) {
        counts.PI++;
      } else if (loc.includes('superstore') || loc === 'ps' || loc.includes('senayan')) {
        counts.PS++;
      } else if (loc.includes('bali')) {
        counts.Bali++;
      } else {
        counts.Others++;
      }
    });
    
    console.log(`Cutoff: ${date} -> Total: ${data.length}`, counts);
  }
}

inspectCrmCutoff();
