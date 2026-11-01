// frontend/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const USER_STORAGE_KEY = 'evalix_user';
const TOKEN_STORAGE_KEY = 'evalix_token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch (err) {
      console.error('Error loading stored auth state:', err);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);

    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      if (authToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
      }
    } catch (err) {
      console.error('Error saving auth to localStorage:', err);
    }
  };

  const logout = async () => {
    try {
      const currentToken = token || localStorage.getItem(TOKEN_STORAGE_KEY);
      if (currentToken) {
        // Notify backend of logout
        fetch('http://localhost:5001/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
          }
        }).catch(() => {});
      }
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  };

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUserData));
    } catch (err) {
      console.error('Error saving updated user to localStorage:', err);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
