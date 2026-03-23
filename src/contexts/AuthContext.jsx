import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved token on load
    const token = localStorage.getItem('token');
    if (token) {
      api.get(`/auth/me?t=${Date.now()}`)
        .then(res => setCurrentUser({ ...res.data, avatar: res.data.name.substring(0,2).toUpperCase() }))
        .catch(() => {
          localStorage.removeItem('token');
          setCurrentUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, adminToken = null, portalRole = null) => {
    try {
      const payload = { email, password };
      if (adminToken) payload.adminToken = adminToken;
      if (portalRole) payload.portalRole = portalRole;

      const res = await api.post('/auth/login', payload);
      
      // The backend returns 202 with an error object instead of 401
      if (res.data.error || !res.data.user) {
        throw new Error(res.data.message || 'Invalid credentials');
      }

      const { token, user } = res.data;
      
      localStorage.setItem('token', token);
      setCurrentUser({ ...user, avatar: (user.name || 'U').substring(0,2).toUpperCase() });
      return user;
    } catch (error) {
      const errMsg = error.message || error.response?.data?.message || 'Login failed';
      throw new Error(errMsg);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
