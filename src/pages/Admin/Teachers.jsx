import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import AddTeacherModal from './AddTeacherModal'; // We will create this next
import axios from 'axios';
import { FaPlus, FaSearch, FaEnvelope, FaPhone, FaBook } from 'react-icons/fa';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/teachers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(res.data);
    } catch (error) {
      console.error("Error fetching teachers", error);
    }
  };

  // Teachers.jsx - Safe Filter Logic
const filteredTeachers = teachers.filter((teacher) => 
  // safely check if fullName exists before lowercasing it
  (teacher.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
  (teacher.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
  (teacher.specialization || "").toLowerCase().includes(searchTerm.toLowerCase())
);

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Teachers Management</h1>
            <p className="text-slate-500">View and manage all faculty members.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            <FaPlus /> Add New Teacher
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
          <FaSearch className="text-slate-400 ml-2" />
          <input 
            type="text"
            placeholder="Search by name or subject..."
            className="w-full bg-transparent border-none focus:ring-0 text-slate-600 outline-none"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Teachers Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {(teacher.fullName || "?").charAt(0)}
                      </div>
                      <span className="font-medium text-slate-700">{teacher.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-2 text-slate-600 text-sm">
                      <FaBook className="text-blue-400" /> {teacher.subject}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-slate-500 space-y-1">
                      <p className="flex items-center gap-2"><FaEnvelope /> {teacher.email}</p>
                      <p className="flex items-center gap-2"><FaPhone /> {teacher.phone}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <button className="text-blue-600 hover:text-blue-800 font-semibold">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredTeachers.length === 0 && (
            <div className="p-10 text-center text-slate-400">No teachers found.</div>
          )}
        </div>
      </div>

      {/* Add Teacher Modal */}
      <AddTeacherModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchTeachers} 
      />
    </Layout>
  );
};

export default Teachers;