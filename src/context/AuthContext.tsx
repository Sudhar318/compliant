import React, { createContext, useState, useEffect } from "react";
import { login as apiLogin, logout as apiLogout, getMe, refresh as apiRefresh } from "../api/auth.ts";
import { tokenStore } from "../api/client.ts";

export interface UserInfo {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: "CITIZEN" | "OFFICER" | "ADMIN";
  ward: string | null;
  district: string | null;
  aadhaarVerified?: boolean;
}

export interface AuthContextType {
  accessToken: string | null;
  user: UserInfo | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  silentRefresh: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserInfo | null>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const updateToken = (token: string | null) => {
    setAccessTokenState(token);
    tokenStore.setToken(token);
  };

  const silentRefresh = async () => {
    try {
      const payload = await apiRefresh();
      updateToken(payload.accessToken);

      const meRes = await getMe();
      if (meRes && meRes.user) {
        setUser(meRes.user as UserInfo);
      }
    } catch (e) {
      console.error("Silent refresh failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    tokenStore.onAuthFailure(() => {
      setAccessTokenState(null);
      setUser(null);
    });

    tokenStore.onTokenRefreshed((newToken) => {
      setAccessTokenState(newToken);
    });

    silentRefresh();
  }, []);

  const login = async (credentials: any) => {
    const res = await apiLogin(credentials);
    updateToken(res.accessToken);
    setUser(res.user as UserInfo);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      console.error("API logout failed:", e);
    } finally {
      updateToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        loading,
        login,
        logout,
        silentRefresh,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
