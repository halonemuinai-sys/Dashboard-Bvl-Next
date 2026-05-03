
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vekgzcxorvdidjutuvrj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZla2d6Y3hvcnZkaWRqdXR1dnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTI2NzIsImV4cCI6MjA4OTg2ODY3Mn0.Kz9udMSBq9YbyFsCmQvAWYPjNhplFsNKcjtiDdIi04I'
);

async function checkData() {
  const { data, count } = await supabase
    .from('clean_master')
    .select('transaction_date, trans_no', { count: 'exact' })
    .gte('transaction_date', '2026-05-01')
    .lte('transaction_date', '2026-05-31');

  console.log('--- CLEAN_MASTER MAY 2026 ---');
  console.log('Total Rows:', count);
  if (data && data.length > 0) {
    console.log('Sample Data:', data.slice(0, 5));
  }
}

checkData();
