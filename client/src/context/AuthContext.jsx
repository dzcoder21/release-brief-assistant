import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TOKEN_KEY } from '../services/api';
import { authService } from '../services/releaseService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authService.me().then((d) => setUser(d.user)).catch(clear).finally(() => setLoading(false));
  }, [clear]);

  useEffect(() => {
    window.addEventListener('auth:expired', clear);
    return () => window.removeEventListener('auth:expired', clear);
  }, [clear]);

  const accept = ({ token, user: u }) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    return u;
  };

  const value = {
    user,
    loading,
    login: async (body) => accept(await authService.login(body)),
    register: async (body) => accept(await authService.register(body)),
    logout: async () => {
      try { await authService.logout(); } catch { /* signing out locally is enough */ }
      clear();
    },
    updateProfile: async (body) => setUser((await authService.updateMe(body)).user),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
