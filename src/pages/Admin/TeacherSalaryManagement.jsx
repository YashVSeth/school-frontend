import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import TeacherSalaryModal from './TeacherSalaryModal';
import axios from 'axios';
import {
  FaMoneyCheckAlt, FaSearch, FaCalendarAlt, FaHistory, FaCheckCircle,
  FaExclamationCircle, FaHourglassHalf, FaSave, FaUserTie, FaWallet,
  FaArrowUp, FaFileInvoiceDollar, FaWhatsapp, FaTimes
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const TeacherSalaryManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Base Salaries draft changes: { [teacherId]: amount }
  const [salaryDrafts, setSalaryDrafts] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [savingBase, setSavingBase] = useState(false);

  // Month payment history cache: { [teacherId]: sumPaid }
  const [monthlyPaidMap, setMonthlyPaidMap] = useState({});
  const [loadingMonthlyPayments, setLoadingMonthlyPayments] = useState(false);

  // Pay Salary Modal
  const [selectedTeacherForPay, setSelectedTeacherForPay] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // History Modal
  const [selectedTeacherForHistory, setSelectedTeacherForHistory] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL;

  // 1. Fetch Teachers List
  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(res.data);

      const initialDraft = {};
      res.data.forEach(t => {
        initialDraft[t._id] = t.baseSalary || 0;
      });
      setSalaryDrafts(initialDraft);
      setHasChanges(false);
    } catch (err) {
      console.error("Error loading teachers:", err);
      toast.error("Failed to load teachers list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // 2. Fetch payments for all teachers for the selected month
  useEffect(() => {
    if (teachers.length === 0) return;

    const fetchMonthlySummary = async () => {
      setLoadingMonthlyPayments(true);
      try {
        const token = localStorage.getItem('token');
        const paidMap = {};

        // Fetch each teacher's payments in parallel
        await Promise.all(
          teachers.map(async (t) => {
            try {
              const res = await axios.get(`${BASE_URL}/api/salary/history/${t._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              const sum = (res.data || [])
                .filter(rec => rec.month === selectedMonth && rec.paymentType !== 'Bonus')
                .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
              paidMap[t._id] = sum;
            } catch (e) {
              paidMap[t._id] = 0;
            }
          })
        );

        setMonthlyPaidMap(paidMap);
      } catch (err) {
        console.error("Error loading payments summary:", err);
      } finally {
        setLoadingMonthlyPayments(false);
      }
    };

    fetchMonthlySummary();
  }, [teachers, selectedMonth]);

  // Handle inline base salary change
  const handleBaseSalaryChange = (teacherId, val) => {
    const num = val === '' ? 0 : Math.max(0, Number(val));
    setSalaryDrafts(prev => ({ ...prev, [teacherId]: num }));
    setHasChanges(true);
  };

  // Save all changed base salaries
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
      setHasChanges(false);
      fetchTeachers();
    } catch (err) {
      console.error("Error saving base salaries:", err);
      toast.error("Failed to update base salaries");
    } finally {
      setSavingBase(false);
    }
  };

  // Open Pay Modal
  const handleOpenPay = (teacher) => {
    setSelectedTeacherForPay(teacher);
    setIsPayModalOpen(true);
  };

  // Open History Modal
  const handleOpenHistory = async (teacher) => {
    setSelectedTeacherForHistory(teacher);
    setIsHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/salary/history/${teacher._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistoryList(res.data || []);
    } catch (err) {
      toast.error("Failed to load salary history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Send WhatsApp Receipt
  const handleWhatsAppReceipt = (rec) => {
    if (!selectedTeacherForHistory) return;
    const teacherName = selectedTeacherForHistory.fullName;
    const msg = `🧾 *Salary Payment Receipt*\n\nDear *${teacherName}*,\nYour salary payment of *₹${rec.amountPaid?.toLocaleString()}* for the month of *${rec.month}* has been processed.\n\n*Payment Type*: ${rec.paymentType}\n*Date*: ${new Date(rec.paymentDate).toLocaleDateString()}\n*Remarks*: ${rec.remarks || 'None'}\n\nRadhey Shyam Shikshan Sansthan`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Compute Metrics
  const totalCommitment = teachers.reduce((sum, t) => sum + (salaryDrafts[t._id] ?? t.baseSalary ?? 0), 0);
  const totalDisbursed = Object.values(monthlyPaidMap).reduce((sum, val) => sum + val, 0);
  const totalPending = Math.max(0, totalCommitment - totalDisbursed);

  // Filtered Teachers
  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = (t.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.specialization || '').toLowerCase().includes(searchTerm.toLowerCase());

    const base = salaryDrafts[t._id] ?? t.baseSalary ?? 0;
    const paid = monthlyPaidMap[t._id] || 0;

    let matchesStatus = true;
    if (statusFilter === 'Paid') matchesStatus = base > 0 && paid >= base;
    else if (statusFilter === 'Partial') matchesStatus = paid > 0 && paid < base;
    else if (statusFilter === 'Unpaid') matchesStatus = base > 0 && paid === 0;

    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in pb-12">

        {/* === HEADER SECTION === */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <FaMoneyCheckAlt size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Teacher Payroll & Salary</h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Manage monthly salaries, disburse payments, and track payroll history</p>
              </div>
            </div>
          </div>

          {/* Month Selector & Save Changes */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
              <FaCalendarAlt className="text-amber-500" size={14} />
              <label className="text-xs font-bold text-slate-500 uppercase">Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              />
            </div>

            {hasChanges && (
              <button
                onClick={saveAllBaseSalaries}
                disabled={savingBase}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 animate-pulse"
              >
                <FaSave /> {savingBase ? "Saving..." : "Save Base Salaries"}
              </button>
            )}
          </div>
        </div>

        {/* === METRIC CARDS === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Commitment */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Monthly Payroll</span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">₹{totalCommitment.toLocaleString()}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Fixed commitment across faculty</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                <FaWallet size={20} />
              </div>
            </div>
          </div>

          {/* 2. Disbursed This Month */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Paid in {selectedMonth}</span>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">₹{totalDisbursed.toLocaleString()}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Disbursed amount</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                <FaCheckCircle size={20} />
              </div>
            </div>
          </div>

          {/* 3. Pending Balance */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Pending Balance</span>
                <h3 className="text-2xl font-black text-rose-600 mt-1">₹{totalPending.toLocaleString()}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Outstanding for this month</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                <FaHourglassHalf size={20} />
              </div>
            </div>
          </div>

          {/* 4. Faculty Count */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Faculty</span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{teachers.length}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Active teachers on payroll</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                <FaUserTie size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* === FILTERS & SEARCH === */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-80 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200">
            <FaSearch className="text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty by name or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-sm text-slate-700 outline-none w-full font-medium"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            {['All', 'Paid', 'Partial', 'Unpaid'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === tab
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* === TEACHER PAYROLL TABLE === */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Payroll Data...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-4">Faculty Member</th>
                    <th className="p-4">Department / Subject</th>
                    <th className="p-4">Base Salary (₹)</th>
                    <th className="p-4">Paid ({selectedMonth})</th>
                    <th className="p-4">Remaining</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTeachers.map((teacher) => {
                    const baseSalary = salaryDrafts[teacher._id] ?? teacher.baseSalary ?? 0;
                    const paid = monthlyPaidMap[teacher._id] || 0;
                    const remaining = Math.max(0, baseSalary - paid);

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                        Unset
                      </span>
                    );
                    if (baseSalary > 0) {
                      if (paid >= baseSalary) {
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
                        {/* Profile */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-sm shrink-0 border border-amber-200">
                              {(teacher.fullName || '?').charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 block">{teacher.fullName}</span>
                              <span className="text-xs text-slate-400 font-medium">{teacher.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="p-4 text-slate-600 font-medium">
                          {teacher.specialization || teacher.highestQualification || 'Faculty'}
                        </td>

                        {/* Base Salary Input */}
                        <td className="p-4">
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-36 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500">
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

                        {/* Paid */}
                        <td className="p-4 font-bold text-emerald-600">
                          ₹{paid.toLocaleString()}
                        </td>

                        {/* Remaining */}
                        <td className="p-4 font-bold text-slate-700">
                          ₹{remaining.toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          {statusBadge}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenPay(teacher)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs shadow-amber-500/20 active:scale-95"
                            >
                              <FaWallet size={11} /> Pay
                            </button>
                            <button
                              onClick={() => handleOpenHistory(teacher)}
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
                  No teachers found matching the filter criteria.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* === MODALS === */}
      {/* 1. Pay Salary Modal */}
      {selectedTeacherForPay && (
        <TeacherSalaryModal
          isOpen={isPayModalOpen}
          onClose={() => {
            setIsPayModalOpen(false);
            setSelectedTeacherForPay(null);
            fetchTeachers();
          }}
          teacher={selectedTeacherForPay}
        />
      )}

      {/* 2. Payment History Modal */}
      {isHistoryOpen && selectedTeacherForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="bg-slate-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                  <FaHistory size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedTeacherForHistory.fullName}</h3>
                  <p className="text-xs text-slate-400">Complete Salary Payment Receipts</p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 bg-slate-50 flex-1">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400">Loading history...</div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No payment receipts on record.</div>
              ) : (
                historyList.map((rec) => (
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
                      {rec.remarks && (
                        <p className="text-xs text-slate-500 italic mt-0.5">Note: "{rec.remarks}"</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleWhatsAppReceipt(rec)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition"
                    >
                      <FaWhatsapp size={14} className="text-emerald-600" /> Share
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default TeacherSalaryManagement;

