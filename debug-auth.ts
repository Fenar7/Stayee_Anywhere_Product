import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Logging in...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@nexthome.io',
    password: 'Password@123',
  });

  if (error) {
    console.error('Login failed:', error);
    return;
  }

  console.log('Login successful. Session:', data.session?.user.id);
  
  // Wait a few seconds for the dev server to be ready
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log('Fetching /admin/hostels...');
  const cookieHeader = `sb-auth-token-0=${data.session.access_token}; sb-auth-token-1=${data.session.refresh_token}`;
  
  const res = await fetch('http://localhost:3000/admin/hostels', {
    headers: {
      'Cookie': cookieHeader,
      'RSC': '1', // Simulate client-side navigation
    }
  });

  console.log('Status:', res.status);
  console.log('Headers:', res.headers);
  const text = await res.text();
  if (text.includes('redirect')) {
    console.log('Redirects to:', text);
  } else {
    console.log('Length:', text.length);
  }
}

run();
