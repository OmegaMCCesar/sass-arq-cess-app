// src/hooks/useAuth.js
import { useAuthContext } from "../contexts/AuthContext";

export function useAuth() {
  return useAuthContext();
}

export default useAuth;
