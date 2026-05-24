import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, User as UserIcon, Mail, Lock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Logo } from '../components/Logo';

interface SignupProps {
  onNavigate: (page: string) => void;
}

export const Signup: React.FC<SignupProps> = ({ onNavigate }) => {
  const { signup } = useApp();
  
  // Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [redditUsername, setRedditUsername] = useState('');
  const [redditProfileLink, setRedditProfileLink] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');

  // States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reddit Validator States
  const [linkValid, setLinkValid] = useState<boolean | null>(null);

  // Run the validator automatically on field changes
  useEffect(() => {
    if (!redditProfileLink) {
      setLinkValid(null);
      return;
    }

    // Clean username input (remove u/ if user typed it)
    const cleanedUsername = redditUsername.replace(/^u\//, '').trim().toLowerCase();

    if (!cleanedUsername) {
      setLinkValid(false);
      return;
    }

    try {
      // Must match reddit.com/user/[username]
      // Support subdomains like www. and protocols. Also support trailing slash
      const regex = /reddit\.com\/user\/([a-zA-Z0-9_\-]+)/i;
      const match = redditProfileLink.match(regex);

      if (match) {
        const urlUsername = match[1].toLowerCase();
        if (urlUsername === cleanedUsername) {
          setLinkValid(true);
        } else {
          setLinkValid(false);
        }
      } else {
        setLinkValid(false);
      }
    } catch {
      setLinkValid(false);
    }
  }, [redditUsername, redditProfileLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName || !email || !password || !confirmPassword || !redditUsername || !redditProfileLink) {
      setErrorMsg('Please complete all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (!linkValid) {
      setErrorMsg('Reddit Profile Link must match form requirement (https://www.reddit.com/user/[username]) and match Reddit Username.');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('You must agree to the Terms of Service to leverage our network.');
      return;
    }

    setLoading(true);
    try {
      // clean username for saving
      const canonicalUsername = redditUsername.startsWith('u/') ? redditUsername : `u/${redditUsername}`;
      await signup({
        fullName,
        email,
        redditUsername: canonicalUsername,
        redditProfileLink,
        referralCode: referralCode.trim() || undefined,
        honeypotFilled: !!websiteUrl
      });
      setLoading(false);
      onNavigate('profile'); // Send directly to profile (locks page down as Verification Pending)
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Signup failed.');
    }
  };

  return (
    <div className="w-full min-h-[90vh] flex items-center justify-center bg-zinc-950 py-12 px-4 select-none" id="signup-panel">
      <div className="w-full max-w-lg bg-zinc-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="text-center space-y-4 mb-8 flex flex-col items-center">
          <Logo size="md" />
          <div>
            <h2 className="text-2.5xl font-black text-white">Register Creator</h2>
            <p className="text-zinc-400 text-xs font-semibold mt-1">Join the Reddit influencer task network</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot hidden input field to catch auto registration bots */}
          <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
            <input 
              type="text" 
              name="website_url" 
              value={websiteUrl} 
              onChange={(e) => setWebsiteUrl(e.target.value)} 
              tabIndex={-1} 
              autoComplete="off" 
            />
          </div>

          {/* General Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera" 
                  className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

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
                  placeholder="alex@gmail.com" 
                  className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Password</label>
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
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Divider with Reddit */}
          <div className="border-t border-white/5 my-4 pt-4">
            <h3 className="text-xs font-extrabold text-purple-400 uppercase tracking-wider mb-3">Reddit Account Binding</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Reddit Username</label>
              <input 
                type="text" 
                value={redditUsername}
                onChange={(e) => setRedditUsername(e.target.value)}
                placeholder="u/alex_rivera" 
                className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Reddit Profile Link</label>
                {/* Visual Validator Checkmark or Error indicator */}
                {linkValid !== null && (
                  linkValid ? (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Link Matches & Valid
                    </span>
                  ) : (
                    <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Mismatch / Invalid Link format
                    </span>
                  )
                )}
              </div>
              <input 
                type="text" 
                value={redditProfileLink}
                onChange={(e) => setRedditProfileLink(e.target.value)}
                placeholder="https://www.reddit.com/user/Extension-Chef-7943" 
                className={`w-full text-xs text-white bg-zinc-950 border pl-4 pr-4 py-3 rounded-xl focus:outline-none transition-colors ${
                  linkValid === true ? 'border-emerald-500/50 focus:border-emerald-500' : 
                  linkValid === false ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-purple-500'
                }`}
              />
              <p className="text-[10px] text-zinc-500 font-semibold mt-1 leading-normal text-balance">
                Format: <strong className="text-zinc-400">https://www.reddit.com/user/[username]</strong>. The username segment in url must match your Username field exactly (case-insensitive).
              </p>
            </div>
          </div>

          {/* Invitation and Terms */}
          <div className="pt-2 grid grid-cols-1 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Referral Code (Optional)</label>
              <input 
                type="text" 
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="SARAHTECH" 
                className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-4 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none transition-colors uppercase"
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1.5 select-none">
              <input 
                type="checkbox" 
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 accent-purple-600 rounded"
              />
              <label htmlFor="agreeTerms" className="text-xs text-zinc-400 leading-snug cursor-pointer">
                I hereby declare all Reddit account statistics entered are completely authentic. I agree to comply with the{' '}
                <button type="button" onClick={() => onNavigate('terms')} className="text-purple-400 hover:underline font-bold">Terms of Service</button>{' '}
                and understand duplicate submissions result in a network ban.
              </label>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-500 text-xs font-bold rounded-xl text-white hover:opacity-95 shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Creating Wallet Account...' : 'Agree & Create Account'} <ShieldCheck className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-400 mt-6 select-none font-semibold">
          ALready have an account?{' '}
          <button onClick={() => onNavigate('login')} className="text-purple-400 hover:text-purple-300 font-bold hover:underline cursor-pointer">
            Log in here
          </button>
        </p>
      </div>
    </div>
  );
};
