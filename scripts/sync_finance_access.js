const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const paths = [
  '/operations-sales',
  '/finance-reconciliation',
  '/finance-payment-analytics',
  '/finance-mdr-setup',
  '/installment-guide'
];

async function run() {
  // Clear any extra paths for role 'finance'
  await supabase.from('role_menu_access').delete().eq('role', 'finance');

  const rows = paths.map(p => ({ role: 'finance', menu_path: p, allowed: true }));
  const { data, error } = await supabase.from('role_menu_access').upsert(rows, { onConflict: 'role,menu_path' });
  if (error) {
    console.error('Error upserting role_menu_access:', error);
  } else {
    console.log('Successfully synced', rows.length, 'strictly allowed menu paths for role finance to Supabase!');
  }
}
run();
