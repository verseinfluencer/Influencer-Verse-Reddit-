import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Shield, RefreshCw, Key, ShieldAlert, CheckCircle2, UserCheck, Trash2, Eye, EyeOff } from 'lucide-react';
import { AccountSidebar } from '../components/AccountSidebar';

interface SettingsPageProps {
  onNavigate: (page: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { 
    currentUser, 
    updateProfile, 
    changePassword, 
    deleteAccount,
    addRedditAccount,
    removeRedditAccount,
    setPrimaryRedditAccount
  } = useApp();

  // Profile forms
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [redditUsername, setRedditUsername] = useState(currentUser?.redditUsername || '');
  const [redditProfileLink, setRedditProfileLink] = useState(currentUser?.redditProfileLink || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Non-binary' | 'Prefer not to say' | ''>(currentUser?.gender || '');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // New Reddit account connection state
  const [newRedditUsername, setNewRedditUsername] = useState('');
  const [newRedditProfileUrl, setNewRedditProfileUrl] = useState('');
  const [newAccError, setNewAccError] = useState<string | null>(null);

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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 select-none" id="settings-panel">
      
      {/* Title Header */}
      <div className="space-y-1.5 pb-4 border-b border-gray-200">
        <span className="text-xs text-purple-600 font-bold uppercase tracking-widest block mb-1">Configuration parameters</span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Platform Settings</h1>
        <p className="text-sm text-gray-500 font-medium">Manage your linked Reddit profiles, security credentials, and preferences</p>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Sidebar Left Column */}
        <AccountSidebar activeTab="settings" onNavigate={onNavigate} />

        {/* Forms Content Right Column */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          
          {/* Rules info sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-amber-50/50 border border-amber-200/55 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold uppercase text-amber-800 tracking-wider">Reddit Binding Rules</h3>
              <div className="space-y-3 text-xs text-gray-650 leading-relaxed font-medium">
                <p>⚠️ <strong>Anti-Spam Re-verification:</strong> Adjusting your linked Reddit Username or Profile URL automatically resets your account status back to <strong className="text-amber-700">Pending Review</strong>.</p>
                <p>Admins will need to re-verify your credential authenticity before task access is unlocked.</p>
                <p>Always double check format: <strong>reddit.com/user/[username]</strong> matches your username exactly.</p>
              </div>
            </div>
          </div>

          {/* Right Forms column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Profile details form card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                <UserCheck className="w-4 h-4 text-purple-600" /> Account Profile Details
              </h2>

              {profileSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 mb-5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> Profile details saved successfully!
                </div>
              )}

              <form onSubmit={handleUpdateProfileSubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs text-gray-900 bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Gender</label>
                  <select 
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full text-xs text-gray-900 bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all cursor-pointer font-medium"
                  >
                    <option value="">Select Gender (Optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Linked Reddit Username</label>
                  <input 
                    type="text" 
                    value={redditUsername}
                    onChange={(e) => setRedditUsername(e.target.value)}
                    className="w-full text-xs text-gray-900 bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all font-mono font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Linked Reddit Profile URL</label>
                  <input 
                    type="text" 
                    value={redditProfileLink}
                    onChange={(e) => setRedditProfileLink(e.target.value)}
                    placeholder="https://www.reddit.com/user/Extension-Chef-7943"
                    className="w-full text-xs text-gray-900 bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all font-mono font-medium"
                    required
                  />
                  <p className="text-[10px] text-gray-400 font-medium mt-1.5">
                    Format: <span className="text-gray-500">https://www.reddit.com/user/[username]</span>
                  </p>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-xs font-bold text-white rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer transition-all"
                  >
                    Save Account Profile
                  </button>
                </div>
              </form>
            </div>

            {/* Connected Reddit Accounts Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-600" /> Connected Reddit Accounts
                </h2>
                <span className="text-xs font-bold px-2 py-1 bg-purple-50 text-purple-700 rounded-lg">
                  {currentUser.redditAccounts?.length || 1}/4 Connected
                </span>
              </div>

              {/* Accounts list */}
              <div className="space-y-3.5">
                {(currentUser.redditAccounts || []).map((acc) => (
                  <div key={acc.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/40 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1.5 flex-1 w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-mono text-gray-900">{acc.redditUsername}</strong>
                        {acc.isPrimary && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            Primary
                          </span>
                        )}
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                          acc.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          acc.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {acc.status}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-gray-500 font-medium flex items-center gap-3 flex-wrap">
                        <span className="truncate">
                          Profile: <a href={acc.redditProfileUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">{acc.redditProfileUrl}</a>
                        </span>
                        <span className="shrink-0">•</span>
                        <span className="shrink-0 font-bold text-purple-700">Karma: {acc.karma || 0}</span>
                        <span className="shrink-0">•</span>
                        <span className="shrink-0 font-bold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{acc.tier || 'Bronze'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {!acc.isPrimary && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await setPrimaryRedditAccount(acc.id);
                              alert("Swapped primary account focus safely!");
                            } catch (err: any) {
                              alert(err.message || "Failed to update primary focus.");
                            }
                          }}
                          className="px-2.5 py-1.5 bg-white border border-gray-254 hover:bg-gray-50 text-[10px] font-bold text-gray-700 hover:text-purple-700 rounded-lg transition-all cursor-pointer shadow-sm"
                        >
                          Set Primary
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Remove connected Reddit account ${acc.redditUsername}? This is irreversible and limits task workflows for this specific handle.`)) {
                            try {
                              await removeRedditAccount(acc.id);
                            } catch (err: any) {
                              alert(err.message || "Failed to remove Reddit account.");
                            }
                          }
                        }}
                        className="p-1.5 hover:bg-rose-50 hover:text-rose-650 text-gray-400 rounded-lg transition-all cursor-pointer"
                        title="Delete this connected account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add account form if slot exists */}
              {(!currentUser.redditAccounts || currentUser.redditAccounts.length < 4) ? (
                <div className="p-5 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700">Connect Another Reddit Handle</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Reddit Username</label>
                      <input 
                        type="text" 
                        value={newRedditUsername}
                        onChange={(e) => setNewRedditUsername(e.target.value)}
                        placeholder="e.g. u/username"
                        className="w-full text-xs text-gray-900 bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Profile URL</label>
                      <input 
                        type="text" 
                        value={newRedditProfileUrl}
                        onChange={(e) => setNewRedditProfileUrl(e.target.value)}
                        placeholder="https://www.reddit.com/user/username"
                        className="w-full text-xs text-gray-900 bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {newAccError && (
                    <p className="text-xs text-rose-600 font-semibold">{newAccError}</p>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      setNewAccError(null);
                      if (!newRedditUsername.trim() || !newRedditProfileUrl.trim()) {
                        setNewAccError("Please specify both a username and a valid profile URL.");
                        return;
                      }
                      try {
                        await addRedditAccount(newRedditUsername.trim(), newRedditProfileUrl.trim());
                        setNewRedditUsername('');
                        setNewRedditProfileUrl('');
                        alert("Reddit account added successfully! It has been submitted for verification.");
                      } catch (err: any) {
                        setNewAccError(err.message || "Failed to add Reddit account.");
                      }
                    }}
                    className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  >
                    Connect Account
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-center">
                  <p className="text-xs text-purple-950 font-bold">You can connect up to 4 Reddit accounts.</p>
                </div>
              )}
            </div>

            {/* Security details form card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Key className="w-4 h-4 text-purple-600" /> Security Reset Password
              </h2>

              {pwSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 mb-5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> Password updated successfully!
                </div>
              )}

              {pwError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 mb-5 font-semibold">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{pwError}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Old Password</label>
                    <div className="relative">
                      <input 
                        type={showOldPw ? "text" : "password"} 
                        value={oldPw}
                        onChange={(e) => setOldPw(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs text-gray-900 bg-white border border-gray-200 pl-3.5 pr-10 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPw(!showOldPw)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 transition-colors cursor-pointer"
                        title={showOldPw ? "Hide password" : "Show password"}
                      >
                        {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">New Password</label>
                    <div className="relative">
                      <input 
                        type={showNewPw ? "text" : "password"} 
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs text-gray-900 bg-white border border-gray-200 pl-3.5 pr-10 py-2.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 transition-colors cursor-pointer"
                        title={showNewPw ? "Hide password" : "Show password"}
                      >
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    className="px-5 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 rounded-xl cursor-pointer hover:shadow-sm transition-all shadow-sm active:scale-98"
                  >
                    Reset Account Password
                  </button>
                </div>
              </form>
            </div>

            {/* Preferences details toggle card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Settings className="w-4 h-4 text-purple-600" /> Platform Preferences
              </h2>

              <div className="space-y-4 text-xs font-semibold">
                <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                  <div>
                    <span className="text-gray-900 font-bold block">Email Transaction Alerts</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mt-0.5">Declaim notify on withdrawals audits completion</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="accent-purple-600 rounded w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <div>
                    <span className="text-gray-900 font-bold block">New Campaign broadcasts</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mt-0.5">Trigger push indicators on premium releases</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={newCampaignAlerts}
                    onChange={(e) => setNewCampaignAlerts(e.target.checked)}
                    className="accent-purple-600 rounded w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* DANGER ZONE */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-rose-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 text-rose-700" /> Danger Config Zone</h3>
              <p className="text-xs text-rose-900 mb-4 font-semibold leading-relaxed">Permanently delete your entire Influencer Verse profile. This is completely irreversible and wipes wallet database entries instantly.</p>
              <button 
                onClick={handleDeleteTrigger}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
              >
                Request Account Deletion
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
