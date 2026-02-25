import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaWallet, FaFileInvoiceDollar, FaChartLine, FaUsers, 
  FaSearch, FaBolt, FaBars, FaChevronDown 
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import StudentFeeModal from './StudentFeeModal'; 
import Sidebar from '../../components/Sidebar'; 

const FinanceDashboard = () => {
  const [stats, setStats] = useState({ totalCollected: 0, grandTotalDue: 0, totalStudents: 0 });
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(''); 
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Sidebar & Modal State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const BASE_URL = import.meta.env.VITE_API_URL;
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  // 1. Fetch classes on initial load
  useEffect(() => {
    fetchClasses();
  }, []);

  // 2. Fetch stats and students whenever the selectedClass changes
  useEffect(() => {
    fetchStats();
    if (selectedClass) {
      fetchStudentsByClass(selectedClass);
    } else if (searchQuery.length < 2) {
      setSearchResults([]);
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(res.data);
    } catch (error) {
      toast.error("Failed to fetch classes");
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = selectedClass 
        ? `${BASE_URL}/api/fees/global-stats?classId=${selectedClass}` 
        : `${BASE_URL}/api/fees/global-stats`;
        
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setStats(res.data);
    } catch (error) {
      toast.error("Failed to load financial stats");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsByClass = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/students?class=${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(res.data.students || res.data);
    } catch (error) {
      console.error("Failed to fetch class students");
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 2) {
      if (selectedClass) fetchStudentsByClass(selectedClass); 
      else setSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      let url = `${BASE_URL}/api/students?search=${query}`;
      if (selectedClass) url += `&class=${selectedClass}`; 

      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setSearchResults(res.data.students || res.data);
    } catch (error) {
      console.error("Search failed");
    }
  };

  const openFeeModal = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleGenerateBills = async () => {
    const target = selectedClass 
      ? classes.find(c => c._id === selectedClass)?.grade 
      : "ALL ACTIVE STUDENTS";

    const amount = prompt(`Enter default amount for ${currentMonth}\nGenerating for: ${target}`, "3000");
    if (!amount) return;

    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/api/fees/invoices/bulk`, {
        monthTitle: `${currentMonth} Tuition`,
        defaultAmount: amount,
        classId: selectedClass || null 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(res.data.message);
      fetchStats(); 
    } catch (error) {
      toast.error("Failed to generate bills");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Finance</h2>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 bg-slate-100 rounded-lg">
            <FaBars />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          
          {/* HEADER */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Finance Command Center</h1>
              <p className="text-slate-500 font-medium mt-1">Manage school revenue and billing.</p>
            </div>
            
            <div className="flex gap-3 w-full xl:w-auto">
              <button 
                onClick={handleGenerateBills}
                disabled={generating}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-70 whitespace-nowrap w-full sm:w-auto"
              >
                {generating ? 'Generating...' : <><FaBolt className="text-yellow-400" /> Generate Bills</>}
              </button>
            </div>
          </div>

          {loading ? (
             <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Calculating Ledger...</div>
          ) : (
            <>
              {/* STATS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
                  <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-2xl">
                    <FaChartLine />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collected {selectedClass && 'in Class'}</p>
                    <h2 className="text-3xl font-black text-slate-800">₹{stats.totalCollected?.toLocaleString()}</h2>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
                  <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl">
                    <FaFileInvoiceDollar />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Dues {selectedClass && 'in Class'}</p>
                    <h2 className="text-3xl font-black text-slate-800">₹{stats.grandTotalDue?.toLocaleString()}</h2>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
                  <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-2xl">
                    <FaUsers />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Students {selectedClass && 'in Class'}</p>
                    <h2 className="text-3xl font-black text-slate-800">{stats.totalStudents}</h2>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SEARCH & STUDENT LIST */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <FaWallet className="text-amber-500" /> Collect Fees
            </h3>
            
            {/* ✅ NEW COMBINED SEARCH & FILTER BAR */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 shrink-0">
              
              {/* Search Bar */}
              <div className="relative w-full sm:flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search by student name or ID..." 
                  className="w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:border-[#F05A28] focus:ring-1 focus:ring-[#F05A28] outline-none text-sm font-bold text-slate-700 transition-all shadow-sm"
                />
              </div>

              {/* Class Dropdown */}
              <div className="w-full sm:w-auto relative shrink-0">
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full sm:min-w-[200px] appearance-none bg-[#F8FAFC] border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-slate-700 outline-none focus:border-[#F05A28] cursor-pointer shadow-sm transition-all"
                >
                  <option value="">All Classes</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>{c.grade}</option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs" />
              </div>

            </div>

            {/* Scrollable Student List */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {searchResults.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <FaUsers size={40} className="mb-3 text-slate-200" />
                  <p className="font-bold">
                    {selectedClass ? "No students found in this class." : "Search or select a class to view students."}
                  </p>
                </div>
              ) : (
                searchResults.map(student => (
                  <div 
                    key={student._id}
                    onClick={() => openFeeModal(student)}
                    className="p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-orange-200 cursor-pointer flex justify-between items-center group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-100 text-[#F05A28] rounded-full flex items-center justify-center font-bold">
                        {student.firstName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 group-hover:text-[#F05A28] transition-colors">{student.firstName} {student.lastName}</p>
                        <p className="text-xs font-bold text-slate-400">ID: {student.studentId} • Class: {student.class?.grade || 'N/A'}</p>
                      </div>
                    </div>
                    <button className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider group-hover:bg-[#F05A28] group-hover:text-white group-hover:border-[#F05A28] transition-all">
                      Checkout
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RENDER THE POS MODAL */}
          <StudentFeeModal 
            isOpen={isModalOpen} 
            onClose={() => { setIsModalOpen(false); fetchStats(); }} 
            student={selectedStudent} 
          />

        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;