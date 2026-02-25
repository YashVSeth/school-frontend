import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaSearch, FaUserGraduate, FaTrash, FaEdit, FaEye, 
  FaFileExcel, FaWhatsapp, FaPhoneAlt, FaIdCard, FaLevelUpAlt, FaUsersCog 
} from 'react-icons/fa'; // ✅ FaUsersCog added for Bulk Button
import EditStudentModal from './EditStudentModal';
import StudentProfileModal from './StudentProfileModal';
import PromoteModal from '../../components/PromoteModal';           // ✅ Correct Path
import PromoteClassModal from '../../components/PromoteClassModal'; // ✅ Correct Path
import { generateIDCards } from '../../utils/IDCardGenerator';
import * as XLSX from 'xlsx';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [studentToView, setStudentToView] = useState(null);
  
  // Single Promote State
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [studentToPromote, setStudentToPromote] = useState(null);
  
  // ✅ Bulk Promote State
  const [isBulkPromoteOpen, setIsBulkPromoteOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [whatsappFilter, setWhatsappFilter] = useState('all'); 

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
      setStudents(Array.isArray(studentRes.data) ? studentRes.data : []);
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
    } catch (error) { toast.error("Failed to load data."); } 
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
    } catch (error) { toast.error("Delete failed"); }
  };

  const handleEditClick = (s) => { setStudentToEdit(s); setIsEditModalOpen(true); };
  const handleViewClick = (s) => { setStudentToView(s); setIsProfileOpen(true); };
  const handlePromoteClick = (s) => { setStudentToPromote(s); setIsPromoteModalOpen(true); };

  const handleWhatsAppMessage = (student) => {
    if (!student.phone) return toast.error("Phone missing!");
    const url = `https://wa.me/${student.phone}`;
    window.open(url, '_blank');
  };

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) return toast.warn("No data");
    const ws = XLSX.utils.json_to_sheet(filteredStudents.map(s => ({ Name: s.firstName, Class: s.class?.grade })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Report.xlsx`);
  };

  const handlePrintIDs = () => {
    if (filteredStudents.length === 0) return toast.warn("No students!");
    generateIDCards(filteredStudents, selectedClass ? `Class_Batch_IDs` : `All_IDs`);
  };

  // Helper to get class name
  const getSelectedClassName = () => {
    const cls = classes.find(c => c._id === selectedClass);
    return cls ? `Class ${cls.grade}` : 'Batch';
  };

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || s.studentId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass ? (s.class?._id === selectedClass || s.class === selectedClass) : true;
    const matchesWhatsapp = whatsappFilter === 'all' ? true : whatsappFilter === 'enabled' ? s.whatsappEnabled : !s.whatsappEnabled;
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
              <p className="text-slate-500 font-medium">Manage records & promotions</p>
           </div>
           
           <div className="flex gap-2">
              <button onClick={handleExportExcel} className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-amber-700 transition-all"><FaFileExcel /> Excel</button>
              <button onClick={handlePrintIDs} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-orange-700 transition-all"><FaIdCard /> IDs</button>
              
              {/* ✅ BULK PROMOTE BUTTON (Header) */}
              <button 
                onClick={() => setIsBulkPromoteOpen(true)} 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all 
                    ${selectedClass 
                        ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200' 
                        : 'bg-slate-800 text-white hover:bg-black shadow-slate-300'
                    }`}
              >
                <FaUsersCog /> Promote {getSelectedClassName()}
              </button>
           </div>
        </div>

        {/* FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
           <div className="md:col-span-2 relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border rounded-xl" />
           </div>
           <select className="bg-white px-4 py-3 rounded-xl border" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
             <option value="">All Classes</option>
             {classes.map(c => <option key={c._id} value={c._id}>{c.grade} - {c.section}</option>)}
           </select>
           <select className="bg-white px-4 py-3 rounded-xl border" value={whatsappFilter} onChange={(e) => setWhatsappFilter(e.target.value)}>
             <option value="all">WhatsApp: All</option>
             <option value="enabled">Active Alerts</option>
             <option value="disabled">Inactive Alerts</option>
           </select>
        </div>

        {/* TABLE */}
        {loading ? <div>Loading...</div> : (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
             <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-50 text-xs font-bold text-slate-400 uppercase"><th className="p-4">Name</th><th className="p-4">Class</th><th className="p-4">Due</th><th className="p-4 text-center">Contact</th><th className="p-4 text-right">Actions</th></tr></thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50 border-b border-slate-50">
                      {/* Name & ID */}
                      <td className="p-4">
                        <div className="font-extrabold text-slate-700">{s.firstName} {s.lastName}</div>
                        <div className="text-xs font-bold text-red-500">ID: {s.studentId}</div>
                        <div className="text-xs text-slate-400">Father: {s.fatherName}</div>
                      </td>
                      
                      {/* Class */}
                      <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{s.class?.grade} - {s.class?.section}</span></td>
                      
                      {/* Fees */}
                      <td className="p-4">
                        <div className="text-xs font-black text-rose-500">
                             Rs. {(s.feeDetails?.backlog_2024 || 0) + (s.feeDetails?.backlog_2025 || 0) + (s.feeDetails?.tuitionFee_2026 || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">Incl. Arrears</div>
                      </td>

                      {/* Contact Buttons */}
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                            <button onClick={() => handleWhatsAppMessage(s)} className={`p-2 rounded-lg ${s.whatsappEnabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-300'}`}><FaWhatsapp/></button>
                            <a href={`tel:${s.phone}`} className="p-2 bg-red-50 text-red-600 rounded-lg"><FaPhoneAlt/></a>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleViewClick(s)} className="p-2 text-slate-400 hover:bg-slate-100 rounded" title="View"><FaEye/></button>
                          
                          {/* ID Card (Single) */}
                          <button onClick={() => generateIDCards([s], `${s.firstName}_ID`)} className="p-2 text-orange-500 hover:bg-orange-50 rounded" title="Print ID"><FaIdCard/></button>
                          
                          {/* ✅ Single Promote Button (Arrow) */}
                          <button onClick={() => handlePromoteClick(s)} className="p-2 text-violet-500 hover:bg-violet-50 rounded" title="Promote"><FaLevelUpAlt/></button>

                          <button onClick={() => handleEditClick(s)} className="p-2 text-amber-500 hover:bg-amber-50 rounded" title="Edit"><FaEdit/></button>
                          <button onClick={() => handleDelete(s._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded" title="Delete"><FaTrash/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
             </div>
          </div>
        )}

        {/* MODALS */}
        <EditStudentModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} student={studentToEdit} classes={classes} refreshData={fetchData} />
        <StudentProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} student={studentToView} />
        
        {/* ✅ Single Promote Modal */}
        <PromoteModal isOpen={isPromoteModalOpen} onClose={() => setIsPromoteModalOpen(false)} student={studentToPromote} classes={classes} refreshData={fetchData} />
        
        {/* ✅ Bulk Promote Modal */}
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