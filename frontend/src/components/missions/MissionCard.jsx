import React from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Circle,
  Plane,
  Package,
  User,
  MoreVertical
} from 'lucide-react';

const priorityColors = {
  1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  2: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', 
  3: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  4: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const statusColors = {
  planned: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  assigned: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-green-600/20 text-green-300 border-green-600/30',
  aborted: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const MissionCard = ({ mission, drone, onSelect, onAssign, onEdit, onDelete }) => {
  const priorityColor = priorityColors[mission.priority] || priorityColors[1];
  const statusColor = statusColors[mission.status] || statusColors.planned;
  
  const getPriorityLabel = (priority) => {
    const labels = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
    return labels[priority] || 'Low';
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'active': return <Circle size={16} className="animate-pulse" />;
      case 'aborted': return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };
  
  const formatETA = (eta) => {
    if (!eta) return 'No ETA';
    const etaDate = new Date(eta);
    const now = new Date();
    const diff = etaDate - now;
    
    if (diff < 0) return 'Overdue';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 cursor-pointer hover:border-green-500/30 transition-all"
      onClick={() => onSelect(mission)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white truncate">{mission.code}</h3>
          <div className={`px-2 py-1 rounded text-xs border ${priorityColor}`}>
            {getPriorityLabel(mission.priority)}
          </div>
        </div>
        <button className="text-gray-400 hover:text-white p-1">
          <MoreVertical size={16} />
        </button>
      </div>
      
      {/* Status and Assignment */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${statusColor}`}>
          {getStatusIcon(mission.status)}
          <span className="capitalize">{mission.status}</span>
        </div>
        
        {mission.assigned_drone_id && drone && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Plane size={12} />
            <span>{drone.callsign}</span>
          </div>
        )}
      </div>
      
      {/* Location Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <MapPin size={14} className="text-green-400" />
          <span>From: {mission.origin.lat.toFixed(4)}, {mission.origin.lon.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <MapPin size={14} className="text-red-400" />
          <span>To: {mission.destination.lat.toFixed(4)}, {mission.destination.lon.toFixed(4)}</span>
        </div>
      </div>
      
      {/* Payloads */}
      {mission.payloads && mission.payloads.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <Package size={14} className="text-blue-400" />
          <span className="text-sm text-gray-300">
            {mission.payloads.length} payload{mission.payloads.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <User size={12} />
          <span>{mission.created_by}</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock size={12} />
          <span>ETA: {formatETA(mission.eta)}</span>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex gap-2 mt-3">
        {!mission.assigned_drone_id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssign(mission);
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded transition-colors"
          >
            Assign Drone
          </button>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(mission);
          }}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs py-2 px-3 rounded transition-colors"
        >
          Edit
        </button>
      </div>
    </motion.div>
  );
};

export default MissionCard;