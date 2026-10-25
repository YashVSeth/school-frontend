import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaCalendarDay, FaPaperPlane, FaClock, FaCheckCircle, FaTimesCircle,
  FaPlus, FaCalendarAlt, FaFilter, FaInfoCircle
} from 'react-icons/fa';

const TeacherLeave = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const fetchMyLeaves = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/leaves/my-leaves`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaves(res.data.leaves || []);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      toast.error("Could not load leave history.");
    } finally {
      setLoading(false);
    }
  };

  // 🧮 Compute day count when dates are selected
  const leaveDays = useMemo(() => {
    if (!startDate || !endDate) return null;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e < s) return null;
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [startDate, endDate]);

  // 📊 Metrics
  const stats = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter(l => l.status === 'Pending').length;
    const approved = leaves.filter(l => l.status === 'Approved').length;
    const declined = leaves.filter(l => l.status === 'Declined').length;
    return { total, pending, approved, declined };
  }, [leaves]);

  const filteredLeaves = useMemo(() => {
    if (statusFilter === 'ALL') return leaves;
    return leaves.filter(l => l.status === statusFilter);
  }, [leaves, statusFilter]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();

    if (!startDate || !endDate || !reason.trim()) {
      return toast.warning("Please fill out all required fields.");
    }

    if (new Date(endDate) < new Date(startDate)) {
      return toast.error("End date cannot be before start date.");
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/api/leaves/apply`, {
        startDate,
        endDate,
        reason: reason.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Leave request submitted successfully!");
      setStartDate('');
      setEndDate('');
      setReason('');

      // Instantly refresh list
      if (res.data.leave) {
        setLeaves(prev => [res.data.leave, ...prev]);
      } else {
        fetchMyLeaves();
      }
    } catch (error) {
      console.error("Leave Application Error:", error);
      toast.error(error.response?.data?.message || "Failed to submit leave request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatusBadge = ({ status }) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black border border-emerald-200 flex items-center gap-1.5 shadow-xs">
            <FaCheckCircle className="text-emerald-600" /> Approved
          </span>
        );
      case 'Declined':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-black border border-red-200 flex items-center gap-1.5 shadow-xs">
            <FaTimesCircle className="text-red-600" /> Declined
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black border border-amber-200 flex items-center gap-1.5 shadow-xs">
            <FaClock className="text-amber-600" /> Pending Review
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <div className="w-10 h-10 border-4 border-[#ab0035] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Leave Records...</p>
      </div>
    );
  }

  return (
    <div className="font-sans flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">

      {/* 🔴 OVERLAPPING HEADER CARD */}
      <div className="bg-gradient-to-br from-[#7a0020] via-[#ab0035] to-[#8b0025] rounded-3xl shadow-xl p-6 sm:p-7 border border-white/10 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <FaCalendarDay size={120} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-yellow-300 border border-white/20 shadow-md">
              <FaCalendarDay size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-300">
                  Faculty Administration
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
                Leave Management Desk
              </h1>
              <p className="text-white/80 text-xs font-medium mt-0.5">
                Apply for planned leaves and track institutional approvals in real time.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 bg-black/25 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 md:min-w-[280px]">
            <div className="text-center px-2 py-1">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Total</span>
              <span className="text-base font-black text-white">{stats.total}</span>
            </div>
            <div className="text-center px-2 py-1 border-x border-white/10">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Pending</span>
              <span className="text-base font-black text-amber-300">{stats.pending}</span>
            </div>
            <div className="text-center px-2 py-1">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Approved</span>
              <span className="text-base font-black text-emerald-300">{stats.approved}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🖥️ MAIN TWO-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* 🟡 APPLICATION FORM (5 COLS) */}
        <div className="lg:col-span-5 bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-4 bg-[#ab0035] rounded-full" />
              Submit Leave Request
            </h2>
            {leaveDays && (
              <span className="text-xs font-black bg-red-50 text-[#ab0035] px-2.5 py-0.5 rounded-full border border-red-100">
                {leaveDays} {leaveDays === 1 ? 'Day' : 'Days'}
              </span>
            )}
          </div>

          <form onSubmit={handleApplyLeave} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-0.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl px-3.5 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#ab0035] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-0.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl px-3.5 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-[#ab0035] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-0.5">
                Reason / Purpose
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Mention the reason for leave (medical, personal, family event, etc.)..."
                rows="4"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl p-3 outline-none focus:bg-white focus:ring-2 focus:ring-[#ab0035] transition resize-none leading-relaxed"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 ${
                isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#ab0035] to-[#8b0025] hover:opacity-95 shadow-[#ab0035]/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane size={13} />
                  <span>Send Leave Request</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* 📄 LEAVE HISTORY (7 COLS) */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
              Application History
            </h2>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {['ALL', 'Pending', 'Approved', 'Declined'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition ${
                    statusFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filteredLeaves.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredLeaves.map((leave) => {
                const start = new Date(leave.startDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });
                const end = new Date(leave.endDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });
                const sameDay = leave.startDate === leave.endDate;
                const dateStr = sameDay ? start : `${start} — ${end}`;

                return (
                  <div
                    key={leave._id}
                    className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-4 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FaCalendarAlt size={11} className="text-[#ab0035]" />
                        <span className="text-slate-900 text-xs font-black whitespace-nowrap">
                          {dateStr}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium text-xs leading-relaxed">
                        {leave.reason}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center sm:justify-end">
                      <StatusBadge status={leave.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-14 flex flex-col items-center justify-center text-slate-400">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-2.5 text-slate-400">
                <FaCalendarDay size={22} />
              </div>
              <p className="font-extrabold text-xs text-slate-700">No leave requests found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {statusFilter !== 'ALL' ? `No requests with status "${statusFilter}".` : 'Your leave submissions will be listed here.'}
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default TeacherLeave;
