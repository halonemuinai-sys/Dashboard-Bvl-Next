const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../.env')
  ];
  
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual !== -1) {
            const key = trimmed.substring(0, firstEqual).trim();
            let val = trimmed.substring(firstEqual + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

async function fetchTableData(supabase, table) {
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  
  console.log(`Mengambil data dari tabel: '${table}'...`);
  
  while (true) {
    // Range query to fetch paginated batches
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      break;
    }
    
    allData = allData.concat(data);
    
    if (data.length < pageSize) {
      break; // Reached end of table
    }
    page++;
  }
  
  console.log(`Sukses mengambil ${allData.length} baris dari tabel '${table}'.`);
  return allData;
}

async function runBackup() {
  loadEnv();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan di .env.local');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const tables = ['clean_master', 'bvlgari_sales', 'targets', 'dashboard_users', 'role_menu_access', 'audit_logs'];
  const backupData = {
    timestamp: new Date().toISOString(),
    projectUrl: supabaseUrl,
    tables: {}
  };
  
  try {
    for (const table of tables) {
      backupData.tables[table] = await fetchTableData(supabase, table);
    }
    
    const outputDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const now = new Date();
    const timestampStr = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
      
    const outputFile = path.join(outputDir, `supabase_client_backup_${timestampStr}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(backupData, null, 2), 'utf8');
    
    const fileStats = fs.statSync(outputFile);
    console.log(`\n🎉 BACKUP SUKSES!`);
    console.log(`Lokasi file: ${outputFile}`);
    console.log(`Ukuran file: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (err) {
    console.error('\n❌ BACKUP GAGAL:', err.message || err);
    process.exit(1);
  }
}

runBackup();
