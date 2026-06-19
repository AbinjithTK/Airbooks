import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '/utils/supabase/client';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-78e76d1f`;

export interface Profile {
  id: string;
  email: string;
  name: string;
  bookCount: number;
}

interface AuthContextType {
  session: Session | null;
  profile: Profile | null;
  accessToken: string | null;
  loading: boolean;
  oauthError: string | null;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null as any);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();

  // ─── Dev bypass: skip real auth on localhost so you can see logged-in screens ───
  const isDevBypass =
    import.meta.env.DEV && window.location.search.includes('dev=true');

  // Capture everything from the URL synchronously at first render — before
  // Supabase's detectSessionInUrl can clear window.location.hash / search.
  const [urlState] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    // Conclusive diagnostic: shows EXACTLY what Google/Supabase returned.
    // - hash has access_token  → tokens arrived, sign-in should succeed
    // - search has code        → PKCE flow (unexpected with implicit config)
    // - both empty             → redirect URL not allow-listed; tokens stripped
    console.log('[AirBooks auth] return URL', {
      origin: window.location.origin,
      hash: window.location.hash || '(empty)',
      search: window.location.search || '(empty)',
    });
    return {
      // Implicit flow: tokens arrive in hash
      accessToken: hash.get('access_token'),
      refreshToken: hash.get('refresh_token'),
      // PKCE flow: code arrives in query string
      pkceCode: query.get('code'),
      // Provider errors
      error: hash.get('error_description') || hash.get('error') ||
             query.get('error_description') || query.get('error'),
    };
  });

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const accessToken = session?.access_token ?? null;

  const loadProfile = async (token: string) => {
    try {
      const res = await fetch(`${SERVER}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { profile } = await res.json();
        setProfile(profile);
        return;
      }
      // 401/403 means the server no longer accepts this session (expired /
      // revoked token). Sign out so the app returns to a clean login state
      // instead of a half-broken session that can't load any data.
      if (res.status === 401 || res.status === 403) {
        console.warn(
          `[AirBooks auth] Session rejected by server (status ${res.status}); signing out.`,
        );
        await supabase.auth.signOut().catch(() => {});
        return;
      }
      console.error('[AirBooks auth] Failed to load profile, status:', res.status);
    } catch (e) {
      // Network error — keep the session; the profile can be retried later via
      // refreshProfile(). Don't sign the user out for a transient blip.
      console.error('[AirBooks auth] Network error loading profile:', e);
    }
  };

  useEffect(() => {
    let active = true;

    // True when we're returning from an OAuth redirect (either flow).
    const isOAuthReturn = !!(
      urlState.accessToken || urlState.refreshToken || urlState.pkceCode
    );

    // Track whether the initial auth state has been resolved.
    // Unlike the previous "settle once" approach, we still process SIGNED_IN /
    // SIGNED_OUT / TOKEN_REFRESHED after init so the session stays live.
    let initResolved = false;

    const resolveInit = () => {
      if (!initResolved) {
        initResolved = true;
        setLoading(false);
      }
    };

    // --- Core auth state listener ---
    // Key insight: do NOT let INITIAL_SESSION(null) stop the loading spinner
    // when we're mid-OAuth-return. detectSessionInUrl fires SIGNED_IN
    // asynchronously AFTER INITIAL_SESSION. If we resolve loading on
    // INITIAL_SESSION(null) and the session update comes in SIGNED_IN, that
    // update must still be applied — which is why we always handle SIGNED_IN.
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return;

      console.log('[AirBooks auth]', event, newSession ? '✓ session' : '✗ no session');

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(newSession);
        if (newSession?.access_token) loadProfile(newSession.access_token);
        resolveInit();
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        resolveInit();
        return;
      }

      if (event === 'INITIAL_SESSION') {
        if (newSession) {
          // Already have a session (e.g. returning user with stored session).
          setSession(newSession);
          if (newSession.access_token) loadProfile(newSession.access_token);
          resolveInit();
        } else if (!isOAuthReturn) {
          // No session, no OAuth in progress — definitively not signed in.
          resolveInit();
        }
        // If isOAuthReturn: wait for SIGNED_IN from detectSessionInUrl.
        // DO NOT resolve loading yet — that would flash the login page.
      }
    });

    if (urlState.error) {
      console.error('[AirBooks auth] OAuth provider error:', urlState.error);
      setOauthError(urlState.error);
      resolveInit();
      return () => { active = false; sub.subscription.unsubscribe(); };
    }

    if (urlState.accessToken && urlState.refreshToken) {
      // Implicit flow return — clean the URL immediately (prevents stale token
      // replay on refresh), then call setSession() directly as a backup to
      // detectSessionInUrl (whichever resolves first wins).
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      supabase.auth
        .setSession({
          access_token: urlState.accessToken,
          refresh_token: urlState.refreshToken,
        })
        .then(({ data, error }) => {
          if (!active) return;
          if (error) {
            console.error('[AirBooks auth] setSession() error:', error.message);
            setOauthError(`Sign-in failed: ${error.message}`);
            resolveInit();
            return;
          }
          if (data.session) {
            setSession(data.session);
            if (data.session.access_token) loadProfile(data.session.access_token);
          }
          resolveInit();
        });
    }

    // PKCE flow: detectSessionInUrl handles exchangeCodeForSession automatically.
    // We just wait for the SIGNED_IN event above — no manual action needed.

    // Hard timeout: if detectSessionInUrl never fires SIGNED_IN (e.g. the PKCE
    // code verifier was lost), stop loading so the user isn't stuck forever.
    const timeout = setTimeout(() => {
      if (active && !initResolved) {
        console.warn('[AirBooks auth] Timed out waiting for session after OAuth return.');
        if (isOAuthReturn) {
          setOauthError('Sign-in timed out. Please try again.');
        }
        resolveInit();
      }
    }, 10_000);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signInWithGoogle = async () => {
    setOauthError(null);

    // Determine the origin OAuth should return to. When the app is embedded in
    // an iframe (e.g. the Figma Make editor preview), window.location.origin is
    // a sandboxed origin that is NOT on Supabase's redirect allow-list — so we
    // try to use the TOP-LEVEL origin instead. Reading a cross-origin top frame
    // throws, so we guard it and fall back to our own origin.
    let origin = window.location.origin;
    const inIframe = window.top != null && window.top !== window.self;
    try {
      if (inIframe && window.top?.location?.origin) {
        origin = window.top.location.origin;
      }
    } catch {
      // Cross-origin top frame — can't read it; keep our own origin.
    }
    // Trailing slash: a wildcard allow-list entry (https://host/**) does NOT
    // match the bare origin (https://host) with no path, so we always send a
    // path. This avoids the "I added it but it still bounces" allow-list gotcha.
    const redirectTo = `${origin}/`;

    console.log('[AirBooks auth] starting Google OAuth', { redirectTo, inIframe });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        // We navigate manually below so we can target the TOP window and break
        // out of any iframe — otherwise the consent + token return happen inside
        // the sandboxed iframe and the session is lost on the way back.
        skipBrowserRedirect: true,
      },
    });
    if (error) return { error: error.message };
    if (!data?.url) return { error: 'Could not start Google sign-in.' };

    // Navigating window.top is allowed cross-origin (only *reading* it is
    // blocked), so this safely breaks out of the iframe. Fall back to the
    // current window if top isn't available.
    try {
      if (window.top) {
        window.top.location.href = data.url;
      } else {
        window.location.href = data.url;
      }
    } catch {
      window.location.href = data.url;
    }
    return {};
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    } catch (e) {
      return { error: `Network error while signing in: ${e}` };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const res = await fetch(`${SERVER}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Signup failed.' }));
        return { error: error ?? 'Signup failed.' };
      }
      return await signIn(email, password);
    } catch (e) {
      return { error: `Network error: ${e}` };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[AirBooks auth] Error during sign-out:', e);
    } finally {
      // Always clear local state so the UI returns to login even if the network
      // call failed — the local session is invalidated either way.
      setSession(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (accessToken) await loadProfile(accessToken);
  };

  // ─── Dev bypass: return a fake authenticated state ───
  if (isDevBypass) {
    const mockProfile: Profile = {
      id: 'dev-user',
      email: 'dev@airbooks.local',
      name: 'Dev User',
      bookCount: 5,
    };
    return (
      <AuthContext.Provider
        value={{
          session: { access_token: 'dev-token' } as any,
          profile: mockProfile,
          accessToken: 'dev-token',
          loading: false,
          oauthError: null,
          signInWithGoogle: async () => ({}),
          signIn: async () => ({}),
          signUp: async () => ({}),
          signOut: async () => { window.location.search = ''; },
          refreshProfile: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        session, profile, accessToken, loading, oauthError,
        signInWithGoogle, signIn, signUp, signOut, refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
