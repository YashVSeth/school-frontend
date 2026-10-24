import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  FaMoneyBillWave, FaClipboardList, FaExclamationTriangle,
  FaFileInvoice, FaDownload, FaCog, FaBars, FaWallet,
  FaCheckCircle, FaClock, FaPlus, FaChevronDown, FaChevronRight,
  FaUniversity, FaCreditCard, FaMobileAlt, FaSearch,
  FaWhatsapp, FaUserClock, FaFilter, FaLayerGroup, FaArrowRight,
  FaReceipt, FaTimes, FaPrint, FaTrash, FaPlusCircle, FaRegSave,
  FaBus, FaMagic, FaAward, FaQrcode, FaCheck, FaPhoneAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import Sidebar from '../../components/Sidebar';
import TransportModal from './TransportModal';
import AddFeeTypeModal from './AddFeeTypeModal';
import QuickFeeCollection from './QuickFeeCollection';

const FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'HALF-YEARLY', 'YEARLY', 'ONE-TIME'];

const FREQUENCY_MULTIPLIERS = {
  'MONTHLY': 12,
  'QUARTERLY': 4,
  'HALF-YEARLY': 2,
  'YEARLY': 1,
  'ONE-TIME': 1
};

const PRESET_TEMPLATES = {
  'Primary (1-5)': [
    { name: 'Tuition Fee', amount: 1200, frequency: 'MONTHLY', type: 'mandatory' },
    { name: 'Exam & Assessment', amount: 600, frequency: 'HALF-YEARLY', type: 'mandatory' },
    { name: 'Computer Lab Fee', amount: 350, frequency: 'QUARTERLY', type: 'mandatory' },
    { name: 'Annual Development', amount: 1500, frequency: 'YEARLY', type: 'mandatory' }
  ],
  'Middle (6-8)': [
    { name: 'Tuition Fee', amount: 1600, frequency: 'MONTHLY', type: 'mandatory' },
    { name: 'Science & IT Lab', amount: 500, frequency: 'QUARTERLY', type: 'mandatory' },
    { name: 'Term Examination', amount: 800, frequency: 'HALF-YEARLY', type: 'mandatory' },
    { name: 'Annual Maintenance', amount: 1800, frequency: 'YEARLY', type: 'mandatory' }
  ],
  'Secondary (9-10)': [
    { name: 'Tuition Fee', amount: 2200, frequency: 'MONTHLY', type: 'mandatory' },
    { name: 'Physics/Chem/Bio Lab', amount: 800, frequency: 'QUARTERLY', type: 'mandatory' },
    { name: 'Board Test & Exam', amount: 1200, frequency: 'HALF-YEARLY', type: 'mandatory' },
    { name: 'Annual Infrastructure', amount: 2200, frequency: 'YEARLY', type: 'mandatory' }
  ],
  'Senior Sec (11-12)': [
    { name: 'Tuition Fee', amount: 2800, frequency: 'MONTHLY', type: 'mandatory' },
    { name: 'Senior Science Practical', amount: 1200, frequency: 'QUARTERLY', type: 'mandatory' },
    { name: 'Board Prep & Reg Fee', amount: 2000, frequency: 'YEARLY', type: 'mandatory' },
    { name: 'Annual Dev & Sports', amount: 2500, frequency: 'YEARLY', type: 'mandatory' }
  ]
};

