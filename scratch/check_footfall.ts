import { supabase } from './src/lib/supabase';

async function checkFootfallData() {
  console.log('Checking footfall_store table...');
  const { data, error } = await supabase
    .from('footfall_store')
    .select('*')
    .limit(10);

  if (error) {
    console.error('Error fetching data:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('Table "footfall_store" does not exist yet.');
    }
  } else {
    console.log(`Found ${data?.length || 0} rows.`);
    if (data && data.length > 0) {
      console.log('Sample data:', JSON.stringify(data[0], null, 2));
    }
  }
}

checkFootfallData();
