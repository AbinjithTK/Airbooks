import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Single shared Supabase browser client (auth + session persistence).
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Parse the OAuth result out of the redirect URL automatically.
          detectSessionInUrl: true,
          // Use the implicit flow (token returned directly in the URL hash)
          // instead of PKCE. PKCE stores a one-time code verifier in page
          // storage, which is lost when the OAuth redirect breaks out of the
          // Figma Make preview iframe — causing the code exchange to fail and
          // bouncing the user back to the login screen. Implicit flow needs no
          // verifier, so the session survives the cross-context redirect.
          flowType: 'implicit',
        },
      },
    );
  }
  return _client;
}
