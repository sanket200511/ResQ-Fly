import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Filter, 
  Search, 
  SortAsc, 
  SortDesc,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plane
} from 'lucide-react';
import { useMissionStore } from '../../stores/missionStore';
import MissionCard from './MissionCard';
import MissionForm from './MissionForm';
import DroneAssignmentModal from './DroneAssignmentModal';
import TriageEngine from './TriageEngine';

const MissionPanel = ({ className }) => {
  const {
    missions,
    drones,
    loading,
    error,
    filters,
    sortBy,
    sortOrder,
    fetchMissions,
    fetchDrones,
    createMission,
    updateMission,
    assignDrone,
    deleteMission,
    updateFilters,
    updateSorting,
    getFilteredMissions
  } = useMissionStore();
  
  const [showForm, setShowForm] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningMission, setAssigningMission] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid, list, triage
  
  useEffect(() => {
    fetchMissions();
    fetchDrones();
  }, [fetchMissions, fetchDrones]);
  
  const filteredMissions = getFilteredMissions().filter(mission =>
    mission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.created_by.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const missionStats = {
    total: missions.length,
    planned: missions.filter(m => m.status === 'planned').length,
    active: missions.filter(m => m.status === 'active').length,
    completed: missions.filter(m => m.status === 'completed').length
  };
  
  const handleCreateMission = async (missionData) => {
    try {
      await createMission(missionData);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create mission:', error);
    }
  };
  
  const handleUpdateMission = async (missionData) => {
    try {
      await updateMission(editingMission.id, missionData);
      setEditingMission(null);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to update mission:', error);
    }
  };
  
  const handleAssignDrone = (mission) => {
    setAssigningMission(mission);
    setShowAssignModal(true);
  };
  
  const handleDroneAssignment = async (droneId) => {
    try {
      await assignDrone(assigningMission.id, droneId);
      setShowAssignModal(false);
      setAssigningMission(null);
    } catch (error) {
      console.error('Failed to assign drone:', error);
    }
  };
  
  const handleEditMission = (mission) => {
    setEditingMission(mission);
    setShowForm(true);
  };
  
  const toggleSort = (field) => {
    if (sortBy === field) {
      updateSorting(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      updateSorting(field, 'desc');
    }
  };
  
  return (
    <div className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-xl ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Mission Control</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMissions()}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={18} />
              New Mission
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{missionStats.total}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
          <div className="bg-blue-500/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{missionStats.planned}</div>
            <div className="text-xs text-blue-300">Planned</div>
          </div>
          <div className="bg-green-500/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{missionStats.active}</div>
            <div className="text-xs text-green-300">Active</div>
          </div>
          <div className="bg-gray-500/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-400">{missionStats.completed}</div>
            <div className="text-xs text-gray-300">Completed</div>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search missions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="planned">Planned</option>
            <option value="assigned">Assigned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="aborted">Aborted</option>
          </select>
          
          <select
            value={filters.priority}
            onChange={(e) => updateFilters({ priority: e.target.value })}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Priority</option>
            <option value="4">Critical</option>
            <option value="3">High</option>
            <option value="2">Medium</option>
            <option value="1">Low</option>
          </select>
        </div>
        
        {/* View Mode and Sorting */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('triage')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'triage' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Triage
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort by:</span>
            <button
              onClick={() => toggleSort('created_at')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                sortBy === 'created_at' ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Created
              {sortBy === 'created_at' && (sortOrder === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}
            </button>
            <button
              onClick={() => toggleSort('priority')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                sortBy === 'priority' ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Priority
              {sortBy === 'priority' && (sortOrder === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}
            </button>
            <button
              onClick={() => toggleSort('eta')}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                sortBy === 'eta' ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              ETA
              {sortBy === 'eta' && (sortOrder === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}
        
        {loading && filteredMissions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-gray-400" />
          </div>
        ) : filteredMissions.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-400 mb-4">No missions found</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Create First Mission
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === 'triage' ? (
              <TriageEngine missions={filteredMissions} drones={drones} />
            ) : (
              <div className="grid gap-4">
                {filteredMissions.map(mission => {
                  const assignedDrone = drones.find(d => d.id === mission.assigned_drone_id);
                  return (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      drone={assignedDrone}
                      onSelect={() => {/* Handle mission selection */}}
                      onAssign={handleAssignDrone}
                      onEdit={handleEditMission}
                      onDelete={deleteMission}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <MissionForm
            mission={editingMission}
            drones={drones}
            onSave={editingMission ? handleUpdateMission : handleCreateMission}
            onCancel={() => {
              setShowForm(false);
              setEditingMission(null);
            }}
          />
        )}
        
        {showAssignModal && (
          <DroneAssignmentModal
            mission={assigningMission}
            drones={drones}
            onAssign={handleDroneAssignment}
            onCancel={() => {
              setShowAssignModal(false);
              setAssigningMission(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MissionPanel;