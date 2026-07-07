import { useState, useEffect } from 'react';
import { hasAdminSession } from './lib/localData';
import { LandingPage } from './components/LandingPage';
import { TicketForm } from './components/TicketForm';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';

type View = 'landing' | 'form' | 'admin-login' | 'admin-dashboard';

function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    const isLoggedIn = await hasAdminSession();
    const shouldOpenAdmin = new URLSearchParams(window.location.search).get('admin') === '1';

    if (isLoggedIn) {
      setIsAdmin(true);
      setCurrentView('admin-dashboard');
      return;
    }

    if (shouldOpenAdmin) {
      setCurrentView('admin-login');
    }
  };

  const handleCreateTicket = () => {
    setCurrentView('form');
  };

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setCurrentView('admin-dashboard');
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setCurrentView('landing');
  };

  return (
    <div>
      {!isAdmin && currentView !== 'landing' && currentView !== 'admin-login' && (
        <></>
      )}

      {currentView === 'landing' && (
        <LandingPage onCreateTicket={handleCreateTicket} onAdminLoginSuccess={handleLoginSuccess} />
      )}
      {currentView === 'form' && (
        <TicketForm onGoHome={() => setCurrentView('landing')} />
      )}
      {currentView === 'admin-login' && <AdminLogin onLoginSuccess={handleLoginSuccess} />}
      {currentView === 'admin-dashboard' && <AdminDashboard onLogout={handleLogout} />}
    </div>
  );
}

export default App;
