import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import AddTeacherModal from './AddTeacherModal';
import TeacherAttendanceModal from './TeacherAttendanceModal'; // Individual History
import DailyAttendanceModal from './DailyAttendanceModal'; // ✅ IMPORT NEW COMPONENT
import axios from 'axios';
import { 
  FaPlus, FaSearch, FaEnvelope, FaPhone, FaBook, FaTrash, FaEdit, FaCalendarCheck, FaClipboardList 
} from 'react-icons/fa';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null); 
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [teacherForAttendance, setTeacherForAttendance] = useState(null);
  
  // ✅ NEW: Daily Attendance Modal State
  const [isDailyAttendanceOpen, setIsDailyAttendanceOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const BASE_URL = import.meta.env.VITE_API_URL;

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(res.data);
    } catch (error) {
      console.error("Error fetching teachers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const getImageUrl = (path) => {
    if (!path) return null;
    return `${BASE_URL}/${path.replace(/\\/g, "/")}`;
  };

  // Handlers
  const handleEdit = (teacher) => {
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
  };
  const handleAdd = () => {
    setSelectedTeacher(null);
    setIsModalOpen(true);
  };
  const handleAttendanceClick = (teacher) => {
    setTeacherForAttendance(teacher);
    setIsAttendanceOpen(true);
  };
  const handleDelete = async (id) => {
    if (window.confirm("Delete teacher?")) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${BASE_URL}/api/teachers/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchTeachers();
      } catch (error) {
        alert("Failed to delete");
      }
    }
  };

  const filteredTeachers = teachers.filter((teacher) => 
    (teacher.fullName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        
        {/* === HEADER SECTION === */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Teachers Management</h1>
            <p className="text-slate-500">View and manage all faculty members.</p>
          </div>
          
          <div className="flex gap-3">
            {/* ✅ NEW: DAILY ATTENDANCE BUTTON */}
            <button 
                onClick={() => setIsDailyAttendanceOpen(true)}
                className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-blue-600 px-5 py-2.5 rounded-xl transition-all font-semibold shadow-sm"
            >
                <FaClipboardList /> Daily Attendance
            </button>

            {/* ADD NEW TEACHER BUTTON */}
            <button 
                onClick={handleAdd}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 font-semibold"
            >
                <FaPlus /> Add New Teacher
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
          <FaSearch className="text-slate-400 ml-2" />
          <input 
            type="text"
            placeholder="Search by name, email or subject..."
            className="w-full bg-transparent border-none focus:ring-0 text-slate-600 outline-none"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* TEACHERS LIST */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
             <div className="p-10 text-center text-slate-500">Loading...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-semibold text-slate-600">Teacher Name</th>
                  <th className="p-4 font-semibold text-slate-600">Subject</th>
                  <th className="p-4 font-semibold text-slate-600">Contact</th>
                  <th className="p-4 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher._id} className="hover:bg-slate-50/50 transition-colors">
                    {/* ... Existing Row Content ... */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold overflow-hidden border border-slate-200">
                          {teacher.photoUrl ? (
                            <img src={getImageUrl(teacher.photoUrl)} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <span>{(teacher.fullName || "?").charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-slate-700 block">{teacher.fullName}</span>
                          <span className="text-xs text-slate-400">{teacher.highestQualification}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><span className="flex items-center gap-2 text-slate-600 text-sm"><FaBook className="text-blue-400" /> {teacher.specialization}</span></td>
                    <td className="p-4 text-xs text-slate-500 space-y-1">
                        <p className="flex items-center gap-2"><FaEnvelope /> {teacher.email}</p>
                        {teacher.phone && <p className="flex items-center gap-2"><FaPhone /> {teacher.phone}</p>}
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-3">
                        {/* History Button (Existing) */}
                        <button onClick={() => handleAttendanceClick(teacher)} className="text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 transition-colors">
                          <FaCalendarCheck /> History
                        </button>
                        <button onClick={() => handleEdit(teacher)} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors">
                          <FaEdit /> Edit
                        </button>
                        <button onClick={() => handleDelete(teacher._id)} className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors">
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODALS */}
      <AddTeacherModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onRefresh={fetchTeachers} teacherToEdit={selectedTeacher} />
      <TeacherAttendanceModal isOpen={isAttendanceOpen} onClose={() => setIsAttendanceOpen(false)} teacher={teacherForAttendance} />
      
      {/* ✅ RENDER NEW MODAL */}
      <DailyAttendanceModal isOpen={isDailyAttendanceOpen} onClose={() => setIsDailyAttendanceOpen(false)} />

    </Layout>
  );
};

export default Teachers;