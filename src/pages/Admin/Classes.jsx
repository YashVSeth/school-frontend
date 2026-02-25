import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaTrash, FaChalkboardTeacher, FaLayerGroup } from 'react-icons/fa';
import Layout from '../../components/Layout';
import ClassDetailsModal from './ClassDetailsModal';

const Classes = () => {
  const [classes, setClasses] = useState([]);

  // ✅ Form State
  const [classForm, setClassForm] = useState({
    grade: '',
    section: ''
  });

  const [subjectForm, setSubjectForm] = useState({ name: '' });

  const [selectedClass, setSelectedClass] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL;
  const gradeOptions = ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
  const sectionOptions = ["A", "B", "C", "D", "E"];

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
      // ✅ Sending Data to Backend
      await axios.post(`${BASE_URL}/api/classes`, classForm, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Class Added Successfully!");
      setClassForm({ grade: '', section: '' });
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add class");
    }
  };

  const handleDeleteClass = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this class?")) return;
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

      <div className="flex flex-col lg:flex-row gap-6 animate-fade-in p-2 sm:p-0">

        {/* === LEFT SIDE: FORMS === */}
        <div className="w-full lg:w-1/3 space-y-6">

          {/* ADD CLASS FORM */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
              <FaLayerGroup className="text-red-600" /> Add New Class
            </h2>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <select name="grade" value={classForm.grade} onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white" required>
                  <option value="">Grade</option>
                  {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select name="section" value={classForm.section} onChange={(e) => setClassForm({ ...classForm, section: e.target.value })} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white" required>
                  <option value="">Section</option>
                  {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition active:scale-95 shadow-lg shadow-red-200">Add Class</button>
            </form>
          </div>

          {/* CREATE SUBJECT FORM */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Create Subject</h2>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <input
                type="text"
                placeholder="Subject Name (e.g. Mathematics)"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ name: e.target.value })}
                className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                required
              />
              <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 transition active:scale-95">Create Subject</button>
            </form>
          </div>
        </div>

        {/* === RIGHT SIDE: CLASS LIST === */}
        <div className="w-full lg:w-2/3 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-6 text-slate-800">Existing Classes</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div
                key={cls._id}
                onClick={() => handleClassClick(cls)}
                className="p-5 border border-slate-200 rounded-xl hover:shadow-md cursor-pointer transition bg-slate-50 hover:bg-white border-l-4 border-l-red-500 group relative"
              >
                <button
                  onClick={(e) => handleDeleteClass(cls._id, e)}
                  className="absolute top-3 right-3 text-slate-300 hover:text-red-500 p-2 z-10 transition-colors"
                >
                  <FaTrash size={14} />
                </button>

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-red-600">
                      {cls.grade} - {cls.section}
                    </h3>
                  </div>
                </div>

                {/* ✅ Display Class Teacher */}
                <div className="mt-3 py-2 border-t border-slate-200/60">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Class Teacher</p>
                  <div className="flex items-center gap-2">
                    <FaChalkboardTeacher className={cls.classTeacher ? "text-green-500" : "text-red-300"} />
                    <span className={`text-xs font-bold ${cls.classTeacher ? "text-slate-700" : "text-red-400 italic"}`}>
                      {cls.classTeacher ? cls.classTeacher.fullName : "Not Assigned"}
                    </span>
                  </div>
                </div>

                {/* Display Subjects */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {cls.subjects?.slice(0, 3).map((s, i) => (
                    <span key={i} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      {s.subject?.name || s.subjectName || "Subject"}
                    </span>
                  ))}
                  {cls.subjects?.length > 3 && <span className="text-[10px] text-slate-400">+{cls.subjects.length - 3} more</span>}
                </div>
              </div>
            ))}

            {classes.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-400">
                No classes added yet.
              </div>
            )}
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