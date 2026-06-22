'use client';

import * as React from 'react';

interface AuthContextType {
  user: any;
  activeBusinessId: number | null;
  activeOfficeId: number | null;
  setActiveBusinessId: (id: number | null) => void;
  setActiveOfficeId: (id: number | null) => void;
  refreshUser: () => void;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  activeBusinessId: null,
  activeOfficeId: null,
  setActiveBusinessId: () => {},
  setActiveOfficeId: () => {},
  refreshUser: () => {},
});

export const AuthProvider = ({ children, initialUser }: { children: React.ReactNode, initialUser?: any }) => {
  const [user, setUser] = React.useState<any>(initialUser || null);
  const [activeBusinessId, setActiveBusinessIdState] = React.useState<number | null>(null);
  const [activeOfficeId, setActiveOfficeIdState] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!user) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          setUser(parsed);
          
          // Load active business id
          const storedBiz = localStorage.getItem('activeBusinessId');
          if (storedBiz) {
            setActiveBusinessIdState(Number(storedBiz));
          } else if (parsed.shipper && Array.isArray(parsed.shipper) && parsed.shipper.length > 0) {
            setActiveBusinessIdState(parsed.shipper[0].id);
            localStorage.setItem('activeBusinessId', parsed.shipper[0].id.toString());
          }

          // Load active office id
          const storedOffice = localStorage.getItem('activeOfficeId');
          if (storedOffice) {
            setActiveOfficeIdState(Number(storedOffice));
          } else if (parsed.offices && Array.isArray(parsed.offices) && parsed.offices.length > 0) {
            setActiveOfficeIdState(parsed.offices[0].id);
            localStorage.setItem('activeOfficeId', parsed.offices[0].id.toString());
          }

        } catch (e) {}
      }
    }
  }, [user]);

  const setActiveBusinessId = (id: number | null) => {
    setActiveBusinessIdState(id);
    if (id) {
      localStorage.setItem('activeBusinessId', id.toString());
    } else {
      localStorage.removeItem('activeBusinessId');
    }
  };

  const setActiveOfficeId = (id: number | null) => {
    setActiveOfficeIdState(id);
    if (id) {
      localStorage.setItem('activeOfficeId', id.toString());
    } else {
      localStorage.removeItem('activeOfficeId');
    }
  };

  const refreshUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
  };

  return (
    <AuthContext.Provider value={{ user, activeBusinessId, activeOfficeId, setActiveBusinessId, setActiveOfficeId, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);
