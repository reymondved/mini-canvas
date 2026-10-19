import { createContext, useContext, useEffect, useState } from 'react';

// "Context" lets any component read the same value without passing it down by hand.
// Here that value is: who is logged in?
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still asking the server, null = logged out, object = logged-in user
  const [user, setUser] = useState(undefined);

  // Ask the server once when the app starts (this is what keeps you logged in after a refresh).
  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>;
}

// Any component can call useAuth() to get { user, setUser, logout }.
export function useAuth() {
  return useContext(AuthContext);
}
