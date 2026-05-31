import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Shield, RefreshCw, Key, ShieldAlert, CheckCircle2, UserCheck, Trash2, Eye, EyeOff } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser, updateProfile, changePassword, deleteAccount } = useApp();

  // Profile forms
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [redditUsername, setRedditUsername] = useState(currentUser?.redditUsername || '');
  const [redditProfileLink, setRedditProfileLink] = useState(currentUser?.redditProfileLink || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Non-binary' | 'Prefer not to say' | ''>(currentUser?.gender || '');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password fields
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [newCampaignAlerts, setNewCampaignAlerts] = useState(true);

  if (!currentUser) return null;

  const handleUpdateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !redditUsername || !redditProfileLink) return;
    
    updateProfile(fullName, redditUsername, redditProfileLink, gender ? gender : undefined);
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (!oldPw || !newPw) {
      setPwError('Please fill in password fields.');
      return;
    }

    try {
      await changePassword(oldPw, newPw);
      setPwSuccess(true);
      setOldPw('');
      setNewPw('');
    } catch {
      setPwError('Failed updating password.');
    }
  };

  const handleDeleteTrigger = () => {
    if (confirm('🚨 CRITICAL WARNING: Clicking OK will permanently delete your account, wallet credentials, and all earned available USDT values instantly! Are you sure?')) {
      deleteAccount();
      alert('Your account has been deleted safely.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-white select-none" id="settings-panel">
      
      {/* Title */}
      <div className="space-y-1.5 pb-2">
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block mb-1">Configuration parameters</span>
        <h1 className="text-2xl md:text-3xl font-black">Platform Settings</h1>
        <p className="text-xs text-zinc-400">Manage your linked Reddit profiles, security passwords, and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column Config navigations/rules info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-900/20 border border-white/15 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-purple-400 tracking-wider">Reddit Binding Rules</h3>
            <div className="space-y-3.5 text-xs text-zinc-400 leading-relaxed font-normal">
              <p>⚠️ <strong>Anti-Spam Re-verification:</strong> Adjusting your linked Reddit Username or Profile URL automatically resets your account status back to <strong className="text-yellow-500">Pending Review</strong>.</p>
              <p>Admins will need to re-verify your credential authenticity before task access is unlocked.</p>
              <p>Always double check format: <strong>reddit.com/user/[username]</strong> matches your username exactly.</p>
            </div>
          </div>
        </div>

        {/* Right 2 Columns - Forms */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Profile details form card */}
          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-sm font-black mb-4 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <UserCheck className="w-4 h-4 text-purple-400" /> Account Profile Details
            </h2>

            {profileSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Profile details saved successfully!
              </div>
            )}

            <form onSubmit={handleUpdateProfileSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Gender</label>
                <select 
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="">Select Gender (Optional)</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Linked Reddit Username</label>
                <input 
                  type="text" 
                  value={redditUsername}
                  onChange={(e) => setRedditUsername(e.target.value)}
                  className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Linked Reddit Profile URL</label>
                <input 
                  type="text" 
                  value={redditProfileLink}
                  onChange={(e) => setRedditProfileLink(e.target.value)}
                  placeholder="https://www.reddit.com/user/Extension-Chef-7943"
                  className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none font-mono"
                />
                <p className="text-[9px] text-zinc-500 font-semibold mt-1">
                  Format: <span className="text-zinc-400">https://www.reddit.com/user/[username]</span>
                </p>
              </div>

              <button 
                type="submit"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-xs font-black text-white rounded-xl shadow-md cursor-pointer"
              >
                Save Account Profile
              </button>
            </form>
          </div>

          {/* Security details form card */}
          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-sm font-black mb-4 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Key className="w-4 h-4 text-purple-400" /> Security Reset Password
            </h2>

            {pwSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Password updated successfully!
              </div>
            )}

            {pwError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{pwError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Old Password</label>
                  <div className="relative">
                    <input 
                      type={showOldPw ? "text" : "password"} 
                      value={oldPw}
                      onChange={(e) => setOldPw(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-3 pr-10 py-2.5 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPw(!showOldPw)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      title={showOldPw ? "Hide password" : "Show password"}
                    >
                      {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">New Password</label>
                  <div className="relative">
                    <input 
                      type={showNewPw ? "text" : "password"} 
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-3 pr-10 py-2.5 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      title={showNewPw ? "Hide password" : "Show password"}
                    >
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-xs font-bold text-zinc-300 hover:text-white rounded-xl cursor-pointer"
              >
                Reset Account Password
              </button>
            </form>
          </div>

          {/* Preferences details toggle card */}
          <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-sm font-black mb-4 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Settings className="w-4 h-4 text-purple-400" /> Platform Preferences
            </h2>

            <div className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <div>
                  <span className="text-white block">Email Transaction Alerts</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Declaim notify on withdrawals audits completion</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="accent-purple-600 rounded"
                />
              </div>

              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="text-white block">New Campaign broadcasts</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Trigger push indicators on premium releases</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={newCampaignAlerts}
                  onChange={(e) => setNewCampaignAlerts(e.target.checked)}
                  className="accent-purple-600 rounded"
                />
              </div>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="bg-red-950/10 border border-red-500/20 rounded-2xl p-6">
            <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-2">Danger Config Zone</h3>
            <p className="text-xs text-zinc-400 mb-4 font-semibold leading-relaxed">Permanently delete your entire Influencer Verse profile. This is completely irreversible and wipes wallet database entries instant.</p>
            <button 
              onClick={handleDeleteTrigger}
              className="px-4 py-2 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Request Account Deletion
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
