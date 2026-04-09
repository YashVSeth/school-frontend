import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaSearch, FaUserGraduate, FaTrash, FaEdit, FaEye, 
  FaFileExcel, FaWhatsapp, FaPhoneAlt, FaIdCard, FaLevelUpAlt, FaUsersCog,
  FaFilter, FaEnvelope, FaEllipsisH, FaChevronDown
} from 'react-icons/fa';
import EditStudentModal from './EditStudentModal';
import StudentProfileModal from './StudentProfileModal';
import PromoteModal from '../../components/PromoteModal';
import PromoteClassModal from '../../components/PromoteClassModal';
import { generateIDCards } from '../../utils/IDCardGenerator';
import * as XLSX from 'xlsx';

// ──────────────── HELPERS ────────────────

// Consistent avatar colors derived from the maroon theme
const AVATAR_COLORS = [
  { bg: '#fbf0f3', text: '#ab0035' },
  { bg: '#fff0e6', text: '#c75a00' },
  { bg: '#eef6ff', text: '#2563eb' },
  { bg: '#f0fdf4', text: '#16a34a' },
  { bg: '#fef3c7', text: '#b45309' },
  { bg: '#f5f3ff', text: '#7c3aed' },
  { bg: '#fdf2f8', text: '#db2777' },
  { bg: '#ecfdf5', text: '#059669' },
  { bg: '#fff7ed', text: '#ea580c' },
  { bg: '#f0f9ff', text: '#0284c7' },
];

const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (firstName, lastName) => {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
};

