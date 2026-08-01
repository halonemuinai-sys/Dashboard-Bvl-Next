import { createClient } from '@supabase/supabase-js';
import { hashPassword } from './src/utils/auth';

const supabase = createClient(
  'https://vekgzcxorvdidjutuvrj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZla2d6Y3hvcnZkaWRqdXR1dnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTI2NzIsImV4cCI6MjA4OTg2ODY3Mn0.Kz9udMSBq9YbyFsCmQvAWYPjNhplFsNKcjtiDdIi04I'
);

async function runMigration() {
  console.log('--- STARTING USER PASSWORD MIGRATION ---');
  
  const { data: users, error } = await supabase
    .from('dashboard_users')
    .select('id, email, full_name');
    
  if (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }
  
  console.log(`Found ${users.length} users in database.`);
  
  for (const user of users) {
    const emailPrefix = user.email.split('@')[0];
    const defaultPassword = `${emailPrefix}123`;
    
    console.log(`Processing user: ${user.full_name} (${user.email})`);
    console.log(` -> Default Password: ${defaultPassword}`);
    
    const hash = await hashPassword(defaultPassword);
    
    const { error: updateErr } = await supabase
      .from('dashboard_users')
      .update({ password: hash })
      .eq('id', user.id);
      
    if (updateErr) {
      console.error(` -> Error updating user ${user.email}:`, updateErr);
    } else {
      console.log(` -> Successfully updated password hash in database.`);
    }
  }
  
  console.log('\n--- MIGRATION COMPLETED SUCCESSFULLY ---');
}

runMigration();
