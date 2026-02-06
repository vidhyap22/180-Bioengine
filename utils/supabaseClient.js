import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { REACT_APP_SB_API_KEY } from '@env';

const supabaseUrl = 'https://gmovqnfwwzkrvhovrdss.supabase.co';
const supabaseKey = REACT_APP_SB_API_KEY;

if (!supabaseKey) {
  console.error('Missing Supabase API key');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Session change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT') {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
});