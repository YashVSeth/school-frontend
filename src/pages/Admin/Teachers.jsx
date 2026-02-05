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

        {/* === TEACHERS DISPLAY SECTION === */}
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading faculty...</div>
        ) : (
          <>
            {/* 🖥️ DESKTOP VIEW: TABLE (Hidden on mobile) */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 font-semibold text-slate-600">Teacher Name</th>
                    <th className="p-4 font-semibold text-slate-600">Subject</th>
                    <th className="p-4 font-semibold text-slate-600">Contact</th>
                    <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold overflow-hidden border border-slate-200 shrink-0">
                            {teacher.photoUrl ? (
                              <img src={getImageUrl(teacher.photoUrl)} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <span>{(teacher.fullName || "?").charAt(0)}</span>
                            )}
                          </div>
                          <div className="truncate max-w-[150px]">
                            <span className="font-medium text-slate-700 block truncate">{teacher.fullName}</span>
                            <span className="text-xs text-slate-400">{teacher.highestQualification}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        <span className="flex items-center gap-2"><FaBook className="text-blue-400" /> {teacher.specialization}</span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        <p className="flex items-center gap-2"><FaEnvelope /> {teacher.email}</p>
                        {teacher.phone && <p className="flex items-center gap-2"><FaPhone /> {teacher.phone}</p>}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => handleAttendanceClick(teacher)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="History"><FaCalendarCheck /></button>
                          <button onClick={() => handleEdit(teacher)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><FaEdit /></button>
                          <button onClick={() => handleDelete(teacher._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 📱 MOBILE VIEW: CARDS (Hidden on desktop) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredTeachers.map((teacher) => (
                <div key={teacher._id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold overflow-hidden shrink-0 border border-slate-200">
                      {teacher.photoUrl ? (
                        <img src={getImageUrl(teacher.photoUrl)} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{(teacher.fullName || "?").charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{teacher.fullName}</h3>
                      <p className="text-xs text-blue-600 font-medium">{teacher.specialization}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-2"><FaEnvelope className="text-slate-400" /> {teacher.email}</div>
                    {teacher.phone && <div className="flex items-center gap-2"><FaPhone className="text-slate-400" /> {teacher.phone}</div>}
                    <div className="flex items-center gap-2 font-medium text-slate-400 italic">{teacher.highestQualification}</div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button onClick={() => handleAttendanceClick(teacher)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold transition-colors">
                      <FaCalendarCheck /> History
                    </button>
                    <button onClick={() => handleEdit(teacher)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold transition-colors">
                      <FaEdit /> Edit
                    </button>
                    <button onClick={() => handleDelete(teacher._id)} className="p-2 bg-red-50 text-red-500 rounded-lg transition-colors">
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
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