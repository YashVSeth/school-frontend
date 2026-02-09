import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaSearch, FaUserGraduate, FaTrash, FaEdit, FaEye, 
  FaFileInvoiceDollar, FaFileExcel, FaWhatsapp, FaPhoneAlt 
} from 'react-icons/fa';
import EditStudentModal from './EditStudentModal';
import StudentProfileModal from './StudentProfileModal';

// --- LIBRARIES FOR EXPORT ---
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [studentToView, setStudentToView] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [whatsappFilter, setWhatsappFilter] = useState('all'); // 'all', 'enabled', 'disabled'

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
      toast.error("Failed to load student list.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ WhatsApp Direct Messaging Function
  const handleWhatsAppMessage = (student) => {
    if (!student.phone) return toast.error("Phone number missing!");
    
    const message = `Namaste, this is from Radhey Shyam Sansthaan regarding ${student.firstName}. We wanted to discuss the student's progress and fee records.`;
    const url = `https://wa.me/${student.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // --- 📊 EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) return toast.warn("No data to export");

    const excelData = filteredStudents.map(s => ({
      "Student ID": s.studentId,
      "Name": `${s.firstName} ${s.lastName}`,
      "Father": s.fatherName,
      "Class": `${s.class?.grade || ''} - ${s.class?.section || ''}`,
      "Total Due": (s.feeDetails?.backlog_2024 || 0) + (s.feeDetails?.backlog_2025 || 0) + 
                   (s.feeDetails?.tuitionFee_2026 || 0) + (s.feeDetails?.electricalCharges || 0),
      "Phone": s.phone || "N/A",
      "WhatsApp": s.whatsappEnabled ? "Enabled" : "Disabled"
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students_Report");
    XLSX.writeFile(wb, `School_Report_${new Date().toLocaleDateString()}.xlsx`);
    toast.success("Excel Downloaded!");
  };

  // --- FILTER LOGIC ---
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const fatherName = (student.fatherName || "").toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          fatherName.includes(searchTerm.toLowerCase());
    
    const matchesClass = selectedClass ? (student.class?._id === selectedClass || student.class === selectedClass) : true;
    
    const matchesWhatsapp = whatsappFilter === 'all' ? true : 
                           whatsappFilter === 'enabled' ? student.whatsappEnabled === true : 
                           student.whatsappEnabled === false;

    return matchesSearch && matchesClass && matchesWhatsapp;
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-10 px-4">
        <ToastContainer position="top-right" autoClose={2000} theme="colored" />
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
           <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Student Directory</h1>
              <p className="text-slate-500 font-medium">Manage records, contact parents, and track waterfall fees</p>
           </div>
           
           <div className="flex gap-2">
              <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-100">
                <FaFileExcel /> Export Excel
              </button>
           </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
           <div className="md:col-span-2 relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Search by name, ID or father's name..." value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
              />
           </div>
           <select 
             className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200 outline-none font-semibold text-slate-600"
             value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
           >
             <option value="">All Classes</option>
             {classes.map(c => <option key={c._id} value={c._id}>{c.grade} - {c.section}</option>)}
           </select>

           <select 
             className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200 outline-none font-semibold text-slate-600"
             value={whatsappFilter} onChange={(e) => setWhatsappFilter(e.target.value)}
           >
             <option value="all">WhatsApp: All</option>
             <option value="enabled">Active Alerts</option>
             <option value="disabled">Inactive Alerts</option>
           </select>
        </div>

        {/* DATA TABLE */}
        {loading ? ( <div className="text-center py-20 font-bold text-slate-400">Loading Students...</div> ) : (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="p-5">Student & Parent</th>
                    <th className="p-5">Class</th>
                    <th className="p-5">Waterfall Due</th>
                    <th className="p-5 text-center">Contact</th>
                    <th className="p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-blue-50/30 transition-all group">
                      <td className="p-5">
                        <div className="font-extrabold text-slate-700 text-base">{student.firstName} {student.lastName}</div>
                        <div className="text-xs font-bold text-blue-500 uppercase tracking-tighter mb-1">ID: {student.studentId}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 font-semibold"><FaUserGraduate className="text-slate-300" size={10}/> Father: {student.fatherName}</div>
                      </td>
                      <td className="p-5">
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 border border-slate-200">
                          {student.class?.grade} - {student.class?.section}
                        </span>
                      </td>
                      <td className="p-5">
                          <div className="text-xs font-black text-rose-500">
                             Rs. {(student.feeDetails?.backlog_2024 || 0) + (student.feeDetails?.backlog_2025 || 0) + (student.feeDetails?.tuitionFee_2026 || 0)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold tracking-tight">Incl. Arrears</div>
                      </td>
                      <td className="p-5">
                        <div className="flex justify-center gap-3">
                           {/* ✅ Updated WhatsApp Button */}
                           <button 
                             onClick={() => handleWhatsAppMessage(student)}
                             className={`p-2.5 rounded-xl transition-all shadow-sm ${student.whatsappEnabled ? 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}
                             disabled={!student.whatsappEnabled}
                             title={student.whatsappEnabled ? "Send WhatsApp Message" : "WhatsApp Alerts Disabled"}
                           >
                             <FaWhatsapp size={20} />
                           </button>
                           <a href={`tel:${student.phone}`} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                             <FaPhoneAlt size={16}/>
                           </a>
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleViewClick(student)} className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all"><FaEye size={18} /></button>
                          <button onClick={() => handleEditClick(student)} className="p-2.5 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"><FaEdit size={18} /></button>
                          <button onClick={() => handleDelete(student._id)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><FaTrash size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <EditStudentModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} student={studentToEdit} classes={classes} refreshData={fetchData} />
        <StudentProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} student={studentToView} />
      </div>
    </Layout>
  );
};

export default StudentList;