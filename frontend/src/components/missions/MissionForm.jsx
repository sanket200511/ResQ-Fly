import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Package, AlertCircle } from 'lucide-react';

const MissionForm = ({ mission, onSave, onCancel, drones = [] }) => {
  const [formData, setFormData] = useState({
    code: '',
    priority: 2,
    origin: { lat: 37.7749, lon: -122.4194, alt: 0 },
    destination: { lat: 37.7849, lon: -122.4094, alt: 0 },
    payloads: ['Medical Supplies'],
    created_by: 'Admin',
    geofence_ids: [],
    assigned_drone_id: '',
    eta: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (mission) {
      setFormData({
        ...mission,
        eta: mission.eta ? new Date(mission.eta).toISOString().slice(0, 16) : ''
      });
    }
  }, [mission]);
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.code.trim()) {
      newErrors.code = 'Mission code is required';
    }
    
    if (!formData.origin.lat || !formData.origin.lon) {
      newErrors.origin = 'Origin coordinates are required';
    }
    
    if (!formData.destination.lat || !formData.destination.lon) {
      newErrors.destination = 'Destination coordinates are required';
    }
    
    if (formData.payloads.length === 0) {
      newErrors.payloads = 'At least one payload is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const missionData = {
        ...formData,
        eta: formData.eta ? new Date(formData.eta).toISOString() : null,
        origin: {
          lat: parseFloat(formData.origin.lat),
          lon: parseFloat(formData.origin.lon),
          alt: parseFloat(formData.origin.alt) || 0
        },
        destination: {
          lat: parseFloat(formData.destination.lat),
          lon: parseFloat(formData.destination.lon),
          alt: parseFloat(formData.destination.alt) || 0
        }
      };
      
      await onSave(missionData);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePayloadChange = (index, value) => {
    const newPayloads = [...formData.payloads];
    newPayloads[index] = value;
    setFormData({ ...formData, payloads: newPayloads });
  };
  
  const addPayload = () => {
    setFormData({
      ...formData,
      payloads: [...formData.payloads, '']
    });
  };
  
  const removePayload = (index) => {
    setFormData({
      ...formData,
      payloads: formData.payloads.filter((_, i) => i !== index)
    });
  };
  
  const priorityOptions = [
    { value: 1, label: 'Low', color: 'text-blue-400' },
    { value: 2, label: 'Medium', color: 'text-yellow-400' },
    { value: 3, label: 'High', color: 'text-orange-400' },
    { value: 4, label: 'Critical', color: 'text-red-400' }
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {mission ? 'Edit Mission' : 'Create New Mission'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mission Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g. RESCUE-001"
              />
              {errors.code && <p className="text-red-400 text-xs mt-1">{errors.code}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Origin */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MapPin size={16} className="inline mr-1" />
              Origin Coordinates *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={formData.origin.lat}
                onChange={(e) => setFormData({
                  ...formData,
                  origin: { ...formData.origin, lat: e.target.value }
                })}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={formData.origin.lon}
                onChange={(e) => setFormData({
                  ...formData,
                  origin: { ...formData.origin, lon: e.target.value }
                })}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="number"
                step="any"
                placeholder="Altitude (m)"
                value={formData.origin.alt}
                onChange={(e) => setFormData({
                  ...formData,
                  origin: { ...formData.origin, alt: e.target.value }
                })}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            {errors.origin && <p className="text-red-400 text-xs mt-1">{errors.origin}</p>}
          </div>
          
          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <MapPin size={16} className="inline mr-1" />
              Destination Coordinates *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={formData.destination.lat}
                onChange={(e) => setFormData({
                  ...formData,
                  destination: { ...formData.destination, lat: e.target.value }
                })}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={formData.destination.lon}
                onChange={(e) => setFormData({
                  ...formData,
                  destination: { ...formData.destination, lon: e.target.value }
                })}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="number"
                step="any"
                placeholder="Altitude (m)"
                value={formData.destination.alt}
                onChange={(e) => setFormData({
                  ...formData,
                  destination: { ...formData.destination, alt: e.target.value }
                })}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            {errors.destination && <p className="text-red-400 text-xs mt-1">{errors.destination}</p>}
          </div>
          
          {/* Payloads */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Package size={16} className="inline mr-1" />
              Payloads *
            </label>
            {formData.payloads.map((payload, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={payload}
                  onChange={(e) => handlePayloadChange(index, e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g. Medical Supplies, Communication Kit"
                />
                {formData.payloads.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePayload(index)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPayload}
              className="text-green-400 hover:text-green-300 text-sm"
            >
              + Add Payload
            </button>
            {errors.payloads && <p className="text-red-400 text-xs mt-1">{errors.payloads}</p>}
          </div>
          
          {/* Assignment & ETA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assign Drone
              </label>
              <select
                value={formData.assigned_drone_id}
                onChange={(e) => setFormData({ ...formData, assigned_drone_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Drone (Optional)</option>
                {drones.map(drone => (
                  <option key={drone.id} value={drone.id}>
                    {drone.callsign} - {drone.status}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Estimated Time of Arrival
              </label>
              <input
                type="datetime-local"
                value={formData.eta}
                onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Submit Errors */}
          {errors.submit && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-red-400 text-sm">{errors.submit}</span>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : (mission ? 'Update Mission' : 'Create Mission')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default MissionForm;