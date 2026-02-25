import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaCalendarDay, FaPaperPlane, FaClock, FaCheckCircle, FaTimesCircle, FaPlus } from 'react-icons/fa';

const TeacherLeave = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            setLeaves(res.data.leaves);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching leaves:", error);
            toast.error("Could not load leave history.");
            setLoading(false);
        }
    };

    const handleApplyLeave = async (e) => {
        e.preventDefault();

        if (!startDate || !endDate || !reason) {
            return toast.warning("Please fill out all fields.");
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
                reason
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Leave request submitted successfully!");
            setStartDate('');
            setEndDate('');
            setReason('');

            // Instantly refresh list
            setLeaves(prev => [res.data.leave, ...prev]);
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
                return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1 w-max"><FaCheckCircle /> Approved</span>;
            case 'Declined':
                return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1 w-max"><FaTimesCircle /> Declined</span>;
            default:
                return <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200 flex items-center gap-1 w-max"><FaClock /> Pending</span>;
        }
    };

    if (loading) return <div className="text-center mt-10 text-slate-400 font-bold">Loading Module...</div>;

    return (
        <div className="font-sans flex flex-col gap-6 px-1 lg:max-w-4xl mx-auto w-full">

            {/* 🔴 OVERLAPPING HEADER CARD */}
            <div className="bg-[#8b0025] rounded-[24px] shadow-xl p-6 border border-white/10 relative overflow-hidden z-10 w-full mt-2">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <FaCalendarDay size={100} />
                </div>
                <div className="flex justify-between items-center relative z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[16px] bg-white/10 flex items-center justify-center text-yellow-400 border border-white/20 backdrop-blur-md">
                            <FaCalendarDay size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-wide drop-shadow-sm">Leave Operations</h2>
                            <p className="text-white/80 text-sm font-medium tracking-wide mt-0.5">Apply and track absences</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🟡 APPLICATION FORM */}
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 mt-[-1.5rem] z-20">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <FaPlus className="text-[#ab0035]" /> Apply for leave
                </h3>

                <form onSubmit={handleApplyLeave} className="flex flex-col gap-5">
                    <div className="flex flex-col sm:flex-row gap-5">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]} // Block historical leaves
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-[#ab0035] transition-all"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate || new Date().toISOString().split('T')[0]}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-[#ab0035] transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Reason for Leave</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Please provide a brief explanation..."
                            rows="3"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-[#ab0035] transition-all resize-none"
                        ></textarea>
                    </div>

                    <div className="flex justify-end mt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[#ab0035] hover:bg-[#8b0025] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-sm py-3.5 px-8 rounded-xl shadow-[0_4px_15px_rgba(171,0,53,0.2)] transition-all flex items-center gap-2"
                        >
                            {isSubmitting ? 'Sending Request...' : <><FaPaperPlane /> Submit Request</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* 📄 HISTORY LIST */}
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-6">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-4">
                    Leave History
                </h3>

                {leaves.length > 0 ? (
                    <div className="flex flex-col gap-3">
                        {leaves.map((leave) => {
                            const start = new Date(leave.startDate).toLocaleDateString();
                            const end = new Date(leave.endDate).toLocaleDateString();
                            const sameDay = start === end;
                            const dateStr = sameDay ? start : `${start} - ${end}`;

                            return (
                                <div key={leave._id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col">
                                        <span className="text-slate-500 text-xs font-bold whitespace-nowrap mb-1">{dateStr}</span>
                                        <span className="text-slate-800 font-semibold text-sm leading-tight max-w-lg">{leave.reason}</span>
                                    </div>
                                    <div className="shrink-0 flex items-center sm:justify-end">
                                        <StatusBadge status={leave.status} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <FaCalendarDay size={24} className="text-slate-300" />
                        </div>
                        <p className="font-bold text-slate-500">No leave requests found.</p>
                        <p className="text-xs text-center">Your leave history will appear here.</p>
                    </div>
                )}
            </div>

            <div className="h-10"></div>
        </div>
    );
};

export default TeacherLeave;
