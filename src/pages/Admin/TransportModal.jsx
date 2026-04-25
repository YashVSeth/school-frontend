import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaTimes, FaBus, FaTrash, FaPlus, FaMapMarkerAlt } from 'react-icons/fa';

const TransportModal = ({ isOpen, onClose }) => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const [newRoute, setNewRoute] = useState({ placeName: '', fare: '' });
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
      setNewRoute({ placeName: '', fare: '' });
    }
  }, [isOpen]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/transport`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoutes(res.data || []);
    } catch (error) {
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
        fare: Number(newRoute.fare)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Route added successfully');
      setNewRoute({ placeName: '', fare: '' });
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
    } catch (error) {
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
              <h2 className="text-xl font-black tracking-tight">Transport Routes</h2>
              <p className="text-red-100 text-xs font-medium opacity-90 mt-0.5">Manage places and monthly fares</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
          {/* Add Route Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FaPlus className="text-red-500" /> Add New Route
            </h3>
            <form onSubmit={handleAddRoute} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Place Name</label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={newRoute.placeName}
                    onChange={(e) => setNewRoute({ ...newRoute, placeName: e.target.value })}
                    placeholder="e.g. Civil Lines"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
              <div className="w-full sm:w-32 shrink-0">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Fare (₹)</label>
                <input
                  type="number"
                  value={newRoute.fare}
                  onChange={(e) => setNewRoute({ ...newRoute, fare: e.target.value })}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-700 outline-none focus:border-red-500 transition-colors text-right"
                />
              </div>
              <button 
                type="submit" 
                disabled={adding}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-70 h-[42px] shrink-0"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </form>
          </div>

          {/* Routes List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-[#fcfafa]">
              <h3 className="text-sm font-black text-slate-800">Existing Routes</h3>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Loading routes...</div>
            ) : routes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm font-medium">No transport routes defined yet.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-extrabold text-[#8fa0b5] tracking-widest uppercase border-b border-slate-100">
                    <th className="px-5 py-3">Place Name</th>
                    <th className="px-5 py-3 text-right">Fare (₹)</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route._id} className="border-b last:border-0 border-slate-50 group hover:bg-[#fafafe] transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-700">{route.placeName}</td>
                      <td className="px-5 py-3 text-right font-black text-slate-800">{route.fare.toLocaleString()}</td>
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
                  ))}
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
