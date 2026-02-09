import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Icons add kiye hain design behtar karne ke liye
import { FaMicrophone, FaWhatsapp, FaSignOutAlt, FaCalendarCheck } from 'react-icons/fa';

const TeacherDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [remarks, setRemarks] = useState({}); // ✅ New state for Remarks
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(response.data);
    } catch (error) { console.error("Error fetching classes"); }
  };

  useEffect(() => {
    if (selectedClass) fetchStudentsByClass();
  }, [selectedClass]);

  const fetchStudentsByClass = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const classStudents = response.data.filter(
        (student) => (student.classId?._id || student.classId) === selectedClass
      );
      
      setStudents(classStudents);
      const initialAttendance = {};
      const initialRemarks = {};
      classStudents.forEach(s => {
        initialAttendance[s._id] = "Present";
        initialRemarks[s._id] = "";
      });
      setAttendance(initialAttendance);
      setRemarks(initialRemarks);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error("Error fetching students");
    }
  };

  // --- 🎙️ VOICE TO TEXT LOGIC ---
  const startVoiceRemark = (studentId) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return toast.error("Browser doesn't support Voice-to-Text");

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Hindi support
    
    recognition.onstart = () => setIsListening(studentId);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setRemarks(prev => ({ ...prev, [studentId]: transcript }));
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  // --- 📱 WHATSAPP ALERT LOGIC ---
  const sendWhatsApp = (student) => {
    const message = `Priya Abhibhavak, aapka baccha ${student.name} aaj school se Absent hai. - Radhey Shyam Sansthaan`;
    const phone = student.phone || "91"; // Default country code
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const attendanceData = Object.keys(attendance).map(studentId => ({
        studentId,
        status: attendance[studentId],
        remark: remarks[studentId] // ✅ Remarks also sent to backend
      }));

      await axios.post(`${BASE_URL}/api/attendance`, {
        date: new Date(),
        classId: selectedClass,
        records: attendanceData
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success("Attendance & Remarks Saved!");
    } catch (error) {
      toast.error("Failed to mark attendance");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <ToastContainer />
      
      {/* Sidebar (Cleaned up) */}
      <div className="w-64 bg-slate-900 text-white flex flex-col p-6 shadow-xl">
         <h2 className="text-xl font-black mb-10 text-center text-blue-400">RADHEY SHYAM</h2>
         <div className="flex-1 space-y-2">
            <button className="w-full text-left py-3 px-4 bg-blue-600 rounded-xl flex items-center gap-3">
              <FaCalendarCheck /> Attendance
            </button>
         </div>
         <button onClick={handleLogout} className="text-red-400 hover:bg-red-500/10 p-3 rounded-xl flex items-center gap-3 transition">
            <FaSignOutAlt /> Logout
         </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">Daily Attendance</h1>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm font-semibold text-slate-500">
                {new Date().toLocaleDateString('hi-IN')}
            </div>
        </header>

        {/* Class Selector */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-slate-200">
          <label className="block text-sm font-bold text-slate-600 mb-3">Select Class to Load Students</label>
          <select 
            className="w-full md:w-1/3 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">-- Click to choose class --</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>{cls.grade} - {cls.section}</option>
            ))}
          </select>
        </div>

        {/* Student List Table */}
        {selectedClass && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-4 text-slate-500 font-bold uppercase text-xs">Student Name</th>
                  <th className="p-4 text-slate-500 font-bold uppercase text-xs text-center">Status</th>
                  <th className="p-4 text-slate-500 font-bold uppercase text-xs">Remarks (Voice)</th>
                  <th className="p-4 text-slate-500 font-bold uppercase text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{student.name}</div>
                      <div className="text-xs text-slate-400">Roll: {student.rollNum}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1 bg-slate-100 p-1 rounded-lg w-fit mx-auto">
                        {["Present", "Absent"].map((status) => (
                          <button
                            key={status}
                            onClick={() => handleAttendanceChange(student._id, status)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${
                              attendance[student._id] === status 
                                ? (status === "Present" ? "bg-green-600 text-white shadow-md" : "bg-red-600 text-white shadow-md") 
                                : "text-slate-500 hover:bg-white"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 bg-slate-50 border rounded-lg px-3 py-1">
                        <input 
                          type="text"
                          value={remarks[student._id] || ""}
                          placeholder="Note..."
                          onChange={(e) => setRemarks({...remarks, [student._id]: e.target.value})}
                          className="bg-transparent text-sm outline-none w-full"
                        />
                        <button 
                          onClick={() => startVoiceRemark(student._id)}
                          className={`${isListening === student._id ? "text-red-500 animate-pulse" : "text-slate-400"} hover:text-blue-500`}
                        >
                          <FaMicrophone size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {attendance[student._id] === "Absent" && (
                        <button 
                          onClick={() => sendWhatsApp(student)}
                          className="text-green-500 hover:bg-green-50 p-2 rounded-full transition"
                          title="Send Absent Alert"
                        >
                          <FaWhatsapp size={20} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <button 
                onClick={handleSubmit}
                className="bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                🚀 Save All Records
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;