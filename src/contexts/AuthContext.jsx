import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import { useSound } from './SoundContext';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playError } = useSound();

  useEffect(() => {
    // Check for saved token on load
    const token = localStorage.getItem('token');
    if (token) {
      api.get(`/auth/me?t=${Date.now()}`)
        .then(res => {
          if (res.data && res.data.name) {
            setCurrentUser({ ...res.data, avatar: res.data.name.substring(0,2).toUpperCase() });
          } else {
            setCurrentUser(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          setCurrentUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password, adminAuthFile = null, portalRole = null) => {
    try {
      const isAdminFile = typeof window !== 'undefined' && adminAuthFile instanceof File;
      const payload = isAdminFile ? new FormData() : { username, password };

      if (isAdminFile) {
        payload.append('username', username);
        payload.append('password', password);
        if (portalRole) payload.append('portalRole', portalRole);
        payload.append('adminAuthFile', adminAuthFile);
      } else {
        if (portalRole) payload.portalRole = portalRole;
      }

      const res = await api.post('/auth/login', payload);
      
      // The backend returns 202 with an error object instead of 401
      if (res.data.error || !res.data.user) {
        throw new Error(res.data.message || 'Invalid credentials');
      }

      const { token, user } = res.data;
      
      localStorage.setItem('token', token);
      const avatar = (user?.name || 'User').substring(0,2).toUpperCase();
      setCurrentUser({ ...user, avatar });
      if ('Notification' in window && Notification.permission === 'default' && typeof Notification.requestPermission === 'function') {
        try {
          void Notification.requestPermission();
        } catch {
          // Ignore permission request failures.
        }
      }
      return user;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || 'Login failed';
      playError();
      throw new Error(errMsg);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  const refreshSession = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    try {
      const res = await api.get(`/auth/me?t=${Date.now()}`);
      if (res.data && res.data.name) {
        const nextUser = { ...res.data, avatar: res.data.name.substring(0, 2).toUpperCase() };
        setCurrentUser(nextUser);
        return nextUser;
      }

      return null;
    } catch {
      localStorage.removeItem('token');
      setCurrentUser(null);
      return null;
    }
  };

  const value = {
    currentUser,
    login,
    logout,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
