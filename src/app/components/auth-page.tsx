import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Mail, Lock, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth-context';

export function AuthPage() {
  const { signIn, signUp, signInWithGoogle, oauthError } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(oauthError);
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      {/* Floating card with 3D perspective */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ type: 'spring', stiffness: 80, damping: 20, duration: 0.8 }}
        style={{ perspective: '1200px' }}
        className="w-full max-w-[420px]"
      >
        {/* Outer glow ring */}
        <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-b from-white/20 to-transparent dark:from-white/5 blur-sm pointer-events-none" />

        {/* Main card — layered glass + raised surface */}
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(240,245,255,0.92) 100%)',
            boxShadow: `
              0 25px 60px -12px rgba(15, 111, 255, 0.15),
              0 12px 30px -8px rgba(0, 0, 0, 0.12),
              inset 0 1px 1px rgba(255,255,255,0.8),
              inset 0 -1px 2px rgba(0,0,0,0.04)
            `,
          }}
        >
          {/* Top highlight strip */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

          <div className="relative p-8 pt-10">
            {/* Logo */}
            <motion.div
              className="flex flex-col items-center mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <motion.div
                whileHover={{ scale: 1.08, rotate: -3 }}
                whileTap={{ scale: 0.95 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: 'linear-gradient(135deg, #0F6FFF 0%, #0EA5E9 60%, #06B6D4 100%)',
                  boxShadow: `
                    0 8px 24px -4px rgba(15, 111, 255, 0.45),
                    0 4px 8px -2px rgba(15, 111, 255, 0.2),
                    inset 0 1px 2px rgba(255,255,255,0.3),
                    inset 0 -2px 4px rgba(0,0,0,0.1)
                  `,
                }}
              >
                <BookOpen className="w-8 h-8 text-white drop-shadow-sm" />
              </motion.div>
              <h1 className="text-[22px] font-bold tracking-tight text-[#1A2332]">
                {mode === 'signin' ? 'Welcome back' : 'Create your library'}
              </h1>
              <p className="text-[13px] text-[#64748B] mt-1 tracking-wide">
                {mode === 'signin'
                  ? 'Sign in to access your AirBooks collection'
                  : 'Sign up to start your personal bookshelf'}
              </p>
            </motion.div>

            {/* Google button — raised 3D */}
            <motion.button
              onClick={handleGoogle}
              disabled={googleBusy || busy}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ y: 1, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-[14px] text-[#1A2332] tracking-wide flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FAFB 100%)',
                boxShadow: `
                  0 4px 12px -2px rgba(0, 0, 0, 0.1),
                  0 2px 4px -1px rgba(0, 0, 0, 0.06),
                  inset 0 1px 1px rgba(255,255,255,0.9),
                  inset 0 -1px 2px rgba(0,0,0,0.04)
                `,
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              {googleBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#CBD5E1] to-transparent" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">or</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#CBD5E1] to-transparent" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {mode === 'signup' && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <SkeuField
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

              <SkeuField
                icon={<Mail className="w-4 h-4" />}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={setEmail}
                required
              />
              <SkeuField
                icon={<Lock className="w-4 h-4" />}
                type="password"
                placeholder="Password"
                value={password}
                onChange={setPassword}
                required
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 p-3.5 rounded-xl text-[13px] text-red-600"
                  style={{
                    background: 'linear-gradient(135deg, #FEF2F2, #FFF1F2)',
                    boxShadow: 'inset 0 2px 4px rgba(220, 38, 38, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                  }}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Submit button — bold gradient, raised */}
              <motion.button
                type="submit"
                disabled={busy || googleBusy}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ y: 1, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="w-full py-3.5 rounded-xl font-bold text-[15px] text-white tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #0F6FFF 0%, #0EA5E9 50%, #06B6D4 100%)',
                  boxShadow: `
                    0 8px 20px -4px rgba(15, 111, 255, 0.4),
                    0 4px 8px -2px rgba(15, 111, 255, 0.2),
                    inset 0 1px 2px rgba(255,255,255,0.25),
                    inset 0 -2px 4px rgba(0,0,0,0.1)
                  `,
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </motion.button>
            </form>

            {/* Toggle mode */}
            <p className="text-center text-[13px] text-[#64748B] mt-6">
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <motion.button
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-[#0F6FFF] font-bold hover:text-[#0050CC] transition-colors cursor-pointer"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </motion.button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Skeuomorphic inset input field ─── */
function SkeuField({
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
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      animate={{
        boxShadow: focused
          ? 'inset 0 2px 6px rgba(15, 111, 255, 0.12), 0 0 0 3px rgba(15, 111, 255, 0.1)'
          : 'inset 0 2px 6px rgba(0, 0, 0, 0.06), inset 0 1px 2px rgba(0, 0, 0, 0.04)',
      }}
      transition={{ duration: 0.2 }}
      className="relative rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #F1F5F9, #F8FAFB)',
        border: focused ? '1px solid rgba(15, 111, 255, 0.3)' : '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]">{icon}</div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        className="w-full pl-11 pr-4 py-3.5 bg-transparent text-[14px] font-medium text-[#1A2332] placeholder-[#94A3B8] focus:outline-none tracking-wide"
      />
    </motion.div>
  );
}

/* ─── Google icon ─── */
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
