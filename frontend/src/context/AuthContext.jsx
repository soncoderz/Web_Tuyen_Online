import { createContext, useContext, useState, useEffect } from 'react';
import { AUTH_SESSION_INVALIDATED_EVENT } from '../services/api';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncStoredUser = () => {
      setUser(readStoredUser());
    };

    syncStoredUser();
    setLoading(false);

    const handleStorage = (event) => {
      if (!event || event.key === 'user') {
        syncStoredUser();
      }
    };

    const handleSessionInvalidated = () => {
      setUser(null);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(AUTH_SESSION_INVALIDATED_EVENT, handleSessionInvalidated);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(AUTH_SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
    };
  }, []);

  const loginUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = () => {
    return user && user.roles && user.roles.includes('ROLE_ADMIN');
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, logout, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
