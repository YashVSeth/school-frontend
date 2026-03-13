import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaMoneyBillWave, FaClipboardList, FaExclamationTriangle,
  FaFileInvoice, FaDownload, FaCog, FaBars, FaWallet
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import Sidebar from '../../components/Sidebar';
import CollectFeeModal from './CollectFeeModal';
import FeeStructureManagement from './FeeStructureManagement';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollectFeeModalOpen, setIsCollectFeeModalOpen] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL;
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    fetchStats();
  }, [academicYear]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/fees/global-stats?academicYear=${academicYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      toast.error("Failed to load financial stats");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  const handleGenerateBills = async () => {
    if (!window.confirm(`Generate default Tuition Invoices for ${currentMonth} for ALL active students based on their specific Grade Fee Structure?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/api/fees/invoices/bulk`, {
        monthTitle: `${currentMonth} Tuition`,
        defaultAmount: 0, // Backend auto-overrides this now
        classId: null,
        academicYear
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(res.data.message);
      fetchStats();
    } catch (error) {
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
        toast.update(toastId, { render: "No transactions found for this month.", type: "info", isLoading: false, autoClose: 3000 });
        return;
      }

      // Map raw data into clean Excel rows
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

      // Generate Worksheet
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Report");

      // Trigger Download
      XLSX.writeFile(workbook, `Fee_Collection_Report_${currentMonth.replace(' ', '_')}.xlsx`);

      toast.update(toastId, { render: "Report Generated Successfully!", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      console.error(error);
      toast.error("Failed to download report");
    }
  };

  // Derived Statistics for the Chart Footer
  const validTrends = stats.collectionTrends?.filter(t => t.total > 0) || [];
  const averageCollection = validTrends.length > 0
    ? validTrends.reduce((acc, curr) => acc + curr.total, 0) / validTrends.length
    : 0;

  // Find the Peak Month
  let peakMonth = { name: '-', total: 0 };
  if (stats.collectionTrends) {
    stats.collectionTrends.forEach(t => {
      if (t.total > peakMonth.total) peakMonth = t;
    });
  }

  // Mock Late Fees since it isn't tracked in DB

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <h2 className="font-bold text-slate-800">EduPay Dashboard</h2>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 bg-slate-100 rounded-lg">
            <FaBars />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

          {activeTab === 'structure' ? (
            <FeeStructureManagement onBack={() => setActiveTab('overview')} />
          ) : (
            <>
              {/* PAGE HEADER */}
              <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Overview</h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-slate-500 font-medium">Real-time school fee collection status for Academic Year</p>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="text-sm font-black text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none"
                  >
                    <option value="2025-26">2025-26</option>
                    <option value="2026-27">2026-27</option>
                    <option value="2027-28">2027-28</option>
                    <option value="2028-29">2028-29</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Calculating Ledger...</div>
              ) : (
                <>
                  {/* TOP 3 METRIC CARDS */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Total Fees Collected */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-emerald-100/50 text-emerald-500 rounded-xl flex items-center justify-center text-xl">
                          <FaMoneyBillWave />
                        </div>
                        <span className="text-emerald-500 font-bold text-xs flex items-center gap-1">↗ +12.5%</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 mb-1">Total Fees Collected</p>
                        <h2 className="text-3xl font-black text-slate-800">{formatCurrency(stats.totalCollected)}</h2>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">vs. last month ₹40.1L</p>
                      </div>
                    </div>

                    {/* Outstanding Balances */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-amber-100/50 text-amber-500 rounded-xl flex items-center justify-center text-xl">
                          <FaClipboardList />
                        </div>
                        <span className="text-amber-500 font-bold text-xs flex items-center gap-1">→ 0.2%</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 mb-1">Outstanding Balances</p>
                        <h2 className="text-3xl font-black text-slate-800">{formatCurrency(stats.grandTotalDue)}</h2>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">{stats.totalStudents} students with pending balances</p>
                      </div>
                    </div>

                    {/* Late Fees Charged */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-red-100/50 text-red-600 rounded-xl flex items-center justify-center text-xl">
                          <FaExclamationTriangle />
                        </div>
                        <span className="text-red-500 font-bold text-xs flex items-center gap-1">↗ +2.4%</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 mb-1">Late Fees Charged</p>
                        <h2 className="text-3xl font-black text-slate-800">{formatCurrency(stats.lateFeesCharged || 0)}</h2>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">Applied to 85 overdue accounts</p>
                      </div>
                    </div>
                  </div>

                  {/* MAIN CHARTS AND TABLES */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">

                    {/* LEFT: Collection Trends Chart */}
                    <div className="xl:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-lg font-black text-slate-800">Collection Trends</h3>
                          <p className="text-xs font-medium text-slate-400 mt-1">Monthly breakdown</p>
                        </div>
                        <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                          Last 6 Months
                        </span>
                      </div>

                      <div className="h-[250px] w-full mb-6 relative">
                        {stats.collectionTrends && stats.collectionTrends.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.collectionTrends}>
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} dy={10} />
                              <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                              />
                              <Bar dataKey="total" radius={[6, 6, 6, 6]} barSize={36}>
                                {stats.collectionTrends.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.name === peakMonth.name ? '#800000' : '#f3e8e8'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-400">No chart data</div>
                        )}
                      </div>

                      <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-500">Average Collection</span>
                          <span className="font-black text-slate-800">{formatCurrency(averageCollection)} / Mo</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-500">Peak Month</span>
                          <span className="font-black text-[#800000]">{peakMonth.name}</span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Recent Fee Payments Table */}
                    <div className="xl:col-span-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-slate-800">Recent Fee Payments</h3>
                        <button className="text-[#800000] font-black text-xs hover:underline uppercase tracking-wide">
                          View All
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                          <thead>
                            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
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
                              stats.recentTransactions.map((tx, idx) => {
                                const initials = tx.student ? `${tx.student.firstName?.charAt(0) || ''}${tx.student.lastName?.charAt(0) || ''}`.toUpperCase() : 'N/A';

                                // Mock assigning different pill colors based on fee type since original DB just stores strings
                                const isBus = tx.monthsPaid?.some(m => m.toLowerCase().includes('bus'));
                                const isLab = tx.monthsPaid?.some(m => m.toLowerCase().includes('lab'));

                                let pillStyle = "bg-blue-50 text-blue-600";
                                let pillText = "TUITION";

                                if (isBus) { pillStyle = "bg-purple-50 text-purple-600"; pillText = "BUS FEE"; }
                                else if (isLab) { pillStyle = "bg-orange-50 text-orange-600"; pillText = "LAB FEE"; }

                                // Mock outstanding balance to match mockup (or we'd need to calculate it deeply per student)
                                const balance = tx.remainingBalance || 0;

                                return (
                                  <tr key={tx._id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-50 text-[#800000] font-black text-xs flex items-center justify-center shrink-0">
                                          {initials}
                                        </div>
                                        <span className="font-bold text-slate-800">
                                          {tx.student ? `${tx.student.firstName} ${tx.student.lastName}` : 'Unknown'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4 font-semibold text-slate-600">
                                      {tx.student?.class?.grade || 'N/A'}
                                    </td>
                                    <td className="py-4">
                                      <span className={`px-2.5 py-1 rounded text-[9px] font-black tracking-widest uppercase ${pillStyle}`}>
                                        {pillText}
                                      </span>
                                    </td>
                                    <td className="py-4 font-black text-slate-900">
                                      {formatCurrency(tx.amount)}
                                    </td>
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
                                <td colSpan="6" className="py-8 text-center text-slate-400 font-bold">No recent transactions found.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400">
                        <span>Showing {stats.recentTransactions?.length || 0} of 1,240 transactions</span>
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 transition-colors">Previous</button>
                          <button className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 transition-colors">Next</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ACTION GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Action 1 */}
                    <button
                      onClick={() => setIsCollectFeeModalOpen(true)}
                      className="bg-[#800000] hover:bg-[#660000] text-white rounded-2xl p-6 shadow-md transition-all flex items-center gap-5 text-left group"
                    >
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        <FaFileInvoice />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest mb-1">Create New</p>
                        <h3 className="text-xl font-black">Fee Invoice</h3>
                      </div>
                    </button>

                    {/* Action 2 */}
                    <button
                      onClick={handleDownloadReport}
                      className="bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-sm transition-all flex items-center gap-5 text-left group"
                    >
                      <div className="w-12 h-12 bg-red-50 text-[#800000] rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        <FaDownload />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Download</p>
                        <h3 className="text-xl font-black text-slate-800">Monthly Report</h3>
                      </div>
                    </button>

                    {/* Action 3 */}
                    <button
                      onClick={() => setActiveTab('structure')}
                      className="bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-sm transition-all flex items-center gap-5 text-left group"
                    >
                      <div className="w-12 h-12 bg-red-50 text-[#800000] rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        <FaCog />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Configure</p>
                        <h3 className="text-xl font-black text-slate-800">Fee Structure</h3>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <CollectFeeModal
        isOpen={isCollectFeeModalOpen}
        onClose={() => setIsCollectFeeModalOpen(false)}
        onPaymentSuccess={fetchStats}
      />
    </div>
  );
};

export default FinanceDashboard;