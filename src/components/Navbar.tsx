import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Sun, Moon, LogOut, User as UserIcon, Settings, BarChart, FileText, Gift, Award, Menu, X, Wallet, ShieldAlert, HeartHandshake } from 'lucide-react';
import { AppNotification } from '../types';
import { Logo } from './Logo';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { currentUser, logout, theme, toggleTheme, notifications, markNotificationRead, clearAllNotifications } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter notifications relevant to this user or "all"
  const userNotifications = notifications.filter(n => 
    currentUser ? (n.userId === currentUser.id || n.userId === 'all') : false
  );
  
  const unreadCount = userNotifications.filter(n => !n.read).length;

  const handleNotifClick = (n: AppNotification) => {
    markNotificationRead(n.id);
    if (n.type === 'verification') {
      onNavigate('profile');
    } else if (n.type === 'new_task') {
      onNavigate('marketplace');
    } else if (n.type === 'withdrawal_update') {
      onNavigate('wallet');
    }
    setNotifOpen(false);
  };

  const navItemClass = (itemPage: string) => {
    const isActive = currentPage === itemPage;
    return `px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
      isActive 
        ? 'bg-bento-purple/20 text-[#D8B4FE] border border-bento-purple/40 shadow-[0_0_15px_rgba(124,58,237,0.25)]' 
        : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
    }`;
  };

  const isPendingUser = currentUser?.status === 'Pending';

  return (
    <nav className="sticky top-0 z-50 w-full border-b backdrop-blur-md bg-[#050505]/80 border-white/10 text-white select-none transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            onClick={() => onNavigate('home')} 
            className="cursor-pointer"
            id="nav-logo"
          >
            <Logo size="sm" withText={true} />
          </div>

          {/* Center Links - Desktop */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-2">
              {currentUser.role === 'admin' ? (
                <>
                  <button onClick={() => onNavigate('admin')} className={navItemClass('admin')}>
                    <BarChart className="w-4 h-4" /> Admin Control
                  </button>
                  <button onClick={() => onNavigate('faq')} className={navItemClass('faq')}>
                    FAQ
                  </button>
                  <button onClick={() => onNavigate('tickets')} className={navItemClass('tickets')}>
                    <HeartHandshake className="w-4 h-4" /> Support Tickets
                  </button>
                </>
              ) : currentUser.role === 'client' ? (
                <>
                  <button onClick={() => onNavigate('client-dashboard')} className={navItemClass('client-dashboard')}>
                    <BarChart className="w-4 h-4" /> Client Dashboard
                  </button>
                  <button onClick={() => onNavigate('faq')} className={navItemClass('faq')}>
                    FAQ
                  </button>
                </>
              ) : (
                <>
                  {/* Pending user can only access Profile, Settings and Notifications page */}
                  {!isPendingUser && (
                    <>
                      <button onClick={() => onNavigate('dashboard')} className={navItemClass('dashboard')}>
                        <BarChart className="w-4 h-4" /> Dashboard
                      </button>
                      <button onClick={() => onNavigate('marketplace')} className={navItemClass('marketplace')}>
                        <FileText className="w-4 h-4" /> Tasks Marketplace
                      </button>
                      <button onClick={() => onNavigate('wallet')} className={navItemClass('wallet')}>
                        <Wallet className="w-4 h-4" /> Wallet
                      </button>

                      <button onClick={() => onNavigate('leaderboard')} className={navItemClass('leaderboard')}>
                        <Award className="w-4 h-4" /> Leaderboard
                      </button>
                    </>
                  )}
                  {isPendingUser && (
                    <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-full text-xs font-semibold animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5" /> Pending Profile Approval
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!currentUser && (
            <div className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
              <button onClick={() => onNavigate('home')} className="hover:text-white cursor-pointer">Home</button>
              <button onClick={() => onNavigate('about')} className="hover:text-white cursor-pointer">About Us</button>
              <button onClick={() => onNavigate('faq')} className="hover:text-white cursor-pointer">FAQ</button>
              <button onClick={() => onNavigate('contact')} className="hover:text-white cursor-pointer">Contact</button>
              <button onClick={() => onNavigate('client-login')} className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer">Client Portal</button>
            </div>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {currentUser ? (
              <>
                {/* Balance display for approved user */}
                {currentUser.role === 'user' && !isPendingUser && (
                  <div 
                    onClick={() => onNavigate('wallet')} 
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600/10 to-blue-500/15 border border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-500/60 transition-all"
                  >
                    <Wallet className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs text-zinc-300 font-semibold">USDT</span>
                    <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
                      ${currentUser.balance.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Notifications Bell */}
                <div className="relative">
                  <button 
                    onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false); }} 
                    className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors relative"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-600 text-[9px] font-bold text-white flex items-center justify-center animate-bounce">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl p-4 text-zinc-200 z-50">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-2">
                        <span className="font-bold text-sm">Notifications ({unreadCount})</span>
                        {userNotifications.length > 0 && (
                          <button 
                            onClick={clearAllNotifications} 
                            className="text-xs text-purple-400 hover:text-purple-300 border border-purple-400/20 hover:border-purple-300/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                        {userNotifications.length === 0 ? (
                          <div className="text-center py-6 text-zinc-500 text-xs text-balance">
                            No notifications found. You will receive updates about your tasks here.
                          </div>
                        ) : (
                          userNotifications.map((n) => (
                            <div 
                              key={n.id} 
                              onClick={() => handleNotifClick(n)}
                              className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all duration-300 flex flex-col gap-0.5 ${
                                !n.read 
                                  ? 'bg-purple-600/10 border-purple-500/20 hover:bg-purple-600/20' 
                                  : 'bg-zinc-950/40 border-zinc-900 hover:bg-zinc-800/40'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-1">
                                <span className="font-semibold text-xs tracking-tight text-white">{n.title}</span>
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-1"></span>}
                              </div>
                              <span className="text-[11px] text-zinc-400 text-wrap leading-tight">{n.message}</span>
                              <span className="text-[9px] text-zinc-500 mt-1 self-end">
                                {new Date(n.timestamp).toLocaleDateString()} {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false); }} 
                    className="flex items-center gap-2 focus:outline-none"
                  >
                    <img 
                      src={currentUser.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=Admin"} 
                      alt="Avatar" 
                      className="w-8 h-8 rounded-full border border-purple-500/50 bg-zinc-950/80 p-0.5"
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl p-2 text-zinc-200 z-50">
                      <div className="px-3 py-2 border-b border-white/5 mb-1.5 leading-snug">
                        <p className="text-xs text-zinc-400 font-semibold">Signed in as</p>
                        <p className="font-bold text-sm text-white truncate max-w-[180px]">{currentUser.fullName}</p>
                        {currentUser.role === 'client' ? (
                          <p className="text-[10px] text-indigo-400 font-semibold">Brand Client Account</p>
                        ) : (
                          <p className="text-[10px] text-purple-400 font-medium truncate max-w-[180px]">{currentUser.redditUsername}</p>
                        )}
                        {currentUser.role === 'user' && !isPendingUser && (
                          <div className="mt-1.5 flex items-center justify-between bg-zinc-950 px-2 py-1 rounded-lg">
                            <span className="text-[10px] text-zinc-400">Streak:</span>
                            <span className="text-xs text-yellow-500 font-bold flex items-center gap-0.5">🔥 {currentUser.streak} days</span>
                          </div>
                        )}
                      </div>

                      {currentUser.role !== 'client' ? (
                        <>
                          <button 
                            onClick={() => { onNavigate('profile'); setDropdownOpen(false); }} 
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white text-left transition-colors cursor-pointer"
                          >
                            <UserIcon className="w-3.5 h-3.5" /> My Profile
                          </button>

                          <button 
                            onClick={() => { onNavigate('settings'); setDropdownOpen(false); }} 
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white text-left transition-colors cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5" /> Platform Settings
                          </button>

                          <button 
                            onClick={() => { onNavigate('tickets'); setDropdownOpen(false); }} 
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white text-left transition-colors cursor-pointer"
                          >
                            <HeartHandshake className="w-3.5 h-3.5" /> Help Support
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => { onNavigate('client-dashboard'); setDropdownOpen(false); }} 
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white text-left transition-colors cursor-pointer"
                        >
                          <BarChart className="w-3.5 h-3.5" /> Client Dashboard
                        </button>
                      )}

                      <div className="border-t border-white/5 my-1"></div>

                      <button 
                        onClick={() => { logout(); setDropdownOpen(false); onNavigate('home'); }} 
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-left transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Disconnect Wallet
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button 
                  onClick={() => onNavigate('login')} 
                  className="px-4 py-2 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-xs font-semibold rounded-xl text-zinc-300 hover:text-white cursor-pointer transition-all"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => onNavigate('signup')} 
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-95 text-xs font-bold rounded-xl text-white cursor-pointer shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile Hamburger Menu */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="md:hidden p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-zinc-950 p-4 space-y-3">
          {currentUser ? (
            currentUser.role === 'admin' ? (
              <>
                <button onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm font-semibold">
                  Admin Dashboard
                </button>
                <button onClick={() => { onNavigate('tickets'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm font-semibold">
                  Support Tickets
                </button>
                <button onClick={() => { onNavigate('faq'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm font-semibold">
                  FAQ Settings
                </button>
              </>
            ) : (
              <>
                {!isPendingUser ? (
                  <>
                    <button onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm font-semibold">Dashboard</button>
                    <button onClick={() => { onNavigate('marketplace'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm font-semibold">Browse Tasks</button>
                    <button onClick={() => { onNavigate('wallet'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm font-semibold">Withdraw (Wallet)</button>

                    <button onClick={() => { onNavigate('leaderboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm font-semibold">Earning Leaderboard</button>
                  </>
                ) : (
                  <div className="text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 px-3 py-2.5 rounded-lg text-xs font-semibold">
                    ⚠️ Account approval pending. Check details inside settings page.
                  </div>
                )}
                <button onClick={() => { onNavigate('profile'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm text-purple-300 font-semibold">My Account</button>
                <button onClick={() => { onNavigate('settings'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm text-purple-300 font-semibold">Settings</button>
                <button onClick={() => { onNavigate('tickets'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm text-purple-300 font-semibold">Support Center</button>
              </>
            )
          ) : (
            <div className="space-y-2">
              <button onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm">Home Page</button>
              <button onClick={() => { onNavigate('about'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm">About Us</button>
              <button onClick={() => { onNavigate('faq'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm">FAQ</button>
              <button onClick={() => { onNavigate('contact'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm">Contact Us</button>
              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }} className="w-1/2 py-2 border border-zinc-800 text-sm font-semibold rounded-lg text-zinc-300 text-center">Login</button>
                <button onClick={() => { onNavigate('signup'); setMobileMenuOpen(false); }} className="w-1/2 py-2 bg-purple-600 text-sm font-bold rounded-lg text-white text-center">Register</button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
