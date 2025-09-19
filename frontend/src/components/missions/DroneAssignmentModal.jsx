import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plane, Battery, Satellite, AlertTriangle, CheckCircle } from 'lucide-react';

const DroneAssignmentModal = ({ mission, drones, onAssign, onCancel }) => {
  const [selectedDrone, setSelectedDrone] = useState('');
  const [loading, setLoading] = useState(false);
  
  const availableDrones = drones.filter(drone => 
    drone.status === 'active' || drone.status === 'idle'
  );
  
  const getDroneStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'idle': return 'text-blue-400';
      case 'maintenance': return 'text-yellow-400';
      case 'offline': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };
  
  const getDroneStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle size={16} />;
      case 'idle': return <Plane size={16} />;
      case 'maintenance': return <AlertTriangle size={16} />;
      default: return <X size={16} />;
    }
  };
  
  const calculateCompatibilityScore = (drone) => {
    let score = 0;
    
    // Battery level (30% weight)
    if (drone.last_telemetry?.battery_percent > 70) score += 30;
    else if (drone.last_telemetry?.battery_percent > 50) score += 20;
    else if (drone.last_telemetry?.battery_percent > 30) score += 10;
    
    // Payload capacity (25% weight)
    const totalPayloadWeight = mission.payloads.length * 1.5; // Estimate 1.5kg per payload
    if (drone.max_payload_kg >= totalPayloadWeight + 2) score += 25;
    else if (drone.max_payload_kg >= totalPayloadWeight) score += 15;
    else if (drone.max_payload_kg >= totalPayloadWeight * 0.8) score += 5;
    
    // Status (25% weight)
    if (drone.status === 'idle') score += 25;
    else if (drone.status === 'active') score += 15;
    
    // GPS quality (20% weight)
    if (drone.last_telemetry?.satellites >= 8) score += 20;
    else if (drone.last_telemetry?.satellites >= 6) score += 15;
    else if (drone.last_telemetry?.satellites >= 4) score += 5;
    
    return Math.min(100, score);
  };
  
  const handleAssign = async () => {
    if (!selectedDrone) return;
    
    setLoading(true);
    try {
      await onAssign(selectedDrone);
    } catch (error) {
      console.error('Assignment failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Assign Drone</h2>
            <p className="text-sm text-gray-400">Mission: {mission.code}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Mission Info */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Mission Requirements</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Payloads:</span>
              <span className="text-white ml-2">{mission.payloads.length} items</span>
            </div>
            <div>
              <span className="text-gray-400">Priority:</span>
              <span className={`ml-2 ${
                mission.priority === 4 ? 'text-red-400' :
                mission.priority === 3 ? 'text-orange-400' :
                mission.priority === 2 ? 'text-yellow-400' :
                'text-blue-400'
              }`}>
                {mission.priority === 4 ? 'Critical' :
                 mission.priority === 3 ? 'High' :
                 mission.priority === 2 ? 'Medium' : 'Low'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Distance:</span>
              <span className="text-white ml-2">
                {Math.round(
                  Math.sqrt(
                    Math.pow(mission.destination.lat - mission.origin.lat, 2) +
                    Math.pow(mission.destination.lon - mission.origin.lon, 2)
                  ) * 111000
                )} m
              </span>
            </div>
            <div>
              <span className="text-gray-400">Est. Weight:</span>
              <span className="text-white ml-2">{mission.payloads.length * 1.5} kg</span>
            </div>
          </div>
        </div>
        
        {/* Available Drones */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-semibold text-gray-300">Available Drones</h3>
          
          {availableDrones.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle size={32} className="mx-auto mb-2 text-yellow-400" />
              <p className="text-gray-400">No drones available for assignment</p>
            </div>
          ) : (
            availableDrones
              .sort((a, b) => calculateCompatibilityScore(b) - calculateCompatibilityScore(a))
              .map(drone => {
                const compatibilityScore = calculateCompatibilityScore(drone);
                const isSelected = selectedDrone === drone.id;
                
                return (
                  <motion.div
                    key={drone.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                    }`}
                    onClick={() => setSelectedDrone(drone.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getDroneStatusColor(drone.status).replace('text-', 'bg-').replace('-400', '-500/20')}`}>
                          {getDroneStatusIcon(drone.status)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{drone.callsign}</h4>
                          <p className="text-sm text-gray-400">{drone.uid}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${
                          compatibilityScore >= 80 ? 'text-green-400' :
                          compatibilityScore >= 60 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {compatibilityScore}% Match
                        </div>
                        <div className={`text-xs ${getDroneStatusColor(drone.status)}`}>
                          {drone.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Drone Details */}
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Battery size={14} className={
                          drone.last_telemetry?.battery_percent > 70 ? 'text-green-400' :
                          drone.last_telemetry?.battery_percent > 30 ? 'text-yellow-400' :
                          'text-red-400'
                        } />
                        <span className="text-gray-300">
                          {drone.last_telemetry?.battery_percent || 0}%
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Satellite size={14} className={
                          drone.last_telemetry?.satellites >= 8 ? 'text-green-400' :
                          drone.last_telemetry?.satellites >= 6 ? 'text-yellow-400' :
                          'text-red-400'
                        } />
                        <span className="text-gray-300">
                          {drone.last_telemetry?.satellites || 0} sats
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Max:</span>
                        <span className="text-gray-300">{drone.max_payload_kg}kg</span>
                      </div>
                    </div>
                    
                    {/* Compatibility Breakdown */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-gray-600"
                      >
                        <div className="text-xs text-gray-400 mb-2">Compatibility Factors:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span>Battery Level:</span>
                            <span className={
                              drone.last_telemetry?.battery_percent > 70 ? 'text-green-400' :
                              drone.last_telemetry?.battery_percent > 50 ? 'text-yellow-400' :
                              'text-red-400'
                            }>
                              {drone.last_telemetry?.battery_percent > 70 ? 'Excellent' :
                               drone.last_telemetry?.battery_percent > 50 ? 'Good' :
                               drone.last_telemetry?.battery_percent > 30 ? 'Fair' : 'Low'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Payload Capacity:</span>
                            <span className={
                              drone.max_payload_kg >= mission.payloads.length * 1.5 + 2 ? 'text-green-400' :
                              drone.max_payload_kg >= mission.payloads.length * 1.5 ? 'text-yellow-400' :
                              'text-red-400'
                            }>
                              {drone.max_payload_kg >= mission.payloads.length * 1.5 + 2 ? 'Excellent' :
                               drone.max_payload_kg >= mission.payloads.length * 1.5 ? 'Adequate' : 'Limited'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedDrone || loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Assigning...' : 'Assign Drone'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DroneAssignmentModal;