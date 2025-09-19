import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';
import io from 'socket.io-client';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { 
  Plane, 
  MapPin, 
  Battery, 
  Satellite, 
  Gauge, 
  AlertTriangle, 
  Shield, 
  Radio,
  Camera,
  Settings,
  Play,
  Pause,
  Activity,
  Navigation,
  Zap
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Zustand store for global state
const useStore = create((set, get) => ({
  // Telemetry state
  telemetry: null,
  isConnected: false,
  drones: [],
  missions: [],
  alerts: [],
  
  // UI state
  selectedDrone: null,
  showCamera: false,
  showSettings: false,
  aiEnabled: false,
  
  // Safety scoring
  safetyScore: null,
  
  // Actions
  setTelemetry: (data) => set({ telemetry: data }),
  setConnection: (status) => set({ isConnected: status }),
  setDrones: (drones) => set({ drones }),
  setMissions: (missions) => set({ missions }),
  setSelectedDrone: (drone) => set({ selectedDrone: drone }),
  toggleCamera: () => set(state => ({ showCamera: !state.showCamera })),
  toggleSettings: () => set(state => ({ showSettings: !state.showSettings })),
  setSafetyScore: (score) => set({ safetyScore: score }),
  setAIEnabled: (enabled) => set({ aiEnabled: enabled })
}));

// WebSocket connection hook
const useWebSocket = () => {
  const { setTelemetry, setConnection } = useStore();
  const ws = useRef(null);
  
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        ws.current = new WebSocket(`${BACKEND_URL.replace('http', 'ws')}/api/telemetry`);
        
        ws.current.onopen = () => {
          console.log('WebSocket connected');
          setConnection(true);
        };
        
        ws.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'telemetry') {
            setTelemetry(data.data);
          }
        };
        
        ws.current.onclose = () => {
          console.log('WebSocket disconnected');
          setConnection(false);
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
        
        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnection(false);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setTimeout(connectWebSocket, 3000);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [setTelemetry, setConnection]);
};

