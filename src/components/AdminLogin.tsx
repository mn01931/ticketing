import { useState } from 'react';
import { signInAdmin } from '../lib/localData';
import { Lock, Mail, Loader2, Shield } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBack: () => void; 
}

export function AdminLogin({ onLoginSuccess, onBack }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInAdmin(email, password);
      onLoginSuccess();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to sign in. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6 text-center w-full">
      <div className="text-center mb-2">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50 shadow-inner">
          <img
            src="/assets/logo.png"
            alt="Logo"
            className="h-12 w-12 object-contain"
          />
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.4em] text-emerald-700/60">Admin Portal</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-emerald-950">
          Sign In
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-500">
          Enter your admin credentials to manage support tickets from the dashboard.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-shake">
          {error}
        </div>
      )}

      <div className="space-y-4 text-left">
        <div>
          <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Email Address
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 pl-12 pr-4 text-black placeholder:text-gray-400 transition-all focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none"
              placeholder="admin@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
            <input
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 pl-12 pr-4 text-black placeholder:text-gray-400 transition-all focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="group relative w-full bg-[#156143] text-white font-bold py-4 rounded-2xl hover:bg-[#0f4630] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-emerald-950/10 active:scale-95"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Shield className="w-5 h-5 text-emerald-400" />
            <span>Sign In to Dashboard</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm font-bold text-gray-400 hover:text-emerald-800 transition-colors py-2"
      >
        Back to Home
      </button>
    </form>
  );
}