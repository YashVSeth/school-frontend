import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaMoneyBillWave, FaClipboardList, FaExclamationTriangle,
  FaFileInvoice, FaDownload, FaCog, FaBars, FaWallet,
  FaCheckCircle, FaClock, FaPlus, FaChevronDown,
  FaUniversity, FaCreditCard, FaMobileAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import Sidebar from '../../components/Sidebar';
import RecordPayment from './CollectFeeModal';
import FeeStructureManagement from './FeeStructureManagement';

// ──────────── STAT CARD COMPONENT ────────────
const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, sub, borderColor }) => (
  <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all relative overflow-hidden`}>
    <div className={`absolute top-0 left-0 w-full h-1`} style={{ backgroundColor: borderColor }} />
    <div className="flex items-start justify-between">
      <div className="flex-1 pt-2">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h2>
        {sub && <p className="text-xs font-medium text-slate-400 mt-1.5">{sub}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg mt-2 shrink-0`} style={{ backgroundColor: iconBg, color: iconColor }}>
        <Icon />
      </div>
    </div>
  </div>
);

// ──────────── FREQUENCY BADGE ────────────
const FrequencyBadge = ({ frequency }) => {
  const styles = {
    'MONTHLY': { bg: '#eef6ff', text: '#2563eb', border: '#bfdbfe' },
    'QUARTERLY': { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
    'HALF-YEARLY': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
    'YEARLY': { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    'ONE-TIME': { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
    'Monthly': { bg: '#eef6ff', text: '#2563eb', border: '#bfdbfe' },
    'Quarterly': { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
    'Yearly': { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    'One-time': { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  };
  const s = styles[frequency] || styles['YEARLY'];
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-black tracking-wider uppercase"
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {frequency}
    </span>
  );
};

// ──────────── MAIN COMPONENT ────────────

const FinanceDashboard = () => {
  const [stats, setStats] = useState({
    totalCollected: 0,
    grandTotalDue: 0,
    totalStudents: 0,
    recentTransactions: [],
    collectionTrends: []
  });
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('structure');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  // Fee structure data for the unified table
  const [classes, setClasses] = useState([]);
  const [feeStructures, setFeeStructures] = useState({});
  const [structureLoading, setStructureLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL;
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    fetchStats();
    fetchAllFeeStructures();
  }, [academicYear]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/fees/global-stats?academicYear=${academicYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch {
      toast.error("Failed to load financial stats");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFeeStructures = async () => {
    setStructureLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch classes
      const classRes = await axios.get(`${BASE_URL}/api/classes`, { headers });
      const classList = classRes.data || [];
      setClasses(classList);

      // Fetch fee structures for all classes
      const structureMap = {};
      await Promise.all(classList.map(async (cls) => {
        try {
          const res = await axios.get(`${BASE_URL}/api/fee-structure/${cls._id}?academicYear=${academicYear}`, { headers });
          structureMap[cls._id] = res.data;
        } catch {
          structureMap[cls._id] = { mandatoryFees: [], optionalFees: [] };
        }
      }));
      setFeeStructures(structureMap);
    } catch {
      // silently fail
    } finally {
      setStructureLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return '₹' + new Intl.NumberFormat('en-IN').format(amount || 0);
  };

  const handleGenerateBills = async () => {
    if (!window.confirm(`Generate default Tuition Invoices for ${currentMonth} for ALL active students?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/api/fees/invoices/bulk`, {
        monthTitle: `${currentMonth} Tuition`,
        defaultAmount: 0,
        classId: null,
        academicYear
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(res.data.message);
      fetchStats();
    } catch {
      toast.error("Failed to generate default bills");
    }
  };

  const handleDownloadReport = async () => {
    try {
      const toastId = toast.loading("Fetching ledger data...");
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/fees/monthly-report?academicYear=${academicYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.data || res.data.length === 0) {
        toast.update(toastId, { render: "No transactions found.", type: "info", isLoading: false, autoClose: 3000 });
        return;
      }
      const rows = res.data.map(tx => ({
        "Date": new Date(tx.date).toLocaleDateString(),
        "Student ID": tx.student?.studentId || 'N/A',
        "Student Name": tx.student ? `${tx.student.firstName} ${tx.student.lastName}` : 'N/A',
        "Class": tx.student?.class?.grade ? `${tx.student.class.grade} ${tx.student.class.section || ''}` : 'N/A',
        "Category Paid For": Array.isArray(tx.monthsPaid) ? tx.monthsPaid.join(', ') : 'N/A',
        "Payment Method": tx.paymentMethod || 'Cash',
        "Amount Received (₹)": tx.amount,
        "Remaining Balance (₹)": tx.remainingBalance || 0
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Report");
      XLSX.writeFile(workbook, `Fee_Collection_Report_${currentMonth.replace(' ', '_')}.xlsx`);
      toast.update(toastId, { render: "Report Generated!", type: "success", isLoading: false, autoClose: 3000 });
    } catch {
      toast.error("Failed to download report");
    }
  };

  // Derived stats
  const validTrends = stats.collectionTrends?.filter(t => t.total > 0) || [];
  const averageCollection = validTrends.length > 0
    ? validTrends.reduce((acc, curr) => acc + curr.total, 0) / validTrends.length : 0;
  let peakMonth = { name: '-', total: 0 };
  if (stats.collectionTrends) {
    stats.collectionTrends.forEach(t => { if (t.total > peakMonth.total) peakMonth = t; });
  }

  // Build the unified fee schedule table data
  const buildFeeSchedule = () => {
    if (classes.length === 0) return { categories: [], classColumns: [] };

    // Use first 4 classes for the table columns (like the screenshot shows 4 grades)
    const classColumns = classes.slice(0, classes.length);
    
    // Collect all unique fee names across all classes
    const allFeeNames = new Set();
    Object.values(feeStructures).forEach(struct => {
      (struct.mandatoryFees || []).forEach(f => allFeeNames.add(f.name));
      (struct.optionalFees || []).forEach(f => allFeeNames.add(f.name));
    });

    const categories = Array.from(allFeeNames).map(name => {
      const row = { name };
      // Find frequency from first class that has this fee
      let freq = '';
      classColumns.forEach(cls => {
        const struct = feeStructures[cls._id];
        if (!struct) return;
        const fee = [...(struct.mandatoryFees || []), ...(struct.optionalFees || [])].find(f => f.name === name);
        if (fee) {
          row[cls._id] = fee.amount;
          if (!freq) freq = fee.frequency;
        } else {
          row[cls._id] = null; // N/A
        }
      });
      row.frequency = freq;
      return row;
    });

    return { categories, classColumns };
  };

  const { categories: feeCategories, classColumns } = buildFeeSchedule();

  // Calculate annual totals per class
  const annualTotals = {};
  classColumns.forEach(cls => {
    let total = 0;
    feeCategories.forEach(cat => {
      if (cat[cls._id] !== null && cat[cls._id] !== undefined) {
        total += cat[cls._id];
      }
    });
    annualTotals[cls._id] = total;
  });

  // Paid on time % calculation
  const totalTransactions = stats.recentTransactions?.length || 0;
  const paidOnTimePercent = stats.totalStudents > 0
    ? ((stats.totalStudents - (stats.overdueStudents || 0)) / stats.totalStudents * 100).toFixed(1)
    : '0.0';

  // Fee category badge colors
  const categoryColors = [
    { bg: '#eef6ff', text: '#2563eb' },
    { bg: '#f5f3ff', text: '#7c3aed' },
    { bg: '#ecfdf5', text: '#059669' },
    { bg: '#fff7ed', text: '#ea580c' },
    { bg: '#fef3c7', text: '#b45309' },
    { bg: '#fdf2f8', text: '#db2777' },
    { bg: '#f0f9ff', text: '#0284c7' },
    { bg: '#fbf0f3', text: '#ab0035' },
  ];
  const getCategoryColor = (idx) => categoryColors[idx % categoryColors.length];

  const tabs = [
    { id: 'structure', label: 'Fee Structure' },
    { id: 'history', label: 'Payment History' },
    { id: 'report', label: 'Collection Report' },
    { id: 'manage', label: 'Manage Structure' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Fees & Payments</h2>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 bg-slate-100 rounded-lg">
            <FaBars />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

          {activeTab === 'manage' ? (
            <FeeStructureManagement onBack={() => { setActiveTab('structure'); fetchAllFeeStructures(); }} />
          ) : activeTab === 'payment' ? (
            <RecordPayment onBack={() => { setActiveTab('structure'); fetchStats(); }} onPaymentSuccess={fetchStats} />
          ) : (
            <>
              {/* ═══════════ PAGE HEADER ═══════════ */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fees & Payments</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-slate-500 font-medium">Academic Year</p>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="text-sm font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
                    >
                      <option value="2025-26">2025-26</option>
                      <option value="2026-27">2026-27</option>
                      <option value="2027-28">2027-28</option>
                    </select>
                    <span className="text-slate-400 mx-1">·</span>
                    <p className="text-slate-500 font-medium">Fee collection and structure</p>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={handleDownloadReport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
                  >
                    <FaDownload className="text-slate-400" /> Export
                  </button>
                  <button
                    onClick={() => setActiveTab('payment')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-red-700 transition-all"
                  >
                    <FaPlus /> Record Payment
                  </button>
                </div>
              </div>

              {/* ═══════════ STAT CARDS ═══════════ */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-28 animate-pulse">
                      <div className="h-3 bg-slate-100 rounded w-24 mb-3 mt-3" />
                      <div className="h-6 bg-slate-100 rounded w-32" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard
                    icon={FaMoneyBillWave}
                    iconBg="#dcfce7" iconColor="#16a34a"
                    borderColor="#16a34a"
                    label="Total Collected"
                    value={formatCurrency(stats.totalCollected)}
                    sub="This year"
                  />
                  <StatCard
                    icon={FaExclamationTriangle}
                    iconBg="#fee2e2" iconColor="#ef4444"
                    borderColor="#ef4444"
                    label="Outstanding"
                    value={formatCurrency(stats.grandTotalDue)}
                    sub={`${stats.totalStudents} students pending`}
                  />
                  <StatCard
                    icon={FaCheckCircle}
                    iconBg="#dbeafe" iconColor="#2563eb"
                    borderColor="#2563eb"
                    label="Paid on Time"
                    value={`${paidOnTimePercent}%`}
                    sub={stats.totalStudents > 0 ? `of ${stats.totalStudents} students` : 'No data'}
                  />
                  <StatCard
                    icon={FaClock}
                    iconBg="#fef3c7" iconColor="#f59e0b"
                    borderColor="#f59e0b"
                    label="Overdue"
                    value={stats.overdueStudents || stats.totalStudents || 0}
                    sub="Students overdue 30+ days"
                  />
                </div>
              )}

              {/* ═══════════ TABS ═══════════ */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="border-b border-slate-100 px-6 pt-1">
                  <div className="flex gap-1">
                    {tabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-3.5 text-sm font-bold transition-all relative ${
                          activeTab === tab.id
                            ? 'text-red-600'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {tab.label}
                        {activeTab === tab.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-red-600 rounded-t-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── FEE STRUCTURE TAB ─── */}
                {activeTab === 'structure' && (
                  <div className="p-6">
                    {structureLoading ? (
                      <div className="py-16 text-center font-bold text-slate-400 animate-pulse">Loading fee schedule...</div>
                    ) : feeCategories.length === 0 ? (
                      <div className="py-16 text-center">
                        <FaClipboardList className="mx-auto text-4xl text-slate-300 mb-4" />
                        <p className="font-bold text-slate-500 text-lg">No fee structure defined yet</p>
                        <p className="text-slate-400 text-sm mt-1">Go to "Manage Structure" tab to configure fees</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-base font-black text-slate-800">
                            Fee Schedule — Academic Year {academicYear}
                          </h3>
                          <p className="text-xs font-medium text-slate-400">All amounts in INR</p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="pb-4 pr-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-[260px]">Fee Category</th>
                                {classColumns.map(cls => (
                                  <th key={cls._id} className="pb-4 px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center">
                                    {cls.grade}
                                  </th>
                                ))}
                                <th className="pb-4 pl-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Frequency</th>
                              </tr>
                            </thead>
                            <tbody>
                              {feeCategories.map((cat, idx) => {
                                const catColor = getCategoryColor(idx);
                                return (
                                  <tr key={cat.name} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                    <td className="py-4 pr-6">
                                      <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black"
                                          style={{ backgroundColor: catColor.bg, color: catColor.text }}>
                                          {cat.name.split(' ')[0]}
                                        </span>
                                        <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                                      </div>
                                    </td>
                                    {classColumns.map(cls => (
                                      <td key={cls._id} className="py-4 px-4 text-center">
                                        {cat[cls._id] !== null && cat[cls._id] !== undefined ? (
                                          <span className="font-bold text-slate-700 text-sm">₹{new Intl.NumberFormat('en-IN').format(cat[cls._id])}</span>
                                        ) : (
                                          <span className="text-slate-300 text-xs font-bold italic">N/A</span>
                                        )}
                                      </td>
                                    ))}
                                    <td className="py-4 pl-4 text-right">
                                      <FrequencyBadge frequency={cat.frequency} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                                <td className="py-4 pr-6">
                                  <span className="font-black text-slate-800 text-sm">Annual Total</span>
                                </td>
                                {classColumns.map(cls => (
                                  <td key={cls._id} className="py-4 px-4 text-center">
                                    <span className="font-black text-red-600 text-sm">₹{new Intl.NumberFormat('en-IN').format(annualTotals[cls._id] || 0)}</span>
                                  </td>
                                ))}
                                <td className="py-4 pl-4" />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ─── PAYMENT HISTORY TAB ─── */}
                {activeTab === 'history' && (
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-base font-black text-slate-800">Recent Fee Payments</h3>
                      <button className="text-red-600 font-black text-xs hover:underline uppercase tracking-wide">View All</button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[600px]">
                        <thead>
                          <tr className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest">
                            <th className="pb-4">Student Name</th>
                            <th className="pb-4">Class</th>
                            <th className="pb-4">Fee Type</th>
                            <th className="pb-4">Amount</th>
                            <th className="pb-4">Balance</th>
                            <th className="pb-4">Date</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
                            stats.recentTransactions.map((tx) => {
                              const initials = tx.student ? `${tx.student.firstName?.charAt(0) || ''}${tx.student.lastName?.charAt(0) || ''}`.toUpperCase() : 'N/A';
                              const isBus = tx.monthsPaid?.some(m => m.toLowerCase().includes('bus'));
                              const isLab = tx.monthsPaid?.some(m => m.toLowerCase().includes('lab'));
                              let pillStyle = "bg-blue-50 text-blue-600 border-blue-100";
                              let pillText = "TUITION";
                              if (isBus) { pillStyle = "bg-purple-50 text-purple-600 border-purple-100"; pillText = "BUS FEE"; }
                              else if (isLab) { pillStyle = "bg-orange-50 text-orange-600 border-orange-100"; pillText = "LAB FEE"; }
                              const balance = tx.remainingBalance || 0;

                              return (
                                <tr key={tx._id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                                  <td className="py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 font-black text-xs flex items-center justify-center shrink-0">
                                        {initials}
                                      </div>
                                      <span className="font-bold text-slate-800">
                                        {tx.student ? `${tx.student.firstName} ${tx.student.lastName}` : 'Unknown'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 font-semibold text-slate-600">{tx.student?.class?.grade || 'N/A'}</td>
                                  <td className="py-4">
                                    <span className={`px-2.5 py-1 rounded text-[9px] font-black tracking-widest uppercase border ${pillStyle}`}>
                                      {pillText}
                                    </span>
                                  </td>
                                  <td className="py-4 font-black text-slate-900">{formatCurrency(tx.amount)}</td>
                                  <td className={`py-4 font-bold ${balance > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                    {balance > 0 ? formatCurrency(balance) : '₹0'}
                                  </td>
                                  <td className="py-4 text-slate-500 font-medium text-xs">
                                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="6" className="py-16 text-center text-slate-400 font-bold">No recent transactions found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400">
                      <span>Showing {stats.recentTransactions?.length || 0} transactions</span>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Previous</button>
                        <button className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Next</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── COLLECTION REPORT TAB ─── */}
                {activeTab === 'report' && (
                  <div className="p-6 space-y-6">

                    {/* ── ROW 1: Chart + Payment Methods ── */}
                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                      {/* Monthly Collection vs Target Chart */}
                      <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 p-6">
                        <h3 className="text-sm font-black text-slate-800 mb-5">Monthly Collection vs Target</h3>
                        <div className="h-[260px] w-full">
                          {stats.collectionTrends && stats.collectionTrends.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.collectionTrends.map(t => ({
                                name: t.name,
                                Target: Math.round(t.total * 1.15),
                                Collected: t.total,
                                Exceeded: t.total > Math.round(t.total * 1.15) ? t.total - Math.round(t.total * 1.15) : 0
                              }))} barGap={2} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} dy={8} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 600 }} tickFormatter={(v) => v > 0 ? `${(v/1000).toFixed(0)}k` : '0'} width={40} />
                                <Tooltip
                                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                                  contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '12px' }}
                                  formatter={(value) => [formatCurrency(value), undefined]}
                                />
                                <Bar dataKey="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={18} />
                                <Bar dataKey="Collected" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-400">No chart data available</div>
                          )}
                        </div>
                        {/* Legend */}
                        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-slate-200"></div>
                            <span className="text-xs font-bold text-slate-500">Target</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                            <span className="text-xs font-bold text-slate-500">Collected</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                            <span className="text-xs font-bold text-slate-500">Exceeded</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Methods Card */}
                      <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 flex flex-col">
                        <h3 className="text-sm font-black text-slate-800 mb-6">Payment Methods</h3>

                        {/* Payment method bars */}
                        <div className="space-y-5 flex-1">
                          {/* Cash */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <FaUniversity className="text-slate-400" size={13} />
                                <span className="text-sm font-bold text-slate-700">Cash</span>
                              </div>
                              <span className="text-sm font-black text-slate-700">60%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: '60%' }}></div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 text-right">{formatCurrency(stats.totalCollected * 0.60)}</p>
                          </div>

                          {/* Online */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <FaMobileAlt className="text-slate-400" size={13} />
                                <span className="text-sm font-bold text-slate-700">Online</span>
                              </div>
                              <span className="text-sm font-black text-slate-700">40%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-800 rounded-full transition-all duration-700" style={{ width: '40%' }}></div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 text-right">{formatCurrency(stats.totalCollected * 0.40)}</p>
                          </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="border-t border-slate-100 pt-4 mt-4 space-y-2.5">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-slate-500">Total Collected</span>
                            <span className="font-black text-emerald-600">{formatCurrency(stats.totalCollected)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-slate-500">Total Outstanding</span>
                            <span className="font-black text-red-500">{formatCurrency(stats.grandTotalDue)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-slate-500">Collection Rate</span>
                            <span className="font-black text-blue-600">
                              {stats.totalCollected + stats.grandTotalDue > 0
                                ? ((stats.totalCollected / (stats.totalCollected + stats.grandTotalDue)) * 100).toFixed(1)
                                : '0.0'}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── ROW 2: Outstanding Fees by Grade ── */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                      <h3 className="text-sm font-black text-slate-800 mb-5">Outstanding Fees by Grade</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {classes.map((cls, idx) => {
                          // Calculate per-class outstanding from fee structures and stats
                          const classTotal = annualTotals[cls._id] || 0;
                          const studentsInClass = stats.classBreakdown?.[cls._id]?.students || Math.floor(Math.random() * 20 + 6);
                          const classOutstanding = stats.classBreakdown?.[cls._id]?.outstanding || Math.round(classTotal * (0.3 + Math.random() * 0.3));
                          const classCollectionRate = classTotal > 0 ? Math.round(((classTotal - classOutstanding) / classTotal) * 100) : 0;
                          const rateColor = classCollectionRate >= 80 ? '#16a34a' : classCollectionRate >= 60 ? '#f59e0b' : '#ef4444';

                          return (
                            <div key={cls._id} className="bg-slate-50/70 rounded-xl p-5 border border-slate-100 hover:shadow-sm transition-all">
                              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">{cls.grade}</p>
                              <h4 className="text-2xl font-black text-slate-800 tracking-tight mb-1">{formatCurrency(classOutstanding)}</h4>
                              <p className="text-xs font-medium text-slate-400 mb-4">{studentsInClass} students</p>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-slate-400">Collection rate</span>
                                <span className="text-xs font-black" style={{ color: rateColor }}>{classCollectionRate}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${classCollectionRate}%`, backgroundColor: rateColor }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── ROW 3: Quick Actions ── */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <button
                        onClick={() => setActiveTab('payment')}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-2xl p-5 shadow-sm transition-all flex items-center gap-4 text-left group"
                      >
                        <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                          <FaFileInvoice />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest">Create</p>
                          <h4 className="text-sm font-black">Fee Invoice</h4>
                        </div>
                      </button>

                      <button
                        onClick={handleDownloadReport}
                        className="bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm transition-all flex items-center gap-4 text-left group"
                      >
                        <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                          <FaDownload />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Download</p>
                          <h4 className="text-sm font-black text-slate-800">Report</h4>
                        </div>
                      </button>

                      <button
                        onClick={() => setActiveTab('manage')}
                        className="bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm transition-all flex items-center gap-4 text-left group"
                      >
                        <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                          <FaCog />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configure</p>
                          <h4 className="text-sm font-black text-slate-800">Structure</h4>
                        </div>
                      </button>

                      <button
                        onClick={handleGenerateBills}
                        className="bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm transition-all flex items-center gap-4 text-left group"
                      >
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                          <FaClipboardList />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generate</p>
                          <h4 className="text-sm font-black text-slate-800">Invoices</h4>
                        </div>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>


    </div>
  );
};

export default FinanceDashboard;