// API hooks
const useAPI = () => {
  const { setDrones, setMissions, setAIEnabled } = useStore();
  
  const fetchDrones = async () => {
    try {
      const response = await fetch(`${API}/drones`);
      const drones = await response.json();
      setDrones(drones);
    } catch (error) {
      console.error('Failed to fetch drones:', error);
    }
  };
  
  const fetchMissions = async () => {
    try {
      const response = await fetch(`${API}/missions`);
      const missions = await response.json();
      setMissions(missions);
    } catch (error) {
      console.error('Failed to fetch missions:', error);
    }
  };
  
  const fetchAISettings = async () => {
    try {
      const response = await fetch(`${API}/ai/settings`);
      const settings = await response.json();
      setAIEnabled(settings.enabled);
    } catch (error) {
      console.error('Failed to fetch AI settings:', error);
    }
  };
  
  const calculateSafetyScore = async (droneId) => {
    try {
      const response = await fetch(`${API}/telemetry/safety-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drone_id: droneId })
      });
      const score = await response.json();
      return score;
    } catch (error) {
      console.error('Failed to calculate safety score:', error);
      return null;
    }
  };
  
  return { fetchDrones, fetchMissions, fetchAISettings, calculateSafetyScore };
};

// Status chip component
const StatusChip = ({ icon: Icon, label, value, status = 'normal', unit = '' }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'good': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-md
        ${getStatusColor()}
      `}
    >
      <Icon size={16} />
      <div>
        <div className="text-xs opacity-75">{label}</div>
        <div className="font-mono font-semibold">{value}{unit}</div>
      </div>
    </motion.div>
  );
};

// Safety score component
const SafetyScorePanel = ({ droneId }) => {
  const { safetyScore, setSafetyScore } = useStore();
  const { calculateSafetyScore } = useAPI();
  
  useEffect(() => {
    if (droneId) {
      const updateScore = async () => {
        const score = await calculateSafetyScore(droneId);
        if (score) setSafetyScore(score);
      };
      
      updateScore();
      const interval = setInterval(updateScore, 5000); // Update every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [droneId, calculateSafetyScore, setSafetyScore]);
  
  if (!safetyScore) return null;
  
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Shield className="text-blue-400" size={20} />
        <h3 className="text-white font-semibold">Landing Zone Safety</h3>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <div className={`text-4xl font-bold ${getScoreColor(safetyScore.score)}`}>
          {safetyScore.score}
        </div>
        <div className="flex-1">
          <div className="bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                safetyScore.score >= 80 ? 'bg-green-400' :
                safetyScore.score >= 60 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${safetyScore.score}%` }}
            />
          </div>
        </div>
      </div>
      
      {safetyScore.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-yellow-400 text-sm font-semibold">Recommendations:</h4>
          {safetyScore.recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-gray-300">
              <AlertTriangle size={14} className="mt-0.5 text-yellow-400 flex-shrink-0" />
              {rec}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// Map component
const MapComponent = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const droneMarker = useRef(null);
  const trailCoordinates = useRef([]);
  const { telemetry, isConnected } = useStore();
  
  useEffect(() => {
    if (map.current) return; // Initialize map only once
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json', // Free OpenStreetMap style
      center: [-122.4194, 37.7749], // Default to San Francisco
      zoom: 13,
      pitch: 45,
      bearing: 0
    });
    
    map.current.on('load', () => {
      // Add trail source
      map.current.addSource('drone-trail', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      });
      
      // Add trail layer
      map.current.addLayer({
        id: 'drone-trail',
        type: 'line',
        source: 'drone-trail',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#00ff88',
          'line-width': 3,
          'line-opacity': 0.8
        }
      });
    });
    
  }, []);
  
  // Update drone position and trail
  useEffect(() => {
    if (!map.current || !telemetry) return;
    
    const { lat, lon, heading } = telemetry;
    const coordinates = [lon, lat];
    
    // Update or create drone marker
    if (droneMarker.current) {
      droneMarker.current.setLngLat(coordinates);
    } else {
      // Create custom drone marker
      const el = document.createElement('div');
      el.className = 'drone-marker';
      el.innerHTML = `
        <div class="drone-icon" style="transform: rotate(${heading}deg)">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#00ff88" fill-opacity="0.2" stroke="#00ff88" stroke-width="2"/>
            <polygon points="16,8 20,20 16,18 12,20" fill="#00ff88"/>
          </svg>
        </div>
      `;
      
      droneMarker.current = new maplibregl.Marker(el)
        .setLngLat(coordinates)
        .addTo(map.current);
    }
    
    // Update trail
    trailCoordinates.current.push(coordinates);
    if (trailCoordinates.current.length > 100) {
      trailCoordinates.current.shift(); // Keep only last 100 points
    }
    
    if (map.current.getSource('drone-trail')) {
      map.current.getSource('drone-trail').setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: trailCoordinates.current
        }
      });
    }
    
    // Center map on drone (smooth transition)
    map.current.flyTo({
      center: coordinates,
      duration: 1000
    });
    
  }, [telemetry]);
  
  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Connection status overlay */}
      <div className="absolute top-4 left-4 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md
            ${isConnected 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }
          `}
        >
          <Activity size={16} />
          <span className="text-sm font-medium">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </motion.div>
      </div>
    </div>
  );
};

// Telemetry panel
const TelemetryPanel = () => {
  const { telemetry, selectedDroneId } = useStore();
  
  if (!telemetry) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400">
        <div className="text-center">
          <Activity size={32} className="mx-auto mb-2 opacity-50" />
          <p>Waiting for telemetry data...</p>
        </div>
      </div>
    );
  }
  
  const getBatteryStatus = (percent) => {
    if (percent > 70) return 'good';
    if (percent > 30) return 'warning';
    return 'critical';
  };
  
  const getGPSStatus = (sats) => {
    if (sats >= 8) return 'good';
    if (sats >= 6) return 'warning';
    return 'critical';
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
      <StatusChip
        icon={Navigation}
        label="Mode"
        value={telemetry.mode}
        status={telemetry.armed ? 'good' : 'warning'}
      />
      
      <StatusChip
        icon={Battery}
        label="Battery"
        value={telemetry.battery_percent}
        unit="%"
        status={getBatteryStatus(telemetry.battery_percent)}
      />
      
      <StatusChip
        icon={Satellite}
        label="GPS"
        value={telemetry.satellites}
        unit=" sats"
        status={getGPSStatus(telemetry.satellites)}
      />
      
      <StatusChip
        icon={Gauge}
        label="Speed"
        value={Math.round(telemetry.groundspeed)}
        unit=" m/s"
      />
      
      <StatusChip
        icon={MapPin}
        label="Altitude"
        value={Math.round(telemetry.alt_rel)}
        unit=" m"
      />
      
      <StatusChip
        icon={Radio}
        label="RSSI"
        value={telemetry.rssi}
        unit=" dBm"
        status={telemetry.rssi > -70 ? 'good' : telemetry.rssi > -85 ? 'warning' : 'critical'}
      />
      
      <StatusChip
        icon={Zap}
        label="Link"
        value={Math.round(telemetry.link_quality * 100)}
        unit="%"
        status={telemetry.link_quality > 0.8 ? 'good' : telemetry.link_quality > 0.6 ? 'warning' : 'critical'}
      />
      
      <StatusChip
        icon={Activity}
        label="Heading"
        value={Math.round(telemetry.heading)}
        unit="°"
      />
    </div>
  );
};

