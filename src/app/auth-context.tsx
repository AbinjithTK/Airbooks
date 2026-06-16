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
  signInWithGoogle: () => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const OAUTH_POPUP_NAME = 'airbooks-google-oauth';

const AuthContext = createContext<AuthContextType>(null as any);
export const useAuth = () => useContext(AuthContext);

/** True when this document is the Google OAuth popup we opened. */
export function isOAuthPopup(): boolean {
  if (typeof window === 'undefined') return false;
  // Primary check: window was opened by us with the correct name.
  if (window.opener && window.opener !== window && window.name === OAUTH_POPUP_NAME) {
    return true;
  }
  // Fallback: if we have an opener and the URL contains OAuth tokens/errors,
  // we're likely the OAuth popup (window.name may be lost after cross-origin
  // redirect through Google).
  if (window.opener && window.opener !== window) {
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('error')) {
      return true;
    }
  }
  return false;
}

/**
 * Rendered inside the OAuth popup after Google redirects back. We let the
 * popup's own Supabase client finish the sign-in (it handles both implicit and
 * PKCE callbacks, and shares localStorage with the opener since it's the same
 * origin). Once a session exists, we notify the opener and close.
 */
export function OAuthCallback() {
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    const supabase = getSupabaseClient();
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      try {
        window.opener?.postMessage({ source: 'airbooks-oauth-done' }, window.location.origin);
      } catch (e) {
        console.log('Failed to notify opener of OAuth completion:', e);
      }
      // Try to close the popup. If it fails (some browsers block window.close),
      // show a success message so the user knows to close manually.
      try {
        window.close();
      } catch {}
      // If window.close() didn't work, update the message.
      setTimeout(() => {
        if (!window.closed) {
          setMessage('Sign-in complete! You can close this window.');
        }
      }, 500);
    };

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) finish();
    };

    // Surface an explicit provider error if Google sent one back.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    const providerError =
      hashParams.get('error_description') ||
      hashParams.get('error') ||
      queryParams.get('error_description') ||
      queryParams.get('error');
    if (providerError) {
      console.log('OAuth provider error:', providerError);
      setMessage(`Sign-in failed: ${providerError}`);
      return;
    }

    // If hash contains tokens, try to explicitly set the session.
    // detectSessionInUrl should handle this, but in popup contexts it can fail.
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        if (error) {
          console.log('setSession error in popup:', error.message);
          setMessage(`Sign-in failed: ${error.message}`);
        } else if (data.session) {
          finish();
        }
      });
    } else {
      // No tokens in hash — poll for session (detectSessionInUrl may handle it).
      check();
      const timer = setInterval(check, 300);
      const stop = setTimeout(() => {
        clearInterval(timer);
        if (!done) setMessage('Sign-in is taking longer than expected. You can close this window.');
      }, 12000);

      return () => {
        clearInterval(timer);
        clearTimeout(stop);
      };
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#64748B',
        padding: 24,
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const accessToken = session?.access_token ?? null;

  const loadProfile = async (token: string) => {
    try {
      const res = await fetch(`${SERVER}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { profile } = await res.json();
        setProfile(profile);
      } else {
        const err = await res.json().catch(() => ({}));
        console.log('Profile load failed:', err);
      }
    } catch (e) {
      console.log('Profile load error:', e);
    }
  };

  useEffect(() => {
    let active = true;
    let resolved = false;

    // Check if the URL contains OAuth hash tokens (implicit flow redirect).
    // detectSessionInUrl processes this asynchronously, so we must wait for the
    // onAuthStateChange callback before declaring "no session". If tokens are in
    // the hash, we give the client extra time to parse them.
    const hashHasTokens =
      window.location.hash.includes('access_token') ||
      window.location.hash.includes('error');

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      resolved = true;
      setSession(newSession);
      if (newSession?.access_token) {
        loadProfile(newSession.access_token);
      } else {
        setProfile(null);
      }
      // If we were waiting for the hash to resolve, stop loading now.
      setLoading(false);

      // Clean up the hash after Supabase has consumed the tokens so the URL
      // looks clean and a page refresh won't re-process stale tokens.
      if (hashHasTokens && newSession) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });

    // Initial session check — but if hash tokens are present, defer to
    // onAuthStateChange which fires once the token is parsed from the URL.
    (async () => {
      if (hashHasTokens) {
        // Give Supabase client up to 5s to parse the hash and fire
        // onAuthStateChange. If it doesn't fire, stop loading anyway.
        setTimeout(() => {
          if (active && !resolved) setLoading(false);
        }, 5000);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session?.access_token) await loadProfile(data.session.access_token);
      setLoading(false);
    })();

    // The OAuth popup finishes sign-in itself and writes the session to shared
    // (same-origin) storage, then posts this signal. We re-read the session so
    // this window flips to signed-in immediately (Supabase also broadcasts it).
    const onMessage = async (e: MessageEvent) => {
      // Validate origin to prevent cross-origin message spoofing
      if (e.origin !== window.location.origin) return;
      if (e.data?.source !== 'airbooks-oauth-done') return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        if (data.session.access_token) loadProfile(data.session.access_token);
      }
    };
    window.addEventListener('message', onMessage);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const signInWithGoogle = async () => {
    // Requires Google to be enabled in the Supabase dashboard:
    // https://supabase.com/docs/guides/auth/social-login/auth-google
    //
    // Strategy: Try popup first (best UX — no page reload). If the popup can't
    // be opened (sandboxed iframe, popup blocker), fall back to same-window
    // redirect. The implicit flow + detectSessionInUrl will parse the tokens
    // from the URL hash when the page reloads.

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: true,
      },
    });
    if (error) {
      console.log('Google sign in error:', error.message);
      return { error: error.message };
    }
    if (!data?.url) {
      return { error: 'Could not start Google sign-in (no auth URL returned).' };
    }

    // Attempt popup approach — open synchronously to avoid popup blockers.
    let popup: Window | null = null;
    try {
      popup = window.open(
        data.url,
        OAUTH_POPUP_NAME,
        'width=500,height=680,menubar=no,toolbar=no',
      );
    } catch {
      popup = null;
    }

    if (popup && !popup.closed) {
      // Popup opened successfully. OAuthCallback in the popup will handle the
      // rest and post a message back. Nothing else to do here.
      return {};
    }

    // Popup failed (blocked or sandboxed). Redirect in the same window.
    // Don't try to break out of iframes — Figma Make manages its own frame
    // structure. Just navigate this window and let the hash tokens be parsed
    // on reload.
    window.location.href = data.url;
    return {};
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.log('Email sign in error:', error.message);
      return { error: error.message };
    }
    return {};
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Create the user server-side (auto-confirmed), then sign in.
      const res = await fetch(`${SERVER}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Signup failed.' }));
        console.log('Sign up error:', error);
        return { error: error ?? 'Signup failed.' };
      }
      return await signIn(email, password);
    } catch (e) {
      console.log('Sign up request error:', e);
      return { error: `Network error during signup: ${e}` };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (accessToken) await loadProfile(accessToken);
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, accessToken, loading, signInWithGoogle, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
