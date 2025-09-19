import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Shield, AlertCircle, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const RegisterForm = ({ onSwitchToLogin, onClose }) => {
  const { register, loading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Pilot',
    org: 'ResQ Operations'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  const roles = [
    { value: 'Admin', label: 'Admin', icon: Shield },
    { value: 'Dispatcher', label: 'Dispatcher', icon: User },
    { value: 'Pilot', label: 'Pilot', icon: User },
    { value: 'Field', label: 'Field Officer', icon: User }
  ];
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
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
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.org.trim()) {
      errors.org = 'Organization is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) return;
    
    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email,
        password: formData.password,
        role: formData.role,
        org: formData.org.trim()
      };
      
      await register(userData);
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
          <h2 className="text-2xl font-bold text-white">Join ResQFly</h2>
        </div>
        <p className="text-gray-400">Create your rescue operations account</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Full Name
          </label>
          <div className="relative">
            <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full bg-gray-800 border rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                formErrors.name ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Enter your full name"
            />
            {formErrors.name && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {formErrors.name}
              </p>
            )}
          </div>
        </div>
        
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
        
        {/* Role & Organization */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Organization
            </label>
            <input
              type="text"
              value={formData.org}
              onChange={(e) => handleInputChange('org', e.target.value)}
              className={`w-full bg-gray-800 border rounded-lg px-3 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                formErrors.org ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Organization"
            />
            {formErrors.org && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {formErrors.org}
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
              placeholder="Create a password"
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
        
        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={`w-full bg-gray-800 border rounded-lg pl-10 pr-12 py-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                formErrors.confirmPassword ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {formErrors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {formErrors.confirmPassword}
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
        
        {/* Register Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <UserPlus size={20} />
              Create Account
            </>
          )}
        </button>
        
        {/* Login Link */}
        <div className="text-center pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-green-400 hover:text-green-300 font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;