import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaBookOpen, FaPlus, FaTrash, FaSearch, FaChalkboardTeacher, 
  FaLayerGroup, FaCheckCircle, FaSpinner 
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [subjectsRes, classesRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/classes`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load subjects or classes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    const trimmed = subjectName.trim();
    if (!trimmed) {
      return toast.warning('Please enter a subject name');
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BASE_URL}/api/subjects`,
        { name: trimmed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Subject "${trimmed}" created successfully!`);
      setSubjectName('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE_URL}/api/subjects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Subject deleted successfully');
      setSubjects(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete subject');
    }
  };

  // Helper to count how many classes teach this subject
  const getSubjectClassCount = (subjectId, subjectName) => {
    let count = 0;
    classes.forEach(cls => {
      if (Array.isArray(cls.subjects)) {
        const found = cls.subjects.some(
          s => (s.subject?._id === subjectId) || (s.subject === subjectId) || (s.subjectName === subjectName)
        );
        if (found) count++;
      }
    });
    return count;
  };

  const filteredSubjects = subjects.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <ToastContainer position="top-right" autoClose={2500} theme="colored" />

      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">

        {/* ─── Header Banner ─── */}
        <div className="bg-gradient-to-r from-red-800 to-red-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Curriculum & Academics
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Subject Management</h1>
            <p className="text-red-100 text-xs sm:text-sm mt-1 opacity-90">
              Create, organize, and manage academic subjects across all grades.
            </p>
          </div>
          <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 shadow-inner">
            <FaBookOpen size={30} className="text-white/80" />
          </div>
        </div>

        {/* ─── Main Content Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Create Subject Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm font-bold">
                  <FaPlus />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Add New Subject</h2>
                  <p className="text-xs text-slate-400">Add course or topic to syllabus</p>
                </div>
              </div>

              <form onSubmit={handleAddSubject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics, Hindi, Science"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-red-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin text-sm" /> Adding...
                    </>
                  ) : (
                    <>
                      <FaPlus /> Create Subject
                    </>
                  )}
                </button>
              </form>

              {/* Quick Link Card */}
              <div className="pt-4 border-t border-slate-100">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <p className="font-bold text-slate-700 flex items-center gap-1.5">
                    <FaChalkboardTeacher className="text-red-500" /> Assign to Classes
                  </p>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    To assign subjects and teachers to specific sections, head over to <strong>Manage Classes</strong>.
                  </p>
                  <Link
                    to="/admin/classes"
                    className="inline-block text-red-600 hover:text-red-700 font-bold text-xs"
                  >
                    Go to Manage Classes →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Existing Subjects List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold">
                    <FaBookOpen />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Available Subjects
                    </h2>
                    <p className="text-xs text-slate-400">
                      Total: {subjects.length} registered subjects
                    </p>
                  </div>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
                  />
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                </div>
              </div>

              {/* Subjects Grid */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <FaSpinner className="animate-spin text-xl text-red-600" />
                  <span className="text-xs">Loading subjects...</span>
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FaBookOpen size={36} className="mx-auto opacity-30 text-slate-400" />
                  <p className="text-sm font-bold text-slate-600">No subjects found</p>
                  <p className="text-xs text-slate-400">
                    {searchTerm ? "Try searching for another name" : "Create your first subject from the form on the left"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredSubjects.map((sub) => {
                    const classCount = getSubjectClassCount(sub._id, sub.name);
                    return (
                      <div
                        key={sub._id}
                        className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:shadow-md transition border-l-4 border-l-red-500 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-red-600 font-bold text-sm shrink-0 shadow-xs">
                            <FaBookOpen />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-red-600 transition">
                              {sub.name}
                            </h3>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <FaLayerGroup className="text-slate-400 text-[10px]" />
                              {classCount > 0 ? (
                                <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                                  Taught in {classCount} {classCount === 1 ? 'class' : 'classes'}
                                </span>
                              ) : (
                                <span className="text-slate-400">Not assigned yet</span>
                              )}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(sub._id, sub.name)}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Subject"
                        >
                          <FaTrash size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </Layout>
  );
};

export default Subjects;
