import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaSearch, FaWallet, FaArrowRight, 
  FaCalendarAlt, FaUserGraduate, FaHistory, FaCheckCircle, 
  FaFilter, FaCog, FaSave, FaMoneyBillWave, FaTrash, FaInfoCircle,
  FaFileInvoiceDollar, FaUniversity
} from 'react-icons/fa';

const Fees = () => {
  const [viewMode, setViewMode] = useState('collection'); 
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]); 
  
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeSummary, setFeeSummary] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const [selectedItems, setSelectedItems] = useState([]); 
  const [historyFilter, setHistoryFilter] = useState('All');

  const [editingClassId, setEditingClassId] = useState(null);
  const [structureForm, setStructureForm] = useState({
    monthlyTuition: 0, admissionFee: 0, examFee: 0, yearlyTotal: 0
  });

  const BASE_URL = import.meta.env.VITE_API_URL;
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  useEffect(() => {
    const initFetch = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [studentsRes, classesRes] = await Promise.all([
            axios.get(`${BASE_URL}/api/students`, { headers }),
            axios.get(`${BASE_URL}/api/classes`, { headers })
        ]);
        setStudents(studentsRes.data);
        setClasses(classesRes.data);
      } catch (err) { toast.error("Database connection failed"); }
    };
    initFetch();
  }, [BASE_URL]);

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setSelectedItems([]); 
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/fees/status/${student._id}?t=${new Date().getTime()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeSummary(res.data);
      setPaymentAmount(''); 
    } catch (err) { toast.error("Error fetching summary"); } 
    finally { setLoading(false); }
  };

  // ✅ CORE LOGIC: Har Cheez ka exact Due calculate karna (Waterfall)
  const calculateDues = () => {
    if (!feeSummary || !feeSummary.structure) return {};

    const monthlyFee = feeSummary.structure.monthlyTuition || 0;
    const admissionFee = feeSummary.structure.admissionFee || 0;
    const examFee = feeSummary.structure.examFee || 0;
    
    // Total saal ki fee
    const yearlyTotal = (monthlyFee * 12) + admissionFee + examFee;
    
    // Ab tak kitna pay kiya hai (Yearly Total - Current Outstanding)
    let totalPaidSoFar = yearlyTotal - (feeSummary.totalDue || 0);

    const duesMap = {};

    // 1. Admission Fee Logic
    if (totalPaidSoFar >= admissionFee) {
        duesMap['admission'] = 0; // Paid
        totalPaidSoFar -= admissionFee;
    } else {
        duesMap['admission'] = admissionFee - totalPaidSoFar; // Partial Due
        totalPaidSoFar = 0;
    }

    // 2. Exam Fee Logic
    if (totalPaidSoFar >= examFee) {
        duesMap['exam'] = 0; // Paid
        totalPaidSoFar -= examFee;
    } else {
        duesMap['exam'] = examFee - totalPaidSoFar; // Partial Due
        totalPaidSoFar = 0;
    }

    // 3. Monthly Fee Logic (Waterfall Distribution)
    months.forEach(month => {
        if (totalPaidSoFar >= monthlyFee) {
            duesMap[month] = 0; // Fully Paid
            totalPaidSoFar -= monthlyFee;
        } else if (totalPaidSoFar > 0) {
            // Partial Payment Logic:
            // Agar monthly fee 600 hai aur 100 bache hain, to 100 kat jayenge
            // Due bachega 500
            duesMap[month] = monthlyFee - totalPaidSoFar;
            totalPaidSoFar = 0; 
        } else {
            duesMap[month] = monthlyFee; // Full Due
        }
    });

    return duesMap;
  };

  const toggleItem = (itemId) => {
    const updated = selectedItems.includes(itemId) 
      ? selectedItems.filter(i => i !== itemId) 
      : [...selectedItems, itemId];
    
    setSelectedItems(updated);

    if (updated.length > 0) {
        // ✅ Calculate sum based on PARTIAL logic
        const duesMap = calculateDues();
        let totalToPay = 0;
        
        updated.forEach(id => {
            totalToPay += (duesMap[id] || 0);
        });

        setPaymentAmount(totalToPay);
    } else {
        setPaymentAmount(''); // Reset to empty if nothing selected
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return toast.warn("Enter a valid amount");

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/fees/pay`, {
        studentId: selectedStudent._id,
        amount: amount,
        months: selectedItems
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success("Payment Successful!");
      setSelectedItems([]);
      handleSelectStudent(selectedStudent); 
    } catch (err) { toast.error("Payment failed"); } 
    finally { setLoading(false); }
  };

  const handleResetHistory = async () => {
    if(!window.confirm("WARNING: This will delete ALL history. Continue?")) return;
    setLoading(true);
    try {
        const token = localStorage.getItem('token');
        await axios.delete(`${BASE_URL}/api/fees/reset`, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("History Reset!");
        setFeeSummary(null); setSelectedStudent(null);
    } catch (err) { toast.error("Reset Failed"); } finally { setLoading(false); }
  };

  const getMonthlyRate = () => feeSummary?.structure?.monthlyTuition || 0;

  // ✅ DISPLAY LOGIC: Badge Text
  const getBadgeDisplay = () => {
      // Case 1: Nothing selected -> Show Total Outstanding
      if (selectedItems.length === 0) {
          return {
              label: "Total Outstanding",
              amount: feeSummary?.totalDue || 0,
              color: "bg-rose-50 text-rose-600"
          };
      }

      // Case 2: Items selected -> Show sum of THEIR dues (e.g. 500 for Apr)
      const duesMap = calculateDues();
      let selectedDueTotal = 0;
      selectedItems.forEach(id => selectedDueTotal += (duesMap[id] || 0));

      return {
          label: "Selected Due",
          amount: selectedDueTotal,
          color: "bg-blue-50 text-blue-600"
      };
  };

  const filteredStudents = students.filter(s => {
    const matchesName = s.firstName.toLowerCase().includes(searchTerm.toLowerCase());
    const studentClassId = s.class?._id || s.class; 
    const matchesClass = selectedClassFilter === 'All' || studentClassId === selectedClassFilter;
    return matchesName && matchesClass;
  });

  const filteredHistory = historyFilter === 'All' 
    ? feeSummary?.history 
    : feeSummary?.history?.filter(trx => trx.months?.includes(historyFilter));

  const handleSelectClassForEdit = async (clsId) => {
    setEditingClassId(clsId);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/fee-structure/${clsId}?t=${new Date().getTime()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.breakdown || {};
      setStructureForm({
        monthlyTuition: data.monthlyTuition || 0, admissionFee: data.admissionFee || 0,
        examFee: data.examFee || 0, yearlyTotal: res.data?.totalAmount || 0 
      });
    } catch (err) { toast.error("Could not fetch structure"); }
    finally { setLoading(false); }
  };

  const handleSaveStructure = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const token = localStorage.getItem('token');
        await axios.post(`${BASE_URL}/api/fee-structure`, {
            classId: editingClassId, academicYear: "2026-27", breakdown: structureForm
        }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Fee Structure Updated!");
    } catch (err) { toast.error("Failed to save structure"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
     const total = (Number(structureForm.monthlyTuition) * 12) + Number(structureForm.admissionFee) + Number(structureForm.examFee);
     setStructureForm(prev => ({ ...prev, yearlyTotal: total }));
  }, [structureForm.monthlyTuition, structureForm.admissionFee, structureForm.examFee]);

  const duesMap = calculateDues();
  const badgeData = getBadgeDisplay();

  return (
    <Layout>
      <div className="h-[calc(100vh-100px)] flex flex-col bg-slate-50 font-sans overflow-hidden">
        <ToastContainer position="top-right" theme="colored" autoClose={2000} />

        <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0">
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Finance Console</h1>
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => { setViewMode('collection'); setSelectedStudent(null); setFeeSummary(null); }} className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'collection' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Fee Collection</button>
                <button onClick={() => { setViewMode('structure'); setEditingClassId(null); }} className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'structure' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><FaCog /> Fee Structures</button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {viewMode === 'collection' && (
                <>
                <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-100 space-y-3">
                        <div className="relative"><FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /><input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500" onChange={(e) => setSearchTerm(e.target.value)} /></div>
                        <div className="relative"><FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /><select value={selectedClassFilter} onChange={(e) => setSelectedClassFilter(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer text-slate-600"><option value="All">All Classes</option>{classes.map((cls) => <option key={cls._id} value={cls._id}>Class {cls.grade}</option>)}</select></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {filteredStudents.length > 0 ? (filteredStudents.map(s => (
                            <div key={s._id} onClick={() => handleSelectStudent(s)} className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${selectedStudent?._id === s._id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${selectedStudent?._id === s._id ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>{s.firstName[0]}</div>
                                <div><p className="font-black text-sm">{s.firstName} {s.lastName}</p><p className={`text-[10px] uppercase font-bold ${selectedStudent?._id === s._id ? 'text-blue-100' : 'text-slate-400'}`}>{s.studentId} • {s.class?.grade ? `Class ${s.class.grade}` : 'N/A'}</p></div>
                            </div>
                        ))) : <div className="text-center p-10 text-slate-400 text-sm font-bold">No students found.</div>}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
                    {!selectedStudent ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                            <FaWallet size={60} className="mb-4 opacity-10" />
                            <p className="font-black uppercase tracking-widest text-xs">Select a student to begin</p>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl"><FaUserGraduate /></div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800">{selectedStudent.firstName} {selectedStudent.lastName}</h2>
                                        <div className="flex gap-2 mt-1">
                                            <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded">Monthly: ₹{getMonthlyRate()}</span>
                                            
                                            {/* ✅ DYNAMIC BADGE */}
                                            {/* Shows "Total Outstanding" when empty */}
                                            {/* Shows "Selected Due" (Partial logic) when items selected */}
                                            <span className={`text-[10px] font-black px-2 py-1 rounded transition-all ${badgeData.color}`}>
                                                {badgeData.label}: ₹{badgeData.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-black text-slate-400">Total Outstanding</p>
                                    <p className="text-xl font-black text-slate-800">₹{(feeSummary?.totalDue || 0).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm"><FaUniversity className="text-purple-500"/> One-Time Fees</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                                    {['admission', 'exam'].map(type => {
                                        const due = duesMap[type] || 0;
                                        const isPaid = due === 0;
                                        const isSelected = selectedItems.includes(type);
                                        const label = type === 'admission' ? 'Admission Fee' : 'Exam Fee';
                                        
                                        return (
                                            <button 
                                                key={type}
                                                onClick={() => toggleItem(type)}
                                                className={`py-4 px-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1
                                                    ${isSelected ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : 
                                                      isPaid ? 'bg-emerald-50 border-emerald-100 text-emerald-600 opacity-60 cursor-default' : 'border-slate-100 text-slate-500 hover:border-purple-200 bg-white'}`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
                                                {isPaid ? <FaCheckCircle/> : <span className="font-black text-sm">₹{due}</span>}
                                            </button>
                                        )
                                    })}
                                </div>

                                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-sm border-t border-slate-100 pt-6"><FaCalendarAlt className="text-blue-500"/> Monthly Fees</h3>
                                <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-8">
                                    {months.map(m => {
                                        const isPaid = duesMap[m] === 0;
                                        return (
                                            <button 
                                                key={m} 
                                                onClick={() => toggleItem(m)}
                                                className={`py-3 rounded-xl font-bold text-xs border-2 transition-all 
                                                    ${selectedItems.includes(m) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 
                                                      isPaid ? 'bg-emerald-50 border-emerald-100 text-emerald-600 opacity-50 cursor-default' : 'border-slate-100 text-slate-400 hover:border-blue-200 bg-white'}`}
                                            >
                                                {m}
                                            </button>
                                        )
                                    })}
                                </div>

                                <form onSubmit={handlePayment} className="bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="flex-1 relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-500">₹</span>
                                            <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-transparent text-white text-4xl font-black outline-none border-b-2 border-slate-700 focus:border-blue-500 transition-all" placeholder="0.00" />
                                        </div>
                                        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-lg transition-all flex items-center gap-3 disabled:opacity-50 h-full">{loading ? "Processing..." : "Confirm"} <FaArrowRight /></button>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 px-2">
                                        <div>
                                            {selectedItems.length > 0 ? (
                                                <span className="text-emerald-400"><FaCheckCircle className="inline mr-1"/> Paying for {selectedItems.length} item(s)</span>
                                            ) : (
                                                <span className="text-slate-400"><FaInfoCircle className="inline mr-1"/> Select items to pay</span>
                                            )}
                                        </div>
                                        <div className={paymentAmount ? "text-emerald-400 font-black" : ""}>
                                            {/* Optional: Show remaining only if input differs from calculated amount */}
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 mb-10">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                    <h3 className="font-black text-slate-800 text-xl tracking-tighter flex items-center gap-2"><FaHistory className="text-emerald-500" /> Payment History</h3>
                                    <div className="flex items-center gap-4">
                                        <button onClick={handleResetHistory} className="text-rose-500 hover:text-rose-700 p-2 rounded-full hover:bg-rose-50 transition-all" title="Clear All History"><FaTrash /></button>
                                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                            <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} className="bg-transparent border-none text-xs font-black text-blue-600 outline-none cursor-pointer pr-4">
                                                <option value="All">All Transactions</option>
                                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {filteredHistory?.length > 0 ? (
                                        filteredHistory.map((trx, index) => (
                                        <div key={index} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm"><FaMoneyBillWave size={18} /></div>
                                                <div><p className="font-black text-slate-800 text-lg">₹{trx.amount.toLocaleString()}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{new Date(trx.date).toLocaleDateString()} • {new Date(trx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></div>
                                            </div>
                                            <div className="flex gap-2 flex-wrap justify-end max-w-[50%]">
                                                {trx.months && trx.months.length > 0 ? trx.months.map(m => (
                                                    <span key={m} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${m === 'admission' || m === 'exam' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {m === 'admission' ? 'Adm. Fee' : m === 'exam' ? 'Exam Fee' : m}
                                                    </span>
                                                )) : <span className="text-[10px] font-bold text-slate-300">No specific items</span>}
                                            </div>
                                        </div>
                                        ))
                                    ) : <div className="text-center py-10"><FaHistory className="text-slate-200 text-4xl mx-auto mb-3" /><p className="text-slate-400 font-bold text-sm">No payment history found.</p></div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                </>
            )}

            {/* Structure Mode (Hidden for brevity, same as previous) */}
            {viewMode === 'structure' && (
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto p-4 space-y-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Select Class</h3>
                        {classes.map(cls => <div key={cls._id} onClick={() => handleSelectClassForEdit(cls._id)} className={`p-4 rounded-xl cursor-pointer font-bold text-sm transition-all flex justify-between items-center ${editingClassId === cls._id ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-100' : 'text-slate-600 hover:bg-slate-50'}`}><span>Class {cls.grade}</span> <FaArrowRight className={`text-xs ${editingClassId === cls._id ? 'opacity-100' : 'opacity-0'}`} /></div>)}
                    </div>
                    <div className="flex-1 bg-slate-50 p-12 overflow-y-auto flex items-center justify-center">
                        {!editingClassId ? <div className="text-center opacity-30"><FaCog size={60} className="mx-auto mb-4"/><p className="font-black text-sm uppercase">Select a class to edit fees</p></div> : (
                            <div className="bg-white w-full max-w-lg p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
                                <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3"><span className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm"><FaCog /></span> Edit Fee Structure</h2>
                                <form onSubmit={handleSaveStructure} className="space-y-6">
                                    <div><label className="block text-xs font-black text-slate-500 uppercase mb-2">Monthly Tuition Fee</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span><input type="number" className="w-full pl-8 pr-4 py-4 bg-slate-50 rounded-xl font-black text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" value={structureForm.monthlyTuition} onChange={(e) => setStructureForm({...structureForm, monthlyTuition: e.target.value})} /></div></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-black text-slate-500 uppercase mb-2">Admission Fee</label><input type="number" className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" value={structureForm.admissionFee} onChange={(e) => setStructureForm({...structureForm, admissionFee: e.target.value})} /></div>
                                        <div><label className="block text-xs font-black text-slate-500 uppercase mb-2">Exam Fee</label><input type="number" className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" value={structureForm.examFee} onChange={(e) => setStructureForm({...structureForm, examFee: e.target.value})} /></div>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center"><span className="text-xs font-black text-emerald-600 uppercase">Est. Yearly Total</span><span className="text-xl font-black text-emerald-700">₹ {structureForm.yearlyTotal}</span></div>
                                    <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase hover:bg-black transition-all flex items-center justify-center gap-2"><FaSave /> Save Structure</button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </Layout>
  );
};

export default Fees;