// Settings panel
const SettingsPanel = () => {
  const { showSettings, toggleSettings, aiEnabled } = useStore();
  const [geminiKey, setGeminiKey] = useState('');
  const [loading, setLoading] = useState(false);
  
  const updateAISettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/ai/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: aiEnabled,
          provider: 'gemini',
          api_key: geminiKey || null
        })
      });
      
      if (response.ok) {
        console.log('AI settings updated');
      }
    } catch (error) {
      console.error('Failed to update AI settings:', error);
    }
    setLoading(false);
  };
  
  if (!showSettings) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={toggleSettings}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button
            onClick={toggleSettings}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              AI Features
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => useStore.setState({ aiEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-gray-300">Enable AI mission briefs and analysis</span>
            </div>
          </div>
          
          {aiEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">
                Optional: Leave empty to use Emergent LLM key
              </p>
            </div>
          )}
          
          <button
            onClick={updateAISettings}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main App component
const App = () => {
  const { 
    telemetry, 
    showCamera, 
    toggleCamera, 
    showSettings,
    toggleSettings 
  } = useStore();
  
  const { fetchDrones, fetchMissions, fetchAISettings } = useAPI();
  
  // Initialize WebSocket and fetch data
  useWebSocket();
  
  useEffect(() => {
    fetchDrones();
    fetchMissions();
    fetchAISettings();
  }, [fetchDrones, fetchMissions, fetchAISettings]);
  
  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Plane className="text-green-400" size={32} />
            <div>
              <h1 className="text-2xl font-bold">ResQFly</h1>
              <p className="text-sm text-gray-400">Disaster Response Drone System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCamera}
              className={`p-2 rounded-lg border backdrop-blur-md transition-colors ${
                showCamera 
                  ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30'
              }`}
            >
              <Camera size={20} />
            </button>
            
            <button
              onClick={toggleSettings}
              className="p-2 rounded-lg border border-gray-500/30 bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 backdrop-blur-md transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="h-full pt-20 flex">
        {/* Map area */}
        <div className="flex-1 relative">
          <MapComponent />
          
          {/* Telemetry overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/10">
            <TelemetryPanel />
          </div>
        </div>
        
        {/* Right sidebar */}
        <div className="w-80 bg-black/40 backdrop-blur-md border-l border-white/10 flex flex-col">
          {/* Camera panel */}
          <AnimatePresence>
            {showCamera && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-white/10"
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera className="text-blue-400" size={20} />
                    <h3 className="font-semibold">Camera Feed</h3>
                  </div>
                  <div className="bg-gray-800 rounded-lg aspect-video flex items-center justify-center">
                    <p className="text-gray-400">Camera feed not available</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Safety score panel */}
          <div className="p-4">
            <SafetyScorePanel droneId={telemetry?.drone_id} />
          </div>
          
          {/* Mission timeline */}
          <div className="flex-1 p-4">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="text-blue-400" size={20} />
                <h3 className="font-semibold">Mission Timeline</h3>
              </div>
              <div className="text-gray-400 text-center py-8">
                <p>No active missions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Settings modal */}
      <AnimatePresence>
        <SettingsPanel />
      </AnimatePresence>
    </div>
  );
};

export default App;