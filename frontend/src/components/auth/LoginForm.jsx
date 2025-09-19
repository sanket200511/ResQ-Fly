import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, AlertCircle, LogIn } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const LoginForm = ({ onSwitchToRegister, onClose }) => {
  const { login, loading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) return;
    
    try {
      await login(formData.email, formData.password);
      onClose();
    } catch (error) {
      // Error is handled by the store
    }
  };
  
  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
    }
  };
  
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/resqfly-logo.svg" alt="ResQFly" className="w-8 h-8" />
          <h2 className="text-2xl font-bold text-white">ResQFly</h2>
        </div>
        <p className="text-gray-400">Sign in to access the mission control</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full bg-gray-800 border rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                formErrors.email ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Enter your email"
            />
            {formErrors.email && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {formErrors.email}
              </p>
            )}
          </div>
        </div>
        
        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`w-full bg-gray-800 border rounded-lg pl-10 pr-12 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                formErrors.password ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {formErrors.password && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {formErrors.password}
              </p>
            )}
          </div>
        </div>
        
        {/* Server Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}
        
        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <LogIn size={20} />
              Sign In
            </>
          )}
        </button>
        
        {/* Register Link */}
        <div className="text-center pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-green-400 hover:text-green-300 font-medium"
            >
              Create Account
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;