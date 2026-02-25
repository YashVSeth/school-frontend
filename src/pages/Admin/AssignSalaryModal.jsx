import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaMoneyCheckAlt, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';

const AssignSalaryModal = ({ isOpen, onClose }) => {
    const [teachers, setTeachers] = useState([]);
    const [salaryData, setSalaryData] = useState({}); // { teacherId: baseSalary }
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const BASE_URL = import.meta.env.VITE_API_URL;

    // Fetch teachers and pre-fill their existing base salaries
    useEffect(() => {
        if (isOpen) {
            fetchTeachers();
        }
    }, [isOpen]);

    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/teachers`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const teacherMap = {};
            res.data.forEach(t => {
                teacherMap[t._id] = t.baseSalary || 0;
            });

            setTeachers(res.data);
            setSalaryData(teacherMap);
        } catch (error) {
            console.error("Error loading teachers", error);
            toast.error("Failed to load staff list");
        } finally {
            setLoading(false);
        }
    };

    const handleSalaryChange = (teacherId, amount) => {
        setSalaryData(prev => ({
            ...prev,
            [teacherId]: Number(amount)
        }));
    };

    const saveSalaries = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const payload = Object.entries(salaryData).map(([teacherId, baseSalary]) => ({
                teacherId,
                baseSalary
            }));

            // Bulk Update Endpoint
            await axios.put(`${BASE_URL}/api/teachers/bulk-salary`, { salaries: payload }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Base Salaries Updated Successfully!");
            onClose();
        } catch (error) {
            toast.error("Failed to save salaries");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="bg-slate-800 text-white p-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-amber-500/20 text-amber-400 p-3 rounded-xl border border-amber-500/30">
                            <FaMoneyCheckAlt size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-wide">Assign Base Salaries</h2>
                            <p className="text-slate-400 text-sm font-medium">Set fixed monthly payroll for all staff members</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-400 transition bg-white/5 hover:bg-white/10 p-2 rounded-full">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1 bg-slate-50 p-6">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Loading Staff...</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100/80 text-xs font-black text-slate-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th className="p-5 border-b border-slate-200">Teacher Profile</th>
                                        <th className="p-5 border-b border-slate-200">Specialization</th>
                                        <th className="p-5 border-b border-slate-200 w-64 text-right">Fixed Monthly Salary (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {teachers.map(teacher => (
                                        <tr key={teacher._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-5">
                                                <div className="font-bold text-slate-800 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-sm border border-amber-200">
                                                        {teacher.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-[15px]">{teacher.fullName}</div>
                                                        <div className="text-xs text-slate-400 font-medium">{teacher.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5 text-sm font-bold text-slate-500">
                                                {teacher.specialization || '-'}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center justify-end">
                                                    <span className="text-slate-400 font-bold mr-2 text-lg">₹</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={salaryData[teacher._id] || ''}
                                                        onChange={(e) => handleSalaryChange(teacher._id, e.target.value)}
                                                        className="w-32 bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-4 py-2.5 font-black text-amber-700 text-right outline-none shadow-sm transition-all group-hover:shadow-md"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center gap-3">
                    <p className="text-xs font-bold text-slate-400">Updates will affect all future payroll records.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveSalaries}
                            disabled={saving}
                            className="px-8 py-3 rounded-xl font-black bg-amber-600 text-white hover:bg-amber-700 transition flex items-center gap-2 shadow-lg shadow-amber-500/30 outline-none"
                        >
                            {saving ? 'Saving...' : <><FaSave /> Save All Salaries</>}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AssignSalaryModal;
