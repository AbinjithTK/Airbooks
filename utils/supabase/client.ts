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
          // Use the PKCE flow. PKCE returns the auth result as a `?code=...`
          // QUERY parameter, which the figma.site static host preserves.
          // Implicit flow returns tokens in the URL `#fragment`, which
          // figma.site strips on hydration before the app can read it — the
          // session was being silently dropped and the user bounced back to
          // login. PKCE's code verifier is stored in localStorage and survives
          // the same-origin, top-level (non-iframe) redirect used by the
          // published site, so the code exchange succeeds.
          flowType: 'pkce',
        },
      },
    );
  }
  return _client;
}
