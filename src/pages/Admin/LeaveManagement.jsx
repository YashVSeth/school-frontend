import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import { FaCalendarCheck, FaCheck, FaTimes, FaClock, FaUserTie } from 'react-icons/fa';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/leaves`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaves(Array.isArray(res.data) ? res.data : (res.data.leaves || []));
    } catch (err) {
      console.error("Error fetching leaves:", err);
      toast.error("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${BASE_URL}/api/leaves/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Leave request ${status.toLowerCase()}!`);
      setLeaves(prev => prev.map(l => l._id === id ? { ...l, status } : l));
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
    }
  };

  const filteredLeaves = leaves.filter(l => {
    if (filter === 'All') return true;
    return l.status === filter;
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto animate-fade-in-up pb-10 space-y-6">
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-500 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Faculty Leave Management</h1>
            <p className="text-orange-100 text-xs sm:text-sm mt-1">Review, approve and manage leave applications from teachers.</p>
          </div>
          <FaCalendarCheck size={36} className="opacity-20 hidden md:block" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit">
          {['All', 'Pending', 'Approved', 'Declined'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                filter === tab ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Leaves List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-100">
            Loading leave applications...
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-100">
            No {filter !== 'All' ? filter.toLowerCase() : ''} leave applications found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLeaves.map(leave => (
              <div key={leave._id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                      <FaUserTie />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{leave.teacher?.fullName || 'Faculty Member'}</h3>
                      <p className="text-xs text-slate-400">{leave.teacher?.email || leave.teacher?.specialization || 'Department Faculty'}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                    leave.status === 'Declined' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {leave.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600">
                  <p><strong>Duration:</strong> {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}</p>
                  <p><strong>Reason:</strong> {leave.reason}</p>
                </div>

                {leave.status === 'Pending' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleUpdateStatus(leave._id, 'Approved')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 active:scale-95"
                    >
                      <FaCheck size={11} /> Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(leave._id, 'Declined')}
                      className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <FaTimes size={11} /> Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LeaveManagement;
