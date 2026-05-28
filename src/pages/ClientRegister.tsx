import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building, User, Mail, Lock, Phone, Globe, Coins, FileText, 
  AlertCircle, CheckCircle, Clock, ArrowRight, ShieldCheck, ChevronDown, Search, X 
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
  const { clientRegister } = useApp();

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
        setResendMessage('📧 Verification email sent successfully!');
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
          // Update Firestore status records immediately
          await updateDoc(doc(db, 'clients', user.uid), { gmailVerified: true });
          await updateDoc(doc(db, 'users', user.uid), { gmailVerified: true });
          setGmailVerifiedStatus(true);
          alert("✅ Email verified successfully! Admin can now approve your profile.");
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
      await clientRegister({
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
      <div id="registration_pending_page" className="max-w-xl mx-auto my-16 p-8 bg-neutral-900 border border-neutral-800 rounded-3xl text-center text-white">
        <Clock className="w-16 h-16 text-amber-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold font-sans tracking-tight mb-3">Pending Admin Review</h1>
        
        <div className="bg-indigo-950/45 p-5 rounded-2xl border border-indigo-500/25 text-left text-xs text-indigo-200 leading-relaxed font-sans space-y-2 mb-6 shadow-inner">
          <p className="font-bold text-center text-sm mb-1 text-white flex items-center justify-center gap-1.5">
            📧 Verification Sent
          </p>
          <p className="text-center">
            Verification email sent to <strong className="text-white font-black">{gmail}</strong>. Please verify your email to complete registration.
          </p>
        </div>

        <p className="text-neutral-400 mb-6 font-sans text-xs">
          Your client account is under review. <br />
          We'll contact you via WhatsApp/Gmail soon.
        </p>

        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-left text-sm text-neutral-300 space-y-2 mb-8">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
            <span>Registration Profile Saved: <strong>{company}</strong></span>
          </div>
          <p className="text-neutral-500 text-xs text-justify leading-relaxed">
            Review processes generally take under 4 hours. Authenticated brand advisors will verify your profile manually, checking your entered WhatsApp and Gmail handle before enabling live campaigns.
          </p>
          <div className="flex justify-between items-center pt-2.5 border-t border-neutral-800/85 mt-2">
            <span className="text-[10px] text-neutral-500 font-bold uppercase">Email status:</span>
            {gmailVerifiedStatus ? (
              <span className="text-xs text-emerald-400 font-bold">✅ Verified in system</span>
            ) : (
              <span className="text-xs text-rose-400 font-bold animate-pulse">❌ Pending link activation</span>
            )}
          </div>
        </div>

        {/* Resend verification email block */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={resendCooldown > 0 || resendCount >= 3}
            className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-neutral-850 text-[11px] text-zinc-300 font-bold border border-white/5 rounded-xl transition duration-150 w-full"
          >
            {resendCooldown > 0 
              ? `Resend in ${resendCooldown}s` 
              : `📧 Resend Verification Email`
            }
          </button>
          
          {resendMessage && (
            <p className="text-[11px] text-zinc-400 font-bold mt-2 text-center">
              {resendMessage}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleCheckGmailVerification}
            disabled={isCheckingGmail || gmailVerifiedStatus}
            className="px-6 py-3 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold rounded-xl transition font-sans w-full cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isCheckingGmail ? 'Syncing status...' : "I've verified my email"}
          </button>

          <button 
            id="pending_back_btn"
            onClick={() => onNavigate('client-login')} 
            className="px-6 py-3 bg-zinc-800 text-zinc-300 font-semibold rounded-xl hover:bg-zinc-700 hover:text-white transition font-sans w-full cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Go to Client Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="client_register_page" className="max-w-4xl mx-auto my-12 px-4 text-white">
      <div className="text-center mb-10 select-none">
        <span className="px-3 py-1 bg-indigo-550/20 text-indigo-400 rounded-full text-xs font-semibold tracking-wider uppercase mb-3 inline-block border border-indigo-500/10">
          Brand Onboarding Portal
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-white font-sans sm:text-5xl">
          Register Client Profile
        </h1>
        <p className="text-neutral-400 mt-2 max-w-lg mx-auto text-sm">
          Join high-paying sponsors deploying automated advertising directives across Premium subreddits.
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 sm:p-10">
        {error && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-900/60 p-4 rounded-2xl mb-8 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-8">
          
          {/* Section 1: Core Details */}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-200 mb-5 flex items-center gap-2 border-b border-neutral-800 pb-3 select-none">
              <Building className="w-5 h-5 text-indigo-400" />
              <span>Core Brand Details</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 1. Client Full Name */}
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Client Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-550 text-sm font-sans"
                  />
                </div>
              </div>

              {/* 2. Client Company/Brand Name */}
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Company / Brand Name
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                  <input 
                    type="text" 
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Cyberdyne Systems"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-550 text-sm font-sans"
                  />
                </div>
              </div>

              {/* 3. Client Country (all 195 countries) */}
              <div className="md:col-span-2 relative">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
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
                    className="w-full pl-11 pr-10 py-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-550 text-sm font-sans text-left flex items-center justify-between cursor-pointer transition"
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                      {country ? (
                        <>
                          <span className="text-base leading-none">
                            {ALL_COUNTRIES.find(c => c.name === country)?.flag}
                          </span>
                          <span>{country}</span>
                        </>
                      ) : (
                        <span className="text-neutral-500 font-medium">Select your country</span>
                      )}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${isCountryOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isCountryOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute left-0 right-0 mt-2 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-35"
                      >
                        <div className="p-2 border-b border-neutral-800 bg-neutral-900 flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Type to filter 195 countries..."
                            className="w-full text-xs bg-transparent text-white focus:outline-none placeholder-neutral-500 py-1"
                            autoFocus
                          />
                          {countrySearch && (
                            <button
                              type="button"
                              onClick={() => setCountrySearch('')}
                              className="text-neutral-500 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="max-h-60 overflow-y-auto divide-y divide-neutral-900 scrollbar-thin text-left">
                          {filteredCountries.length === 0 ? (
                            <div className="p-3 text-center text-xs text-neutral-500 italic">
                              No countries found matching your search.
                            </div>
                          ) : (
                            filteredCountries.map((c) => (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => handleSelectCountry(c.name)}
                                className={`w-full text-left px-4 py-2.5 hover:bg-indigo-600/20 text-xs text-neutral-200 transition-colors flex items-center gap-3 ${
                                  country === c.name ? 'bg-indigo-600/10 font-bold text-indigo-400' : ''
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
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Client Gmail Address (Ends in @gmail.com)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 text-neutral-500 w-4 h-4" />
                  <input 
                    type="email" 
                    value={gmail}
                    onChange={(e) => setGmail(e.target.value)}
                    placeholder="brand.manager@gmail.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-550 text-sm font-sans"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Verification link will be dispatched automatically upon draft profile execution.</p>
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Portal Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-550 text-sm font-sans"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Create a secure client portal logging password.</p>
              </div>

              {/* 5. Phone Number + OTP Verification using Phone.Email */}
              <div className="md:col-span-2 bg-neutral-950 p-6 rounded-2xl border border-neutral-800/80 space-y-4">
                {!phoneVerified ? (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-widest mb-3">
                      PHONE NUMBER VERIFICATION
                    </label>
                    <div className="mb-4 bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 inline-block">
                      <div
                        className="pe_signin_button"
                        data-client-id="11325233774487345919"
                      />
                    </div>
                    <p className="text-xs text-neutral-400">Click above to verify your phone number</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-4 py-3 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-450 shrink-0" />
                    <span className="text-sm font-bold">✅ Phone Verified: {verifiedPhone}</span>
                  </div>
                )}
              </div>

              {/* 6. WhatsApp Number (no verification required) */}
              <div className="md:col-span-2 relative">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
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
                      className="w-full h-full px-3 py-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-550 text-xs font-mono flex items-center justify-between cursor-pointer transition"
                    >
                      {(() => {
                        const matched = ALL_COUNTRIES.find(c => c.code === dialCode);
                        return (
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="text-base leading-none">{matched?.flag || '🌐'}</span>
                            <span>{dialCode}</span>
                          </span>
                        );
                      })()}
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    </button>

                    <AnimatePresence>
                      {isDialOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 mt-2 w-56 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-35"
                        >
                          <div className="p-2 border-b border-neutral-800 bg-neutral-900 flex items-center gap-2">
                            <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-1" />
                            <input
                              type="text"
                              value={dialSearch}
                              onChange={(e) => setDialSearch(e.target.value)}
                              placeholder="Search dial code..."
                              className="w-full text-xs bg-transparent text-white focus:outline-none placeholder-neutral-500 py-1"
                              autoFocus
                            />
                            {dialSearch && (
                              <button
                                type="button"
                                onClick={() => setDialSearch('')}
                                className="text-neutral-500 hover:text-white shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="max-h-52 overflow-y-auto divide-y divide-neutral-900 scrollbar-thin text-left">
                            {filteredDialCodes.length === 0 ? (
                              <div className="p-3 text-center text-xs text-neutral-500 italic">
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
                                  className={`w-full text-left px-3 py-2.5 hover:bg-indigo-600/20 text-xs text-neutral-300 transition-colors flex items-center justify-between ${
                                    dialCode === c.code ? 'bg-indigo-600/10 font-bold text-indigo-400' : ''
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <span className="text-sm shrink-0">{c.flag}</span>
                                    <span className="truncate text-[10px] text-neutral-400">{c.name}</span>
                                  </span>
                                  <span className="font-mono text-[10px] text-indigo-400 shrink-0 font-bold">{c.code}</span>
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
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                    <input 
                      type="tel" 
                      value={whatsAppNum}
                      onChange={(e) => setWhatsAppNum(e.target.value.replace(/\D/g, '').substring(0, 15))}
                      placeholder="e.g. 9876543210 (digits only)"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-550 text-sm font-sans"
                    />
                  </div>
                </div>

                <div className="mt-2 space-y-1 select-text">
                  <div className="flex items-center gap-2 bg-neutral-950/40 border border-neutral-800/40 px-3 py-1.5 rounded-xl">
                    <span className="text-[9px] font-black uppercase text-neutral-500 tracking-wider">Your WhatsApp Preview:</span>
                    <span className="text-xs text-indigo-400 font-mono font-black">
                      {dialCode} {whatsAppNum || '—'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section 7: About Payment */}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-200 mb-5 flex items-center gap-2 border-b border-neutral-800 pb-3 select-none">
              <Coins className="w-5 h-5 text-indigo-400" />
              <span>Payments & Disbursal Plan</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Payment Method Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Payout Method Selection
                </label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-550 text-sm font-sans"
                >
                  <option value="Crypto">Crypto (USDT BEP20)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other Alternative Methods</option>
                </select>
              </div>

              {/* Estimated Monthly Budget */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Estimated Monthly Campaign Budget (USDT)
                </label>
                <div className="relative">
                  <Coins className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                  <input 
                    type="text" 
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 5,000 USDT"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-550 text-sm font-sans"
                  />
                </div>
              </div>

              {/* Additional Payment Notes */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Additional Payment Notes
                </label>
                <textarea 
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Desired frequency of settlement, special guidelines, or crypto wallet preferences..."
                  className="w-full p-3 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-550 text-sm font-sans resize-none"
                />
              </div>

            </div>
          </div>

          {/* Section 8: Agree to Terms Checkbox */}
          <div className="mt-8 pt-4 border-t border-neutral-800">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 w-4.5 h-4.5 bg-neutral-950 text-indigo-500 border border-neutral-800 rounded focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-neutral-400">
                I agree to the <strong>Campaign Terms of Service</strong>. I certify that all brand links provided represent real materials. Influencer Verse maintains full claim audit authorizations.
              </span>
            </label>
          </div>

          {/* Section 9: Submit for Review Button block */}
          <div className="flex gap-4 pt-4 border-t border-neutral-800">
            <button
              id="submit_client_register"
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 px-6 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold rounded-xl transition focus:outline-none text-center block text-sm disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/10"
            >
              {loading ? 'Submitting Registry Profile...' : 'Submit Profile for Admin Review'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('client-login')}
              className="py-3.5 px-6 bg-neutral-800 text-white font-semibold rounded-xl hover:bg-neutral-700 transition text-sm cursor-pointer whitespace-nowrap"
            >
              Sign In Instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
