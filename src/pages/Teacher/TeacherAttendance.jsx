import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaCheckCircle, FaTimesCircle, FaClock, FaCheckDouble,
  FaCalendarAlt, FaSearch, FaSave, FaUserGraduate,
  FaChalkboardTeacher, FaExclamationTriangle, FaFilter
} from 'react-icons/fa';

const TeacherAttendance = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { studentId: "Present" | "Absent" | "Late" }
  const [classInfo, setClassInfo] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PRESENT, ABSENT, UNMARKED

  const BASE_URL = import.meta.env.VITE_API_URL;

  // 1. Fetch Assigned Class(es) & Initial Students
  useEffect(() => {
    fetchClassAndStudents(selectedClassId);
  }, [selectedClassId]);

  const fetchClassAndStudents = async (classId = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParam = classId ? `?classId=${classId}` : '';
      const res = await axios.get(`${BASE_URL}/api/attendance/my-students${queryParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const fetchedStudents = Array.isArray(res.data.students) ? res.data.students : [];
      fetchedStudents.sort((a, b) => {
        if (a.rollNo && b.rollNo) return a.rollNo - b.rollNo;
        if (a.rollNo) return -1;
        if (b.rollNo) return 1;
        return (a.firstName || '').localeCompare(b.firstName || '');
      });

      setStudents(fetchedStudents);
      setClassInfo({
        classId: res.data.classId,
        className: res.data.className
      });

      if (!selectedClassId && res.data.classId) {
        setSelectedClassId(res.data.classId);
      }

      if (res.data.assignedClasses && Array.isArray(res.data.assignedClasses)) {
        setAssignedClasses(res.data.assignedClasses);
      }
    } catch (error) {
      console.error("Error fetching assigned class:", error);
      toast.error(error.response?.data?.message || "No class assigned to you yet.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Historical Records for Selected Date
  useEffect(() => {
    if (classInfo?.classId) {
      fetchDailyRecords(classInfo.classId, selectedDate);
    }
  }, [selectedDate, classInfo?.classId]);

  const fetchDailyRecords = async (classId, date) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/attendance/daily?classId=${classId}&date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const records = res.data;
      const initialMap = {};

      if (records && records.length > 0) {
        records.forEach(r => {
          const sId = r.student?._id || r.student;
          if (sId) initialMap[sId] = r.status;
        });
      } else {
        // Leave unmarked by default so teacher intentionally marks
        students.forEach(s => { initialMap[s._id] = null; });
      }

      setAttendance(initialMap);
    } catch (error) {
      console.error("Error fetching daily records:", error);
    }
  };

  // 🟢 Quick Status Handlers
  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status
    }));
  };

  const handleMarkAllPresent = () => {
    const updated = {};
    students.forEach(s => {
      updated[s._id] = 'Present';
    });
    setAttendance(updated);
    toast.success("Marked all students as Present!");
  };

  const handleReset = () => {
    const resetMap = {};
    students.forEach(s => { resetMap[s._id] = null; });
    setAttendance(resetMap);
    toast.info("Cleared attendance selections.");
  };

  // 💾 Submit Attendance
  const handleSubmit = async () => {
    if (!classInfo?.classId) {
      return toast.error("No class assigned to save attendance.");
    }

    const unmarked = students.filter(s => !attendance[s._id]);
    if (unmarked.length > 0) {
      const proceed = window.confirm(
        `${unmarked.length} student(s) are unmarked. Do you want to submit anyway? (Unmarked will default to Absent)`
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const records = students.map(s => ({
        student: s._id,
        status: attendance[s._id] || 'Absent'
      }));

      await axios.post(`${BASE_URL}/api/attendance`, {
        date: selectedDate,
        classId: classInfo.classId,
        records
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Attendance saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error.response?.data?.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  // 📊 Live Counts
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let unmarked = 0;

    students.forEach(s => {
      const st = attendance[s._id];
      if (st === 'Present') present++;
      else if (st === 'Absent') absent++;
      else if (st === 'Late') late++;
      else unmarked++;
    });

    return { total: students.length, present, absent, late, unmarked };
  }, [students, attendance]);

  // 🔍 Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      const roll = String(s.rollNo || '');
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || roll.includes(searchQuery);

      if (!matchesSearch) return false;

      const currentStatus = attendance[s._id];
      if (statusFilter === 'PRESENT') return currentStatus === 'Present';
      if (statusFilter === 'ABSENT') return currentStatus === 'Absent';
      if (statusFilter === 'UNMARKED') return !currentStatus;
      return true;
    });
  }, [students, searchQuery, statusFilter, attendance]);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="font-sans flex flex-col gap-4 max-w-5xl mx-auto w-full pb-20">
      
      {/* 🔴 TOP HERO CARD: Assigned Class & Date */}
      <div className="bg-gradient-to-br from-[#750426] via-[#8f0631] to-[#a81140] rounded-3xl p-5 text-white shadow-xl border border-white/10 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-yellow-300 border border-white/20 shrink-0">
              <FaChalkboardTeacher size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-yellow-300">
                Assigned Class Monitor
              </span>
              <h1 className="text-xl font-black leading-tight text-white truncate">
                {classInfo?.className || 'Assigned Class'}
              </h1>
            </div>
          </div>

          <span className="bg-white/15 px-3 py-1 rounded-full text-xs font-bold text-white border border-white/20 shrink-0">
            {counts.total} Students
          </span>
        </div>

        {/* Multi-Class Switcher Chips (if assigned to more than 1 class) */}
        {assignedClasses.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 mb-3">
            <span className="text-[11px] font-bold text-white/80 shrink-0">Switch:</span>
            {assignedClasses.map(cls => (
              <button
                key={cls._id}
                onClick={() => setSelectedClassId(cls._id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                  selectedClassId === cls._id
                    ? 'bg-yellow-400 text-slate-900 shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Class {cls.grade} {cls.section ? `(${cls.section})` : ''}
              </button>
            ))}
          </div>
        )}

        {/* Date Selector Row */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/15">
          <div className="flex items-center gap-2">
            <FaCalendarAlt size={14} className="text-yellow-300" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white/15 text-white font-bold text-xs rounded-xl px-2.5 py-1.5 outline-none border border-white/20 cursor-pointer focus:ring-2 focus:ring-yellow-300"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {!isToday && (
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="bg-yellow-400 text-slate-900 font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl active:scale-95 transition"
              >
                Today
              </button>
            )}
            <button
              onClick={handleMarkAllPresent}
              className="bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-95 transition border border-white/20"
            >
              <FaCheckDouble size={12} className="text-emerald-300" />
              All Present
            </button>
          </div>
        </div>
      </div>

      {/* 📊 LIVE METRICS BAR */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setStatusFilter(statusFilter === 'ALL' ? 'ALL' : 'ALL')}
          className={`p-2.5 rounded-2xl text-center border transition ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold block uppercase tracking-wider opacity-70">Total</span>
          <span className="text-base font-black">{counts.total}</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
          className={`p-2.5 rounded-2xl text-center border transition ${
            statusFilter === 'PRESENT'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-emerald-50 text-emerald-800 border-emerald-100'
          }`}
        >
          <span className="text-[10px] font-bold block uppercase tracking-wider text-emerald-600">Present</span>
          <span className="text-base font-black text-emerald-700">{counts.present}</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
          className={`p-2.5 rounded-2xl text-center border transition ${
            statusFilter === 'ABSENT'
              ? 'bg-red-600 text-white border-red-600 shadow-sm'
              : 'bg-red-50 text-red-800 border-red-100'
          }`}
        >
          <span className="text-[10px] font-bold block uppercase tracking-wider text-red-600">Absent</span>
          <span className="text-base font-black text-red-700">{counts.absent}</span>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'UNMARKED' ? 'ALL' : 'UNMARKED')}
          className={`p-2.5 rounded-2xl text-center border transition ${
            statusFilter === 'UNMARKED'
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
              : 'bg-amber-50 text-amber-800 border-amber-100'
          }`}
        >
          <span className="text-[10px] font-bold block uppercase tracking-wider text-amber-600">Pending</span>
          <span className="text-base font-black text-amber-700">{counts.unmarked}</span>
        </button>
      </div>

      {/* 🔍 SEARCH & FILTER BAR */}
      <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-slate-100 flex items-center gap-2">
        <FaSearch className="text-slate-400 ml-2" size={13} />
        <input
          type="text"
          placeholder="Search by student name or roll no..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 placeholder:text-slate-400 outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 font-bold px-2 py-0.5 rounded-lg hover:bg-slate-100"
          >
            Clear
          </button>
        )}
      </div>

      {/* 📋 STUDENT LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-[#8f0631] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading Assigned Students...</span>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-xs flex flex-col items-center justify-center">
          <FaUserGraduate size={32} className="text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">No students found</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery ? 'Try clearing your search query.' : 'Ensure students are registered in this class.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredStudents.map((student) => {
            const currentStatus = attendance[student._id];
            const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';

            return (
              <div
                key={student._id}
                className={`bg-white rounded-2xl p-3 sm:p-3.5 shadow-xs border transition-all flex items-center justify-between gap-3 ${
                  currentStatus === 'Present'
                    ? 'border-emerald-300 bg-emerald-50/30 shadow-xs'
                    : currentStatus === 'Absent'
                    ? 'border-red-300 bg-red-50/30 shadow-xs'
                    : currentStatus === 'Late'
                    ? 'border-amber-300 bg-amber-50/30 shadow-xs'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Left: Roll No + Avatar + Name */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Roll No Badge */}
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs sm:text-sm text-slate-800 shrink-0">
                    {student.rollNo !== undefined && student.rollNo !== null ? `#${student.rollNo}` : '—'}
                  </div>

                  {/* Student Info */}
                  <div className="flex flex-col min-w-0">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                      {fullName}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate font-medium">
                      {student.fatherName ? `Father: ${student.fatherName}` : 'Student Record'}
                    </span>
                  </div>
                </div>

                {/* Right: Thumb-Friendly Status Toggles */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Present Button */}
                  <button
                    onClick={() => handleStatusChange(student._id, 'Present')}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center active:scale-90 ${
                      currentStatus === 'Present'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                    title="Mark Present"
                  >
                    P
                  </button>

                  {/* Absent Button */}
                  <button
                    onClick={() => handleStatusChange(student._id, 'Absent')}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center active:scale-90 ${
                      currentStatus === 'Absent'
                        ? 'bg-red-600 text-white shadow-md shadow-red-500/30 ring-2 ring-red-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
                    }`}
                    title="Mark Absent"
                  >
                    A
                  </button>

                  {/* Late Button */}
                  <button
                    onClick={() => handleStatusChange(student._id, 'Late')}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center active:scale-90 ${
                      currentStatus === 'Late'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                    }`}
                    title="Mark Late"
                  >
                    L
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 💾 FIXED / FLOATING SUBMIT BUTTON (MOBILE-FIRST) */}
      {students.length > 0 && (
        <div className="sticky bottom-20 z-30 pt-2">
          <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200/90 flex items-center gap-2">
            <div className="px-3 py-1 flex flex-col">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Progress</span>
              <span className="text-xs font-black text-slate-800">
                {counts.total - counts.unmarked}/{counts.total} Marked
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`flex-1 py-3.5 px-4 rounded-xl font-black text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 ${
                saving
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#8f0631] to-[#750426] hover:opacity-95 shadow-[#8f0631]/25'
              }`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Records...</span>
                </>
              ) : (
                <>
                  <FaSave size={16} />
                  <span>Submit Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;