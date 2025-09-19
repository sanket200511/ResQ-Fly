import { create } from 'zustand';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useMissionStore = create((set, get) => ({
  // State
  missions: [],
  selectedMission: null,
  drones: [],
  loading: false,
  error: null,
  
  // Mission filters and sorting
  filters: {
    status: 'all', // all, planned, active, completed, aborted
    priority: 'all', // all, 1, 2, 3, 4
    assignedDrone: 'all'
  },
  
  sortBy: 'created_at', // created_at, priority, eta
  sortOrder: 'desc',
  
  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  // Fetch missions
  fetchMissions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API}/missions`);
      if (!response.ok) throw new Error('Failed to fetch missions');
      const missions = await response.json();
      set({ missions, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  // Fetch drones
  fetchDrones: async () => {
    try {
      const response = await fetch(`${API}/drones`);
      if (!response.ok) throw new Error('Failed to fetch drones');
      const drones = await response.json();
      set({ drones });
    } catch (error) {
      set({ error: error.message });
    }
  },
  
  // Create mission
  createMission: async (missionData) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API}/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missionData)
      });
      if (!response.ok) throw new Error('Failed to create mission');
      const newMission = await response.json();
      set(state => ({
        missions: [newMission, ...state.missions],
        loading: false
      }));
      return newMission;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Update mission
  updateMission: async (missionId, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API}/missions/${missionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update mission');
      const updatedMission = await response.json();
      set(state => ({
        missions: state.missions.map(m => m.id === missionId ? updatedMission : m),
        loading: false
      }));
      return updatedMission;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Assign drone to mission
  assignDrone: async (missionId, droneId) => {
    try {
      const response = await fetch(`${API}/missions/${missionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drone_id: droneId })
      });
      if (!response.ok) throw new Error('Failed to assign drone');
      
      // Update mission in state
      set(state => ({
        missions: state.missions.map(m => 
          m.id === missionId 
            ? { ...m, assigned_drone_id: droneId, status: 'assigned' }
            : m
        )
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  // Delete mission
  deleteMission: async (missionId) => {
    try {
      const response = await fetch(`${API}/missions/${missionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete mission');
      
      set(state => ({
        missions: state.missions.filter(m => m.id !== missionId)
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  // Select mission
  selectMission: (mission) => set({ selectedMission: mission }),
  
  // Update filters
  updateFilters: (newFilters) => set(state => ({
    filters: { ...state.filters, ...newFilters }
  })),
  
  // Update sorting
  updateSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
  
  // Get filtered and sorted missions
  getFilteredMissions: () => {
    const { missions, filters, sortBy, sortOrder } = get();
    
    let filtered = missions.filter(mission => {
      if (filters.status !== 'all' && mission.status !== filters.status) return false;
      if (filters.priority !== 'all' && mission.priority !== parseInt(filters.priority)) return false;
      if (filters.assignedDrone !== 'all' && mission.assigned_drone_id !== filters.assignedDrone) return false;
      return true;
    });
    
    // Sort missions
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'priority':
          aVal = a.priority;
          bVal = b.priority;
          break;
        case 'eta':
          aVal = new Date(a.eta || 0);
          bVal = new Date(b.eta || 0);
          break;
        default:
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    return filtered;
  },
  
  // Calculate triage priority score
  calculateTriagePriority: (mission, droneStatus, weatherConditions = {}) => {
    const priorityWeight = mission.priority * 25; // 25-100 based on priority level
    const urgencyWeight = mission.eta ? Math.max(0, 50 - (new Date(mission.eta) - new Date()) / (1000 * 60 * 60)) : 25;
    const droneWeight = droneStatus?.battery_percent || 50;
    const weatherWeight = weatherConditions.safe ? 25 : 0;
    
    return Math.min(100, priorityWeight + urgencyWeight + droneWeight * 0.25 + weatherWeight);
  }
}));