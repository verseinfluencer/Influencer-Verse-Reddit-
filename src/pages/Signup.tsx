import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, User as UserIcon, Mail, Lock, CheckCircle2, XCircle, AlertCircle, Clock, Send, Loader2, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../components/Logo';
import { auth } from '../utils/firebase';
import { sendEmailVerification } from 'firebase/auth';

interface SignupProps {
  onNavigate: (page: string) => void;
}

export const Signup: React.FC<SignupProps> = ({ onNavigate }) => {
  const { signup, completeCreatorRegistration } = useApp();
  
  // Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [redditUsername, setRedditUsername] = useState('');
  const [redditProfileLink, setRedditProfileLink] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Discord Verification state
  const [discordVerified, setDiscordVerified] = useState(false);
  const [discordUserId, setDiscordUserId] = useState<string | null>(null);
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);
  const [discordVerifiedAt, setDiscordVerifiedAt] = useState<string | null>(null);
  const [discordFeedback, setDiscordFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [discordVerifying, setDiscordVerifying] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('influencerverse.online')) {
        return;
      }
      
      if (event.data?.type === 'DISCORD_VERIFICATION_RESULT') {
        const { success, discordUserId, discordUsername, discordVerifiedAt, error, fallbackText } = event.data;
        setDiscordVerifying(false);
        if (success) {
          setDiscordVerified(true);
          setDiscordUserId(discordUserId);
          setDiscordUsername(discordUsername);
          setDiscordVerifiedAt(discordVerifiedAt);
          setDiscordFeedback({ success: true, message: "Discord verified successfully." });
        } else {
          setDiscordVerified(false);
          setDiscordFeedback({
            success: false,
            message: fallbackText || error || "Please join our Discord server and verify again."
          });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleVerifyDiscord = async () => {
    if (discordVerifying) return;
    setDiscordVerifying(true);
    setDiscordFeedback(null);
    try {
      const response = await fetch('/api/auth/discord/url');
      if (!response.ok) {
        throw new Error('Failed to retrieve Discord authorization URL.');
      }
      const { url } = await response.json();
      
      const authWindow = window.open(
        url,
        'discord_oauth_popup',
        'width=600,height=750'
      );

      if (!authWindow) {
        alert('Please allow popups for this site to complete your Discord verification.');
        setDiscordVerifying(false);
      }
    } catch (err: any) {
      console.error('Discord authorization initialization failed:', err);
      setDiscordFeedback({
        success: false,
        message: err.message || 'Unable to connect to Discord authentication services.'
      });
      setDiscordVerifying(false);
    }
  };

  // States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email verification tracking
  const [isEmailVerificationPending, setIsEmailVerificationPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [userDraft, setUserDraft] = useState<any>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (resendCount >= 3) {
      setResendMessage('❌ Maximum 3 resends reached.');
      return;
    }
    if (resendCooldown > 0) return;

    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setResendCount(prev => prev + 1);
        setResendCooldown(60);
        setResendMessage('Verification email resent successfully. Please check Inbox and Spam folder.');
      } else {
        setResendMessage('❌ No active session found.');
      }
    } catch (err: any) {
      console.error(err);
      setResendMessage('❌ Please wait before resending.');
    }
  };

  const handleCheckEmailVerification = async () => {
    setIsCheckingEmail(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          let draft = userDraft;
          if (!draft) {
            const draftStr = localStorage.getItem('pending_reg_' + email.trim().toLowerCase());
            if (draftStr) {
              draft = JSON.parse(draftStr);
            }
          }
          if (draft) {
            await completeCreatorRegistration(draft);
            setIsEmailVerificationPending(false);
            onNavigate('profile');
          } else {
            alert("❌ Registration details draft went missing. Fallback user profile activated.");
            setIsEmailVerificationPending(false);
            onNavigate('profile');
          }
        } else {
          alert("❌ Email is not verified yet. Please check your inbox and click the verification link.");
        }
      } else {
        alert("Session is untraceable. Try logging in again.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error checking status: " + err.message);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleGoBackWrongEmail = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await user.delete();
      }
      setIsEmailVerificationPending(false);
    } catch (err: any) {
      console.error("Error deleting unverified user session:", err);
      setIsEmailVerificationPending(false);
    }
  };

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
    if (loading) return; // Prevent double submission
    setErrorMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFullName = fullName.trim();
    const trimmedRedditUsername = redditUsername.trim();
    const trimmedProfileLink = redditProfileLink.trim();

    if (!trimmedFullName || !trimmedEmail || !password || !confirmPassword || !trimmedRedditUsername || !trimmedProfileLink) {
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

    if (!discordVerified) {
      setErrorMsg('Please pre-verify your active Discord server membership first.');
      return;
    }

    setLoading(true);
    try {
      const canonicalUsername = trimmedRedditUsername.startsWith('u/') ? trimmedRedditUsername : `u/${trimmedRedditUsername}`;
      const draft = await signup({
        fullName: trimmedFullName,
        email: trimmedEmail,
        password: password,
        redditUsername: canonicalUsername,
        redditProfileLink: trimmedProfileLink,
        referralCode: referralCode.trim() || undefined,
        honeypotFilled: !!websiteUrl,
        discordVerified: true,
        discordUserId: discordUserId || undefined,
        discordUsername: discordUsername || undefined,
        discordVerifiedAt: discordVerifiedAt || undefined
      });
      
      // Save draft user object in localStorage and userDraft state
      localStorage.setItem('pending_reg_' + trimmedEmail.trim().toLowerCase(), JSON.stringify(draft));
      setUserDraft(draft);
      
      setLoading(false);
      setIsEmailVerificationPending(true);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Signup failed.');
    }
  };

  if (isEmailVerificationPending) {
    return (
      <div className="w-full min-h-[90vh] flex items-center justify-center bg-zinc-950 py-12 px-4 select-none" id="verification-panel">
        <div className="w-full max-w-md bg-zinc-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center justify-center text-purple-400 mb-6">
            <Mail className="w-8 h-8" />
          </div>

          <h2 className="text-2.5xl font-black text-white mb-2">Verify Your Email</h2>
          <p className="text-zinc-400 text-sm mb-6">
            We sent a verification link to:<br />
            <span className="font-semibold text-purple-300 break-all">{email}</span>
          </p>

          <p className="text-zinc-400 text-xs leading-relaxed mb-6">
            Please check your inbox and spam folder. Click the link in the email to complete your registration.
          </p>

          <div className="w-full bg-zinc-950/60 border border-white/5 rounded-2xl p-4 text-left mb-6">
            <h4 className="text-white text-xs font-semibold mb-1">Didn't receive the email?</h4>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Please check your Spam, Junk, or Promotions folder. Verification emails may sometimes be filtered there. If you still can't find it, wait a few minutes and try resending.
            </p>
          </div>

          <button
            onClick={handleCheckEmailVerification}
            disabled={isCheckingEmail}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition duration-300 flex items-center justify-center gap-2 mb-4 font-sans disabled:opacity-50"
          >
            {isCheckingEmail ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>✅ I've Verified My Email</span>
              </>
            )}
          </button>

          <button
            onClick={handleResendEmail}
            disabled={resendCooldown > 0 || resendCount >= 3}
            className="w-full h-11 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-sm transition duration-300 mb-6 disabled:opacity-40"
          >
            {resendCooldown > 0 ? (
              <span className="flex items-center justify-center gap-2 text-zinc-400 font-mono">
                <Clock className="w-4 h-4 animate-spin text-purple-400" />
                Resend in {resendCooldown}s
              </span>
            ) : (
              <span>📧 Resend Email</span>
            )}
          </button>

          {resendMessage && (
            <p className={`text-xs font-semibold mb-6 ${resendMessage.includes('❌') ? 'text-red-400' : 'text-emerald-400'}`}>
              {resendMessage}
            </p>
          )}

          <button
            onClick={handleGoBackWrongEmail}
            className="text-zinc-500 hover:text-zinc-300 text-sm underline transition duration-200"
          >
            Wrong email? Go back
          </button>
        </div>
      </div>
    );
  }

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
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-10 pr-10 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-10 pr-10 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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

          {/* Discord Server Verification */}
          <div className="pt-4 pb-4 border-t border-b border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Discord Server Verification <span className="text-red-500">*</span>
              </label>
              {discordVerified ? (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Discord Verified
                </span>
              ) : (
                <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5" /> Mandatory Verification
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed font-semibold">
              To complete registration on Influencer Verse, you must verify your membership in our official Discord server. Please click the button below to link and verify.
            </p>

            <button
              type="button"
              onClick={handleVerifyDiscord}
              disabled={discordVerifying}
              className={`w-full py-3 flex items-center justify-center gap-2 text-xs font-bold rounded-xl transition-all ${
                discordVerified 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-[#5865F2] text-white hover:bg-[#4752C4] shadow-md cursor-pointer'
              } disabled:opacity-50`}
            >
              {discordVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Discord Membership...
                </>
              ) : discordVerified ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Verified as: {discordUsername}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Verify Discord Membership
                </>
              )}
            </button>

            {discordFeedback && (
              <div id="discord-feedback-msg" className={`p-3 rounded-lg text-xs leading-relaxed border ${
                discordFeedback.success 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-semibold' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400 font-semibold'
              }`}>
                {discordFeedback.message}
              </div>
            )}
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
            disabled={loading || !discordVerified}
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
