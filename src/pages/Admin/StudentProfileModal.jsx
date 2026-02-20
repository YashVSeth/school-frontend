import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaTimes, FaUserGraduate, FaCalendarCheck, FaChartBar, FaPhoneAlt, FaEnvelope 
} from 'react-icons/fa';

const StudentProfileModal = ({ isOpen, onClose, student }) => {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'marks'
  const [loading, setLoading] = useState(false);
  
  // Default states to prevent crashes
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, total: 0, percentage: 0 });
  const [marksData, setMarksData] = useState([]);

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (isOpen && student) {
      fetchStudentDetails();
    }
  }, [isOpen, student]);

  const fetchStudentDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Attendance Stats (Mocked or Real Endpoint)
      try {
        const attRes = await axios.get(`${BASE_URL}/api/attendance/stats/${student._id}`, { headers });
        setAttendanceStats(attRes.data || { present: 0, absent: 0, total: 0, percentage: 0 });
      } catch (err) {
        console.warn("Attendance stats endpoint not ready, using defaults.");
      }

      // 2. Fetch Marks/Results
      try {
        const marksRes = await axios.get(`${BASE_URL}/api/marks/student/${student._id}`, { headers });
        setMarksData(Array.isArray(marksRes.data) ? marksRes.data : []);
      } catch (err) {
        console.warn("Marks endpoint not ready, using empty array.");
      }

    } catch (error) {
      console.error("Error fetching details", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  // Helper to format class name safely
  const className = student.class 
    ? (typeof student.class === 'object' ? `${student.class.grade}-${student.class.section}` : "N/A")
    : "Unassigned";

  // Helper for Full Name
  const fullName = `${student.firstName || ''} ${student.lastName || ''}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* === 1. HEADER PROFILE SECTION === */}
        <div className="bg-slate-800 text-white p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
            <FaTimes size={24} />
          </button>
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full border-4 border-slate-600 bg-white flex items-center justify-center text-slate-800 font-bold text-3xl overflow-hidden shadow-lg shrink-0">
              {student.photo ? (
                <img src={student.photo} className="w-full h-full object-cover" alt="Student" />
              ) : (
                fullName.charAt(0) || 'S'
              )}
            </div>
            
            {/* Text Info */}
            <div className="text-center md:text-left space-y-2">
              <h2 className="text-3xl font-bold">{fullName}</h2>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-3 text-slate-300 text-sm">
                <span className="bg-slate-700 px-3 py-1 rounded-full font-mono border border-slate-600">
                    ID: {student.studentId || 'N/A'}
                </span>
                <span className="flex items-center gap-2 px-2">
                    <FaUserGraduate className="text-blue-400"/> Class: {className}
                </span>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-400 pt-1">
                 <span className="flex items-center gap-1"><FaPhoneAlt /> {student.phone || "No Phone"}</span>
                 <span className="flex items-center gap-1"><FaEnvelope /> {student.email || "No Email"}</span>
              </div>

              {/* ✅ NEW: Height and Weight Display Added Here */}
              {(student.height || student.weight) && (
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-300 pt-1 font-bold">
                   {student.height && <span className="bg-slate-700/50 px-3 py-1 rounded-full">Height: {student.height}</span>}
                   {student.weight && <span className="bg-slate-700/50 px-3 py-1 rounded-full">Weight: {student.weight}</span>}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* === 2. TABS NAVIGATION === */}
        <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors border-b-2
              ${activeTab === 'attendance' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
          >
            <FaCalendarCheck /> Attendance Report
          </button>
          <button 
            onClick={() => setActiveTab('marks')}
            className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors border-b-2
              ${activeTab === 'marks' ? 'border-purple-600 text-purple-600 bg-purple-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
          >
            <FaChartBar /> Academic Results
          </button>
        </div>

        {/* === 3. CONTENT AREA === */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-10 text-slate-400 animate-pulse gap-3">
                <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                Loading detailed records...
             </div>
          ) : (
            <>
              {/* --- ATTENDANCE TAB --- */}
              {activeTab === 'attendance' && (
                <div className="space-y-6 animate-fade-in-up">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl text-center border border-slate-100 shadow-sm flex flex-col items-center">
                      <div className="bg-emerald-100 text-emerald-600 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                        <FaCalendarCheck />
                      </div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Present Days</p>
                      <p className="text-3xl font-bold text-emerald-600 mt-1">{attendanceStats.present}</p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl text-center border border-slate-100 shadow-sm flex flex-col items-center">
                       <div className="bg-red-100 text-red-600 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                        <FaTimes />
                      </div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Absent Days</p>
                      <p className="text-3xl font-bold text-red-500 mt-1">{attendanceStats.absent}</p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl text-center border border-slate-100 shadow-sm flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${attendanceStats.percentage < 75 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        %
                      </div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Attendance %</p>
                      <p className={`text-3xl font-bold mt-1 ${attendanceStats.percentage < 75 ? 'text-orange-500' : 'text-blue-600'}`}>
                        {attendanceStats.percentage}%
                      </p>
                    </div>
                  </div>

                  {/* Warning Logic */}
                  {attendanceStats.percentage < 75 && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 rounded-r-lg flex items-center gap-3">
                      <span className="text-xl">⚠️</span>
                      <div>
                          <strong>Low Attendance Warning</strong> 
                          <p className="text-xs opacity-80 mt-1">This student is below the 75% mandatory threshold.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- MARKS TAB --- */}
              {activeTab === 'marks' && (
                <div className="space-y-4 animate-fade-in-up">
                  {marksData.length === 0 ? (
                    <div className="text-center text-slate-400 py-10 bg-white rounded-xl border border-dashed border-slate-300">
                        <FaChartBar className="mx-auto mb-2 text-2xl opacity-20" />
                        No exam records found for this student.
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold tracking-wider">
                          <tr>
                            <th className="p-4 border-b border-slate-100">Exam Name</th>
                            <th className="p-4 border-b border-slate-100">Subject</th>
                            <th className="p-4 border-b border-slate-100">Marks</th>
                            <th className="p-4 border-b border-slate-100">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {marksData.map((exam, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-medium text-slate-700">{exam.examName}</td>
                              <td className="p-4 text-slate-500 text-sm">{exam.subject}</td>
                              <td className="p-4 font-bold text-slate-800">
                                {exam.marksObtained} <span className="text-slate-400 text-xs font-normal">/ {exam.totalMarks}</span>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold border 
                                  ${exam.grade === 'A' ? 'bg-green-50 text-green-700 border-green-200' : 
                                    exam.grade === 'F' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                  {exam.grade}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfileModal;