import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import AddTeacherModal from './AddTeacherModal';
import TeacherAttendanceModal from './TeacherAttendanceModal'; // Individual History
import DailyAttendanceModal from './DailyAttendanceModal'; // ✅ IMPORT NEW COMPONENT
import TeacherSalaryModal from './TeacherSalaryModal'; // ✅ IMPORT SALARY MODAL
import AssignSalaryModal from './AssignSalaryModal'; // ✅ IMPORT ASSIGN SALARY MODAL
import axios from 'axios';
import {
  FaPlus, FaSearch, FaEnvelope, FaPhone, FaBook, FaTrash, FaEdit, FaCalendarCheck, FaClipboardList, FaMoneyCheckAlt, FaWhatsapp, FaCopy, FaCheckCircle
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

  // ✅ NEW: Salary Modal State
  const [isSalaryOpen, setIsSalaryOpen] = useState(false);
  const [teacherForSalary, setTeacherForSalary] = useState(null);

  // ✅ NEW: Bulk Assign Salary State
  const [isAssignSalaryOpen, setIsAssignSalaryOpen] = useState(false);

  // ✅ NEW: Success Credentials Pop-Up
  const [successCredentials, setSuccessCredentials] = useState(null);

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
  const handleSalaryClick = (teacher) => {
    setTeacherForSalary(teacher);
    setIsSalaryOpen(true);
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

  const handleTeacherAdded = (credentials) => {
    // Refresh the list immediately
    fetchTeachers();

    // If it was a new teacher and we got credentials back, show the success modal!
    if (credentials) {
      setSuccessCredentials(credentials);
    }
  };

  const copyToClipboard = () => {
    const text = `🎉 Welcome to Radheshyam Shikshan Sansthan!\n\nHere are your Teacher Portal login details:\n*Portal URL*: https://radheshyam.edu/login\n*Email*: ${successCredentials.email}\n*Password*: ${successCredentials.password}\n\nPlease log in and change your password immediately.`;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard! You can now paste it into WhatsApp.");
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
            {/* ✅ NEW: ASSIGN SALARY BUTTON */}
            <button
              onClick={() => setIsAssignSalaryOpen(true)}
              className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 px-5 py-2.5 rounded-xl transition-all font-bold shadow-sm"
            >
              <FaMoneyCheckAlt /> Assign Salary
            </button>

            {/* ✅ NEW: DAILY ATTENDANCE BUTTON */}
            <button
              onClick={() => setIsDailyAttendanceOpen(true)}
              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-red-600 px-5 py-2.5 rounded-xl transition-all font-semibold shadow-sm"
            >
              <FaClipboardList /> Daily Attendance
            </button>

            {/* ADD NEW TEACHER BUTTON */}
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-red-500/20 font-semibold"
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
                          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold overflow-hidden border border-slate-200 shrink-0">
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
                        <span className="flex items-center gap-2"><FaBook className="text-red-400" /> {teacher.specialization}</span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        <p className="flex items-center gap-2"><FaEnvelope /> {teacher.email}</p>
                        {teacher.phone && <p className="flex items-center gap-2"><FaPhone /> {teacher.phone}</p>}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => handleSalaryClick(teacher)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200" title="Pay Salary">
                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M461.2 128H80c-8.84 0-16-7.16-16-16s7.16-16 16-16h384c8.84 0 16-7.16 16-16 0-26.51-21.49-48-48-48H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h397.2c28.02 0 50.8-21.53 50.8-48V176c0-26.47-22.78-48-50.8-48zM416 336c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32z"></path></svg>
                          </button>
                          <button onClick={() => handleAttendanceClick(teacher)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="History"><FaCalendarCheck /></button>
                          <button onClick={() => handleEdit(teacher)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Edit"><FaEdit /></button>
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
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold overflow-hidden shrink-0 border border-slate-200">
                      {teacher.photoUrl ? (
                        <img src={getImageUrl(teacher.photoUrl)} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{(teacher.fullName || "?").charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{teacher.fullName}</h3>
                      <p className="text-xs text-red-600 font-medium">{teacher.specialization}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-2"><FaEnvelope className="text-slate-400" /> {teacher.email}</div>
                    {teacher.phone && <div className="flex items-center gap-2"><FaPhone className="text-slate-400" /> {teacher.phone}</div>}
                    <div className="flex items-center gap-2 font-medium text-slate-400 italic">{teacher.highestQualification}</div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button onClick={() => handleSalaryClick(teacher)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold transition-colors">
                      <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M461.2 128H80c-8.84 0-16-7.16-16-16s7.16-16 16-16h384c8.84 0 16-7.16 16-16 0-26.51-21.49-48-48-48H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h397.2c28.02 0 50.8-21.53 50.8-48V176c0-26.47-22.78-48-50.8-48zM416 336c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32z"></path></svg> Pay
                    </button>
                    <button onClick={() => handleAttendanceClick(teacher)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold transition-colors">
                      <FaCalendarCheck /> History
                    </button>
                    <button onClick={() => handleEdit(teacher)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold transition-colors">
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
      <AddTeacherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTeacherAdded}
        teacherToEdit={selectedTeacher}
      />
      <TeacherAttendanceModal isOpen={isAttendanceOpen} onClose={() => setIsAttendanceOpen(false)} teacher={teacherForAttendance} />
      <DailyAttendanceModal isOpen={isDailyAttendanceOpen} onClose={() => setIsDailyAttendanceOpen(false)} />
      <TeacherSalaryModal isOpen={isSalaryOpen} onClose={() => setIsSalaryOpen(false)} teacher={teacherForSalary} />
      <AssignSalaryModal
        isOpen={isAssignSalaryOpen}
        onClose={() => { setIsAssignSalaryOpen(false); fetchTeachers(); }}
      />

      {/* ✅ NEW: SUCCESS CREDENTIALS MODAL */}
      {successCredentials && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <FaCheckCircle className="text-green-500 text-4xl" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Teacher Added!</h2>
            <p className="text-slate-500 mt-2 text-sm font-medium">
              The account for <span className="text-slate-800 font-bold">{successCredentials.name}</span> has been successfully created.
            </p>

            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Login Email</p>
                <p className="font-mono text-slate-800 font-bold bg-white p-2 rounded border border-slate-100">{successCredentials.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Generated Password</p>
                <p className="font-mono text-slate-800 font-bold bg-white p-2 rounded border border-slate-100">{successCredentials.password}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setSuccessCredentials(null)}
                className="flex-1 py-3 px-4 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={copyToClipboard}
                className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-transform active:scale-95 shadow-lg shadow-green-200 flex items-center justify-center gap-2"
              >
                <FaWhatsapp size={18} /> Copy Details
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default Teachers;