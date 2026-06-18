import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './auth-context';
import { ErrorBoundary } from './components/error-boundary';
import { WorldProvider } from './world/world-provider';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WorldProvider>
          <RouterProvider router={router} />
        </WorldProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
