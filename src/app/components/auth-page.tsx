import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Mail, Lock, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth-context';

export function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result =
      mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim());
    if (result.error) setError(result.error);
    setBusy(false);
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
      setGoogleBusy(false);
    }
    // On success the browser redirects to Google, so no need to reset state.
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8FAFB] to-[#E8F2FF] dark:from-[#0A1628] dark:to-[#0F2138] px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#0F6FFF] to-[#0EA5E9] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#0F6FFF]/30">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A2332] dark:text-[#F1F5F9]">
            {mode === 'signin' ? 'Welcome back' : 'Create your library'}
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
            {mode === 'signin'
              ? 'Sign in to access your AirBooks library'
              : 'Sign up to start building your personal bookshelf'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#1A2332] rounded-2xl shadow-xl border border-[#0F6FFF]/10 dark:border-[#3B82F6]/20 p-6">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleBusy || busy}
            className="w-full py-3 px-4 bg-white dark:bg-[#0A1628] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl font-medium text-[#1A2332] dark:text-[#F1F5F9] hover:bg-[#F8FAFB] dark:hover:bg-[#0F2138] hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {googleBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#E2E8F0] dark:bg-[#1E293B]" />
            <span className="text-xs text-[#94A3B8]">or</span>
            <div className="flex-1 h-px bg-[#E2E8F0] dark:bg-[#1E293B]" />
          </div>

          {/* Email / password */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {mode === 'signup' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Field
                    icon={<UserIcon className="w-4 h-4" />}
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={setName}
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Field
              icon={<Mail className="w-4 h-4" />}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              icon={<Lock className="w-4 h-4" />}
              type="password"
              placeholder="Password"
              value={password}
              onChange={setPassword}
              required
            />

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || googleBusy}
              className="w-full py-3 bg-gradient-to-r from-[#0F6FFF] to-[#0EA5E9] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#0F6FFF]/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-[#64748B] dark:text-[#94A3B8] mt-5">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-[#0F6FFF] dark:text-[#3B82F6] font-medium hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Field({
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]">{icon}</div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full pl-11 pr-4 py-3 bg-[#F8FAFB] dark:bg-[#0A1628] border border-[#0F6FFF]/10 dark:border-[#3B82F6]/20 rounded-xl text-[#1A2332] dark:text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0F6FFF] dark:focus:ring-[#3B82F6] focus:border-transparent transition-all"
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
