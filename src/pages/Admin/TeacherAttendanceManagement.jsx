import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import {
  FaClipboardList, FaCheck, FaTimes, FaCalendarAlt, FaSearch,
  FaUserCheck, FaUserTimes, FaSave, FaHistory, FaCheckCircle,
  FaCalendarCheck, FaChartPie, FaFilter
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const TeacherAttendanceManagement = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [teachers, setTeachers] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // { [teacherId]: 'Present' | 'Absent' | 'Half Day' | 'On Leave' }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // History Modal
  const [selectedTeacherForHistory, setSelectedTeacherForHistory] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL;

  // 1. Fetch Teachers and Attendance for selected date
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Fetch teachers
      const teachersRes = await axios.get(`${BASE_URL}/api/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(teachersRes.data || []);

      // Fetch existing daily attendance for the selected date
      let map = {};
      try {
        const attRes = await axios.get(`${BASE_URL}/api/attendance/teachers/daily`, {
          params: { date: selectedDate },
          headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(attRes.data)) {
          attRes.data.forEach(rec => {
            if (rec.teacherId) {
              map[rec.teacherId] = rec.status;
            }
          });
        }
      } catch (e) {
        // No records yet for this date
      }

      setAttendanceData(map);
    } catch (err) {
      console.error("Error loading attendance:", err);
      toast.error("Failed to load staff list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Status Change handler
  const handleStatusChange = (teacherId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [teacherId]: status
    }));
  };

  // Mark All Present
  const handleMarkAll = (status) => {
    const updated = {};
    teachers.forEach(t => {
      updated[t._id] = status;
    });
    setAttendanceData(updated);
    toast.info(`Marked all teachers as ${status}`);
  };

  // Save Bulk Attendance
  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const records = Object.entries(attendanceData).map(([teacherId, status]) => ({
        teacherId,
        date: selectedDate,
        status
      }));

      if (records.length === 0) {
        toast.warn("No attendance status marked yet.");
        setSaving(false);
        return;
      }

      await axios.post(`${BASE_URL}/api/attendance/teachers/bulk`, { records }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Attendance for ${selectedDate} saved successfully!`);
    } catch (err) {
      console.error("Save attendance error:", err);
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // View Individual Teacher Attendance History
  const handleOpenHistory = async (teacher) => {
    setSelectedTeacherForHistory(teacher);
    setIsHistoryModalOpen(true);
    fetchTeacherHistory(teacher._id, historyMonth);
  };

  const fetchTeacherHistory = async (teacherId, month) => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/attendance/teacher/${teacherId}`, {
        params: { month },
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistoryRecords(res.data || []);
    } catch (err) {
      toast.error("Failed to fetch history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Metrics
  const totalCount = teachers.length;
  const presentCount = Object.values(attendanceData).filter(s => s === 'Present').length;
  const absentCount = Object.values(attendanceData).filter(s => s === 'Absent').length;
  const leaveCount = Object.values(attendanceData).filter(s => s === 'On Leave' || s === 'Half Day').length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Filtered Teachers
  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = (t.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.specialization || '').toLowerCase().includes(searchTerm.toLowerCase());

    const status = attendanceData[t._id];
    let matchesStatus = true;
    if (filterStatus === 'Present') matchesStatus = status === 'Present';
    else if (filterStatus === 'Absent') matchesStatus = status === 'Absent';
    else if (filterStatus === 'Unmarked') matchesStatus = !status;

    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in pb-16">

        {/* === HEADER SECTION === */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                <FaClipboardList size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Faculty Daily Attendance</h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Record daily attendance, manage faculty leaves, and track history</p>
              </div>
            </div>
          </div>

          {/* Date Picker & Save Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-xs">
              <FaCalendarAlt className="text-rose-500" size={14} />
              <label className="text-xs font-bold text-slate-500 uppercase">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-rose-500/20 transition-all active:scale-95"
            >
              <FaSave /> {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>

        {/* === STATS OVERVIEW CARDS === */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Teachers</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{totalCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Active faculty on roster</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-black uppercase text-emerald-600 tracking-wider">Present Today</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{presentCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{attendanceRate}% attendance rate</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-black uppercase text-rose-600 tracking-wider">Absent Today</span>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{absentCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Faculty not checked in</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-black uppercase text-amber-600 tracking-wider">Leave / Half-Day</span>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{leaveCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Partial / permitted leave</p>
          </div>
        </div>

        {/* === CONTROLS & BATCH ACTIONS === */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-80 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
            <FaSearch className="text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-sm text-slate-700 outline-none w-full font-medium"
            />
          </div>

          {/* Quick Mark All Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => handleMarkAll('Present')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
            >
              <FaCheck size={11} /> Mark All Present
            </button>
            <button
              onClick={() => handleMarkAll('Absent')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
            >
              <FaTimes size={11} /> Mark All Absent
            </button>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {['All', 'Present', 'Absent', 'Unmarked'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    filterStatus === tab
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* === TEACHERS ATTENDANCE LIST === */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Faculty Attendance...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-4">Faculty Member</th>
                    <th className="p-4">Department / Subject</th>
                    <th className="p-4">Status for {selectedDate}</th>
                    <th className="p-4 text-right">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTeachers.map((teacher) => {
                    const currentStatus = attendanceData[teacher._id];

                    return (
                      <tr key={teacher._id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Profile */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 font-black flex items-center justify-center text-sm shrink-0 border border-rose-200">
                              {(teacher.fullName || '?').charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 block">{teacher.fullName}</span>
                              <span className="text-xs text-slate-400">{teacher.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Specialization */}
                        <td className="p-4 text-slate-600 font-medium">
                          {teacher.specialization || teacher.highestQualification || 'Faculty'}
                        </td>

                        {/* Status Toggle Buttons */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(teacher._id, 'Present')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                                currentStatus === 'Present'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-500/20'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              <FaCheck size={10} /> Present
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(teacher._id, 'Absent')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                                currentStatus === 'Absent'
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs shadow-rose-500/20'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                              }`}
                            >
                              <FaTimes size={10} /> Absent
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(teacher._id, 'Half Day')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                currentStatus === 'Half Day'
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                              }`}
                            >
                              Half Day
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(teacher._id, 'On Leave')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                currentStatus === 'On Leave'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700'
                              }`}
                            >
                              On Leave
                            </button>
                          </div>
                        </td>

                        {/* History Link */}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenHistory(teacher)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition inline-flex items-center gap-1 text-xs font-bold"
                            title="View Monthly History"
                          >
                            <FaHistory size={13} /> History
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredTeachers.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-medium">
                  No teachers found matching your search.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* === INDIVIDUAL ATTENDANCE HISTORY MODAL === */}
      {isHistoryModalOpen && selectedTeacherForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="bg-slate-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
                  <FaCalendarCheck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedTeacherForHistory.fullName}</h3>
                  <p className="text-xs text-slate-400">Monthly Attendance History</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={historyMonth}
                  onChange={(e) => {
                    setHistoryMonth(e.target.value);
                    fetchTeacherHistory(selectedTeacherForHistory._id, e.target.value);
                  }}
                  className="bg-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg outline-none font-bold"
                />
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-2.5 bg-slate-50 flex-1">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400">Loading history records...</div>
              ) : historyRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No attendance records found for this month.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {historyRecords.map((rec) => {
                    const isPresent = rec.status === 'Present';
                    return (
                      <div
                        key={rec._id}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          isPresent
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/70 border-rose-200 text-rose-900'
                        }`}
                      >
                        <span className="font-bold text-xs">{rec.date}</span>
                        <span
                          className={`text-[11px] font-black uppercase px-2 py-0.5 rounded ${
                            isPresent ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default TeacherAttendanceManagement;

