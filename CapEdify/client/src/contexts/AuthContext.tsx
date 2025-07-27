import React, { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // TODO: Implement proper authentication logic
  const authValue: AuthContextType = {
    isAuthenticated: true, // Temporarily set to true to bypass auth
    user: null,
    login: async () => {},
    logout: () => {}
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
