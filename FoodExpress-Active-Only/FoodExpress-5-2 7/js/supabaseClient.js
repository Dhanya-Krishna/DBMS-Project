/**
 * FoodExpress - Supabase Client
 */

const SUPABASE_URL = 'https://wtzczwkdtlwerhdcoygx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lmbPH0tQlG6-YzsWGH2gSA_GAHnOWMx';

function initSupabase() {
  if (window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client ready');
    return true;
  }
  return false;
}

// Try immediately
if (!initSupabase()) {
  // If not ready yet, try again after a short delay
  document.addEventListener('DOMContentLoaded', initSupabase);
  setTimeout(initSupabase, 500);
}