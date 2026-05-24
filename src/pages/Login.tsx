import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, LogIn, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { Logo } from '../components/Logo';

interface LoginProps {
  onNavigate: (page: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorObj(null);

    if (!email || !password) {
      setErrorObj('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      setLoading(false);
      
      // Route routing after login
      if (loggedUser.role === 'admin') {
        onNavigate('admin');
      } else if (loggedUser.status === 'Pending') {
        onNavigate('profile'); // Send them to their profile/pending status info
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorObj(err.message || 'Login failed.');
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex items-center justify-center bg-zinc-950 px-4 select-none" id="login-panel">
      <div className="w-full max-w-md bg-zinc-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
        
        {/* Brand visual header */}
        <div className="text-center space-y-4 mb-8 flex flex-col items-center">
          <Logo size="md" />
          <div>
            <h2 className="text-2.5xl font-black text-white">Welcome Back</h2>
            <p className="text-zinc-400 text-xs font-semibold mt-1">Access your Influencer Verse creator account</p>
          </div>
        </div>

        {errorObj && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorObj}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Mail className="w-4 h-4" />
              </span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" 
                className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Password</label>
              <a href="#" className="text-[10px] text-purple-400 hover:text-purple-300 font-bold transition-colors">Forgot Password?</a>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-xs font-bold rounded-xl text-white hover:opacity-95 shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In To Wallet'} <LogIn className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Separator */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className="relative bg-zinc-900/60 px-3 text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">OR CONTINUING USING</span>
        </div>

        {/* Google Mock OAuth */}
        <button 
          onClick={() => {
            setErrorObj("Google OAuth interface initialization successful! Google registration details will complete inside production applets.");
          }}
          className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-white/5 text-xs text-zinc-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <img src="https://api.dicebear.com/7.x/identicon/svg?seed=google" className="w-3.5 h-3.5 opacity-80" alt="google" />
          Continue via Google OAuth
        </button>

        <p className="text-center text-[11px] text-zinc-400 mt-6 select-none font-semibold">
          Don't have a wallet configured?{' '}
          <button onClick={() => onNavigate('signup')} className="text-purple-400 hover:text-purple-300 font-bold hover:underline cursor-pointer">
            Create account
          </button>
        </p>
      </div>
    </div>
  );
};
