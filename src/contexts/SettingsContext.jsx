import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../api/index';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    companyName: 'TASKFLOW',
    logoDataUrl: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/settings`);
      setSettings(res.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/api/settings`, newSettings, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(newSettings instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        }
      });
      setSettings(prev => ({ ...prev, ...res.data }));
      return true;
    } catch (err) {
      console.error('Error updating settings:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
    const intervalId = setInterval(fetchSettings, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchSettings();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
