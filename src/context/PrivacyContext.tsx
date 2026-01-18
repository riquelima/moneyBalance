import React, { createContext, useContext, useState, useEffect } from 'react';

interface PrivacyContextType {
  isPrivacyEnabled: boolean;
  togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
  isPrivacyEnabled: false,
  togglePrivacy: () => {},
});

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('privacy_mode');
    if (saved) {
      setIsPrivacyEnabled(JSON.parse(saved));
    }
  }, []);

  const togglePrivacy = () => {
    setIsPrivacyEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('privacy_mode', JSON.stringify(newValue));
      return newValue;
    });
  };

  return (
    <PrivacyContext.Provider value={{ isPrivacyEnabled, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => useContext(PrivacyContext);