// Grade badge colors (maroon-based palette)
const GRADE_COLORS = {
  '1': { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  '2': { bg: '#eef6ff', text: '#2563eb', border: '#bfdbfe' },
  '3': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  '4': { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  '5': { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' },
  '6': { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  '7': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  '8': { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' },
  '9': { bg: '#ecfdf5', text: '#047857', border: '#6ee7b7' },
  '10': { bg: '#fbf0f3', text: '#ab0035', border: '#f5dbe3' },
  '11': { bg: '#f5f3ff', text: '#6d28d9', border: '#c4b5fd' },
  '12': { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
};

const getGradeColor = (grade) => {
  if (!grade) return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
  const numericGrade = grade.replace(/[^0-9]/g, '');
  return GRADE_COLORS[numericGrade] || { bg: '#fbf0f3', text: '#ab0035', border: '#f5dbe3' };
};

const formatDOB = (dob) => {
  if (!dob) return '';
  const d = new Date(dob);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Attendance bar color
const getAttendanceColor = (pct) => {
  if (pct >= 90) return { bar: '#16a34a', bg: '#dcfce7' };
  if (pct >= 75) return { bar: '#eab308', bg: '#fef9c3' };
  if (pct >= 50) return { bar: '#f97316', bg: '#ffedd5' };
  return { bar: '#ef4444', bg: '#fee2e2' };
};

// ──────────────── ACTION MENU COMPONENT ────────────────
const ActionMenu = ({ student, onView, onEdit, onPromote, onDelete, onPrintID, onWhatsApp }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
      >
        <FaEllipsisH size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 w-48 z-50 animate-slide-up">
          <button onClick={() => { onView(); setOpen(false); }}
            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
            <FaEye className="text-slate-400" /> View Profile
          </button>
          <button onClick={() => { onEdit(); setOpen(false); }}
            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
            <FaEdit className="text-amber-500" /> Edit Student
          </button>
          <button onClick={() => { onPrintID(); setOpen(false); }}
            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
            <FaIdCard className="text-orange-500" /> Print ID Card
          </button>
          <button onClick={() => { onPromote(); setOpen(false); }}
            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
            <FaLevelUpAlt className="text-violet-500" /> Promote
          </button>
          <button onClick={() => { onWhatsApp(); setOpen(false); }}
            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
            <FaWhatsapp className="text-green-500" /> WhatsApp
          </button>
          <hr className="my-1 border-slate-100" />
          <button onClick={() => { onDelete(); setOpen(false); }}
            className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
            <FaTrash /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

// ──────────────── MAIN COMPONENT ────────────────

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceMap, setAttendanceMap] = useState({});
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [studentToView, setStudentToView] = useState(null);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [studentToPromote, setStudentToPromote] = useState(null);
  const [isBulkPromoteOpen, setIsBulkPromoteOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [studentRes, classRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/students`, { headers }),
        axios.get(`${BASE_URL}/api/classes`, { headers })
      ]);
      const studentData = Array.isArray(studentRes.data) ? studentRes.data : [];
      setStudents(studentData);
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);

      // Fetch attendance stats in bulk
      if (studentData.length > 0) {
        try {
          const ids = studentData.map(s => s._id).join(',');
          const attRes = await axios.get(`${BASE_URL}/api/attendance/stats/bulk?studentIds=${ids}`, { headers });
          setAttendanceMap(attRes.data || {});
        } catch { /* attendance stats API optional */ }
      }
    } catch { toast.error("Failed to load data."); } 
    finally { setLoading(false); }
  };

  // --- ACTIONS ---
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this student?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE_URL}/api/students/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Student Deleted!");
      setStudents(students.filter(s => s._id !== id)); 
    } catch { toast.error("Delete failed"); }
  };

  const handleEditClick = (s) => { setStudentToEdit(s); setIsEditModalOpen(true); };
  const handleViewClick = (s) => { setStudentToView(s); setIsProfileOpen(true); };
  const handlePromoteClick = (s) => { setStudentToPromote(s); setIsPromoteModalOpen(true); };

  const handleWhatsAppMessage = (student) => {
    if (!student.phone) return toast.error("Phone missing!");
    window.open(`https://wa.me/${student.phone}`, '_blank');
  };

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) return toast.warn("No data");
    const ws = XLSX.utils.json_to_sheet(filteredStudents.map(s => ({
      Name: `${s.firstName} ${s.lastName || ''}`,
      StudentID: s.studentId,
      Class: s.class?.grade ? `${s.class.grade}-${s.class.section}` : '',
      Father: s.fatherName,
      Phone: s.phone,
      Status: s.status || 'active',
      Attendance: attendanceMap[s._id]?.percentage ? `${attendanceMap[s._id].percentage}%` : 'N/A'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Student_Report.xlsx`);
  };

  const handlePrintIDs = () => {
    if (filteredStudents.length === 0) return toast.warn("No students!");
    generateIDCards(filteredStudents, selectedClass ? `Class_Batch_IDs` : `All_IDs`);
  };

  const getSelectedClassName = () => {
    const cls = classes.find(c => c._id === selectedClass);
    return cls ? `Class ${cls.grade}` : 'Batch';
  };

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || s.studentId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass ? (s.class?._id === selectedClass || s.class === selectedClass) : true;
    const matchesStatus = statusFilter ? (s.status || 'active') === statusFilter : true;
    return matchesSearch && matchesClass && matchesStatus;
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-10 px-4">
        <ToastContainer position="top-right" autoClose={2000} theme="colored" />
        
        {/* ═══════════ TOP BAR ═══════════ */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
           <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Student Directory</h1>
              <p className="text-slate-500 font-medium mt-1">Manage records & promotions</p>
           </div>
           
           <div className="flex gap-2 flex-wrap">
              <button onClick={handleExportExcel} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md hover:border-red-200 transition-all text-sm">
                <FaFileExcel className="text-green-600" /> Excel
              </button>
              <button onClick={handlePrintIDs} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md hover:border-red-200 transition-all text-sm">
                <FaIdCard className="text-orange-500" /> IDs
              </button>
              <button 
                onClick={() => setIsBulkPromoteOpen(true)} 
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md transition-all text-sm bg-red-600 text-white hover:bg-red-700"
              >
                <FaUsersCog /> Promote {getSelectedClassName()}
              </button>
           </div>
        </div>

        {/* ═══════════ SEARCH & FILTERS ═══════════ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3 items-stretch">
            {/* Search Input */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search students..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all" 
              />
            </div>

            {/* Filter Divider */}
            <div className="hidden md:flex items-center px-1">
              <div className="w-px h-8 bg-slate-200"></div>
            </div>

            {/* Filter Icon Button */}
            <button className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
              <FaFilter size={12} /> Filter
            </button>

            {/* Grade Dropdown */}
            <div className="relative">
              <select 
                className="appearance-none bg-slate-50 px-4 py-3 pr-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 cursor-pointer transition-all min-w-[140px]" 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">Grade</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.grade} - {c.section}</option>)}
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <select 
                className="appearance-none bg-slate-50 px-4 py-3 pr-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 cursor-pointer transition-all min-w-[130px]" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} />
            </div>
          </div>
        </div>

        {/* ═══════════ STUDENT TABLE ═══════════ */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
            <p className="font-medium">Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
            <FaUserGraduate className="mx-auto text-4xl text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold text-lg">No students found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Grade</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Guardian</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, index) => {
                    const fullName = `${s.firstName} ${s.lastName || ''}`;
                    const initials = getInitials(s.firstName, s.lastName);
                    const avatarColor = getAvatarColor(fullName);
                    const gradeLabel = s.class?.grade ? `${s.class.grade}${s.class.section || ''}` : '—';
                    const gradeColor = getGradeColor(s.class?.grade || '');
                    const attStats = attendanceMap[s._id];
                    const attPct = attStats?.percentage || 0;
                    const attColor = getAttendanceColor(attPct);
                    const status = s.status || 'active';

                    return (
                      <tr 
                        key={s._id} 
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        {/* ─── STUDENT ─── */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 select-none"
                              style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{fullName}</p>
                              <p className="text-xs text-slate-400 font-medium">
                                {s.studentId}{s.dob ? ` · DOB ${formatDOB(s.dob)}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* ─── GRADE ─── */}
                        <td className="px-4 py-4">
                          <span 
                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-extrabold"
                            style={{ backgroundColor: gradeColor.bg, color: gradeColor.text, border: `1px solid ${gradeColor.border}` }}
                          >
                            {gradeLabel}
                          </span>
                        </td>

                        {/* ─── ATTENDANCE ─── */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3 min-w-[140px]">
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: attColor.bg }}>
                              <div 
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${attPct}%`, backgroundColor: attColor.bar }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-500 w-10 text-right">{attStats?.total > 0 ? `${attPct}%` : '—'}</span>
                          </div>
                        </td>

                        {/* ─── GUARDIAN ─── */}
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-slate-600 truncate max-w-[160px]">{s.fatherName || '—'}</p>
                        </td>

                        {/* ─── STATUS ─── */}
                        <td className="px-4 py-4">
                          {status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-500 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* ─── ACTIONS ─── */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={`mailto:${s.email}`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                              title="Email"
                            >
                              <FaEnvelope size={13} />
                            </a>
                            <a
                              href={`tel:${s.phone}`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                              title="Call"
                            >
                              <FaPhoneAlt size={13} />
                            </a>
                            <ActionMenu
                              student={s}
                              onView={() => handleViewClick(s)}
                              onEdit={() => handleEditClick(s)}
                              onPromote={() => handlePromoteClick(s)}
                              onDelete={() => handleDelete(s._id)}
                              onPrintID={() => generateIDCards([s], `${s.firstName}_ID`)}
                              onWhatsApp={() => handleWhatsAppMessage(s)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
              <p className="text-xs font-medium text-slate-400">
                Showing <span className="text-slate-600 font-bold">{filteredStudents.length}</span> of <span className="text-slate-600 font-bold">{students.length}</span> students
              </p>
            </div>
          </div>
        )}

        {/* ═══════════ MODALS ═══════════ */}
        <EditStudentModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} student={studentToEdit} classes={classes} refreshData={fetchData} />
        <StudentProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} student={studentToView} />
        <PromoteModal isOpen={isPromoteModalOpen} onClose={() => setIsPromoteModalOpen(false)} student={studentToPromote} classes={classes} refreshData={fetchData} />
        <PromoteClassModal 
            isOpen={isBulkPromoteOpen} 
            onClose={() => setIsBulkPromoteOpen(false)} 
            classes={classes} 
            refreshData={fetchData}
            defaultClassId={selectedClass} 
        />
      </div>
    </Layout>
  );
};

export default StudentList;