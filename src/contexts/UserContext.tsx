"use client"
import React, { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

type User = {
  nome: string;
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
      console.log('=== USER CONTEXT DEBUG ===');
      console.log('Token decodificado:', decoded);
      console.log('Nome encontrado:', decoded.nome);
      console.log('ID encontrado:', decoded.id);
      console.log('Email encontrado:', decoded.email);
      
      setUser({
        nome: decoded.nome,
        id: decoded.id,
        email: decoded.email,
        plano_id: decoded.plano_id,
      });
    }
  }, []);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);