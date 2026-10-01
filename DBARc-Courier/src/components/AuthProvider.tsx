'use client';

import * as React from 'react';

interface AuthContextType {
  user: any;
  activeBusinessId: number | null;
  activeOfficeId: number | null;
  isShipper: boolean;
  isShipperAdmin: boolean;
  isShipperEmployee: boolean;
  setActiveBusinessId: (id: number | null) => void;
  setActiveOfficeId: (id: number | null) => void;
  refreshUser: () => void;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  activeBusinessId: null,
  activeOfficeId: null,
  isShipper: false,
  isShipperAdmin: false,
  isShipperEmployee: false,
  setActiveBusinessId: () => {},
  setActiveOfficeId: () => {},
  refreshUser: () => {},
});

import { authStorage, isUserShipper } from '@/shared/utils/auth-storage';

export const AuthProvider = ({ children, initialUser }: { children: React.ReactNode, initialUser?: any }) => {
  const [user, setUser] = React.useState<any>(initialUser || null);
  const [activeBusinessId, setActiveBusinessIdState] = React.useState<number | null>(null);
  const [activeOfficeId, setActiveOfficeIdState] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!user) {
      const currentUser = authStorage.getUser();
      if (currentUser) {
        setUser(currentUser);
        
        // Load active business id
        const storedBiz = authStorage.getActiveBusinessId();
        if (storedBiz) {
          setActiveBusinessIdState(storedBiz);
        } else if (currentUser.shipper && Array.isArray(currentUser.shipper) && currentUser.shipper.length > 0) {
          const firstBizId = currentUser.shipper[0].id;
          setActiveBusinessIdState(firstBizId);
          authStorage.setActiveBusinessId(firstBizId);
        }

        // Load active office id
        const storedOffice = authStorage.getActiveOfficeId();
        if (storedOffice) {
          setActiveOfficeIdState(storedOffice);
        } else if (currentUser.offices && Array.isArray(currentUser.offices) && currentUser.offices.length > 0) {
          const firstOfficeId = currentUser.offices[0].id;
          setActiveOfficeIdState(firstOfficeId);
          authStorage.setActiveOfficeId(firstOfficeId);
        }
      }
    }
  }, [user]);

  const isShipper = React.useMemo(() => {
    return isUserShipper(user);
  }, [user]);

  const isShipperEmployee = React.useMemo(() => {
    if (!isShipper) return false;
    const roles = Array.isArray(user?.shipper_roles) ? user.shipper_roles : [];
    return roles.some((r: string) => r.toLowerCase().includes('employee'));
  }, [isShipper, user]);

  const isShipperAdmin = React.useMemo(() => {
    if (!isShipper) return false;
    return !isShipperEmployee;
  }, [isShipper, isShipperEmployee]);

  const setActiveBusinessId = React.useCallback((id: number | null) => {
    setActiveBusinessIdState(id);
    authStorage.setActiveBusinessId(id);
  }, []);

  const setActiveOfficeId = React.useCallback((id: number | null) => {
    setActiveOfficeIdState(id);
    authStorage.setActiveOfficeId(id);
  }, []);

  const refreshUser = React.useCallback(() => {
    const refreshed = authStorage.getUser();
    if (refreshed) {
      setUser(refreshed);
    }
  }, []);

  const contextValue = React.useMemo(() => ({
    user,
    activeBusinessId,
    activeOfficeId,
    isShipper,
    isShipperAdmin,
    isShipperEmployee,
    setActiveBusinessId,
    setActiveOfficeId,
    refreshUser,
  }), [
    user,
    activeBusinessId,
    activeOfficeId,
    isShipper,
    isShipperAdmin,
    isShipperEmployee,
    setActiveBusinessId,
    setActiveOfficeId,
    refreshUser,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);
