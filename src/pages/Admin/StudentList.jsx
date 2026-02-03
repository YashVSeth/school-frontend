import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaSearch, FaFilter, FaUserGraduate, FaTrash, FaEdit, FaPhoneAlt, FaEye 
} from 'react-icons/fa';
import EditStudentModal from './EditStudentModal';
import StudentProfileModal from './StudentProfileModal';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);

  // Profile/View Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [studentToView, setStudentToView] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState(''); // ✅ State is named 'searchTerm'
  const [selectedClass, setSelectedClass] = useState('');

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [studentRes, classRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/students`, { headers }),
        axios.get(`${BASE_URL}/api/classes`, { headers })
      ]);

      setStudents(Array.isArray(studentRes.data) ? studentRes.data : []);
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
    } catch (error) {
      console.error("Error fetching data");
      toast.error("Failed to load student list.");
    } finally {
      setLoading(false);
    }
  };

  // Handler to open Edit modal
  const handleEditClick = (student) => {
    setStudentToEdit(student);
    setIsEditModalOpen(true);
  };

  // Handler to open View/Profile modal
  const handleViewClick = (student) => {
    setStudentToView(student);
    setIsProfileOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this student?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE_URL}/api/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(students.filter(s => s._id !== id));
      toast.success("Student deleted successfully");
    } catch (error) {
      toast.error("Failed to delete student");
    }
  };

  // === FILTER LOGIC ===
  const filteredStudents = students.filter((student) => {
    
    // 1. SAFELY Get values
    const name = (student.firstName || "") + " " + (student.lastName || "");
    const studentClass = student.class || ""; 
    
    // 2. Perform the search safely using 'searchTerm'
    // 
    const searchLower = searchTerm.toLowerCase(); // ✅ FIXED: Uses 'searchTerm'

    const matchesName = name.toLowerCase().includes(searchLower);
    
    // Check class match
    const classString = typeof studentClass === 'object' 
        ? (studentClass.grade || "") 
        : String(studentClass);

    const matchesSearch = matchesName || classString.toLowerCase().includes(searchLower);

    // 3. Apply Dropdown Class Filter
    const matchesClassFilter = selectedClass ? 
        (typeof student.class === 'object' ? student.class._id === selectedClass : student.class === selectedClass) 
        : true;

    return matchesSearch && matchesClassFilter;
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fade-in pb-10">
        <ToastContainer position="top-right" autoClose={2000} />
        
        {/* === HEADER & FILTERS === */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Student Directory</h1>
            <p className="text-sm text-slate-500">Manage and view all enrolled students</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative group w-full md:w-64">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search by Name or ID..." 
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm transition-all"
                value={searchTerm} // Matches state
                onChange={(e) => setSearchTerm(e.target.value)} // Matches state
              />
            </div>

            {/* Class Filter */}
            <div className="relative w-full md:w-48">
              <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select 
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm appearance-none cursor-pointer"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls._id} value={cls._id}>{cls.grade} - {cls.section}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* === CONTENT AREA === */}
        {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-400 animate-pulse">
            Loading student records...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
              <FaUserGraduate size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No Students Found</h3>
            <p className="text-slate-400 text-sm">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <>
            {/* 📱 MOBILE VIEW: CARDS */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredStudents.map((student) => (
                <div key={student._id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-md shadow-blue-500/20 overflow-hidden">
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      student.firstName?.charAt(0) || 'S'
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-800 truncate">{student.firstName} {student.lastName}</h3>
                        <p className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-1">
                          ID: {student.studentId || 'N/A'}
                        </p>
                      </div>
                      
                      {/* === Mobile Action Buttons === */}
                      <div className="flex gap-2">
                        <button 
                            onClick={() => handleViewClick(student)} 
                            className="text-emerald-500 p-2 hover:bg-emerald-50 rounded-lg transition"
                        >
                            <FaEye size={14} />
                        </button>
                        <button 
                            onClick={() => handleEditClick(student)} 
                            className="text-blue-400 p-2 hover:bg-blue-50 rounded-lg transition"
                        >
                            <FaEdit size={14} />
                        </button>
                        <button onClick={() => handleDelete(student._id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition">
                            <FaTrash size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-slate-500">
                      <p className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">Class:</span> 
                        {student.class ? (typeof student.class === 'object' ? `${student.class.grade}-${student.class.section}` : "Loaded") : "Unassigned"}
                      </p>
                      <p className="flex items-center gap-2">
                        <FaPhoneAlt className="text-xs opacity-50" /> {student.phone || "No Phone"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 💻 DESKTOP VIEW: TABLE */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">Student</th>
                    <th className="p-4">ID / Roll No</th>
                    <th className="p-4">Class</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Father's Name</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm overflow-hidden">
                             {student.photo ? (
                                <img src={student.photo} alt="" className="w-full h-full object-cover" />
                             ) : (
                                student.firstName?.charAt(0) || 'S'
                             )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 text-sm">{student.firstName} {student.lastName}</p>
                            <p className="text-xs text-slate-400">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-600 py-1 px-3 rounded-full text-xs font-semibold">
                          {student.studentId || "N/A"}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600 font-medium">
                        {student.class && typeof student.class === 'object' 
                            ? `${student.class.grade} - ${student.class.section}` 
                            : <span className="text-red-400 text-xs">Unassigned</span>}
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                          <div className="flex flex-col">
                            <span>{student.phone}</span>
                          </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {student.fatherName || "-"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          
                          <button 
                            onClick={() => handleViewClick(student)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" 
                            title="View Profile"
                          >
                            <FaEye />
                          </button>

                          <button 
                            onClick={() => handleEditClick(student)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          
                          <button 
                            onClick={() => handleDelete(student._id)} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" 
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* === EDIT MODAL === */}
        {/*  */}
        <EditStudentModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          student={studentToEdit}
          classes={classes} // ✅ FIXED: Passed classes prop so dropdown works
          refreshData={fetchData} 
        />

        {/* === VIEW/PROFILE MODAL === */}
        <StudentProfileModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
          student={studentToView}
        />

      </div>
    </Layout>
  );
};

export default StudentList;