import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaCalendarDay, FaCheckCircle, FaTimesCircle, FaClock, FaCalendarAlt } from 'react-icons/fa';
import AssignSubstituteModal from './AssignSubstituteModal';

const LeaveManagement = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Pending'); // 'Pending', 'Approved', 'Declined', 'All'

    // Sub Modal State
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [selectedLeaveForSub, setSelectedLeaveForSub] = useState(null);

    const BASE_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchLeaves();
    }, [filter]);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const query = filter !== 'All' ? `?status=${filter}` : '';
            const res = await axios.get(`${BASE_URL}/api/leaves${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeaves(res.data.leaves);
        } catch (error) {
            console.error("Error fetching leaves:", error);
            toast.error("Could not load leave requests");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            // Optimistic UI update
            setLeaves(prev => prev.map(l => l._id === id ? { ...l, status: newStatus } : l));

            await axios.put(`${BASE_URL}/api/leaves/${id}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`Leave request ${newStatus.toLowerCase()}!`);

            // If we are filtering, remove it from the list if it no longer matches
            if (filter !== 'All') {
                setLeaves(prev => prev.filter(l => l.status === filter));
            }

            // Trigger Substitution Modal Flow if Approved
            if (newStatus === 'Approved') {
                const approvedLeave = leaves.find(l => l._id === id);
                if (approvedLeave && approvedLeave.teacher) {
                    setSelectedLeaveForSub(approvedLeave);
                    setIsSubModalOpen(true);
                }
            }
        } catch (error) {
            console.error("Update status error:", error);
            toast.error("Failed to update status");
            // Revert optimism if error
            fetchLeaves();
        }
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'Approved':
                return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1 w-max"><FaCheckCircle className="text-[10px]" /> Approved</span>;
            case 'Declined':
                return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1 w-max"><FaTimesCircle className="text-[10px]" /> Declined</span>;
            default:
                return <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200 flex items-center gap-1 w-max"><FaClock className="text-[10px]" /> Pending</span>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                        <FaCalendarDay size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Leave Approvals</h1>
                        <p className="text-slate-500 text-sm font-medium">Review and manage teacher absences</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['Pending', 'Approved', 'Declined', 'All'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12 text-slate-400 font-bold">Loading requests...</div>
            ) : leaves.length > 0 ? (
                <div className="grid gap-4">
                    {leaves.map(leave => {
                        const start = new Date(leave.startDate).toLocaleDateString();
                        const end = new Date(leave.endDate).toLocaleDateString();
                        const sameDay = start === end;
                        const dateStr = sameDay ? start : `${start} to ${end}`;
                        const name = leave.teacher?.fullName || `${leave.teacher?.firstName || ''} ${leave.teacher?.lastName || ''}`.trim() || 'Unknown Teacher';

                        return (
                            <div key={leave._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between gap-6 hover:shadow-md transition-shadow">

                                <div className="flex gap-4 items-start flex-1">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">
                                        {name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-800">{name}</span>
                                            {renderStatusBadge(leave.status)}
                                        </div>
                                        <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold mt-1 bg-indigo-50 w-max px-2 py-1 rounded-md">
                                            <FaCalendarAlt /> {dateStr}
                                        </div>
                                        <p className="text-sm text-slate-600 font-medium leading-relaxed mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            "{leave.reason}"
                                        </p>
                                    </div>
                                </div>

                                {leave.status === 'Pending' && (
                                    <div className="flex items-center gap-2 lg:flex-col lg:w-32 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                                        <button
                                            onClick={() => handleUpdateStatus(leave._id, 'Approved')}
                                            className="flex-1 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                                        >
                                            <FaCheckCircle /> Approve
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(leave._id, 'Declined')}
                                            className="flex-1 py-2 px-4 bg-white border-2 border-slate-200 hover:border-red-500 hover:bg-red-50 text-slate-600 hover:text-red-600 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <FaTimesCircle /> Decline
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl py-20 flex flex-col items-center justify-center text-slate-400 border border-slate-100 border-dashed">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <FaCalendarDay size={32} className="text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-500 text-lg">No {filter.toLowerCase()} leaves found.</p>
                    <p className="text-sm mt-1">When teachers request time off, it will appear here.</p>
                </div>
            )}

            {/* Substitution Assignment Modal Overlay */}
            {isSubModalOpen && selectedLeaveForSub && (
                <AssignSubstituteModal
                    isOpen={isSubModalOpen}
                    onClose={() => {
                        setIsSubModalOpen(false);
                        setSelectedLeaveForSub(null);
                    }}
                    absentTeacher={selectedLeaveForSub.teacher}
                    leaveStartDate={selectedLeaveForSub.startDate}
                    leaveEndDate={selectedLeaveForSub.endDate}
                    onSubstituteAssigned={() => {
                        fetchLeaves(); // Maybe refresh or just let it be
                    }}
                />
            )}
        </div>
    );
};

export default LeaveManagement;
