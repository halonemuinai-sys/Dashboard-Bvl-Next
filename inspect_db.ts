import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTargets() {
  console.log("Checking targets table structure...");
  const { data, error } = await supabase.from('targets').select('*').limit(1);
  
  if (error) {
    console.error("Error fetching targets:", error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log("Found columns:", Object.keys(data[0]));
    console.log("Sample row:", data[0]);
  } else {
    console.log("Table 'targets' is empty or does not exist as expected.");
  }
}

inspectTargets();
