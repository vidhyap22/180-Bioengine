import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

// From app.config.js extra (loaded from .env) or process.env
const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = extra.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gmovqnfwwzkrvhovrdss.supabase.co';
const supabaseKey = extra.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_KEY;

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