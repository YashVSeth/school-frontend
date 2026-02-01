import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import AddTeacherModal from './AddTeacherModal';
import axios from 'axios';
import { FaPlus, FaSearch, FaEnvelope, FaPhone, FaBook, FaTrash, FaEdit } from 'react-icons/fa';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null); // Used for Edit Mode
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

  // --- ACTIONS ---

  // 1. Handle Edit Click
  const handleEdit = (teacher) => {
    setSelectedTeacher(teacher); // Pass the teacher data
    setIsModalOpen(true); // Open the modal
  };

  // 2. Handle Add Click
  const handleAdd = () => {
    setSelectedTeacher(null); // Clear previous data for "Add" mode
    setIsModalOpen(true);
  };

  // 3. Handle Delete Click
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this teacher? This cannot be undone.")) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${BASE_URL}/api/teachers/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Teacher deleted successfully");
        fetchTeachers(); // Refresh list
      } catch (error) {
        console.error("Error deleting:", error);
        alert("Failed to delete teacher");
      }
    }
  };

  const filteredTeachers = teachers.filter((teacher) => 
    (teacher.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.specialization || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Teachers Management</h1>
            <p className="text-slate-500">View and manage all faculty members.</p>
          </div>
          {/* UPDATED: Uses handleAdd */}
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            <FaPlus /> Add New Teacher
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
          <FaSearch className="text-slate-400 ml-2" />
          <input 
            type="text"
            placeholder="Search by name, email or subject..."
            className="w-full bg-transparent border-none focus:ring-0 text-slate-600 outline-none"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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
                    <td className="p-4">
                      <span className="flex items-center gap-2 text-slate-600 text-sm">
                        <FaBook className="text-blue-400" /> {teacher.specialization || "N/A"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-slate-500 space-y-1">
                        <p className="flex items-center gap-2"><FaEnvelope /> {teacher.email}</p>
                        {teacher.phone && <p className="flex items-center gap-2"><FaPhone /> {teacher.phone}</p>}
                      </div>
                    </td>
                    
                    {/* UPDATED ACTIONS COLUMN */}
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleEdit(teacher)} 
                          className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(teacher._id)} 
                          className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors"
                        >
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

      {/* MODAL (Now accepts teacherToEdit prop) */}
      <AddTeacherModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchTeachers} 
        teacherToEdit={selectedTeacher} // Pass the selected teacher
      />
    </Layout>
  );
};

export default Teachers;