"use client"
import React, { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

type User = {
  id: string;
  email: string;
  plano_id: string;
  
};

const UserContext = createContext<User | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    if (token) {
      const decoded: any = jwtDecode(token);
      setUser({
        id: decoded.id,
        email: decoded.email,
        plano_id: decoded.plano_id,
      });
    }
  }, []);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);