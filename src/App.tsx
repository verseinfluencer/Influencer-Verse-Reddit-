import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages import
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { UserDashboard } from './pages/UserDashboard';
import { PendingVerification } from './pages/PendingVerification';
import { Marketplace } from './pages/Marketplace';
import { Leaderboard } from './pages/Leaderboard';
import { WalletPage } from './pages/WalletPage';
import { UserProfile } from './pages/UserProfile';
import { SettingsPage } from './pages/Settings';
import { SupportTickets } from './pages/SupportTickets';
import { AdminDashboard } from './pages/AdminDashboard';
import { ClientRegister } from './pages/ClientRegister';
import { ClientLogin } from './pages/ClientLogin';
import { ClientDashboard } from './pages/ClientDashboard';

// Informational subviews import
import { FAQPage, AboutPage, ContactPage, TermsPage, ReferralProgramInfo } from './pages/InformationalPages';
import { TrustPage } from './pages/TrustPage';

function MainAppContent() {
  const { currentUser } = useApp();
  const [currentPage, setCurrentPage] = useState<string>('home');

  // Sync light/dark theme dynamically on the root document element
  React.useEffect(() => {
    const lightPages = ['home', 'about', 'faq', 'contact', 'trust', 'terms', 'referrals', 'login', 'signup', 'client-login', 'client-register', 'dashboard', 'marketplace', 'wallet', 'leaderboard', 'profile', 'settings'];
    if (lightPages.includes(currentPage)) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    return () => {
      document.documentElement.classList.remove('light');
    };
  }, [currentPage]);

  const onNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isPending = currentUser?.status === 'Pending' || currentUser?.status === 'pending';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  // Render the core active page component dynamically
  const renderPage = () => {
    // 1. Unauthenticated views
    if (!currentUser) {
      switch (currentPage) {
        case 'about':
          return <AboutPage />;
        case 'trust':
          return <TrustPage />;
        case 'faq':
          return <FAQPage />;
        case 'contact':
          return <ContactPage />;
        case 'terms':
          return <TermsPage />;
        case 'referrals':
          return <ReferralProgramInfo />;
        case 'login':
          return <Login onNavigate={onNavigate} />;
        case 'signup':
          return <Signup onNavigate={onNavigate} />;
        case 'client-login':
          return <ClientLogin onNavigate={onNavigate} />;
        case 'client-register':
          return <ClientRegister onNavigate={onNavigate} />;
        case 'home':
        default:
          return <Home onNavigate={onNavigate} />;
      }
    }

    // 1.5. Authenticated Client checks
    if (currentUser?.role === 'client') {
      switch (currentPage) {
        case 'client-dashboard':
          return <ClientDashboard />;
        case 'about':
          return <AboutPage />;
        case 'trust':
          return <TrustPage />;
        case 'faq':
          return <FAQPage />;
        case 'contact':
          return <ContactPage />;
        case 'terms':
          return <TermsPage />;
        default:
          return <ClientDashboard />;
      }
    }

    // 2. Authenticated paths
    // Admin checks
    if (isAdmin) {
      switch (currentPage) {
        case 'admin':
          return <AdminDashboard />;
        case 'tickets':
          return <SupportTickets />;
        case 'profile':
          return <UserProfile />;
        case 'settings':
          return <SettingsPage />;
        case 'faq':
          return <FAQPage />;
        case 'about':
          return <AboutPage />;
        case 'trust':
          return <TrustPage />;
        case 'contact':
          return <ContactPage />;
        case 'terms':
          return <TermsPage />;
        default:
          return <AdminDashboard />;
      }
    }

    // 3. Pending verification user restrictions logic
    // Blocking tasks, wallets, refer links, dashboards if pending review OR not email verified
    const isEmailUnverified = !currentUser?.emailVerified && !currentUser?.gmailVerified && currentUser?.email?.toLowerCase() !== 'kalloldeyprivate20@gmail.com';
    if (isPending || isEmailUnverified) {
      if (['dashboard', 'marketplace', 'wallet', 'referrals', 'leaderboard'].includes(currentPage)) {
        return <PendingVerification onNavigate={onNavigate} />;
      }
    }

    // Standard / Approved User page map
    switch (currentPage) {
      case 'dashboard':
        return <UserDashboard onNavigate={onNavigate} />;
      case 'marketplace':
        return <Marketplace />;
      case 'wallet':
        return <WalletPage />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'profile':
        return <UserProfile />;
      case 'settings':
        return <SettingsPage />;
      case 'tickets':
        return <SupportTickets />;
      case 'referrals':
        return <ReferralProgramInfo />;
      case 'about':
        return <AboutPage />;
      case 'trust':
        return <TrustPage />;
      case 'faq':
        return <FAQPage />;
      case 'contact':
        return <ContactPage />;
      case 'terms':
        return <TermsPage />;
      case 'home':
      default:
        // Approved user navigating to home gets redirect to dashboard
        return <UserDashboard onNavigate={onNavigate} />;
    }
  };

  const isLightPage = ['home', 'about', 'faq', 'contact', 'trust', 'terms', 'referrals', 'login', 'signup', 'client-login', 'client-register', 'dashboard', 'marketplace', 'wallet', 'leaderboard', 'profile', 'settings'].includes(currentPage);
  const isPublicLightFooter = ['home', 'about', 'faq', 'contact', 'trust', 'terms', 'referrals', 'login', 'signup', 'client-login', 'client-register'].includes(currentPage);

  return (
    <div className={`min-h-screen ${isLightPage ? 'bg-zinc-50 text-zinc-900 selection:bg-purple-200 selection:text-purple-950' : 'bg-[#050505] text-white selection:bg-bento-purple selection:text-white'} flex flex-col justify-between transition-colors duration-200`}>
      <div>
        <Navbar onNavigate={onNavigate} currentPage={currentPage} />
        <main className="relative z-10">
          {renderPage()}
        </main>
      </div>
      <Footer onNavigate={onNavigate} isLightPage={isPublicLightFooter} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
