import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vekgzcxorvdidjutuvrj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZla2d6Y3hvcnZkaWRqdXR1dnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTI2NzIsImV4cCI6MjA4OTg2ODY3Mn0.Kz9udMSBq9YbyFsCmQvAWYPjNhplFsNKcjtiDdIi04I'
);

async function checkData() {
  console.log('--- TEST RUNNING getDpsSvcTransactions BEHAVIOR ---');
  const month = 'July';
  const year = 2026;

  const monthIndex = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(month);
  const mStart = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const mEnd   = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  console.log(`mStart: ${mStart}, mEnd: ${mEnd}`);

  const { data, error } = await supabase
    .from('bvlgari_sales')
    .select('id, transaction_no, transaction_date, collection, price, qty, net_sales')
    .gte('transaction_date', mStart)
    .lte('transaction_date', mEnd)
    .in('collection', ['DPS', 'SVC'])
    .order('transaction_date', { ascending: true });

  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log(`Successfully fetched ${data?.length || 0} rows.`);
    console.log('Sample rows:', data?.slice(0, 5));
  }
}

checkData();
