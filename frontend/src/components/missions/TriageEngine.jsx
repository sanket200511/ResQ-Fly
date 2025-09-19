import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Clock, 
  Battery, 
  MapPin,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

const TriageEngine = ({ missions, drones }) => {
  const [weatherConditions, setWeatherConditions] = useState({
    safe: true,
    windSpeed: 5,
    visibility: 10,
    precipitation: false
  });
  
  const calculateTriagePriority = (mission) => {
    const assignedDrone = drones.find(d => d.id === mission.assigned_drone_id);
    
    // Priority weight (40%)
    const priorityWeight = (mission.priority / 4) * 40;
    
    // Urgency based on ETA (30%)
    let urgencyWeight = 0;
    if (mission.eta) {
      const etaTime = new Date(mission.eta);
      const now = new Date();
      const hoursUntilEta = (etaTime - now) / (1000 * 60 * 60);
      
      if (hoursUntilEta < 0) urgencyWeight = 30; // Overdue
      else if (hoursUntilEta < 1) urgencyWeight = 25;
      else if (hoursUntilEta < 4) urgencyWeight = 20;
      else if (hoursUntilEta < 12) urgencyWeight = 15;
      else urgencyWeight = 5;
    } else {
      urgencyWeight = 10; // No ETA set
    }
    
    // Drone readiness (20%)
    let droneWeight = 0;
    if (assignedDrone) {
      const batteryLevel = assignedDrone.last_telemetry?.battery_percent || 0;
      const isOnline = assignedDrone.status === 'active' || assignedDrone.status === 'idle';
      
      if (isOnline && batteryLevel > 70) droneWeight = 20;
      else if (isOnline && batteryLevel > 50) droneWeight = 15;
      else if (isOnline && batteryLevel > 30) droneWeight = 10;
      else if (isOnline) droneWeight = 5;
    } else {
      droneWeight = 15; // Unassigned but could be assigned
    }
    
    // Weather conditions (10%)
    const weatherWeight = weatherConditions.safe ? 10 : 0;
    
    const totalScore = priorityWeight + urgencyWeight + droneWeight + weatherWeight;
    
    return {
      score: Math.min(100, totalScore),
      factors: {
        priority: priorityWeight,
        urgency: urgencyWeight,
        drone: droneWeight,
        weather: weatherWeight
      }
    };
  };
  
  const triageMissions = useMemo(() => {
    return missions
      .map(mission => ({
        ...mission,
        triage: calculateTriagePriority(mission)
      }))
      .sort((a, b) => b.triage.score - a.triage.score);
  }, [missions, drones, weatherConditions]);
  
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-red-400 bg-red-500/20 border-red-500/30';
    if (score >= 60) return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    if (score >= 40) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-green-400 bg-green-500/20 border-green-500/30';
  };
  
  const getScoreLabel = (score) => {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  };
  
  const getTrendIcon = (score) => {
    if (score >= 80) return <TrendingUp className="text-red-400" size={16} />;
    if (score >= 60) return <TrendingUp className="text-orange-400" size={16} />;
    if (score >= 40) return <Minus className="text-yellow-400" size={16} />;
    return <TrendingDown className="text-green-400" size={16} />;
  };
  
  return (
    <div className="space-y-4">
      {/* Weather Override */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Environmental Conditions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Weather Safe</label>
            <select
              value={weatherConditions.safe}
              onChange={(e) => setWeatherConditions({
                ...weatherConditions,
                safe: e.target.value === 'true'
              })}
              className="w-full bg-gray-700 border border-gray-600 rounded text-white text-sm px-2 py-1"
            >
              <option value="true">Safe</option>
              <option value="false">Hazardous</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-gray-400 mb-1">Wind Speed (m/s)</label>
            <input
              type="number"
              min="0"
              max="50"
              value={weatherConditions.windSpeed}
              onChange={(e) => setWeatherConditions({
                ...weatherConditions,
                windSpeed: parseInt(e.target.value) || 0
              })}
              className="w-full bg-gray-700 border border-gray-600 rounded text-white text-sm px-2 py-1"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-400 mb-1">Visibility (km)</label>
            <input
              type="number"
              min="0"
              max="50"
              value={weatherConditions.visibility}
              onChange={(e) => setWeatherConditions({
                ...weatherConditions,
                visibility: parseInt(e.target.value) || 0
              })}
              className="w-full bg-gray-700 border border-gray-600 rounded text-white text-sm px-2 py-1"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-400 mb-1">Precipitation</label>
            <select
              value={weatherConditions.precipitation}
              onChange={(e) => setWeatherConditions({
                ...weatherConditions,
                precipitation: e.target.value === 'true'
              })}
              className="w-full bg-gray-700 border border-gray-600 rounded text-white text-sm px-2 py-1"
            >
              <option value="false">None</option>
              <option value="true">Rain/Snow</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Triage List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="text-yellow-400" size={20} />
          Mission Triage Priority
        </h3>
        
        {triageMissions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No missions to prioritize
          </div>
        ) : (
          triageMissions.map((mission, index) => {
            const assignedDrone = drones.find(d => d.id === mission.assigned_drone_id);
            const scoreColor = getScoreColor(mission.triage.score);
            
            return (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-4 hover:border-green-500/30 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-gray-400">
                      #{index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{mission.code}</h4>
                      <p className="text-sm text-gray-400">
                        Priority {mission.priority} • {mission.status}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getTrendIcon(mission.triage.score)}
                    <div className={`px-3 py-2 rounded-lg border text-center ${scoreColor}`}>
                      <div className="text-lg font-bold">{Math.round(mission.triage.score)}</div>
                      <div className="text-xs">{getScoreLabel(mission.triage.score)}</div>
                    </div>
                  </div>
                </div>
                
                {/* Mission Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-blue-400" />
                    <span className="text-gray-300">
                      {Math.round(
                        Math.sqrt(
                          Math.pow(mission.destination.lat - mission.origin.lat, 2) +
                          Math.pow(mission.destination.lon - mission.origin.lon, 2)
                        ) * 111000
                      )} m
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-yellow-400" />
                    <span className="text-gray-300">
                      {mission.eta ? new Date(mission.eta).toLocaleTimeString() : 'No ETA'}
                    </span>
                  </div>
                  
                  {assignedDrone && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Drone:</span>
                        <span className="text-white">{assignedDrone.callsign}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Battery size={14} className={
                          assignedDrone.last_telemetry?.battery_percent > 70 ? 'text-green-400' :
                          assignedDrone.last_telemetry?.battery_percent > 30 ? 'text-yellow-400' :
                          'text-red-400'
                        } />
                        <span className="text-gray-300">
                          {assignedDrone.last_telemetry?.battery_percent || 0}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Triage Factors */}
                <div className="bg-gray-800/50 rounded p-3">
                  <div className="text-xs text-gray-400 mb-2">Score Breakdown:</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400">Priority:</span>
                      <span className="text-white ml-1">{Math.round(mission.triage.factors.priority)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Urgency:</span>
                      <span className="text-white ml-1">{Math.round(mission.triage.factors.urgency)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Drone:</span>
                      <span className="text-white ml-1">{Math.round(mission.triage.factors.drone)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Weather:</span>
                      <span className="text-white ml-1">{Math.round(mission.triage.factors.weather)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TriageEngine;