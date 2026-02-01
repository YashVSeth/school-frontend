import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaTrash } from 'react-icons/fa';
import Layout from '../../components/Layout';
import ClassDetailsModal from './ClassDetailsModal';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  
  const [classForm, setClassForm] = useState({ grade: '', section: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '' });
  
  const [selectedClass, setSelectedClass] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL;
  const gradeOptions = ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
  const sectionOptions = ["-", "A", "B", "C"];

  useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/classes`, { headers: { Authorization: `Bearer ${token}` } });
      setClasses(Array.isArray(res.data) ? res.data : []);
    } catch (error) { console.error(error); }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/classes`, classForm, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Class Added!");
      setClassForm({ grade: '', section: '' });
      fetchClasses();
    } catch (error) { toast.error("Failed to add class"); }
  };

  const handleDeleteClass = async (id, e) => {
    e.stopPropagation();
    if(!window.confirm("Are you sure you want to delete this class?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE_URL}/api/classes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Class Deleted!");
      fetchClasses();
    } catch (error) { toast.error("Failed to delete class"); }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/subjects`, subjectForm, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Subject Created!");
      setSubjectForm({ name: '' }); 
    } catch (error) { toast.error("Failed to add subject"); }
  };

  const handleClassClick = (cls) => {
    setSelectedClass(cls);
    setIsModalOpen(true);
  };

  return (
    <Layout>
      <ToastContainer />
      
      {/* Changed: Padding reduced on mobile (p-4), normal on desktop (p-6) */}
      <div className="flex flex-col lg:flex-row gap-6 animate-fade-in p-2 sm:p-0">
        
        {/* === LEFT SIDE: FORMS === */}
        {/* Changed: Full width on mobile, 1/3 on large screens */}
        <div className="w-full lg:w-1/3 space-y-6">
          
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Add New Class</h2>
            <form onSubmit={handleAddClass} className="space-y-4">
              <select name="grade" value={classForm.grade} onChange={(e)=>setClassForm({...classForm, grade: e.target.value})} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" required>
                <option value="">Select Grade</option>
                {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select name="section" value={classForm.section} onChange={(e)=>setClassForm({...classForm, section: e.target.value})} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" required>
                <option value="">Select Section</option>
                {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition active:scale-95">Add Class</button>
            </form>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Create Subject</h2>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <input 
                type="text" 
                placeholder="Subject Name" 
                value={subjectForm.name} 
                onChange={(e)=>setSubjectForm({ name: e.target.value })} 
                className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                required 
              />
              <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 transition active:scale-95">Create Subject</button>
            </form>
          </div>
        </div>

        {/* === RIGHT SIDE: CLASS LIST === */}
        <div className="w-full lg:w-2/3 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-6 text-slate-800">Existing Classes</h2>
          
          {/* Changed: Grid 1 col on mobile, 2 on sm, 3 on xl */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div 
                key={cls._id} 
                onClick={() => handleClassClick(cls)}
                className="p-5 border border-slate-200 rounded-xl hover:shadow-md cursor-pointer transition bg-slate-50 hover:bg-white border-l-4 border-l-blue-500 group relative"
              >
                <button 
                  onClick={(e) => handleDeleteClass(cls._id, e)}
                  className="absolute top-3 right-3 text-slate-300 hover:text-red-500 p-2 z-10 transition-colors"
                >
                  <FaTrash size={14} />
                </button>

                <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600">{cls.grade}</h3>
                <p className="text-slate-500 text-sm">Section: <span className="font-semibold">{cls.section}</span></p>
                <div className="mt-3 flex flex-wrap gap-2">
                   {cls.subjects?.slice(0, 3).map((s, i) => (
                      <span key={i} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {s.subject?.name}
                      </span>
                   ))}
                   {cls.subjects?.length > 3 && <span className="text-[10px] text-slate-400">+{cls.subjects.length - 3} more</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <ClassDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        classData={selectedClass}
        onUpdate={fetchClasses}
      />
    </Layout>
  );
};

export default Classes;