import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider, OAuthCallback, isOAuthPopup } from './auth-context';

export default function App() {
  // If this document is the Google OAuth popup, finish sign-in and close —
  // don't boot the full app inside the popup.
  if (isOAuthPopup()) {
    return <OAuthCallback />;
  }

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
