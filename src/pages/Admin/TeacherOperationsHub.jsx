import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import TeacherSalaryModal from './TeacherSalaryModal';
import TeacherPayslipModal from './TeacherPayslipModal';
import axios from 'axios';
import {
  FaMoneyCheckAlt, FaClipboardList, FaSearch, FaCalendarAlt,
  FaCheckCircle, FaExclamationCircle, FaHourglassHalf, FaSave,
  FaUserTie, FaWallet, FaHistory, FaCheck, FaTimes, FaCalendarCheck,
  FaUserCheck, FaUserTimes, FaWhatsapp, FaChartBar, FaArrowRight,
  FaFilter, FaClock, FaCalendarDay, FaCalculator, FaMagic,
  FaSlidersH, FaInfoCircle, FaPrint, FaFileInvoiceDollar
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const TeacherOperationsHub = ({ initialTab = 'salary' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const resolveTab = () => {
    if (location.pathname.includes('/attendance')) return 'attendance';
    if (location.pathname.includes('/summary') || location.pathname.includes('/operations')) return 'summary';
    if (location.pathname.includes('/salary')) return 'salary';
    return initialTab || 'salary';
  };

  const [activeTab, setActiveTab] = useState(resolveTab);

  // Sync tab with route path
  useEffect(() => {
    setActiveTab(resolveTab());
  }, [location.pathname, initialTab]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'salary') navigate('/admin/teachers/salary');
    else if (tab === 'attendance') navigate('/admin/teachers/attendance');
    else if (tab === 'summary') navigate('/admin/teachers/operations');
  };

  // Common State
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- SALARY & PRORATED PAYROLL STATES ---
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [salaryDrafts, setSalaryDrafts] = useState({});
  const [hasSalaryChanges, setHasSalaryChanges] = useState(false);
  const [savingBase, setSavingBase] = useState(false);
  const [salaryFilter, setSalaryFilter] = useState('All');
  const [selectedTeacherForPay, setSelectedTeacherForPay] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedTeacherForSalaryHistory, setSelectedTeacherForSalaryHistory] = useState(null);
  const [salaryHistoryList, setSalaryHistoryList] = useState([]);
  const [loadingSalaryHistory, setLoadingSalaryHistory] = useState(false);
  const [isSalaryHistoryOpen, setIsSalaryHistoryOpen] = useState(false);

  // 🧾 Payslip Modal State (Option B)
  const [selectedPayslipData, setSelectedPayslipData] = useState(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  // ✨ Auto-Prorated Payroll state (Option A)
  const [proratedPayrollData, setProratedPayrollData] = useState(null);
  const [useProration, setUseProration] = useState(true);
  const [loadingProrated, setLoadingProrated] = useState(false);

  // --- ATTENDANCE TAB STATES ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({}); // { [teacherId]: 'Present' | 'Absent' | 'Half Day' | 'On Leave' }
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState('All');
  const [selectedTeacherForAttHistory, setSelectedTeacherForAttHistory] = useState(null);
  const [attHistoryRecords, setAttHistoryRecords] = useState([]);
  const [loadingAttHistory, setLoadingAttHistory] = useState(false);
  const [attHistoryMonth, setAttHistoryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isAttHistoryOpen, setIsAttHistoryOpen] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL;

  // 1. Fetch Teachers List
  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data || [];
      setTeachers(data);

      const drafts = {};
      data.forEach(t => {
        drafts[t._id] = t.baseSalary || 0;
      });
      setSalaryDrafts(drafts);
      setHasSalaryChanges(false);
    } catch (err) {
      console.error("Error loading teachers:", err);
      toast.error("Failed to load staff list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // 2. Fetch Prorated Payroll Summary for active month
  const fetchProratedPayroll = async () => {
    setLoadingProrated(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/salary/prorated-summary`, {
        params: { month: selectedMonth },
        headers: { Authorization: `Bearer ${token}` }
      });
      setProratedPayrollData(res.data);
    } catch (err) {
      console.error("Failed to fetch prorated payroll:", err);
    } finally {
      setLoadingProrated(false);
    }
  };

  useEffect(() => {
    if (teachers.length > 0) {
      fetchProratedPayroll();
    }
  }, [teachers, selectedMonth]);

  // 3. Fetch daily attendance for selectedDate
  useEffect(() => {
    if (teachers.length === 0) return;

    const fetchDailyAttendance = async () => {
      try {
        const token = localStorage.getItem('token');
        const attRes = await axios.get(`${BASE_URL}/api/attendance/teachers/daily`, {
          params: { date: selectedDate },
          headers: { Authorization: `Bearer ${token}` }
        });

        const map = {};
        if (Array.isArray(attRes.data)) {
          attRes.data.forEach(rec => {
            if (rec.teacherId) map[rec.teacherId] = rec.status;
          });
        }
        setAttendanceData(map);
      } catch (e) {
        setAttendanceData({});
      }
    };

    fetchDailyAttendance();
  }, [selectedDate, teachers]);

  // --- SALARY HANDLERS ---
  const handleBaseSalaryChange = (teacherId, val) => {
    const num = val === '' ? 0 : Math.max(0, Number(val));
    setSalaryDrafts(prev => ({ ...prev, [teacherId]: num }));
    setHasSalaryChanges(true);
  };

  const saveAllBaseSalaries = async () => {
    setSavingBase(true);
    try {
      const token = localStorage.getItem('token');
      const payload = Object.entries(salaryDrafts).map(([teacherId, baseSalary]) => ({
        teacherId,
        baseSalary
      }));

      await axios.put(`${BASE_URL}/api/teachers/bulk-salary`, { salaries: payload }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Base salaries updated successfully!");
      setHasSalaryChanges(false);
      fetchTeachers();
      fetchProratedPayroll();
    } catch (err) {
      toast.error("Failed to update base salaries");
    } finally {
      setSavingBase(false);
    }
  };

  const handleOpenSalaryHistory = async (teacher) => {
    setSelectedTeacherForSalaryHistory(teacher);
    setIsSalaryHistoryOpen(true);
    setLoadingSalaryHistory(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/salary/history/${teacher._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSalaryHistoryList(res.data || []);
    } catch (err) {
      toast.error("Failed to load salary history");
    } finally {
      setLoadingSalaryHistory(false);
    }
  };

  const handleWhatsAppReceipt = (rec) => {
    if (!selectedTeacherForSalaryHistory) return;
    let msg = `🧾 *Salary Payment Receipt*\n\nDear *${selectedTeacherForSalaryHistory.fullName}*,\nYour payment of *₹${rec.amountPaid?.toLocaleString()}* for *${rec.month}* has been recorded.\nType: ${rec.paymentType}\nDate: ${new Date(rec.paymentDate).toLocaleDateString()}\n`;

    if (rec.attendanceDeduction > 0) {
      msg += `Attendance Deductions (${rec.effectiveAbsentDays} days): -₹${rec.attendanceDeduction?.toLocaleString()}\n`;
    }
    if (rec.remarks) msg += `Note: "${rec.remarks}"\n`;
    msg += `\nRadhey Shyam Shikshan Sansthan`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- ATTENDANCE HANDLERS ---
  const handleStatusChange = (teacherId, status) => {
    setAttendanceData(prev => ({ ...prev, [teacherId]: status }));
  };

  const handleMarkAllAttendance = (status) => {
    const updated = {};
    teachers.forEach(t => { updated[t._id] = status; });
    setAttendanceData(updated);
    toast.info(`Marked all teachers as ${status}`);
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      const token = localStorage.getItem('token');
      const records = Object.entries(attendanceData).map(([teacherId, status]) => ({
        teacherId,
        date: selectedDate,
        status
      }));

      if (records.length === 0) {
        toast.warn("No attendance status marked.");
        setSavingAttendance(false);
        return;
      }

      await axios.post(`${BASE_URL}/api/attendance/teachers/bulk`, { records }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Attendance for ${selectedDate} saved!`);
      // Also refresh prorated calculations since attendance changed!
      fetchProratedPayroll();
    } catch (err) {
      toast.error("Failed to save attendance");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleOpenAttHistory = async (teacher) => {
    setSelectedTeacherForAttHistory(teacher);
    setIsAttHistoryOpen(true);
    fetchAttHistory(teacher._id, attHistoryMonth);
  };

  const fetchAttHistory = async (teacherId, month) => {
    setLoadingAttHistory(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/attendance/teacher/${teacherId}`, {
        params: { month },
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttHistoryRecords(res.data || []);
    } catch (err) {
      toast.error("Failed to fetch history");
    } finally {
      setLoadingAttHistory(false);
    }
  };

  // --- PRORATED DATA MAP ---
  const proratedMap = {};
  (proratedPayrollData?.teachers || []).forEach(t => {
    proratedMap[t.teacherId] = t;
  });

  // --- METRICS COMPUTATION ---
  const stats = proratedPayrollData?.stats || {
    totalCommitment: teachers.reduce((sum, t) => sum + (salaryDrafts[t._id] ?? t.baseSalary ?? 0), 0),
    totalDeductions: 0,
    totalNetPayable: teachers.reduce((sum, t) => sum + (salaryDrafts[t._id] ?? t.baseSalary ?? 0), 0),
    totalDisbursed: 0,
    totalPending: 0,
    staffCount: teachers.length
  };

  const presentToday = Object.values(attendanceData).filter(s => s === 'Present').length;
  const absentToday = Object.values(attendanceData).filter(s => s === 'Absent').length;
  const leaveToday = Object.values(attendanceData).filter(s => s === 'On Leave' || s === 'Half Day').length;
  const attRate = teachers.length > 0 ? Math.round((presentToday / teachers.length) * 100) : 0;

  // Filtered Teachers
  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = (t.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.specialization || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const pInfo = proratedMap[t._id];
    if (activeTab === 'salary') {
      const base = salaryDrafts[t._id] ?? t.baseSalary ?? 0;
      const targetDue = useProration ? (pInfo?.netPayable ?? base) : base;
      const paid = pInfo?.paidAmount || 0;

      if (salaryFilter === 'Paid') return targetDue > 0 && paid >= targetDue;
      if (salaryFilter === 'Partial') return paid > 0 && paid < targetDue;
      if (salaryFilter === 'Unpaid') return targetDue > 0 && paid === 0;
      return true;
    }

    if (activeTab === 'attendance') {
      const status = attendanceData[t._id];
      if (attendanceFilter === 'Present') return status === 'Present';
      if (attendanceFilter === 'Absent') return status === 'Absent';
      if (attendanceFilter === 'Unmarked') return !status;
      return true;
    }

    return true;
  });

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in pb-16">

        {/* Back breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/admin/teachers"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <FaArrowRight className="rotate-180" size={11} /> Back to Faculty List
          </Link>
          <span className="text-xs text-slate-400 font-medium">Academic Year 2026-27</span>
        </div>

        {/* ================= PAGE HEADER & TAB SWITCHER ================= */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-red-950 text-white flex items-center justify-center shadow-lg shadow-black/10 shrink-0">
              {activeTab === 'salary' ? (
                <FaMoneyCheckAlt className="text-amber-400" size={26} />
              ) : activeTab === 'attendance' ? (
                <FaClipboardList className="text-rose-400" size={26} />
              ) : (
                <FaChartBar className="text-blue-400" size={26} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  Faculty Operations
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                  Staff Hub
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Centralized dashboard to manage faculty salaries, auto-prorated payroll, and track daily attendance.
              </p>
            </div>
          </div>

          {/* Tab Switcher Pills */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-1 shrink-0 self-start lg:self-center overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => switchTab('salary')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'salary'
                  ? 'bg-white text-amber-700 shadow-sm shadow-black/5'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaWallet className={activeTab === 'salary' ? 'text-amber-500' : ''} />
              Salary & Payroll
            </button>

            <button
              onClick={() => switchTab('attendance')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'attendance'
                  ? 'bg-white text-rose-700 shadow-sm shadow-black/5'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaCalendarCheck className={activeTab === 'attendance' ? 'text-rose-500' : ''} />
              Daily Attendance
            </button>

            <button
              onClick={() => switchTab('summary')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'summary'
                  ? 'bg-white text-blue-700 shadow-sm shadow-black/5'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FaChartBar className={activeTab === 'summary' ? 'text-blue-500' : ''} />
              Work & Pay Overview
            </button>
          </div>
        </div>

        {/* ================= TAB 1: SALARY & PAYROLL ================= */}
        {activeTab === 'salary' && (
          <div className="space-y-6 animate-fade-in">

            {/* Salary Top Controls & Proration Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
                  <FaCalendarAlt className="text-amber-500" size={15} />
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Payroll Month:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-sm font-black text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>

                {/* ✨ Option A: Proration Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setUseProration(!useProration)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all border shadow-xs ${
                    useProration
                      ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-500/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle automatic attendance deduction based on absent and half-days"
                >
                  <FaCalculator className={useProration ? 'text-amber-600' : 'text-slate-400'} />
                  {useProration ? 'Attendance Proration: ACTIVE' : 'Attendance Proration: OFF'}
                  <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                    useProration ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {useProration ? 'Auto-Deduct' : 'Standard'}
                  </span>
                </button>
              </div>

              {hasSalaryChanges && (
                <button
                  onClick={saveAllBaseSalaries}
                  disabled={savingBase}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 animate-pulse"
                >
                  <FaSave /> {savingBase ? "Saving..." : "Save Base Salaries"}
                </button>
              )}
            </div>

            {/* Salary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Total Commitment */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Base Payroll</span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">₹{stats.totalCommitment.toLocaleString()}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Fixed commitment</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <FaWallet size={18} />
                </div>
              </div>

              {/* Card 2: Attendance Deductions */}
              <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${
                useProration ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-100 opacity-60'
              }`}>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">Absent Deductions</span>
                  <h3 className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                    {useProration ? `-₹${stats.totalDeductions.toLocaleString()}` : '₹0'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {useProration ? `Auto-calculated for ${selectedMonth}` : 'Proration paused'}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <FaCalculator size={18} />
                </div>
              </div>

              {/* Card 3: Net Payable */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    {useProration ? 'Net Due Payable' : 'Standard Payable'}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
                    ₹{(useProration ? stats.totalNetPayable : stats.totalCommitment).toLocaleString()}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">After absent adjustments</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <FaMoneyCheckAlt size={18} />
                </div>
              </div>

              {/* Card 4: Paid so far */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Paid in {selectedMonth}</span>
                  <h3 className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">₹{stats.totalDisbursed.toLocaleString()}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Disbursed so far</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <FaCheckCircle size={18} />
                </div>
              </div>

              {/* Card 5: Remaining Pending */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Remaining Balance</span>
                  <h3 className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                    ₹{(useProration ? stats.totalPending : Math.max(0, stats.totalCommitment - stats.totalDisbursed)).toLocaleString()}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Pending disbursement</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <FaHourglassHalf size={18} />
                </div>
              </div>
            </div>

            {/* Salary Filters & Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full md:w-80 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                <FaSearch className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search faculty by name or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none text-sm text-slate-700 outline-none w-full font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                {['All', 'Paid', 'Partial', 'Unpaid'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSalaryFilter(tab)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      salaryFilter === tab
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* 🖥️ DESKTOP VIEW: Salary Roster Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="p-4">Faculty Member</th>
                      <th className="p-4">Base Salary (₹)</th>
                      {useProration && (
                        <>
                          <th className="p-4">Absent Days</th>
                          <th className="p-4">Deduction (₹)</th>
                          <th className="p-4">Net Due (₹)</th>
                        </>
                      )}
                      <th className="p-4">Paid ({selectedMonth})</th>
                      <th className="p-4">Remaining</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTeachers.map((teacher) => {
                      const baseSalary = salaryDrafts[teacher._id] ?? teacher.baseSalary ?? 0;
                      const pInfo = proratedMap[teacher._id];
                      const effectiveAbsent = pInfo?.effectiveAbsent || 0;
                      const attendanceDeduction = pInfo?.attendanceDeduction || 0;
                      const netPayable = useProration ? (pInfo?.netPayable ?? baseSalary) : baseSalary;
                      const paid = pInfo?.paidAmount || 0;
                      const remaining = Math.max(0, netPayable - paid);

                      let statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                          Unset
                        </span>
                      );
                      if (baseSalary > 0) {
                        if (paid >= netPayable && netPayable > 0) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <FaCheckCircle size={10} /> Fully Paid
                            </span>
                          );
                        } else if (paid > 0) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <FaHourglassHalf size={10} /> Partial
                            </span>
                          );
                        } else {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <FaExclamationCircle size={10} /> Unpaid
                            </span>
                          );
                        }
                      }

                      return (
                        <tr key={teacher._id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Faculty Member */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-sm shrink-0 border border-amber-200">
                                {(teacher.fullName || '?').charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 block">{teacher.fullName}</span>
                                <span className="text-xs text-slate-400">{teacher.specialization || 'Faculty'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Base Salary Input */}
                          <td className="p-4">
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-32 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500">
                              <span className="text-slate-400 font-bold text-xs">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={salaryDrafts[teacher._id] ?? ''}
                                onChange={(e) => handleBaseSalaryChange(teacher._id, e.target.value)}
                                placeholder="0"
                                className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none"
                              />
                            </div>
                          </td>

                          {/* Option A Prorated Columns */}
                          {useProration && (
                            <>
                              <td className="p-4">
                                {effectiveAbsent > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                                    {effectiveAbsent} Days
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    100% Present
                                  </span>
                                )}
                              </td>

                              <td className="p-4 font-bold text-rose-600">
                                {attendanceDeduction > 0 ? `-₹${attendanceDeduction.toLocaleString()}` : '₹0'}
                              </td>

                              <td className="p-4 font-black text-slate-800">
                                ₹{netPayable.toLocaleString()}
                              </td>
                            </>
                          )}

                          {/* Paid Amount */}
                          <td className="p-4 font-bold text-emerald-600">
                            ₹{paid.toLocaleString()}
                          </td>

                          {/* Remaining Due */}
                          <td className="p-4 font-bold text-slate-700">
                            ₹{remaining.toLocaleString()}
                          </td>

                          {/* Status Badge */}
                          <td className="p-4">{statusBadge}</td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedTeacherForPay(teacher);
                                  setIsPayModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs shadow-amber-500/20 active:scale-95"
                              >
                                <FaWallet size={11} /> Pay
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPayslipData({
                                    teacher,
                                    proratedInfo: pInfo,
                                    month: selectedMonth
                                  });
                                  setIsPayslipOpen(true);
                                }}
                                className="px-2.5 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                                title="Print / Download Official Payslip"
                              >
                                <FaFileInvoiceDollar size={12} className="text-amber-600" /> Slip
                              </button>
                              <button
                                onClick={() => handleOpenSalaryHistory(teacher)}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                title="Payment History"
                              >
                                <FaHistory size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredTeachers.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    No faculty found matching the criteria.
                  </div>
                )}
              </div>
            </div>

            {/* 📱 MOBILE VIEW: Salary Cards */}
            <div className="md:hidden space-y-3">
              {filteredTeachers.map((teacher) => {
                const baseSalary = salaryDrafts[teacher._id] ?? teacher.baseSalary ?? 0;
                const pInfo = proratedMap[teacher._id];
                const effectiveAbsent = pInfo?.effectiveAbsent || 0;
                const attendanceDeduction = pInfo?.attendanceDeduction || 0;
                const netPayable = useProration ? (pInfo?.netPayable ?? baseSalary) : baseSalary;
                const paid = pInfo?.paidAmount || 0;
                const remaining = Math.max(0, netPayable - paid);

                let statusBadge = (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                    Unset
                  </span>
                );
                if (baseSalary > 0) {
                  if (paid >= netPayable && netPayable > 0) {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Paid
                      </span>
                    );
                  } else if (paid > 0) {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Partial
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Unpaid
                      </span>
                    );
                  }
                }

                return (
                  <div key={teacher._id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-sm shrink-0 border border-amber-200">
                          {(teacher.fullName || '?').charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight">{teacher.fullName}</h4>
                          <p className="text-xs text-slate-400">{teacher.specialization || 'Faculty'}</p>
                        </div>
                      </div>
                      {statusBadge}
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-black block">Base</span>
                        <div className="flex items-center justify-center gap-0.5 mt-0.5 bg-white border border-slate-200 rounded px-1 py-0.5">
                          <span className="text-[10px] text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={salaryDrafts[teacher._id] ?? ''}
                            onChange={(e) => handleBaseSalaryChange(teacher._id, e.target.value)}
                            className="w-14 text-center font-bold text-xs text-slate-800 bg-transparent outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-black block">
                          {useProration ? 'Net Due' : 'Total Due'}
                        </span>
                        <span className="text-xs font-black text-slate-800 block mt-1">₹{netPayable.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-black block">Balance</span>
                        <span className="text-xs font-bold text-rose-600 block mt-1">₹{remaining.toLocaleString()}</span>
                      </div>
                    </div>

                    {useProration && effectiveAbsent > 0 && (
                      <div className="text-[11px] bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 text-amber-900 flex justify-between items-center">
                        <span>Absent: <strong>{effectiveAbsent} days</strong></span>
                        <span className="text-rose-600 font-bold">Deduction: -₹{attendanceDeduction.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setSelectedPayslipData({
                            teacher,
                            proratedInfo: pInfo,
                            month: selectedMonth
                          });
                          setIsPayslipOpen(true);
                        }}
                        className="px-3 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <FaFileInvoiceDollar size={11} className="text-amber-600" /> Payslip
                      </button>
                      <button
                        onClick={() => handleOpenSalaryHistory(teacher)}
                        className="px-3 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <FaHistory size={11} /> Receipts
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTeacherForPay(teacher);
                          setIsPayModalOpen(true);
                        }}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <FaWallet size={11} /> Pay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ================= TAB 2: DAILY ATTENDANCE ================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-6 animate-fade-in">

            {/* Attendance Top Controls & Date Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs self-start">
                <FaCalendarDay className="text-rose-500" size={15} />
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Attendance Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-sm font-black text-slate-800 bg-transparent outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-rose-500/20 transition-all active:scale-95"
              >
                <FaSave /> {savingAttendance ? "Saving..." : `Save Attendance (${selectedDate})`}
              </button>
            </div>

            {/* Attendance Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total Staff</span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{teachers.length}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Faculty on roster</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[11px] font-black uppercase text-emerald-600 tracking-wider">Present Today</span>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{presentToday}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{attRate}% present rate</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[11px] font-black uppercase text-rose-600 tracking-wider">Absent Today</span>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{absentToday}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Staff absent</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[11px] font-black uppercase text-amber-600 tracking-wider">Leave / Half-Day</span>
                <h3 className="text-2xl font-black text-amber-600 mt-1">{leaveToday}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Partial / excused</p>
              </div>
            </div>

            {/* Attendance Filters & Batch Actions */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full md:w-80 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                <FaSearch className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search faculty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none text-sm text-slate-700 outline-none w-full font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => handleMarkAllAttendance('Present')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                >
                  <FaCheck size={11} /> Mark All Present
                </button>
                <button
                  onClick={() => handleMarkAllAttendance('Absent')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                >
                  <FaTimes size={11} /> Mark All Absent
                </button>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {['All', 'Present', 'Absent', 'Unmarked'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setAttendanceFilter(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        attendanceFilter === tab
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 🖥️ DESKTOP VIEW: Attendance Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="p-4">Faculty Member</th>
                      <th className="p-4">Department</th>
                      <th className="p-4">Status for {selectedDate}</th>
                      <th className="p-4 text-right">Monthly History</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTeachers.map((teacher) => {
                      const currentStatus = attendanceData[teacher._id];

                      return (
                        <tr key={teacher._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 font-black flex items-center justify-center text-sm shrink-0 border border-rose-200">
                                {(teacher.fullName || '?').charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 block">{teacher.fullName}</span>
                                <span className="text-xs text-slate-400">{teacher.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 text-slate-600 font-medium">
                            {teacher.specialization || teacher.highestQualification || 'Faculty'}
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(teacher._id, 'Present')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                                  currentStatus === 'Present'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                <FaCheck size={10} /> Present
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStatusChange(teacher._id, 'Absent')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                                  currentStatus === 'Absent'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                                }`}
                              >
                                <FaTimes size={10} /> Absent
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStatusChange(teacher._id, 'Half Day')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                  currentStatus === 'Half Day'
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                              >
                                Half Day
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStatusChange(teacher._id, 'On Leave')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                  currentStatus === 'On Leave'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700'
                                }`}
                              >
                                On Leave
                              </button>
                            </div>
                          </td>

                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleOpenAttHistory(teacher)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition inline-flex items-center gap-1 text-xs font-bold"
                              title="View Monthly History"
                            >
                              <FaHistory size={13} /> History
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 📱 MOBILE VIEW: Attendance Cards */}
            <div className="md:hidden space-y-3">
              {filteredTeachers.map((teacher) => {
                const currentStatus = attendanceData[teacher._id];

                return (
                  <div key={teacher._id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 font-black flex items-center justify-center text-sm shrink-0 border border-rose-200">
                          {(teacher.fullName || '?').charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight">{teacher.fullName}</h4>
                          <p className="text-xs text-slate-400">{teacher.specialization || 'Faculty'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenAttHistory(teacher)}
                        className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
                      >
                        <FaHistory size={11} /> History
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(teacher._id, 'Present')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                          currentStatus === 'Present'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        <FaCheck size={11} /> Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(teacher._id, 'Absent')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                          currentStatus === 'Absent'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50'
                        }`}
                      >
                        <FaTimes size={11} /> Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(teacher._id, 'Half Day')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center border ${
                          currentStatus === 'Half Day'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50'
                        }`}
                      >
                        Half Day
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(teacher._id, 'On Leave')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition text-center border ${
                          currentStatus === 'On Leave'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50'
                        }`}
                      >
                        On Leave
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ================= TAB 3: WORK & PAY OVERVIEW (PRORATED CORRELATION) ================= */}
        {activeTab === 'summary' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-800">Attendance vs. Prorated Payroll Audit</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Live Proration Engine
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Full mathematical breakdown: Base Salary − Absent Deductions (Absent Days × Daily Rate) = Net Due Payable.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 self-start md:self-center">
                <FaCalendarAlt className="text-blue-500" size={14} />
                <label className="text-xs font-bold text-slate-500 uppercase">Month:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="p-4">Faculty Member</th>
                      <th className="p-4">Base Salary</th>
                      <th className="p-4">Days Present</th>
                      <th className="p-4">Absent / Penalty</th>
                      <th className="p-4">Daily Rate</th>
                      <th className="p-4">Absent Deduction</th>
                      <th className="p-4">Net Prorated Due</th>
                      <th className="p-4">Amount Paid</th>
                      <th className="p-4">Balance</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(proratedPayrollData?.teachers || []).map(pt => {
                      return (
                        <tr key={pt.teacherId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4 font-bold text-slate-800">
                            {pt.fullName}
                            <span className="block text-xs font-normal text-slate-400">{pt.specialization}</span>
                          </td>
                          <td className="p-4 font-bold text-slate-700">₹{pt.baseSalary.toLocaleString()}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {pt.presentDays} Days
                            </span>
                          </td>
                          <td className="p-4">
                            {pt.effectiveAbsent > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                                {pt.effectiveAbsent} Days ({pt.absentDays}A, {pt.halfDays}HD)
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-emerald-600">0 Absent</span>
                            )}
                          </td>
                          <td className="p-4 text-xs font-bold text-slate-500">₹{pt.dailyRate}/day</td>
                          <td className="p-4 font-bold text-rose-600">
                            {pt.attendanceDeduction > 0 ? `-₹${pt.attendanceDeduction.toLocaleString()}` : '₹0'}
                          </td>
                          <td className="p-4 font-black text-slate-900">₹{pt.netPayable.toLocaleString()}</td>
                          <td className="p-4 font-bold text-emerald-600">₹{pt.paidAmount.toLocaleString()}</td>
                          <td className="p-4 font-bold text-slate-700">₹{pt.remainingBalance.toLocaleString()}</td>
                          <td className="p-4">
                            {pt.baseSalary > 0 && pt.paidAmount >= pt.netPayable ? (
                              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                Fully Settled
                              </span>
                            ) : pt.paidAmount > 0 ? (
                              <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                Partial
                              </span>
                            ) : (
                              <span className="text-xs font-black text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ================= MODALS ================= */}
      {/* 1. Pay Salary Modal with Proration Integration */}
      {selectedTeacherForPay && (
        <TeacherSalaryModal
          isOpen={isPayModalOpen}
          initialMonth={selectedMonth}
          onClose={() => {
            setIsPayModalOpen(false);
            setSelectedTeacherForPay(null);
            fetchTeachers();
            fetchProratedPayroll();
          }}
          teacher={selectedTeacherForPay}
        />
      )}

      {/* 2. Salary History Modal */}
      {isSalaryHistoryOpen && selectedTeacherForSalaryHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="bg-slate-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                  <FaHistory size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedTeacherForSalaryHistory.fullName}</h3>
                  <p className="text-xs text-slate-400">Complete Salary Receipts</p>
                </div>
              </div>
              <button
                onClick={() => setIsSalaryHistoryOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 bg-slate-50 flex-1">
              {loadingSalaryHistory ? (
                <div className="py-12 text-center text-slate-400">Loading receipts...</div>
              ) : salaryHistoryList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No payment receipts on record.</div>
              ) : (
                salaryHistoryList.map((rec) => (
                  <div
                    key={rec._id}
                    className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 text-base">₹{rec.amountPaid?.toLocaleString()}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          {rec.paymentType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Month: <span className="font-semibold text-slate-600">{rec.month}</span> • Paid on: {new Date(rec.paymentDate).toLocaleDateString()}
                      </p>
                      {rec.attendanceDeduction > 0 && (
                        <p className="text-xs font-bold text-rose-500 mt-0.5">
                          Attendance Deductions ({rec.effectiveAbsentDays} days): -₹{rec.attendanceDeduction.toLocaleString()}
                        </p>
                      )}
                      {rec.remarks && (
                        <p className="text-xs text-slate-500 italic mt-0.5">Note: "{rec.remarks}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedPayslipData({
                            teacher: selectedTeacherForSalaryHistory,
                            paymentRecord: rec,
                            proratedInfo: proratedMap[selectedTeacherForSalaryHistory._id],
                            month: rec.month
                          });
                          setIsPayslipOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs"
                        title="Print / Download Payslip"
                      >
                        <FaPrint size={12} className="text-amber-600" /> Slip
                      </button>

                      <button
                        onClick={() => handleWhatsAppReceipt(rec)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition"
                      >
                        <FaWhatsapp size={14} className="text-emerald-600" /> Share
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Attendance History Modal */}
      {isAttHistoryOpen && selectedTeacherForAttHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="bg-slate-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
                  <FaCalendarCheck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedTeacherForAttHistory.fullName}</h3>
                  <p className="text-xs text-slate-400">Monthly Attendance Log</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={attHistoryMonth}
                  onChange={(e) => {
                    setAttHistoryMonth(e.target.value);
                    fetchAttHistory(selectedTeacherForAttHistory._id, e.target.value);
                  }}
                  className="bg-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg outline-none font-bold"
                />
                <button
                  onClick={() => setIsAttHistoryOpen(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-2.5 bg-slate-50 flex-1">
              {loadingAttHistory ? (
                <div className="py-12 text-center text-slate-400">Loading history records...</div>
              ) : attHistoryRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No attendance records found for this month.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attHistoryRecords.map((rec) => {
                    const isPresent = rec.status === 'Present';
                    return (
                      <div
                        key={rec._id}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          isPresent
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/70 border-rose-200 text-rose-900'
                        }`}
                      >
                        <span className="font-bold text-xs">{rec.date}</span>
                        <span
                          className={`text-[11px] font-black uppercase px-2 py-0.5 rounded ${
                            isPresent ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Official Payslip Modal (Option B) */}
      {isPayslipOpen && selectedPayslipData && (
        <TeacherPayslipModal
          isOpen={isPayslipOpen}
          onClose={() => {
            setIsPayslipOpen(false);
            setSelectedPayslipData(null);
          }}
          teacher={selectedPayslipData.teacher}
          paymentRecord={selectedPayslipData.paymentRecord}
          proratedInfo={selectedPayslipData.proratedInfo}
          month={selectedPayslipData.month}
        />
      )}

    </Layout>
  );
};

export default TeacherOperationsHub;
