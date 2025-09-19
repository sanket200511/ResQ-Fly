import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, Shield, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const UserProfile = () => {
  const { user, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  
  if (!user) return null;
  
  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return 'text-red-400 bg-red-500/20';
      case 'Dispatcher': return 'text-blue-400 bg-blue-500/20';
      case 'Pilot': return 'text-green-400 bg-green-500/20';
      case 'Field': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 p-2 rounded-lg bg-black/20 backdrop-blur-md border border-white/10 hover:border-green-500/30 transition-colors"
      >
        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
          <User size={16} className="text-green-400" />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-white">{user.name}</div>
          <div className={`text-xs px-2 py-0.5 rounded ${getRoleColor(user.role)}`}>
            {user.role}
          </div>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl p-3 z-50"
          >
            {/* User Info */}
            <div className="px-3 py-2 border-b border-gray-700 mb-2">
              <div className="font-medium text-white">{user.name}</div>
              <div className="text-sm text-gray-400">{user.email}</div>
              <div className="text-xs text-gray-500 mt-1">{user.org}</div>
            </div>
            
            {/* Menu Items */}
            <div className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <Settings size={16} />
                <span>Account Settings</span>
              </button>
              
              {user.role === 'Admin' && (
                <button className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  <Shield size={16} />
                  <span>Admin Panel</span>
                </button>
              )}
              
              <hr className="border-gray-700 my-2" />
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Backdrop */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default UserProfile;