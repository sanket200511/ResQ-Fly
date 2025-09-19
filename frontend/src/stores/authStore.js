import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      
      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      
      // Login
      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Include cookies for httpOnly JWT
            body: JSON.stringify({ email, password })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Login failed');
          }
          
          const userData = await response.json();
          set({
            user: userData.user,
            token: userData.token,
            isAuthenticated: true,
            loading: false,
            error: null
          });
          
          return userData;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      // Register
      register: async (userData) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(userData)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Registration failed');
          }
          
          const newUser = await response.json();
          set({
            user: newUser.user,
            token: newUser.token,
            isAuthenticated: true,
            loading: false,
            error: null
          });
          
          return newUser;
        } catch (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },
      
      // Logout
      logout: async () => {
        try {
          await fetch(`${API}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });
      },
      
      // Refresh token
      refreshToken: async () => {
        try {
          const response = await fetch(`${API}/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error('Token refresh failed');
          }
          
          const userData = await response.json();
          set({
            user: userData.user,
            token: userData.token,
            isAuthenticated: true
          });
          
          return userData;
        } catch (error) {
          // Token refresh failed, logout user
          get().logout();
          throw error;
        }
      },
      
      // Get current user
      getCurrentUser: async () => {
        if (!get().isAuthenticated) return null;
        
        try {
          const response = await fetch(`${API}/auth/me`, {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error('Failed to get user info');
          }
          
          const userData = await response.json();
          set({ user: userData });
          return userData;
        } catch (error) {
          console.error('Get current user error:', error);
          return null;
        }
      },
      
      // Check if user has role
      hasRole: (role) => {
        const user = get().user;
        return user && user.role === role;
      },
      
      // Check if user has any of the roles
      hasAnyRole: (roles) => {
        const user = get().user;
        return user && roles.includes(user.role);
      },
      
      // Clear error
      clearError: () => set({ error: null })
    }),
    {
      name: 'resqfly-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);