const FinanceDashboard = ({ initialTab }) => {
  const BASE_URL = import.meta.env.VITE_API_URL;
  const location = useLocation();

  const resolveTab = () => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('fee-structure') || location.pathname.includes('structure')) return 'structure';
    if (location.pathname.includes('defaulter')) return 'defaulters';
    if (location.pathname.includes('ledger')) return 'ledger';
    return 'collect';
  };

  const [academicYear, setAcademicYear] = useState('2026-27');
  const [activeTab, setActiveTab] = useState(resolveTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (location.pathname.includes('fee-structure')) {
      setActiveTab('structure');
    } else if (location.pathname.includes('fees')) {
      setActiveTab('collect');
    }
  }, [initialTab, location.pathname]);

  // Global Financial Analytics
  const [stats, setStats] = useState({
    totalCollected: 0,
    grandTotalDue: 0,
    totalStudents: 0,
    overdueStudents: 0,
    classBreakdown: {},
    recentTransactions: [],
    collectionTrends: []
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Classes & Structure
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [feeStructures, setFeeStructures] = useState({});
  const [currentMandatoryFees, setCurrentMandatoryFees] = useState([]);
  const [currentOptionalFees, setCurrentOptionalFees] = useState([]);
  const [structureSaving, setStructureSaving] = useState(false);
  const [isAddFeeModalOpen, setIsAddFeeModalOpen] = useState(false);
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false);

  // Quick Collect State
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDues, setStudentDues] = useState([]);
  const [selectedDueIds, setSelectedDueIds] = useState([]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // No-Dues Clearance Modal State
  const [clearanceData, setClearanceData] = useState(null);
  const [isClearanceOpen, setIsClearanceOpen] = useState(false);
  const [clearanceLoading, setClearanceLoading] = useState(false);

  // Defaulters State
  const [defaultersData, setDefaultersData] = useState({ totalDefaulters: 0, agingBuckets: {}, defaulters: [] });
  const [defaulterFilterDays, setDefaulterFilterDays] = useState('all');
  const [defaulterClassFilter, setDefaulterClassFilter] = useState('');
  const [defaultersLoading, setDefaultersLoading] = useState(false);

  // Ledger Filter
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Initial Load
  useEffect(() => {
    fetchGlobalStats();
    fetchAllStructures();
    fetchDefaulters();
  }, [academicYear]);

  // Load fee structure when class changes
  useEffect(() => {
    if (selectedClassId && feeStructures[selectedClassId]) {
      setCurrentMandatoryFees(feeStructures[selectedClassId].mandatoryFees || []);
      setCurrentOptionalFees(feeStructures[selectedClassId].optionalFees || []);
    } else if (selectedClassId) {
      fetchSingleClassStructure(selectedClassId);
    }
  }, [selectedClassId, feeStructures]);

  // Refetch Defaulters when filters change
  useEffect(() => {
    if (activeTab === 'defaulters') {
      fetchDefaulters();
    }
  }, [defaulterFilterDays, defaulterClassFilter, activeTab]);

  const formatCurrency = (num) => '₹' + new Intl.NumberFormat('en-IN').format(num || 0);

  // ──────── API CALLS ────────
  const fetchGlobalStats = async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/fees/global-stats?academicYear=${academicYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch {
      // silent
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchAllStructures = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/fee-structure/all?academicYear=${academicYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setClasses(res.data.classes || []);
        setFeeStructures(res.data.structures || {});
        if (res.data.classes?.length > 0 && !selectedClassId) {
          setSelectedClassId(res.data.classes[0]._id);
        }
      }
    } catch {
      try {
        const token = localStorage.getItem('token');
        const classRes = await axios.get(`${BASE_URL}/api/classes`, { headers: { Authorization: `Bearer ${token}` } });
        setClasses(classRes.data || []);
        if (classRes.data?.length > 0 && !selectedClassId) setSelectedClassId(classRes.data[0]._id);
      } catch {
        // silent
      }
    }
  };

  const fetchSingleClassStructure = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/fee-structure/${classId}?academicYear=${academicYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentMandatoryFees(res.data?.mandatoryFees || []);
      setCurrentOptionalFees(res.data?.optionalFees || []);
    } catch {
      setCurrentMandatoryFees([]);
      setCurrentOptionalFees([]);
    }
  };

  const fetchDefaulters = async () => {
    setDefaultersLoading(true);
    try {
      const token = localStorage.getItem('token');
      const minDaysQuery = defaulterFilterDays === 'all' ? '' : `&minDays=${defaulterFilterDays}`;
      const classQuery = defaulterClassFilter ? `&classId=${defaulterClassFilter}` : '';
      const res = await axios.get(`${BASE_URL}/api/fees/defaulters?academicYear=${academicYear}${minDaysQuery}${classQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDefaultersData(res.data || { totalDefaulters: 0, agingBuckets: {}, defaulters: [] });
    } catch {
      // silent
    } finally {
      setDefaultersLoading(false);
    }
  };

  // ──────── QUICK COLLECT ACTIONS ────────
  const handleStudentSearch = async (e) => {
    const q = e.target.value;
    setStudentSearch(q);
    if (!q || q.length < 2) {
      setStudentResults([]);
      return;
    }
    setSearchingStudents(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/students?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentResults(res.data.students || res.data || []);
    } catch {
      // silent
    } finally {
      setSearchingStudents(false);
    }
  };

  const selectStudentForPayment = async (student) => {
    setSelectedStudent(student);
    setStudentSearch(`${student.firstName} ${student.lastName || ''}`.trim());
    setStudentResults([]);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const classId = student.class?._id || student.class;

      const [invRes, structRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/fees/invoices/${student._id}`, { headers }).catch(() => ({ data: [] })),
        classId ? axios.get(`${BASE_URL}/api/fee-structure/${classId}?academicYear=${academicYear}`, { headers }).catch(() => ({ data: null })) : { data: null }
      ]);

      const invoices = invRes.data || [];
      const structure = structRes.data || { mandatoryFees: [], optionalFees: [] };
      const items = [];
      const seenTitles = new Set();

      // 1. Existing Unpaid Invoices
      invoices.forEach(inv => {
        const remaining = inv.amount - (inv.amountPaid || 0);
        if (remaining > 0) {
          seenTitles.add(inv.title.toLowerCase());
          items.push({
            id: inv._id,
            name: inv.title,
            amount: remaining,
            fullAmount: inv.amount,
            isInvoice: true,
            status: new Date() > new Date(inv.dueDate) ? 'Overdue' : 'Due'
          });
        }
      });

      // 2. Structure Items (Tuition / Labs / Exam not yet billed)
      (structure.mandatoryFees || []).forEach((f, i) => {
        if (!seenTitles.has(f.name.toLowerCase())) {
          items.push({
            id: `struct-${i}`,
            name: f.name,
            amount: f.amount,
            fullAmount: f.amount,
            isInvoice: false,
            frequency: f.frequency,
            status: 'Standard Fee'
          });
        }
      });

      // 3. Transport if opted in
      if (student.feeDetails?.isUsingTransport && !seenTitles.has('transport fee')) {
        items.push({
          id: 'transport',
          name: `Transport (${student.feeDetails.transportRoute || 'Facility'})`,
          amount: student.feeDetails.transportFee || 0,
          fullAmount: student.feeDetails.transportFee || 0,
          isInvoice: false,
          frequency: 'MONTHLY',
          status: 'Facility'
        });
      }

      setStudentDues(items);
      setSelectedDueIds(items.map(i => i.id)); // Select all by default
    } catch {
      toast.error("Failed to load student dues");
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedStudent) return toast.error("Please select a student first");
    if (selectedDueIds.length === 0) return toast.error("Select at least one fee item");

    const selectedItems = studentDues.filter(d => selectedDueIds.includes(d.id));
    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.amount || 0), 0);

    setPaymentProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Ensure invoices exist for structure items
      const invoiceIds = [];
      for (const item of selectedItems) {
        if (item.isInvoice) {
          invoiceIds.push(item.id);
        } else {
          const invRes = await axios.post(`${BASE_URL}/api/fees/invoices`, {
            studentId: selectedStudent._id,
            title: item.name,
            amount: item.amount,
            academicYear
          }, { headers });
          if (invRes.data?.invoice?._id) invoiceIds.push(invRes.data.invoice._id);
        }
      }

      // Process payment with Smart Waterfall Settlement
      const payRes = await axios.post(`${BASE_URL}/api/fees/pay-cart`, {
        studentId: selectedStudent._id,
        amountPaid: totalAmount,
        paymentMethod: paymentMode,
        invoicesToPay: invoiceIds,
        remarks: paymentRemarks,
        academicYear
      }, { headers });

      const receipt = {
        receiptNo: payRes.data.receiptNo || `REC-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        student: {
          name: `${selectedStudent.firstName} ${selectedStudent.lastName || ''}`.trim(),
          studentId: selectedStudent.studentId,
          grade: selectedStudent.class?.grade || 'Class',
          rollNo: selectedStudent.rollNo || 'N/A'
        },
        items: selectedItems.map(i => ({ name: i.name, amount: i.amount })),
        total: totalAmount,
        paymentMethod: paymentMode,
        remarks: paymentRemarks
      };

      setReceiptData(receipt);
      setIsReceiptOpen(true);
      toast.success("Payment recorded successfully!");

      // Refresh stats & dues
      fetchGlobalStats();
      fetchDefaulters();
      selectStudentForPayment(selectedStudent);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleFetchClearance = async () => {
    if (!selectedStudent) return;
    setClearanceLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/fees/clearance/${selectedStudent._id}?academicYear=${academicYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClearanceData(res.data);
      setIsClearanceOpen(true);
    } catch {
      toast.error("Failed to generate clearance certificate");
    } finally {
      setClearanceLoading(false);
    }
  };

  // ──────── STRUCTURE BUILDER ACTIONS ────────
  const handleSaveClassStructure = async () => {
    if (!selectedClassId) return;
    setStructureSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/fee-structure/${selectedClassId}`, {
        academicYear,
        mandatoryFees: currentMandatoryFees,
        optionalFees: currentOptionalFees
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Fee structure saved for this class!");
      fetchAllStructures();
      fetchGlobalStats();
    } catch {
      toast.error("Failed to save fee structure");
    } finally {
      setStructureSaving(false);
    }
  };

  const [applying, setApplying] = useState(false);
  const handleApplyStructureToStudents = async () => {
    if (!selectedClassId) return;
    const clsName = selectedClassObj?.grade || 'this class';
    if (!window.confirm(`Deploy fee structure to all active students in ${clsName}? This will generate their mandatory fee invoices and update fee balances for Session ${academicYear}.`)) return;

    setApplying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/api/fee-structure/apply/${selectedClassId}`, {
        academicYear
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(res.data?.message || `Fee structure successfully deployed to ${clsName}!`);
      fetchGlobalStats();
      fetchDefaulters();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to deploy fee structure to students");
    } finally {
      setApplying(false);
    }
  };

  const applyPreset = (presetName) => {
    const tmpl = PRESET_TEMPLATES[presetName];
    if (!tmpl) return;
    setCurrentMandatoryFees(tmpl.map(item => ({ ...item })));
    setCurrentOptionalFees([]);
    toast.info(`Loaded ${presetName} template! Click 'Save Changes' to apply.`);
  };

  const calculateAnnualClassTotal = () => {
    let total = 0;
    currentMandatoryFees.forEach(f => {
      const mult = FREQUENCY_MULTIPLIERS[(f.frequency || 'MONTHLY').toUpperCase()] || 1;
      total += (Number(f.amount) || 0) * mult;
    });
    return total;
  };

  // ──────── EXPORTS & HELPERS ────────
  const exportLedgerExcel = () => {
    const txs = stats.recentTransactions || [];
    if (txs.length === 0) return toast.info("No transaction records found to export");

    const rows = txs.map(t => ({
      "Receipt No": t.receiptNo || 'N/A',
      "Date": new Date(t.date).toLocaleDateString(),
      "Student ID": t.student?.studentId || 'N/A',
      "Student Name": t.student ? `${t.student.firstName} ${t.student.lastName || ''}`.trim() : 'N/A',
      "Class": t.student?.class?.grade || 'N/A',
      "Payment Mode": t.paymentMethod || 'Cash',
      "Amount Paid (₹)": t.amount,
      "Balance (₹)": t.remainingBalance || 0
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `Fee_Ledger_${academicYear}.xlsx`);
    toast.success("Ledger exported to Excel!");
  };

  const generateUpiQr = (amt, note) => {
    const upiUri = `upi://pay?pa=radheyshyam@upi&pn=Radhey%20Shyam%20Sansthaan&am=${Number(amt) || 0}&cu=INR&tn=${encodeURIComponent(note || 'School Fee')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUri)}`;
  };

  const selectedTotalToPay = studentDues
    .filter(d => selectedDueIds.includes(d.id))
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const selectedClassObj = classes.find(c => c._id === selectedClassId);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <FaBars />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <FaWallet className="text-red-600" /> Fees & Fee Structure
                </h1>
                <span className="bg-red-50 text-red-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-red-100">
                  {academicYear}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Quick fee collection, grade structures, overdue tracking & receipts</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="2025-26">Session 2025-26</option>
              <option value="2026-27">Session 2026-27</option>
              <option value="2027-28">Session 2027-28</option>
            </select>

            <button
              onClick={() => setIsTransportModalOpen(true)}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <FaBus className="text-amber-600" /> Bus Slabs
            </button>

            <button
              onClick={exportLedgerExcel}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <FaDownload className="text-slate-400" /> Export
            </button>
          </div>
        </header>

        {/* Navigation Tabs Bar */}
        <div className="bg-white border-b border-slate-200 px-6 shrink-0 flex gap-2 overflow-x-auto">
          {[
            { id: 'collect', label: 'Quick Fee Collection', icon: FaMoneyBillWave },
            { id: 'structure', label: 'Fee Structure Builder', icon: FaLayerGroup },
            { id: 'defaulters', label: `Overdue Defaulters (${defaultersData.totalDefaulters || 0})`, icon: FaExclamationTriangle },
            { id: 'ledger', label: 'Receipts & Analytics', icon: FaReceipt }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-red-600 text-red-600 bg-red-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={isActive ? 'text-red-600' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6">

          {/* ═════════════ TAB 1: QUICK FEE COLLECTION ═════════════ */}
          {activeTab === 'collect' && (
            <QuickFeeCollection academicYear={academicYear} onPaymentSuccess={() => { fetchGlobalStats(); fetchDefaulters(); }} />
          )}

          {/* ═════════════ TAB 2: FEE STRUCTURE BUILDER ═════════════ */}
          {activeTab === 'structure' && (
            <div className="space-y-6 animate-fade-in">

              {/* Grade Selector Strip */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Class to Configure</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Presets:</span>
                    {Object.keys(PRESET_TEMPLATES).map(tmpl => (
                      <button
                        key={tmpl}
                        onClick={() => applyPreset(tmpl)}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-red-50 hover:border-red-200 border border-slate-200 text-slate-700 hover:text-red-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        + {tmpl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {classes.map(c => {
                    const isSelected = c._id === selectedClassId;
                    return (
                      <button
                        key={c._id}
                        onClick={() => setSelectedClassId(c._id)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 border-red-600 text-white shadow-sm scale-[1.02]'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {c.grade}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Two Column Fee Builder */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left 8 Cols: Fee Cards List */}
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900">{selectedClassObj?.grade || 'Class'} Fee Schedule</h3>
                      <p className="text-xs text-slate-400 font-medium">Configure itemized amounts and billing frequencies</p>
                    </div>

                    <button
                      onClick={() => setIsAddFeeModalOpen(true)}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FaPlusCircle size={12} /> Add Fee Head
                    </button>
                  </div>

                  {currentMandatoryFees.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-sm font-bold text-slate-500">No fee items configured for {selectedClassObj?.grade}</p>
                      <p className="text-xs text-slate-400 mt-1">Click "Add Fee Head" or select a preset template above</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentMandatoryFees.map((fee, idx) => {
                        const mult = FREQUENCY_MULTIPLIERS[(fee.frequency || 'MONTHLY').toUpperCase()] || 1;
                        const annualVal = (Number(fee.amount) || 0) * mult;

                        return (
                          <div key={idx} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white hover:shadow-2xs transition-all">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{fee.name}</h4>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                Multiplier: ×{mult} · Annual: <strong className="text-slate-700">₹{annualVal.toLocaleString('en-IN')}</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center">
                              {/* Amount input */}
                              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                                <span className="text-xs font-bold text-slate-400 mr-1">₹</span>
                                <input
                                  type="number"
                                  value={fee.amount}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setCurrentMandatoryFees(prev => prev.map((item, i) => i === idx ? { ...item, amount: val } : item));
                                  }}
                                  className="w-20 text-right font-black text-slate-800 text-sm outline-none"
                                />
                              </div>

                              {/* Frequency selector */}
                              <select
                                value={(fee.frequency || 'MONTHLY').toUpperCase()}
                                onChange={(e) => {
                                  const f = e.target.value;
                                  setCurrentMandatoryFees(prev => prev.map((item, i) => i === idx ? { ...item, frequency: f } : item));
                                }}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                              >
                                {FREQUENCIES.map(freq => (
                                  <option key={freq} value={freq}>{freq}</option>
                                ))}
                              </select>

                              {/* Delete button */}
                              <button
                                onClick={() => setCurrentMandatoryFees(prev => prev.filter((_, i) => i !== idx))}
                                className="p-2 text-slate-300 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                <FaTrash size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right 4 Cols: Annual Summary & Save */}
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 h-fit">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Annual Calculation</span>
                  <h3 className="text-lg font-black text-slate-900">{selectedClassObj?.grade || 'Class'} Summary</h3>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>Configured Heads</span>
                      <span className="font-bold text-slate-900">{currentMandatoryFees.length} Items</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-slate-600">
                      <span>Tuition & Labs</span>
                      <span className="font-bold text-slate-900">{formatCurrency(calculateAnnualClassTotal())}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                      <span className="text-xs font-black text-slate-800 uppercase">Annual Due / Student</span>
                      <span className="text-xl font-black text-red-600">{formatCurrency(calculateAnnualClassTotal())}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleSaveClassStructure}
                      disabled={structureSaving}
                      className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-black text-sm transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FaRegSave />
                      {structureSaving ? 'Saving Changes...' : `Save ${selectedClassObj?.grade || 'Class'} Structure`}
                    </button>

                    <button
                      onClick={handleApplyStructureToStudents}
                      disabled={applying || structureSaving}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FaMagic />
                      {applying ? 'Deploying to Students...' : `Deploy to All ${selectedClassObj?.grade || 'Class'} Students`}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ═════════════ TAB 3: OVERDUE DEFAULTERS & WHATSAPP ═════════════ */}
          {activeTab === 'defaulters' && (
            <div className="space-y-6 animate-fade-in">

              {/* Aging Buckets Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: '0 — 30 Days', val: defaultersData.agingBuckets?.tier1_30?.total, count: defaultersData.agingBuckets?.tier1_30?.count, color: 'text-blue-600', bg: 'bg-blue-50/60 border-blue-100' },
                  { label: '31 — 60 Days', val: defaultersData.agingBuckets?.tier2_60?.total, count: defaultersData.agingBuckets?.tier2_60?.count, color: 'text-amber-600', bg: 'bg-amber-50/60 border-amber-100' },
                  { label: '61 — 90 Days', val: defaultersData.agingBuckets?.tier3_90?.total, count: defaultersData.agingBuckets?.tier3_90?.count, color: 'text-orange-600', bg: 'bg-orange-50/60 border-orange-100' },
                  { label: '> 90 Days Critical', val: defaultersData.agingBuckets?.tier4_above90?.total, count: defaultersData.agingBuckets?.tier4_above90?.count, color: 'text-red-600', bg: 'bg-red-50/60 border-red-100' }
                ].map((tier, i) => (
                  <div key={i} className={`p-4 rounded-2xl border ${tier.bg}`}>
                    <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${tier.color}`}>{tier.label}</p>
                    <h4 className="text-2xl font-black text-slate-900">{formatCurrency(tier.val || 0)}</h4>
                    <p className="text-xs font-bold text-slate-500 mt-1">{tier.count || 0} students</p>
                  </div>
                ))}
              </div>

              {/* Defaulter Filters & Table */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><FaFilter /> Filter:</span>
                    <select
                      value={defaulterFilterDays}
                      onChange={(e) => setDefaulterFilterDays(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                    >
                      <option value="all">All Overdue Dues</option>
                      <option value="30">&gt; 30 Days Overdue</option>
                      <option value="60">&gt; 60 Days Overdue</option>
                      <option value="90">&gt; 90 Days (Critical)</option>
                    </select>

                    <select
                      value={defaulterClassFilter}
                      onChange={(e) => setDefaulterClassFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                    >
                      <option value="">All Classes</option>
                      {classes.map(c => (
                        <option key={c._id} value={c._id}>{c.grade}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs font-bold text-slate-400">
                    Showing {defaultersData.defaulters?.length || 0} defaulters
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="pb-3">Student Name</th>
                        <th className="pb-3">Class</th>
                        <th className="pb-3">Guardian</th>
                        <th className="pb-3">Overdue Days</th>
                        <th className="pb-3 text-right">Pending Amount</th>
                        <th className="pb-3 text-right">WhatsApp Reminder</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {defaultersLoading ? (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-slate-400 font-bold animate-pulse">Loading defaulters list...</td>
                        </tr>
                      ) : defaultersData.defaulters?.length > 0 ? (
                        defaultersData.defaulters.map(d => {
                          const cleanPhone = (d.phone || '').replace(/[^0-9]/g, '');
                          const waLink = cleanPhone ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(d.whatsappMsg)}` : null;

                          return (
                            <tr key={d._id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3">
                                <p className="font-bold text-slate-900">{d.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{d.studentId}</p>
                              </td>
                              <td className="py-3 font-bold text-slate-700">{d.grade}</td>
                              <td className="py-3">
                                <p className="font-bold text-slate-700">{d.fatherName}</p>
                                <p className="text-[10px] text-slate-400">{d.phone || 'No phone'}</p>
                              </td>
                              <td className="py-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  d.daysOverdue > 90 ? 'bg-red-100 text-red-700' : d.daysOverdue > 60 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {d.daysOverdue} Days
                                </span>
                              </td>
                              <td className="py-3 text-right font-black text-red-600 text-sm">
                                {formatCurrency(d.pendingAmount)}
                              </td>
                              <td className="py-3 text-right">
                                {waLink ? (
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                                  >
                                    <FaWhatsapp size={13} className="text-emerald-600" /> Send Reminder
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-300">No contact</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-slate-400 font-bold">
                            No student defaulters matching this filter 🎉
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ═════════════ TAB 4: LEDGER & ANALYTICS ═════════════ */}
          {activeTab === 'ledger' && (
            <div className="space-y-6 animate-fade-in">
              {/* Monthly Trend Chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-sm font-black text-slate-900 mb-4">Monthly Fee Collection Trend</h3>
                <div className="h-60 w-full">
                  {stats.collectionTrends?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.collectionTrends.map(t => ({ name: t.month || t.name, Collected: t.total }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} dy={6} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 600 }} tickFormatter={v => v > 0 ? `${(v/1000).toFixed(0)}k` : '0'} width={40} />
                        <Tooltip formatter={(v) => [formatCurrency(v), 'Collection']} />
                        <Bar dataKey="Collected" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">No chart data available</div>
                  )}
                </div>
              </div>

              {/* Transactions List */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-900">Recent Payment Receipts</h3>
                  <button onClick={exportLedgerExcel} className="text-xs font-bold text-red-600 hover:underline">
                    Export All
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="pb-3">Receipt No</th>
                        <th className="pb-3">Student Name</th>
                        <th className="pb-3">Class</th>
                        <th className="pb-3">Mode</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.recentTransactions?.map(tx => (
                        <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 font-mono font-bold text-slate-500">{tx.receiptNo || `#${tx._id.slice(-6)}`}</td>
                          <td className="py-3 font-bold text-slate-800">
                            {tx.student ? `${tx.student.firstName} ${tx.student.lastName || ''}`.trim() : 'N/A'}
                          </td>
                          <td className="py-3 font-medium text-slate-600">{tx.student?.class?.grade || 'Class'}</td>
                          <td className="py-3 font-bold text-slate-700">{tx.paymentMethod || 'Cash'}</td>
                          <td className="py-3 text-slate-400">{new Date(tx.date).toLocaleDateString()}</td>
                          <td className="py-3 text-right font-black text-slate-900">{formatCurrency(tx.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ═════════════ OFFICIAL PAYMENT RECEIPT MODAL ═════════════ */}
      {isReceiptOpen && receiptData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black">Official Payment Receipt</h3>
                <p className="text-xs text-slate-400 font-mono">{receiptData.receiptNo}</p>
              </div>
              <button onClick={() => setIsReceiptOpen(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs bg-white text-slate-800">
              <div className="text-center pb-3 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-900">RADHEY SHYAM SHIKSHAN SANSTHAAN</h2>
                <p className="text-[11px] text-slate-400 font-medium">Official Fee Acknowledgment & Receipt</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[9px] font-bold uppercase text-slate-400">Student Name</p>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{receiptData.student.name}</p>
                  <p className="text-[10px] text-slate-400">ID: {receiptData.student.studentId}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Class & Date</p>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{receiptData.student.grade}</p>
                  <p className="text-[10px] text-slate-400">{receiptData.date}</p>
                </div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[9px] font-black uppercase text-slate-400">
                    <th className="pb-1.5">Description</th>
                    <th className="pb-1.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receiptData.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-bold text-slate-700">{it.name}</td>
                      <td className="py-2 text-right font-black text-slate-900">{formatCurrency(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-800 font-black">
                    <td className="pt-2 text-xs">Total Paid ({receiptData.paymentMethod})</td>
                    <td className="pt-2 text-right text-sm text-emerald-600">{formatCurrency(receiptData.total)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                <img
                  src={generateUpiQr(receiptData.total, receiptData.receiptNo)}
                  alt="Verify QR"
                  className="w-14 h-14 rounded border border-slate-200 p-0.5"
                />
                <div className="text-center">
                  <div className="w-28 border-b border-slate-300 mb-1"></div>
                  <p className="text-[9px] font-bold text-slate-400">Authorized Signature</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setIsReceiptOpen(false)}
                className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FaPrint /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════ NO-DUES CLEARANCE CERTIFICATE MODAL ═════════════ */}
      {isClearanceOpen && clearanceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black">Fee Clearance Certificate</h3>
                <p className="text-xs text-slate-400 font-mono">{clearanceData.certificateNo}</p>
              </div>
              <button onClick={() => setIsClearanceOpen(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs bg-white text-slate-800 overflow-y-auto">
              <div className="text-center pb-3 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-900">RADHEY SHYAM SHIKSHAN SANSTHAAN</h2>
                <p className="text-[11px] text-slate-400 font-medium">Certificate of Institutional Fee Clearance</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Student:</span>
                  <span className="font-bold text-slate-900">{clearanceData.student?.name} ({clearanceData.student?.grade})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Father:</span>
                  <span className="font-bold text-slate-700">{clearanceData.student?.fatherName}</span>
                </div>
              </div>

              {clearanceData.isCleared ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-xs font-black text-emerald-800 uppercase">✅ All Dues Cleared</span>
                  <p className="text-[11px] text-emerald-900 mt-1">Verified eligible for Exam Admit Card and TC issuance.</p>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                  <span className="text-xs font-black text-red-800 uppercase">⚠️ Outstanding Balance</span>
                  <p className="text-xs text-red-700 font-bold mt-1">Remaining: {formatCurrency(clearanceData.financialSummary?.remainingBalance)}</p>
                </div>
              )}

              <div className="pt-4 flex justify-between items-end border-t border-slate-100">
                <p className="text-[9px] text-slate-400">Date: {clearanceData.issuedDate}</p>
                <p className="text-[9px] font-bold text-slate-500">Accounts Officer / Principal</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setIsClearanceOpen(false)}
                className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
              {clearanceData.isCleared && (
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <FaPrint /> Print Certificate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════ MODALS ═════════════ */}
      {isAddFeeModalOpen && (
        <AddFeeTypeModal
          isOpen={isAddFeeModalOpen}
          onClose={() => setIsAddFeeModalOpen(false)}
          onAdd={(fee) => {
            setCurrentMandatoryFees(prev => [...prev, { name: fee.name, amount: fee.amount, frequency: fee.frequency || 'MONTHLY' }]);
          }}
        />
      )}

      {isTransportModalOpen && (
        <TransportModal
          isOpen={isTransportModalOpen}
          onClose={() => setIsTransportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default FinanceDashboard;