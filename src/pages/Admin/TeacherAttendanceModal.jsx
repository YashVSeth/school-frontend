import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import { toast } from 'react-toastify';

const TeacherAttendanceModal = ({ isOpen, onClose, teacher }) => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (isOpen && teacher) {
      fetchAttendance();
    }
  }, [isOpen, teacher, month]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // GET /api/attendance/teacher/:teacherId?month=2023-10
      const res = await axios.get(`${BASE_URL}/api/attendance/teacher/${teacher._id}`, {
        params: { month },
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendance(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to load teacher attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (date, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/attendance/teacher`, {
        teacherId: teacher._id,
        date: date,
        status: status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Marked as ${status}`);
      fetchAttendance(); // Refresh list
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (!isOpen || !teacher) return null;

  // Helper to generate days in selected month
  const getDaysInMonth = () => {
    const [y, m] = month.split('-');
    const days = new Date(y, m, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(y, m - 1, i + 1);
      return d.toISOString().split('T')[0];
    });
  };

  const daysList = getDaysInMonth();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FaClock className="text-emerald-400" /> Attendance Record
            </h2>
            <p className="text-slate-300 text-sm">{teacher.name} ({teacher.email})</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <FaTimes size={24} />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="font-bold text-slate-600">Select Month:</span>
          <input 
            type="month" 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
             <div className="text-center py-10 text-slate-400">Loading records...</div>
          ) : (
            <div className="space-y-2">
              {daysList.map((dateString) => {
                // Find existing record for this day
                const record = attendance.find(a => a.date?.startsWith(dateString));
                const status = record ? record.status : 'Not Marked';
                const isWeekend = new Date(dateString).getDay() === 0; // 0 = Sunday

                if (isWeekend) return null; // Optional: Hide Sundays

                return (
                  <div key={dateString} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-lg hover:bg-slate-50 transition">
                    
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 p-2 rounded text-slate-500 font-mono text-xs">
                        {dateString}
                      </div>
                      <span className={`text-sm font-bold 
                        ${status === 'Present' ? 'text-emerald-600' : 
                          status === 'Absent' ? 'text-red-600' : 'text-slate-400'}`}>
                        {status}
                      </span>
                    </div>

                    {/* Admin Override Controls */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStatusUpdate(dateString, 'Present')}
                        className={`p-1.5 rounded-full transition ${status === 'Present' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300 hover:bg-emerald-100 hover:text-emerald-500'}`}
                        title="Mark Present"
                      >
                        <FaCheckCircle />
                      </button>
                      <button 
                         onClick={() => handleStatusUpdate(dateString, 'Absent')}
                         className={`p-1.5 rounded-full transition ${status === 'Absent' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-300 hover:bg-red-100 hover:text-red-500'}`}
                         title="Mark Absent"
                      >
                        <FaTimesCircle />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TeacherAttendanceModal;