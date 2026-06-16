# Plan: Fix Google Cloud OAuth Configuration for AirBooks

## Context

The user has the Google OAuth popup now showing "Completing sign-in…" (code fix from the previous session works). However the session is never established — the popup hangs and never closes. Root cause: the OAuth 2.0 Client ID in Google Cloud Console has incorrect or missing Authorized JavaScript Origins and/or Authorized Redirect URIs. No code changes are needed — this is a pure Google Cloud Console + Supabase Dashboard configuration task.

Supabase project ID (from `/utils/supabase/info.tsx`): `aropcfyljasokjdthlip`  
App URL: `https://core-eject-35447046.figma.site`

---

## Changes Required

### 1. Google Cloud Console — Edit the "airbooks" OAuth 2.0 Client

1. Go to **Google Cloud Console → APIs & Services → Credentials**
2. Click the ✏️ pencil icon on the **"airbooks"** Web application OAuth 2.0 client
3. Under **Authorized JavaScript origins** — add:
   ```
   https://core-eject-35447046.figma.site
   ```
4. Under **Authorized redirect URIs** — add (replace any localhost entry or wrong URL):
   ```
   https://aropcfyljasokjdthlip.supabase.co/auth/v1/callback
   ```
   > This is the Supabase callback URL. Google must redirect here — NOT to the app URL directly. Supabase processes the Google tokens and then redirects the popup to the app with Supabase tokens in the hash.

5. Click **Save**

---

### 2. Supabase Dashboard — URL Configuration

1. Go to **Supabase Dashboard → Authentication → URL Configuration**
2. Set **Site URL** to:
   ```
   https://core-eject-35447046.figma.site
   ```
3. Under **Redirect URLs** — add:
   ```
   https://core-eject-35447046.figma.site
   ```
4. Save

---

### 3. Supabase Dashboard — Google Provider

1. Go to **Supabase Dashboard → Authentication → Providers → Google**
2. Confirm the **Client ID** matches the one from Google Cloud (`872369929690-sue0...`)
3. Confirm the **Client Secret** is filled in (copy from Google Cloud Console → the airbooks OAuth client → Client Secret field)

---

## No Code Changes Needed

The `auth-context.tsx` fix from the previous session is already correct:
- Tokens are captured at render time via `useState` initializer before Supabase clears the hash ✓
- `setSession()` is called directly with the captured tokens ✓
- The popup posts a message to the opener on success ✓

---

## Verification

After saving Google Cloud and Supabase settings:
1. Open `https://core-eject-35447046.figma.site` in an incognito window
2. Click **Continue with Google**
3. Complete Google sign-in in the popup
4. The popup should show "Completing sign-in…" briefly, then close automatically
5. The main window should transition from the login page to the book library
