import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building, User, Mail, Lock, Phone, Globe, Coins, FileText, 
  AlertCircle, CheckCircle, Clock, ArrowRight, ShieldCheck, ChevronDown, Search, X,
  Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ALL_COUNTRIES } from '../utils/countries';
import { auth, db } from '../utils/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';

interface ClientRegisterProps {
  onNavigate: (page: string) => void;
}

export const ClientRegister: React.FC<ClientRegisterProps> = ({ onNavigate }) => {
  const { clientRegister, completeClientRegistration } = useApp();

  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  
  // Custom Country Dropdown States
  const [country, setCountry] = useState(''); // Default: empty string for placeholder "Select your country"
  const [countrySearch, setCountrySearch] = useState('');
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  // Custom Dial Code States (Section 6: WhatsApp selector)
  const [dialCode, setDialCode] = useState('+1');
  const [dialSearch, setDialSearch] = useState('');
  const [isDialOpen, setIsDialOpen] = useState(false);

  // Phone.Email Verification States
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');

  const [whatsAppNum, setWhatsAppNum] = useState('');
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Crypto' | 'Bank Transfer' | 'Other'>('Crypto');
  const [budget, setBudget] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Form State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isCheckingGmail, setIsCheckingGmail] = useState(false);
  const [gmailVerifiedStatus, setGmailVerifiedStatus] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

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
        setResendMessage('❌ No active session. Please register again or login.');
      }
    } catch (err: any) {
      console.error(err);
      setResendMessage('❌ Please wait before resending.');
    }
  };

  // Search & Filter Logic
  const filteredCountries = ALL_COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredDialCodes = ALL_COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(dialSearch.toLowerCase()) || 
    c.code.includes(dialSearch)
  );

  const handleSelectCountry = (countryName: string) => {
    setCountry(countryName);
    setIsCountryOpen(false);
    setCountrySearch('');
    
    // Auto sync dial code prefix with selected country
    const found = ALL_COUNTRIES.find(c => c.name === countryName);
    if (found) {
      setDialCode(found.code);
    }
  };

  // Load Phone.Email script and global listener
  useEffect(() => {
    // Load Phone.Email script
    const script = document.createElement('script');
    script.src = 'https://www.phone.email/sign_in_button_v1.js';
    script.async = true;
    document.body.appendChild(script);

    // Global callback
    (window as any).phoneEmailListener = async (userObj: any) => {
      try {
        const response = await fetch(
          userObj.user_json_url
        );
        const data = await response.json();
        setVerifiedPhone(data.user_phone_number);
        setPhoneVerified(true);
      } catch (err) {
        console.error('Phone verification failed', err);
      }
    };

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {
        // Safe check
      }
    };
  }, []);

  // ─── Verification Sync check on successful registrations ───
  const handleCheckGmailVerification = async () => {
    setIsCheckingGmail(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          const draftStr = localStorage.getItem('pending_client_reg_' + gmail.trim().toLowerCase());
          if (draftStr) {
            const draftObj = JSON.parse(draftStr);
            await completeClientRegistration(draftObj);
          } else {
            // Safe fallback creation
            const fallbackClient = {
              id: user.uid,
              name: fullName.trim() || 'Brand Partner',
              company: company.trim() || 'Brand Sponsor',
              country: country || 'US',
              whatsapp: `${dialCode} ${whatsAppNum.trim()}`,
              gmail: gmail.trim().toLowerCase(),
              gmailVerified: true,
              emailVerified: true,
              phoneNumber: verifiedPhone || '',
              phoneVerified: phoneVerified,
              phoneVerifiedAt: phoneVerified ? new Date().toISOString() : '',
              paymentMethod,
              budget: budget.trim() || '$500+',
              paymentNotes: paymentNotes.trim() || '',
              status: 'pending' as const,
              taskUploadEnabled: true,
              registeredAt: new Date().toISOString(),
              payAgencyBalance: 0,
              payAgencyHistory: []
            };
            await completeClientRegistration(fallbackClient);
          }
          setGmailVerifiedStatus(true);
          alert("✅ Email verified successfully! Your profile is now pending admin approval.");
        } else {
          alert("❌ Email is not verified yet. Please check your inbox and click the verification link.");
        }
      } else {
        alert("Session is untraceable. Go to login page to verify your credentials manually.");
      }
    } catch (err: any) {
      console.error("Email verification status sync failed:", err);
      alert("Verification query rejected: " + err.message);
    } finally {
      setIsCheckingGmail(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    // Field Verifications
    if (!fullName.trim() || !company.trim() || !country || !whatsAppNum.trim() || !gmail.trim() || !password.trim() || !budget.trim()) {
      setError('Please provide all necessary details, including selecting your country.');
      return;
    }

    if (!gmail.toLowerCase().endsWith('@gmail.com')) {
      setError('You must use an official @gmail.com address to register.');
      return;
    }

    if (whatsAppNum.length < 7 || whatsAppNum.length > 15) {
      setError('WhatsApp number must be between 7 and 15 digits (excluding country code).');
      return;
    }

    if (!phoneVerified) {
      setError('Please verify your phone number first');
      throw new Error("Please verify your phone number first");
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms of Service to onboard.');
      return;
    }

    try {
      setLoading(true);
      const draft = await clientRegister({
        name: fullName.trim(),
        company: company.trim(),
        country,
        whatsapp: `${dialCode} ${whatsAppNum.trim()}`,
        gmail: gmail.trim().toLowerCase(),
        phoneNumber: verifiedPhone || null,
        phoneVerified: phoneVerified,
        phoneVerifiedAt: phoneVerified ? new Date().toISOString() : null,
        paymentMethod,
        budget: budget.trim(),
        paymentNotes: paymentNotes.trim(),
        password
      });

      // Save draft profile to localStorage using email as key
      localStorage.setItem('pending_client_reg_' + gmail.trim().toLowerCase(), JSON.stringify(draft));
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Oops, registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div id="registration_pending_page" className="max-w-xl mx-auto my-16 p-8 bg-white border border-slate-100 rounded-3xl text-center text-zinc-900 shadow-xl">
        <Mail className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
        <h1 className="text-3xl font-black font-display tracking-tight mb-3 text-zinc-900">Verify Your Email</h1>
        
        <div className="bg-indigo-50/75 p-5 rounded-2xl border border-indigo-100 text-left text-xs text-indigo-810 leading-relaxed font-sans space-y-2 mb-6">
          <p className="font-bold text-center text-sm mb-1 text-indigo-900 flex items-center justify-center gap-1.5">
            📧 Verification Sent
          </p>
          <p className="text-center font-medium leading-normal text-indigo-700">
            Verification email sent to <strong className="text-indigo-950 font-black">{gmail}</strong>. Please verify your email to complete registration.
          </p>
        </div>

        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left mb-6">
          <h4 className="text-zinc-805 text-xs font-bold mb-1.5 flex items-center gap-1.5">Didn't receive the email?</h4>
          <p className="text-zinc-500 text-[11px] leading-relaxed text-justify">
            Please check your Spam, Junk, or Promotions folder. Verification emails may sometimes be filtered there. If you still can't find it, wait a few minutes and try resending.
          </p>
        </div>

        <p className="text-zinc-500 mb-6 font-sans text-xs">
          Your client account is under review. <br />
          We'll contact you via WhatsApp/Gmail soon.
        </p>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-sm text-zinc-700 space-y-2 mb-8">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-bold text-zinc-800">Registration Profile Saved: <strong>{company}</strong></span>
          </div>
          <p className="text-zinc-500 text-xs text-justify leading-relaxed font-sans">
            Review processes generally take under 4 hours. Authenticated brand advisors will verify your profile manually, checking your entered WhatsApp and Gmail handle before enabling live campaigns.
          </p>
          <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 mt-2">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Email status:</span>
            {gmailVerifiedStatus ? (
              <span className="text-xs text-emerald-600 font-extrabold">✅ Verified in system</span>
            ) : (
              <span className="text-xs text-rose-500 font-extrabold animate-pulse">❌ Pending link activation</span>
            )}
          </div>
        </div>

        {/* Resend verification email block */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={resendCooldown > 0 || resendCount >= 3}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[11px] text-zinc-700 font-bold border border-slate-200 rounded-xl transition duration-150 w-full cursor-pointer"
          >
            {resendCooldown > 0 
              ? `Resend in ${resendCooldown}s` 
              : `📧 Resend Verification Email`
            }
          </button>
          
          {resendMessage && (
            <p className="text-[11px] text-zinc-500 font-bold mt-2 text-center">
              {resendMessage}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleCheckGmailVerification}
            disabled={isCheckingGmail || gmailVerifiedStatus}
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition font-sans w-full cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-indigo-600/10"
          >
            {isCheckingGmail ? 'Syncing status...' : "✅ I've Verified My Email"}
          </button>

          <button 
            id="pending_back_btn"
            onClick={() => onNavigate('client-login')} 
            className="px-6 py-3 bg-slate-100 text-zinc-750 font-bold rounded-xl hover:bg-slate-200 border border-slate-200 transition font-sans w-full cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Go to Client Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={async () => {
              try {
                const u = auth.currentUser;
                if (u) {
                  await u.delete();
                }
                setSuccess(false);
              } catch (err) {
                setSuccess(false);
              }
            }}
            className="text-zinc-400 hover:text-indigo-600 text-[11px] underline transition duration-200 mt-6 block mx-auto cursor-pointer font-bold"
          >
            Wrong email? Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="client_register_page" className="max-w-4xl mx-auto my-12 px-4 text-zinc-900">
      <div className="text-center mb-10 select-none">
        <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3 inline-block">
          Brand Onboarding Portal
        </span>
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 font-display sm:text-5xl">
          Register Client Profile
        </h1>
        <p className="text-zinc-500 mt-2 max-w-lg mx-auto text-sm leading-relaxed">
          Join high-paying sponsors deploying automated advertising directives across Premium subreddits.
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 p-4 rounded-2xl mb-8 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-8">
          
          {/* Section 1: Core Details */}
          <div>
            <h2 className="text-xl font-black font-display tracking-tight text-zinc-900 mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 select-none">
              <Building className="w-5 h-5 text-indigo-600" />
              <span>Core Brand Details</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 1. Client Full Name */}
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Client Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-500 text-xs font-sans hover:border-slate-300 transition-all font-medium"
                  />
                </div>
              </div>

              {/* 2. Client Company/Brand Name */}
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Company / Brand Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                    <Building className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Cyberdyne Systems"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-500 text-xs font-sans hover:border-slate-300 transition-all font-medium"
                  />
                </div>
              </div>

              {/* 3. Client Country (all 195 countries) */}
              <div className="md:col-span-2 relative">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Client Country
                </label>

                {isCountryOpen && (
                  <div className="fixed inset-0 z-10" onClick={() => setIsCountryOpen(false)} />
                )}

                <div className="relative z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCountryOpen(!isCountryOpen);
                      setIsDialOpen(false);
                    }}
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-500 text-xs font-sans text-left flex items-center justify-between cursor-pointer transition"
                  >
                    <span className="flex items-center gap-2">
                      <span className="absolute left-3.5 top-3.5 text-zinc-400">
                        <Globe className="w-4 h-4" />
                      </span>
                      {country ? (
                        <>
                          <span className="text-base leading-none">
                            {ALL_COUNTRIES.find(c => c.name === country)?.flag}
                          </span>
                          <span className="font-medium text-zinc-800">{country}</span>
                        </>
                      ) : (
                        <span className="text-zinc-450 font-medium">Select your country</span>
                      )}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isCountryOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isCountryOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden z-35"
                      >
                        <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Type to filter 195 countries..."
                            className="w-full text-xs bg-transparent text-zinc-900 focus:outline-none placeholder-zinc-400 py-1 font-sans"
                            autoFocus
                          />
                          {countrySearch && (
                            <button
                              type="button"
                              onClick={() => setCountrySearch('')}
                              className="text-zinc-400 hover:text-zinc-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 scrollbar-thin text-left">
                          {filteredCountries.length === 0 ? (
                            <div className="p-3 text-center text-xs text-zinc-400 italic">
                              No countries found matching your search.
                            </div>
                          ) : (
                            filteredCountries.map((c) => (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => handleSelectCountry(c.name)}
                                className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-zinc-700 transition-colors flex items-center gap-3 ${
                                  country === c.name ? 'bg-indigo-50 font-extrabold text-indigo-600' : ''
                                }`}
                              >
                                <span className="text-base leading-none shrink-0">{c.flag}</span>
                                <span className="truncate">{c.name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 4. Client Gmail Address & Security Password combined */}
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Client Gmail Address (Ends in @gmail.com)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input 
                    type="email" 
                    value={gmail}
                    onChange={(e) => setGmail(e.target.value)}
                    placeholder="brand.manager@gmail.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-500 text-xs font-sans hover:border-slate-300 transition-all font-medium"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5 font-sans">Verification link will be dispatched automatically upon draft profile execution.</p>
              </div>

              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Portal Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-11 py-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-500 text-xs font-sans hover:border-slate-300 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5 font-sans">Create a secure client portal logging password.</p>
              </div>

              {/* 5. Phone Number + OTP Verification using Phone.Email */}
              <div className="md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                {!phoneVerified ? (
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                      PHONE NUMBER VERIFICATION
                    </label>
                    <div className="mb-4 bg-white p-4 rounded-xl border border-slate-200 inline-block shadow-sm">
                      <div
                        className="pe_signin_button"
                        data-client-id="11325233774487345919"
                      />
                    </div>
                    <p className="text-xs text-zinc-500 font-medium">Click above to verify your phone number</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-150 px-4 py-3 rounded-xl shadow-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-sm font-bold">Phone Verified: <span className="font-mono text-xs">{verifiedPhone}</span></span>
                  </div>
                )}
              </div>

              {/* 6. WhatsApp Number (no verification required) */}
              <div className="md:col-span-2 relative">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Client WhatsApp Number (No verification required / country code selector only)
                </label>

                {isDialOpen && (
                  <div className="fixed inset-0 z-10" onClick={() => setIsDialOpen(false)} />
                )}

                <div className="flex gap-2 relative">
                  {/* Selector Block */}
                  <div className="relative z-20 w-36 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDialOpen(!isDialOpen);
                        setIsCountryOpen(false);
                      }}
                      className="w-full h-full px-3 py-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-500 text-xs font-mono flex items-center justify-between cursor-pointer transition"
                    >
                      {(() => {
                        const matched = ALL_COUNTRIES.find(c => c.code === dialCode);
                        return (
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="text-base leading-none">{matched?.flag || '🌐'}</span>
                            <span className="font-bold text-zinc-850">{dialCode}</span>
                          </span>
                        );
                      })()}
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </button>

                    <AnimatePresence>
                      {isDialOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden z-35"
                        >
                          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
                            <input
                              type="text"
                              value={dialSearch}
                              onChange={(e) => setDialSearch(e.target.value)}
                              placeholder="Search dial code..."
                              className="w-full text-xs bg-transparent text-zinc-900 focus:outline-none placeholder-zinc-400 py-1 font-sans"
                              autoFocus
                            />
                            {dialSearch && (
                              <button
                                type="button"
                                onClick={() => setDialSearch('')}
                                className="text-zinc-400 hover:text-zinc-655 shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 scrollbar-thin text-left">
                            {filteredDialCodes.length === 0 ? (
                              <div className="p-3 text-center text-xs text-zinc-400 italic">
                                No matches.
                              </div>
                            ) : (
                              filteredDialCodes.map((c) => (
                                <button
                                  key={`${c.name}-${c.code}`}
                                  type="button"
                                  onClick={() => {
                                    setDialCode(c.code);
                                    setIsDialOpen(false);
                                    setDialSearch('');
                                  }}
                                  className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 text-xs text-zinc-700 transition-colors flex items-center justify-between ${
                                    dialCode === c.code ? 'bg-indigo-50 font-extrabold text-indigo-600' : ''
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <span className="text-sm shrink-0">{c.flag}</span>
                                    <span className="truncate text-[10px] text-zinc-400 font-sans">{c.name}</span>
                                  </span>
                                  <span className="font-mono text-[10px] text-indigo-600 shrink-0 font-bold">{c.code}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Digits Only Input */}
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input 
                      type="tel" 
                      value={whatsAppNum}
                      onChange={(e) => setWhatsAppNum(e.target.value.replace(/\D/g, '').substring(0, 15))}
                      placeholder="e.g. 9876543210 (digits only)"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-500 text-xs font-sans hover:border-slate-300 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="mt-2.5 select-text">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl inline-block">
                    <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">Your WhatsApp Preview:</span>
                    <span className="text-xs text-indigo-600 font-mono font-bold">
                      {dialCode} {whatsAppNum || '—'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section 7: About Payment */}
          <div>
            <h2 className="text-xl font-black font-display tracking-tight text-zinc-900 mb-5 flex items-center gap-2 border-b border-slate-100 pb-3 select-none">
              <Coins className="w-5 h-5 text-indigo-600" />
              <span>Payments & Disbursal Plan</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Payment Method Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Payout Method Selection
                </label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-550 text-xs font-sans hover:border-slate-300 transition-all font-medium"
                >
                  <option value="Crypto">Crypto (USDT BEP20)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other Alternative Methods</option>
                </select>
              </div>

              {/* Estimated Monthly Budget */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Estimated Monthly Campaign Budget (USDT)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                    <Coins className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 5,000 USDT"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-500 text-xs font-sans hover:border-slate-300 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Additional Payment Notes */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  Additional Payment Notes
                </label>
                <textarea 
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Desired frequency of settlement, special guidelines, or crypto wallet preferences..."
                  className="w-full p-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-550 text-xs font-sans resize-none hover:border-slate-300 transition-all font-medium"
                />
              </div>

            </div>
          </div>

          {/* Section 8: Agree to Terms Checkbox */}
          <div className="mt-8 pt-4 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 w-4.5 h-4.5 bg-slate-50 border-slate-200 text-indigo-600 rounded focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-zinc-500 font-medium leading-relaxed font-sans">
                I agree to the <strong className="text-zinc-700 font-bold">Campaign Terms of Service</strong>. I certify that all brand links provided represent real materials. Influencer Verse maintains full claim audit authorizations.
              </span>
            </label>
          </div>

          {/* Section 9: Submit for Review Button block */}
          <div className="flex gap-4 pt-4 border-t border-slate-150">
            <button
              id="submit_client_register"
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-750 text-white font-black uppercase tracking-wider rounded-xl transition focus:outline-none text-center block text-xs disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/10 hover:scale-[1.01]"
            >
              {loading ? 'Submitting Registry Profile...' : 'Submit Profile for Admin Review'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('client-login')}
              className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-zinc-700 border border-slate-200 font-bold rounded-xl transition text-xs whitespace-nowrap cursor-pointer uppercase tracking-wider"
            >
              Sign In Instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
