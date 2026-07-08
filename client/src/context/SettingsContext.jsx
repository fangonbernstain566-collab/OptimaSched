import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getSettings, updateSettings as updateSettingsApi } from '../services/settingsApi';

const DEFAULT_SETTINGS = {
  themeMode: 'LIGHT',
  fontSize: 'MEDIUM',
  highContrast: false,
  reducedMotion: false,
  emailNotifications: true,
  inAppNotifications: true,
  defaultLandingPage: '/dashboard',
};

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getSettings()
      .then((data) => {
        if (!cancelled) setSettings({ ...DEFAULT_SETTINGS, ...data });
      })
      .catch(() => {
        if (!cancelled) setSettings(DEFAULT_SETTINGS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateSettings = useCallback(async (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    const updated = await updateSettingsApi(patch);
    setSettings((prev) => ({ ...prev, ...updated }));
    return updated;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
