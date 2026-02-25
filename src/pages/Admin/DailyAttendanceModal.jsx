import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaCalendarAlt, FaCheck, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';

const DailyAttendanceModal = ({ isOpen, onClose }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [teachers, setTeachers] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // { teacherId: 'Present' | 'Absent' }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL;

  // Fetch teachers and their attendance for the selected date
  useEffect(() => {
    if (isOpen) {
      fetchDailyData();
    }
  }, [isOpen, date]);

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // 1. Get All Teachers
      const teachersRes = await axios.get(`${BASE_URL}/api/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 2. Get Attendance for this Date (Backend logic required)
      // Endpoint: GET /api/attendance/teachers/daily?date=YYYY-MM-DD
      let attendanceMap = {};
      try {
        const attRes = await axios.get(`${BASE_URL}/api/attendance/teachers/daily`, {
          params: { date },
          headers: { Authorization: `Bearer ${token}` }
        });
        // Convert array to map: { teacherId: status }
        if (Array.isArray(attRes.data)) {
            attRes.data.forEach(rec => {
                attendanceMap[rec.teacherId] = rec.status;
            });
        }
      } catch (err) {
        // If 404 or no data, just assume empty
      }

      setTeachers(teachersRes.data);
      setAttendanceData(attendanceMap);

    } catch (error) {
      console.error("Error loading daily data", error);
      toast.error("Failed to load list");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (teacherId, status) => {
    setAttendanceData(prev => ({ ...prev, [teacherId]: status }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = Object.entries(attendanceData).map(([teacherId, status]) => ({
        teacherId,
        date,
        status
      }));

      // Bulk Update Endpoint
      await axios.post(`${BASE_URL}/api/attendance/teachers/bulk`, { records: payload }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Attendance Saved Successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-slate-700 p-2 rounded-lg">
                <FaCalendarAlt className="text-amber-400" size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold">Staff Attendance Register</h2>
                <p className="text-slate-400 text-xs">Mark attendance for all teachers</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <FaTimes size={24} />
          </button>
        </div>

        {/* Date Selector */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <label className="text-sm font-bold text-slate-600">Select Date:</label>
            <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 font-medium focus:ring-2 focus:ring-red-500 outline-none"
            />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-0">
            {loading ? (
                <div className="p-10 text-center text-slate-400 animate-pulse">Loading Staff List...</div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-xs font-bold text-slate-500 uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-4">Teacher Name</th>
                            <th className="p-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {teachers.map(teacher => {
                            const status = attendanceData[teacher._id] || ''; // Default empty
                            return (
                                <tr key={teacher._id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-700">{teacher.fullName}</div>
                                        <div className="text-xs text-slate-400">{teacher.studentId || teacher.email}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Present Button */}
                                            <button 
                                                onClick={() => handleStatusChange(teacher._id, 'Present')}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border
                                                ${status === 'Present' 
                                                    ? 'bg-amber-500 text-white border-amber-500 shadow-amber-200 shadow-md' 
                                                    : 'bg-white text-slate-400 border-slate-200 hover:border-amber-300 hover:text-amber-500'}`}
                                            >
                                                Present
                                            </button>

                                            {/* Absent Button */}
                                            <button 
                                                onClick={() => handleStatusChange(teacher._id, 'Absent')}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border
                                                ${status === 'Absent' 
                                                    ? 'bg-red-500 text-white border-red-500 shadow-red-200 shadow-md' 
                                                    : 'bg-white text-slate-400 border-slate-200 hover:border-red-300 hover:text-red-500'}`}
                                            >
                                                Absent
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-semibold text-slate-500 hover:bg-slate-100 transition"
            >
                Cancel
            </button>
            <button 
                onClick={saveAttendance}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2 shadow-lg shadow-red-500/20"
            >
                {saving ? 'Saving...' : <><FaSave /> Save Attendance</>}
            </button>
        </div>

      </div>
    </div>
  );
};

export default DailyAttendanceModal;