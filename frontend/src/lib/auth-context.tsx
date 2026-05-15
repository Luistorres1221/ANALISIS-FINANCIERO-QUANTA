import { createContext, useContext } from 'react';
import type { AuthUser } from './auth';

interface AuthCtx {
  user:   AuthUser | null;
  logout: () => void;
}

export const AuthContext = createContext<AuthCtx>({
  user:   null,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
