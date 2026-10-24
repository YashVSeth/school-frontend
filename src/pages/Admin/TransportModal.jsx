import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaTimes, FaBus, FaTrash, FaPlus, FaMapMarkerAlt, FaRoute, FaFilter } from 'react-icons/fa';

const ZONES = [
  { id: 'Zone 1 (0-3 km)', label: 'Zone 1 (0-3 km)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'Zone 2 (3-7 km)', label: 'Zone 2 (3-7 km)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'Zone 3 (7-12 km)', label: 'Zone 3 (7-12 km)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'Zone 4 (12+ km)', label: 'Zone 4 (12+ km)', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const TransportModal = ({ isOpen, onClose }) => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [zoneFilter, setZoneFilter] = useState('');
  
  const [newRoute, setNewRoute] = useState({
    placeName: '',
    fare: '',
    zone: 'Zone 1 (0-3 km)',
    distanceKm: ''
  });
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
      setNewRoute({
        placeName: '',
        fare: '',
        zone: 'Zone 1 (0-3 km)',
        distanceKm: ''
      });
    }
  }, [isOpen, zoneFilter]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const query = zoneFilter ? `?zone=${encodeURIComponent(zoneFilter)}` : '';
      const res = await axios.get(`${BASE_URL}/api/transport${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoutes(res.data || []);
    } catch {
      toast.error('Failed to load transport routes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoute = async (e) => {
    e.preventDefault();
    if (!newRoute.placeName || !newRoute.fare) {
      toast.warning('Please provide both place name and fare');
      return;
    }
    
    setAdding(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/transport`, {
        placeName: newRoute.placeName,
        fare: Number(newRoute.fare),
        zone: newRoute.zone,
        distanceKm: Number(newRoute.distanceKm) || 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Transport route added successfully');
      setNewRoute({ placeName: '', fare: '', zone: 'Zone 1 (0-3 km)', distanceKm: '' });
      fetchRoutes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add route');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRoute = async (id) => {
    if (!window.confirm('Are you sure you want to delete this route?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE_URL}/api/transport/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Route deleted successfully');
      fetchRoutes();
    } catch {
      toast.error('Failed to delete route');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 animate-scale-up flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-[#800000] p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <FaBus className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Transport Route Slabs</h2>
              <p className="text-red-100 text-xs font-medium opacity-90 mt-0.5">Zone-based distance zones and monthly fares</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-1 space-y-6">
          {/* Add Route Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FaPlus className="text-red-500" /> Add New Route & Slab
            </h3>
            <form onSubmit={handleAddRoute} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Place / Stop Name</label>
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={newRoute.placeName}
                      onChange={(e) => setNewRoute({ ...newRoute, placeName: e.target.value })}
                      placeholder="e.g. Civil Lines, Kydganj"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Distance Zone</label>
                  <select
                    value={newRoute.zone}
                    onChange={(e) => setNewRoute({ ...newRoute, zone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:border-red-500 transition-colors cursor-pointer"
                  >
                    {ZONES.map(z => (
                      <option key={z.id} value={z.id}>{z.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Distance (Km)</label>
                  <input
                    type="number"
                    value={newRoute.distanceKm}
                    onChange={(e) => setNewRoute({ ...newRoute, distanceKm: e.target.value })}
                    placeholder="e.g. 5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Monthly Fare (₹)</label>
                  <input
                    type="number"
                    value={newRoute.fare}
                    onChange={(e) => setNewRoute({ ...newRoute, fare: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:border-red-500 transition-colors text-right"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={adding}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl transition-colors disabled:opacity-70 text-xs h-[38px] shadow-sm shadow-red-600/20"
                >
                  {adding ? 'Adding...' : 'Add Route'}
                </button>
              </div>
            </form>
          </div>

          {/* Routes List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-[#fcfafa] flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-black text-slate-800">Transport Routes & Slabs</h3>
              
              <div className="flex items-center gap-2">
                <FaFilter className="text-slate-400 text-xs" />
                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
                >
                  <option value="">All Zones</option>
                  {ZONES.map(z => (
                    <option key={z.id} value={z.id}>{z.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Loading routes...</div>
            ) : routes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm font-medium">No transport routes defined yet.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-extrabold text-[#8fa0b5] tracking-widest uppercase border-b border-slate-100">
                    <th className="px-5 py-3">Place / Stop</th>
                    <th className="px-5 py-3">Zone</th>
                    <th className="px-5 py-3 text-right">Fare (₹)</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => {
                    const zoneObj = ZONES.find(z => z.id === route.zone) || ZONES[0];
                    return (
                      <tr key={route._id} className="border-b last:border-0 border-slate-50 group hover:bg-[#fafafe] transition-colors">
                        <td className="px-5 py-3 font-bold text-slate-700">
                          {route.placeName}
                          {route.distanceKm > 0 && (
                            <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({route.distanceKm} km)</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${zoneObj.color}`}>
                            {route.zone || 'Zone 1'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-black text-slate-800">₹{route.fare?.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => handleDeleteRoute(route._id)}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-red-50"
                            title="Delete Route"
                          >
                            <FaTrash size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TransportModal;
