import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, LogOut, User as UserIcon, Settings, BarChart, FileText, Gift, Award, Menu, X, Wallet, ShieldAlert, HeartHandshake } from 'lucide-react';
import { AppNotification } from '../types';
import { Logo } from './Logo';
import { motion } from 'motion/react';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { currentUser, logout, notifications, markNotificationRead, clearAllNotifications } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Unified public navigation items defined for SaaS consistency
  const publicNavItems = [
    { label: 'Home', page: 'home' },
    { label: 'About Us', page: 'about' },
    { label: 'Trust & Payouts', page: 'trust' },
    { label: 'FAQ', page: 'faq' },
    { label: 'Contact', page: 'contact' },
    { label: 'Client Portal', page: 'client-login' }
  ];

  const isNavActive = (page: string) => {
    if (page === 'client-login') {
      return currentPage === 'client-login' || currentPage === 'client-register';
    }
    return currentPage === page;
  };

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
    if (isLightHeader) {
      return `px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
        isActive 
          ? 'bg-purple-150 text-purple-700 bg-purple-50 border border-purple-200/50 shadow-[0_2px_10px_rgba(124,58,237,0.08)] font-extrabold' 
          : 'text-zinc-600 hover:text-purple-600 hover:bg-zinc-100 border border-transparent font-medium'
      }`;
    }
    return `px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
      isActive 
        ? 'bg-bento-purple/20 text-[#D8B4FE] border border-bento-purple/40 shadow-[0_0_15px_rgba(124,58,237,0.25)]' 
        : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
    }`;
  };

  const isPendingUser = currentUser?.status === 'Pending';
  const isPublic = !currentUser;
  const isLightHeader = ['home', 'about', 'faq', 'contact', 'trust', 'terms', 'referrals', 'login', 'signup', 'client-login', 'client-register', 'dashboard', 'marketplace', 'wallet', 'leaderboard', 'profile', 'settings'].includes(currentPage);

  const navBgClass = isLightHeader
    ? 'sticky top-0 z-50 w-full border-b backdrop-blur-md bg-white/90 border-slate-100 text-zinc-900 shadow-[0_2px_15px_rgba(0,0,0,0.02)] select-none transition-all duration-300'
    : 'sticky top-0 z-50 w-full border-b backdrop-blur-md bg-[#050505]/80 border-white/10 text-white select-none transition-all duration-300';

  const mobileMenuBgClass = isLightHeader
    ? 'md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-lg p-5 space-y-3 shadow-lg'
    : 'md:hidden border-t border-white/10 bg-zinc-950 p-4 space-y-3';

  return (
    <nav className={navBgClass}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            onClick={() => onNavigate('home')} 
            className="cursor-pointer"
            id="nav-logo"
          >
            <Logo size="sm" withText={true} textClassName={isLightHeader ? "text-black font-black" : "text-white font-black"} />
          </div>

          {/* Center Links - Desktop */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-2">
              {(currentUser.role === 'admin' || currentUser.role === 'moderator') ? (
                <>
                  <button onClick={() => onNavigate('admin')} className={navItemClass('admin')}>
                    <BarChart className="w-4 h-4" /> {currentUser.role === 'admin' ? 'Admin Control' : 'Moderator Panel'}
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
            <div className="hidden md:flex items-center gap-7 text-sm">
              {publicNavItems.map((item) => {
                const isActive = isNavActive(item.page);
                return (
                  <button
                    key={item.page}
                    onClick={() => onNavigate(item.page)}
                    className={`relative py-1.5 px-0.5 text-xs font-semibold cursor-pointer transition-all duration-300 transform hover:-translate-y-[2px] flex items-center bg-transparent border-none outline-none ${
                      isActive
                        ? isLightHeader
                          ? 'text-purple-600 font-bold'
                          : 'text-[#D8B4FE] font-bold'
                        : isLightHeader
                          ? 'text-zinc-600 hover:text-purple-600'
                          : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className={`absolute bottom-[-2px] left-0 right-0 h-[2px] rounded-full transition-all duration-300 ${
                        isLightHeader ? 'bg-purple-600' : 'bg-purple-400'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-3">
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
                    className={`p-2 rounded-xl border transition-colors relative ${
                      isLightHeader 
                        ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-zinc-600 hover:text-purple-600'
                        : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
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
                    <div className={`absolute right-0 mt-2 w-80 rounded-2xl border shadow-2xl p-4 z-50 ${
                      isLightHeader 
                        ? 'border-slate-200 bg-white text-zinc-700 shadow-xl shadow-zinc-200/50' 
                        : 'border-white/10 bg-zinc-900 text-zinc-200'
                    }`}>
                      <div className={`flex justify-between items-center pb-2 border-b mb-2 ${
                        isLightHeader ? 'border-slate-100' : 'border-white/5'
                      }`}>
                        <span className={`font-bold text-sm ${isLightHeader ? 'text-zinc-800 font-bold' : 'text-zinc-200'}`}>Notifications ({unreadCount})</span>
                        {userNotifications.length > 0 && (
                          <button 
                            onClick={clearAllNotifications} 
                            className={`text-xs border px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              isLightHeader
                                ? 'text-purple-650 border-purple-200 hover:bg-purple-50 hover:border-purple-300'
                                : 'text-purple-400 border-purple-400/20 hover:border-purple-300/40'
                            }`}
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
                                  ? isLightHeader
                                    ? 'bg-purple-50/60 border-purple-100/70 hover:bg-purple-50'
                                    : 'bg-purple-600/10 border-purple-500/20 hover:bg-purple-600/20' 
                                  : isLightHeader
                                    ? 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100/50'
                                    : 'bg-zinc-950/40 border-zinc-900 hover:bg-zinc-800/40'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-1">
                                <span className={`font-bold text-xs tracking-tight ${isLightHeader ? 'text-zinc-800 font-bold' : 'text-white font-semibold'}`}>{n.title}</span>
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-1"></span>}
                              </div>
                              <span className={`text-[11px] text-wrap leading-tight ${isLightHeader ? 'text-zinc-550 font-medium' : 'text-zinc-400 font-semibold'}`}>{n.message}</span>
                              <span className="text-[9px] text-zinc-405 mt-1 self-end font-medium">
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
                    <div className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl p-2 z-50 ${
                      isLightHeader
                        ? 'border-slate-200 bg-white text-zinc-750 shadow-xl shadow-zinc-200/50'
                        : 'border-white/10 bg-zinc-900 text-zinc-205'
                    }`}>
                      <div className={`px-3 py-2 border-b mb-1.5 leading-snug ${
                        isLightHeader ? 'border-slate-100' : 'border-white/5'
                      }`}>
                        <p className="text-xs text-zinc-400 font-semibold">Signed in as</p>
                        <p className={`font-bold text-sm truncate max-w-[180px] ${isLightHeader ? 'text-zinc-800 font-bold' : 'text-white'}`}>{currentUser.fullName}</p>
                        {currentUser.role === 'client' ? (
                          <p className="text-[10px] text-indigo-505 font-bold">Brand Client Account</p>
                        ) : (
                          <>
                            <p className="text-[10px] text-purple-600 font-bold truncate max-w-[180px]">{currentUser.redditUsername}</p>
                            {currentUser.role === 'admin' && (
                              <span className="inline-block mt-1 text-[9px] font-extrabold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-500 px-1.5 py-0.5 rounded">Admin</span>
                            )}
                            {currentUser.role === 'moderator' && (
                              <span className="inline-block mt-1 text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/15 border border-amber-500/25 text-amber-550 px-1.5 py-0.5 rounded">Moderator</span>
                            )}
                          </>
                        )}
                      </div>

                      {currentUser.role !== 'client' ? (
                        <>
                          <button 
                            onClick={() => { onNavigate('profile'); setDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl text-left transition-colors cursor-pointer ${
                              isLightHeader
                                ? 'hover:bg-purple-50 text-zinc-705 hover:text-purple-650'
                                : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <UserIcon className="w-3.5 h-3.5" /> My Profile
                          </button>

                          <button 
                            onClick={() => { onNavigate('settings'); setDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl text-left transition-colors cursor-pointer ${
                              isLightHeader
                                ? 'hover:bg-purple-50 text-zinc-705 hover:text-purple-650'
                                : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <Settings className="w-3.5 h-3.5" /> Platform Settings
                          </button>

                          <button 
                            onClick={() => { onNavigate('tickets'); setDropdownOpen(false); }} 
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl text-left transition-colors cursor-pointer ${
                              isLightHeader
                                ? 'hover:bg-purple-50 text-zinc-705 hover:text-purple-650'
                                : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <HeartHandshake className="w-3.5 h-3.5" /> Help Support
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => { onNavigate('client-dashboard'); setDropdownOpen(false); }} 
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl text-left transition-colors cursor-pointer ${
                            isLightHeader
                              ? 'hover:bg-purple-50 text-zinc-705 hover:text-purple-650'
                              : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          <BarChart className="w-3.5 h-3.5" /> Client Dashboard
                        </button>
                      )}

                      <div className={`border-t my-1 ${isLightHeader ? 'border-slate-100' : 'border-white/5'}`}></div>

                      <button 
                        onClick={() => { logout(); setDropdownOpen(false); onNavigate('home'); }} 
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl text-left transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Disconnect Wallet
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavigate('login')} 
                  className={`px-5 py-2 font-extrabold text-xs rounded-full cursor-pointer transition-all shadow-sm flex items-center justify-center ${
                    isLightHeader 
                      ? 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-800' 
                      : 'bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  Sign In
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, boxShadow: isLightHeader ? '0 4px 15px rgba(124, 58, 237, 0.25)' : '0 4px 15px rgba(124, 58, 237, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavigate('signup')} 
                  className={`px-5 py-2 text-xs font-black rounded-full text-white cursor-pointer shadow-md transition-all flex items-center justify-center ${
                    isLightHeader 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500' 
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400'
                  }`}
                >
                  Register
                </motion.button>
              </div>
            )}

            {/* Mobile Hamburger Menu */}
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className={`md:hidden p-2 rounded-xl border transition-all ${
                isLightHeader
                  ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-zinc-700 hover:text-zinc-950'
                  : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={mobileMenuBgClass}>
          {currentUser ? (
            (currentUser.role === 'admin' || currentUser.role === 'moderator') ? (
              <>
                <button onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 bg-zinc-900 rounded-lg text-sm font-semibold">
                  {currentUser.role === 'admin' ? 'Admin Dashboard' : 'Moderator Panel'}
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
            <div className="space-y-1.5 font-sans">
              {publicNavItems.map((item) => {
                const isActive = isNavActive(item.page);
                return (
                  <button
                    key={item.page}
                    onClick={() => { onNavigate(item.page); setMobileMenuOpen(false); }}
                    className={`block w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-all active:scale-95 outline-none ${
                      isActive
                        ? isLightHeader
                          ? 'text-purple-600 bg-purple-50/50 font-bold border-l-2 border-purple-600 rounded-l-none'
                          : 'text-[#D8B4FE] bg-purple-500/10 font-bold border-l-2 border-[#D8B4FE] rounded-l-none'
                        : isLightHeader
                          ? 'text-zinc-650 hover:text-purple-600 hover:bg-slate-50'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <div className={`flex gap-2.5 pt-3.5 text-center border-t ${isLightHeader ? 'border-slate-100' : 'border-white/10'}`}>
                <button 
                  onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }} 
                  className={`w-1/2 py-2.5 text-xs font-extrabold rounded-full active:scale-95 transition-all cursor-pointer ${
                    isLightHeader 
                      ? 'border border-slate-200 text-zinc-700 bg-slate-50' 
                      : 'border border-zinc-800 text-zinc-200 bg-zinc-900'
                  }`}
                >
                  Login
                </button>
                <button 
                  onClick={() => { onNavigate('signup'); setMobileMenuOpen(false); }} 
                  className={`w-1/2 py-2.5 text-xs font-extrabold rounded-full active:scale-95 transition-all cursor-pointer shadow-md ${
                    isLightHeader
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
