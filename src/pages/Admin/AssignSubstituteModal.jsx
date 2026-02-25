import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaUserPlus, FaTimes, FaExchangeAlt, FaUserGraduate } from 'react-icons/fa';

const AssignSubstituteModal = ({ isOpen, onClose, absentTeacher, leaveStartDate, leaveEndDate, onSubstituteAssigned }) => {
    const [absentSchedule, setAbsentSchedule] = useState([]);
    const [availableTeachers, setAvailableTeachers] = useState([]);
    const [selectedSubstitutes, setSelectedSubstitutes] = useState({}); // { scheduleId: substituteTeacherId }
    const [loading, setLoading] = useState(false);

    const BASE_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        if (isOpen && absentTeacher) {
            fetchAbsentTeacherSchedule();
            fetchAllTeachers();
        }
    }, [isOpen, absentTeacher]);

    const fetchAbsentTeacherSchedule = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Fetch the schedule specifically for the absent teacher
            const res = await axios.get(`${BASE_URL}/api/schedule?teacherId=${absentTeacher._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAbsentSchedule(res.data);
        } catch (error) {
            console.error("Error fetching schedule:", error);
            toast.error("Failed to load absent teacher's schedule");
        } finally {
            setLoading(false);
        }
    };

    const fetchAllTeachers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/teachers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter out the teacher who is actually going on leave
            const validSubs = res.data.filter(t => t._id !== absentTeacher._id);
            setAvailableTeachers(validSubs);
        } catch (error) {
            console.error("Error fetching available teachers");
        }
    };

    const handleSubstituteSelect = (scheduleId, subId) => {
        setSelectedSubstitutes(prev => ({
            ...prev,
            [scheduleId]: subId
        }));
    };

    const handleSubmitSubstitutions = async () => {
        // Find which schedules actually have a substitute selected
        const assignmentsToMake = Object.entries(selectedSubstitutes).filter(([_, subId]) => subId !== '');

        if (assignmentsToMake.length === 0) {
            return toast.warn("Please select at least one substitute teacher.");
        }

        try {
            const token = localStorage.getItem('token');
            let successCount = 0;

            // Iterate through selections and hit the existing schedule update API
            // The API internally handles clash detection during updates
            for (const [scheduleId, subId] of assignmentsToMake) {
                // The backend `updateScheduleEntry` only requires the `substituteTeacher` field
                await axios.put(`${BASE_URL}/api/schedule/${scheduleId}`, {
                    substituteTeacher: subId
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                successCount++;
            }

            toast.success(`Successfully assigned ${successCount} substitute(s)!`);
            onSubstituteAssigned();
            onClose();
        } catch (error) {
            console.error("Substitution Assignment Error:", error);
            toast.error(error.response?.data?.message || "Failed to assign substitutes. A clash might have occurred.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <FaExchangeAlt />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Assign Substitutes</h2>
                            <p className="text-white/80 text-sm">Covering for {absentTeacher?.fullName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full">
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                    <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-3 text-amber-800">
                        <div className="mt-0.5"><FaUserPlus /></div>
                        <div className="text-sm">
                            <span className="font-bold">Leave Duration: </span>
                            {new Date(leaveStartDate).toLocaleDateString()} to {new Date(leaveEndDate).toLocaleDateString()}. <br />
                            Select substitutes for the classes below. The system will automatically check for timetable clashes.
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 font-bold text-slate-400">Loading teacher timetable...</div>
                    ) : absentSchedule.length > 0 ? (
                        <div className="space-y-3">
                            {absentSchedule.map((block) => (
                                <div key={block._id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-800 flex items-center gap-2">
                                            <FaUserGraduate className="text-indigo-500" />
                                            Class {block.classId?.grade} ({block.classId?.section})
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1 flex gap-3">
                                            <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">{block.timeSlot}</span>
                                            <span className="font-medium bg-indigo-50 px-2 py-0.5 rounded text-indigo-600">{block.subject}</span>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-64 shrink-0">
                                        <select
                                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                            value={selectedSubstitutes[block._id] || ''}
                                            onChange={(e) => handleSubstituteSelect(block._id, e.target.value)}
                                        >
                                            <option value="">-- Choose Substitute --</option>
                                            {availableTeachers.map(t => (
                                                <option key={t._id} value={t._id}>
                                                    {t.fullName || (`${t.firstName} ${t.lastName}`)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500 font-bold">
                            {absentTeacher?.fullName} has no classes scheduled. No substitution required.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmitSubstitutions}
                        disabled={absentSchedule.length === 0}
                        className="px-6 py-2 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <FaCheckCircle /> Confirm Assignments
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AssignSubstituteModal;
