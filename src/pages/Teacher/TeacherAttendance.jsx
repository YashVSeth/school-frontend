import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSave, FaCheckDouble, FaUserClock, FaTimesCircle, FaCheckCircle } from 'react-icons/fa';

const TeacherAttendance = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { studentId: "Present" }
  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/attendance/my-students`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStudents(res.data.students);
      setClassInfo(res.data); // Class ID aur Name store kar liya

      setLoading(false);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Could not load students. Is a class assigned?");
      setLoading(false);
    }
  };

  // ✅ NEW: Fetch historical attendance when date or class changes
  useEffect(() => {
    if (classInfo?.classId && students.length > 0) {
      fetchDailyAttendance();
    }
  }, [selectedDate, classInfo, students]);

  const fetchDailyAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/attendance/daily?classId=${classInfo.classId}&date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const records = res.data;
      const newAttendance = {};

      if (records && records.length > 0) {
        // Restore saved attendance state
        records.forEach(r => newAttendance[r.student] = r.status);
      } else {
        // Reset to blank slate if no records exist for this date
        students.forEach(s => newAttendance[s._id] = null);
      }

      setAttendance(newAttendance);
    } catch (error) {
      console.error("Error fetching daily records:", error);
    }
  };

  // 🟢 Mark All Present Button Logic
  const handleMarkAllPresent = () => {
    const newAttendance = {};
    students.forEach(s => newAttendance[s._id] = 'Present');
    setAttendance(newAttendance);
    toast.info("All students marked Present!");
  };

  // Individual Status Change
  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // 💾 Submit to Backend
  const handleSubmit = async () => {
    // Check agar kisi ka status choot gaya ho
    const missing = students.filter(s => !attendance[s._id]);
    if (missing.length > 0) {
      return toast.warning(`${missing.length} students are unmarked!`);
    }

    try {
      const token = localStorage.getItem('token');

      // Data Format jo backend maang raha hai
      const payload = {
        classId: classInfo.classId,
        date: selectedDate,
        records: students.map(s => ({
          student: s._id,
          status: attendance[s._id]
        }))
      };

      await axios.post(`${BASE_URL}/api/attendance`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Attendance Saved Successfully! 🎉");
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error("Failed to save attendance.");
    }
  };

  // Counts for Summary
  const presentCount = Object.values(attendance).filter(s => s === 'Present').length;
  const absentCount = Object.values(attendance).filter(s => s === 'Absent').length;

  if (loading) return <div className="p-8 text-center">Loading Class Data...</div>;

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 animate-fade-in">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mark Attendance</h1>
          <p className="text-slate-500">
            Class: <span className="font-bold text-orange-600">{classInfo?.className}</span> |
            Total Students: {students.length}
          </p>
        </div>

        <div className="flex gap-3 items-center bg-white p-2 rounded-lg shadow-sm">
          <label className="text-sm font-bold text-slate-500">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded p-1 text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
        <button
          onClick={handleMarkAllPresent}
          className="flex items-center gap-2 text-orange-600 font-bold hover:bg-orange-50 px-4 py-2 rounded-lg transition"
        >
          <FaCheckDouble /> Mark All Present
        </button>

        <div className="text-sm font-bold text-slate-600">
          Summary: <span className="text-green-600">{presentCount} P</span> / <span className="text-red-500">{absentCount} A</span>
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="grid grid-cols-1 gap-3 mb-20">
        {students.map((student) => (
          <div
            key={student._id}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${attendance[student._id] === 'Absent' ? 'bg-red-50 border-red-100' :
              attendance[student._id] === 'Present' ? 'bg-green-50 border-green-100' : 'bg-white border-slate-200'
              }`}
          >
            {/* Student Name */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                {student.firstName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{student.firstName} {student.lastName}</h3>
                <p className="text-xs text-slate-500">Roll No: {student.rollNum || "N/A"}</p>
              </div>
            </div>

            {/* Attendance Buttons */}
            <div className="flex gap-2 w-full sm:w-auto justify-center">
              <button
                onClick={() => handleStatusChange(student._id, 'Present')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold flex items-center gap-2 border transition ${attendance[student._id] === 'Present'
                  ? 'bg-green-600 text-white border-green-600 shadow-md transform scale-105'
                  : 'bg-white text-slate-400 hover:text-green-600 hover:border-green-200'
                  }`}
              >
                <FaCheckCircle /> Present
              </button>

              <button
                onClick={() => handleStatusChange(student._id, 'Absent')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold flex items-center gap-2 border transition ${attendance[student._id] === 'Absent'
                  ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-105'
                  : 'bg-white text-slate-400 hover:text-red-600 hover:border-red-200'
                  }`}
              >
                <FaTimesCircle /> Absent
              </button>

              <button
                onClick={() => handleStatusChange(student._id, 'Late')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold flex items-center gap-2 border transition ${attendance[student._id] === 'Late'
                  ? 'bg-yellow-500 text-white border-yellow-500 shadow-md transform scale-105'
                  : 'bg-white text-slate-400 hover:text-yellow-500 hover:border-yellow-200'
                  }`}
              >
                <FaUserClock /> Late
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FLOATING SUBMIT BUTTON */}
      <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-auto">
        <button
          onClick={handleSubmit}
          className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white text-lg font-bold py-3 px-8 rounded-full shadow-2xl flex items-center justify-center gap-3 transition-transform active:scale-95"
        >
          <FaSave /> Save Attendance
        </button>
      </div>

    </div>
  );
};

export default TeacherAttendance;