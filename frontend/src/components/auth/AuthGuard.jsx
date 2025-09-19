import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import AuthModal from './AuthModal';

const AuthGuard = ({ children, requiredRoles = null }) => {
  const { isAuthenticated, user, hasAnyRole, getCurrentUser } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated) {
        try {
          await getCurrentUser();
        } catch (error) {
          console.error('Failed to get current user:', error);
        }
      }
      setIsLoading(false);
    };
    
    initAuth();
  }, [isAuthenticated, getCurrentUser]);
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isLoading, isAuthenticated]);
  
  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <img src="/resqfly-logo.svg" alt="ResQFly" className="w-16 h-16 mx-auto mb-4" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading ResQFly...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
        <div className="text-center">
          <img src="/resqfly-logo.svg" alt="ResQFly" className="w-24 h-24 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white mb-2">ResQFly</h1>
          <p className="text-xl text-gray-400 mb-8">Disaster Response Drone System</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Access Mission Control
          </button>
        </div>
      </div>
    );
  }
  
  // Check role-based access
  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-8 max-w-md">
            <h2 className="text-xl font-bold text-red-400 mb-4">Access Denied</h2>
            <p className="text-gray-300 mb-4">
              You don't have permission to access this area.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Required roles: {requiredRoles.join(', ')}
              <br />
              Your role: {user?.role || 'Unknown'}
            </p>
            <button
              onClick={() => useAuthStore.getState().logout()}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return children;
};

export default AuthGuard;