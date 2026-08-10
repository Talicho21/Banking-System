"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

type SecurityContextType = {
  permissions: string[];
  roleName: string;
  loading: boolean;
};

const SecurityContext = createContext<SecurityContextType>({
  permissions: [],
  roleName: "",
  loading: true,
});

export function useSecurity() {
  return useContext(SecurityContext);
}

type SecurityProviderProps = {
  children: ReactNode;
};

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleName, setRoleName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadPermissions = async () => {
      try {
        const response = await fetch("/api/admin/security/me", { method: "GET", cache: "no-store" });
        const result = await response.json();
        
        if (isMounted && response.ok && result?.success) {
          setPermissions(Array.isArray(result.data?.permissions) ? result.data.permissions : []);
          setRoleName(String(result.data?.roleName ?? ""));
        } else if (isMounted) {
          setPermissions([]);
          setRoleName("");
        }
      } catch {
        if (isMounted) {
          setPermissions([]);
          setRoleName("");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPermissions();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SecurityContext.Provider value={{ permissions, roleName, loading }}>
      {children}
    </SecurityContext.Provider>
  );
}
