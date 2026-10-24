import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaSearch, FaMoneyBillWave, FaMobileAlt, FaUniversity,
  FaCheckCircle, FaExclamationCircle, FaReceipt, FaPrint,
  FaWhatsapp, FaCalculator, FaTimes, FaUserGraduate,
  FaHistory, FaClock, FaCheck, FaQrcode, FaArrowRight,
  FaRedo, FaCertificate, FaPhoneAlt, FaEdit, FaSlidersH,
  FaChevronDown
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const QuickFeeCollection = ({ onPaymentSuccess, academicYear = '2026-27' }) => {
  const BASE_URL = import.meta.env.VITE_API_URL;

  // Class Filter & Class Students State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);

  // Student Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [student, setSelectedStudent] = useState(null);

  // Student Dues & Partial Payment State
  const [dueItems, setDueItems] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  // Payment Options
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [cashTendered, setCashTendered] = useState('');
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  // Recent Counter Receipts (Today's Quick History)
  const [recentCounterReceipts, setRecentCounterReceipts] = useState([]);

  // Receipt Modal
  const [receipt, setReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Load Classes List on Mount
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const raw = Array.isArray(res.data) ? res.data : [];
      const gradeOrder = (grade) => {
        if (!grade) return 999;
        const g = grade.toString().toLowerCase().trim();
        if (g.includes('play') || g.includes('pg')) return 1;
        if (g.includes('nur')) return 2;
        if (g.includes('lkg')) return 3;
        if (g.includes('ukg') || g.includes('kg')) return 4;
        const match = g.match(/\d+/);
        if (match) return 10 + parseInt(match[0], 10);
        return 100;
      };
      const sorted = [...raw].sort((a, b) => gradeOrder(a.grade) - gradeOrder(b.grade));
      setClasses(sorted);
    } catch {
      // silent
    }
  };

  const handleClassChange = async (clsId) => {
    setSelectedClassId(clsId);
    if (!clsId) {
      setClassStudents([]);
      return;
    }

    setLoadingClassStudents(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/students?classId=${clsId}&status=active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setClassStudents(list);
    } catch {
      toast.error("Failed to load students for this class");
      setClassStudents([]);
    } finally {
      setLoadingClassStudents(false);
    }
  };

  // Search input handler
  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (!val || val.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const classQuery = selectedClassId ? `&classId=${selectedClassId}` : '';
      const res = await axios.get(`${BASE_URL}/api/students?search=${encodeURIComponent(val)}${classQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(res.data.students || res.data || []);
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  };

  // Student Selection & Dues Resolution with Duplicate Prevention
  const handleSelectStudent = async (std) => {
    setSelectedStudent(std);
    setSearchTerm(`${std.firstName} ${std.lastName || ''}`.trim());
    setSearchResults([]);
    setCashTendered('');

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const classId = std.class?._id || std.class;

      const [invRes, structRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/fees/invoices/${std._id}?academicYear=${academicYear}`, { headers }).catch(() => ({ data: [] })),
        classId ? axios.get(`${BASE_URL}/api/fee-structure/${classId}?academicYear=${academicYear}`, { headers }).catch(() => ({ data: null })) : { data: null }
      ]);

      const invoices = invRes.data || [];
      const structure = structRes.data || { mandatoryFees: [], optionalFees: [] };
      const items = [];
      const paidTitleSet = new Set();
      const unpaidTitleSet = new Set();

      // 1. Process all existing invoices (both Paid and Unpaid/Partially Paid)
      invoices.forEach(inv => {
        const remaining = Math.max(0, inv.amount - (inv.amountPaid || 0));
        const lowerTitle = inv.title.toLowerCase();

        if (inv.status === 'Paid' || remaining <= 0) {
          paidTitleSet.add(lowerTitle);
          items.push({
            id: inv._id,
            name: inv.title,
            amount: 0,
            fullAmount: inv.amount,
            paidAmount: inv.amountPaid || inv.amount,
            payingAmount: 0,
            isInvoice: true,
            isPaid: true,
            status: 'Paid',
            dueDate: inv.dueDate
          });
        } else {
          unpaidTitleSet.add(lowerTitle);
          items.push({
            id: inv._id,
            name: inv.title,
            amount: remaining,
            fullAmount: inv.amount,
            paidAmount: inv.amountPaid || 0,
            payingAmount: remaining, // default to full remaining
            isInvoice: true,
            isPaid: false,
            status: inv.status === 'Partially Paid' ? 'Partially Paid' : (new Date() > new Date(inv.dueDate) ? 'Overdue' : 'Due'),
            dueDate: inv.dueDate
          });
        }
      });

      // 2. Fee Structure Heads (One-Time, Yearly, Monthly)
      (structure.mandatoryFees || []).forEach((f, i) => {
        const lowerName = f.name.toLowerCase();
        const freq = (f.frequency || 'MONTHLY').toUpperCase();

        if (freq === 'ONE-TIME' || freq === 'YEARLY') {
          if (!paidTitleSet.has(lowerName) && !unpaidTitleSet.has(lowerName)) {
            items.push({
              id: `struct-${i}`,
              name: `${f.name} (${freq === 'ONE-TIME' ? 'One-Time' : 'Annual 2026-27'})`,
              amount: f.amount,
              fullAmount: f.amount,
              paidAmount: 0,
              payingAmount: f.amount,
              isInvoice: false,
              isPaid: false,
              frequency: freq,
              status: 'Unpaid Due'
            });
          }
        } else if (freq === 'MONTHLY') {
          const academicMonthNames = ['April 2026', 'May 2026', 'June 2026', 'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026', 'January 2027', 'February 2027', 'March 2027'];

          academicMonthNames.slice(0, Math.min(academicMonthNames.length, 6)).forEach((mName, mIdx) => {
            const cycleTitle = `${f.name} - ${mName}`;
            const cycleLower = cycleTitle.toLowerCase();

            if (!paidTitleSet.has(cycleLower) && !unpaidTitleSet.has(cycleLower) && !paidTitleSet.has(lowerName)) {
              items.push({
                id: `struct-${i}-m${mIdx}`,
                name: cycleTitle,
                amount: f.amount,
                fullAmount: f.amount,
                paidAmount: 0,
                payingAmount: f.amount,
                isInvoice: false,
                isPaid: false,
                frequency: 'MONTHLY',
                status: mIdx === 0 ? 'Current Month Due' : 'Upcoming Cycle'
              });
            }
          });
        } else {
          if (!paidTitleSet.has(lowerName) && !unpaidTitleSet.has(lowerName)) {
            items.push({
              id: `struct-${i}`,
              name: f.name,
              amount: f.amount,
              fullAmount: f.amount,
              paidAmount: 0,
              payingAmount: f.amount,
              isInvoice: false,
              isPaid: false,
              frequency: freq,
              status: 'Unpaid Due'
            });
          }
        }
      });

      // 3. Transport Check
      if (std.feeDetails?.isUsingTransport) {
        const transTitle = `Transport Fee (${std.feeDetails.transportRoute || 'Facility'})`;
        const transLower = transTitle.toLowerCase();
        if (!paidTitleSet.has(transLower) && !unpaidTitleSet.has(transLower) && !paidTitleSet.has('transport fee')) {
          items.push({
            id: 'transport',
            name: transTitle,
            amount: std.feeDetails.transportFee || 0,
            fullAmount: std.feeDetails.transportFee || 0,
            paidAmount: 0,
            payingAmount: std.feeDetails.transportFee || 0,
            isInvoice: false,
            isPaid: false,
            frequency: 'MONTHLY',
            status: 'Transport Due'
          });
        }
      }

      setDueItems(items);
      // Auto-select only unpaid items
      setSelectedItemIds(items.filter(it => !it.isPaid).map(i => i.id));
    } catch {
      toast.error("Failed to load student dues");
    }
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setSearchTerm('');
    setDueItems([]);
    setSelectedItemIds([]);
    setCashTendered('');
  };

  // Helper to change paying amount on a specific fee item
  const updateItemPayingAmount = (itemId, newAmount) => {
    setDueItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const num = Math.max(0, Math.min(Number(newAmount) || 0, item.amount));
      return { ...item, payingAmount: num };
    }));
  };

  // Helper for quick percentage buttons (Full vs Half)
  const setQuickFraction = (itemId, fraction) => {
    setDueItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const num = Math.round(item.amount * fraction);
      return { ...item, payingAmount: num };
    }));
  };

  // Calculations
  const selectedItems = dueItems.filter(d => selectedItemIds.includes(d.id) && !d.isPaid);
  const totalSelectedDue = selectedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const finalAmountToPay = selectedItems.reduce((sum, item) => sum + (item.payingAmount || 0), 0);
  const remainingBalanceAfter = Math.max(0, totalSelectedDue - finalAmountToPay);

  const changeReturnAmount = paymentMode === 'Cash' && Number(cashTendered) > finalAmountToPay
    ? Number(cashTendered) - finalAmountToPay
    : 0;

  const formatCurrency = (val) => '₹' + new Intl.NumberFormat('en-IN').format(val || 0);

  const generateUpiQr = (amt, note) => {
    const upiUri = `upi://pay?pa=radheyshyam@upi&pn=Radhey%20Shyam%20Sansthaan&am=${Number(amt) || 0}&cu=INR&tn=${encodeURIComponent(note || 'School Fee')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiUri)}`;
  };

  // Payment Execution with Partial Payment support
  const handleCollectPayment = async () => {
    if (!student) return toast.error("Please search and select a student first");
    if (finalAmountToPay <= 0) return toast.error("Please select dues or enter a payment amount greater than ₹0");

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Ensure invoices exist for structure items
      const invoiceIds = [];
      const itemBreakdown = [];

      for (const item of selectedItems) {
        let invId = item.id;

        if (!item.isInvoice) {
          try {
            const invRes = await axios.post(`${BASE_URL}/api/fees/invoices`, {
              studentId: student._id,
              title: item.name,
              amount: Number(item.fullAmount || item.amount) || 0,
              academicYear: academicYear
            }, { headers });
            if (invRes.data?.invoice?._id) {
              invId = invRes.data.invoice._id;
            }
          } catch {
            // Ignore error if already created
          }
        }

        if (invId) {
          invoiceIds.push(invId);
          itemBreakdown.push({
            invoiceId: invId,
            amount: item.payingAmount
          });
        }
      }

      // Process payment with Smart Waterfall Settlement and explicit item breakdowns
      const payRes = await axios.post(`${BASE_URL}/api/fees/pay-cart`, {
        studentId: student._id,
        amountPaid: Number(finalAmountToPay),
        paymentMethod: paymentMode,
        invoicesToPay: invoiceIds,
        itemBreakdown,
        remarks: remarks || '',
        academicYear: academicYear
      }, { headers });

      const newReceipt = {
        receiptNo: payRes.data.receiptNo || `REC-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        student: {
          name: `${student.firstName} ${student.lastName || ''}`.trim(),
          studentId: student.studentId,
          grade: student.class?.grade || 'Class',
          rollNo: student.rollNo || 'N/A',
          phone: student.phone || '',
          fatherName: student.fatherName || 'Parent'
        },
        items: selectedItems.map(i => ({
          name: i.name,
          paying: i.payingAmount,
          due: i.amount,
          remaining: Math.max(0, i.amount - i.payingAmount)
        })),
        total: finalAmountToPay,
        remainingDueAfter: remainingBalanceAfter,
        paymentMethod: paymentMode,
        remarks
      };

      setReceipt(newReceipt);
      setShowReceiptModal(true);
      setRecentCounterReceipts(prev => [newReceipt, ...prev.slice(0, 4)]);
      toast.success("Payment recorded successfully!");

      if (onPaymentSuccess) onPaymentSuccess();
      handleSelectStudent(student); // Refresh student dues
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const getWhatsAppMessage = (r) => {
    const remNote = r.remainingDueAfter > 0 ? ` Remaining Balance: ₹${r.remainingDueAfter.toLocaleString('en-IN')}.` : ' All dues cleared!';
    return `Dear ${r.student.fatherName}, payment of ₹${r.total.toLocaleString('en-IN')} for ${r.student.name} (${r.student.grade}) has been received via ${r.paymentMethod}.${remNote} Receipt No: ${r.receiptNo}. - Radhey Shyam Shikshan Sansthaan`;
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">

      {/* Main 2-Column Collection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ═══ LEFT 7 COLS: STUDENT SEARCH & DUES WITH PARTIAL PAYMENTS ═══ */}
        <div className="lg:col-span-7 space-y-5">

          {/* 1. Class Filter & Student Selection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                1. Class Filter & Student Selection
              </span>
              {student && (
                <button onClick={handleClearStudent} className="text-xs font-bold text-red-600 hover:underline cursor-pointer">
                  Clear Selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Class Filter Dropdown */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">
                  Class Filter
                </label>
                <div className="relative">
                  <select
                    value={selectedClassId}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-red-500 focus:bg-white transition-all appearance-none cursor-pointer shadow-inner"
                  >
                    <option value="">-- All Classes / Select Class --</option>
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.grade} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>

              {/* Student Dropdown for Selected Class */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 block">
                  Select Student
                </label>
                <div className="relative">
                  <select
                    value={student?._id || ''}
                    onChange={(e) => {
                      const found = classStudents.find(s => s._id === e.target.value);
                      if (found) handleSelectStudent(found);
                    }}
                    disabled={!selectedClassId || loadingClassStudents}
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-red-500 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50 shadow-inner"
                  >
                    <option value="">
                      {!selectedClassId
                        ? '← Select a Class first'
                        : loadingClassStudents
                          ? 'Loading students...'
                          : classStudents.length === 0
                            ? 'No students found'
                            : `-- Choose Student (${classStudents.length}) --`}
                    </option>
                    {classStudents.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.rollNo ? `Roll ${s.rollNo} - ` : ''}{s.firstName} {s.lastName || ''} ({s.studentId})
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Quick Search Bar */}
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder={selectedClassId ? "Or search student name / roll no in this class..." : "Or type student name, student ID, or roll no..."}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner placeholder:font-normal placeholder:text-slate-400"
              />
              {searching && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 animate-pulse">
                  Searching...
                </span>
              )}
            </div>

            {/* Instant Auto-Suggest Results */}
            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-xl bg-white shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-slide-up">
                {searchResults.map(s => (
                  <div
                    key={s._id}
                    onClick={() => handleSelectStudent(s)}
                    className="p-3.5 hover:bg-red-50/50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{s.firstName} {s.lastName || ''}</h4>
                      <p className="text-xs text-slate-400 font-medium">ID: {s.studentId} · Roll: {s.rollNo || 'N/A'} · Father: {s.fatherName || 'Parent'}</p>
                    </div>
                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-lg">
                      {s.class?.grade || 'Class'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Student Banner */}
            {student && (
              <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl flex items-center justify-between flex-wrap gap-4 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center font-black text-base shadow-sm">
                    {student.firstName?.[0]}{student.lastName?.[0] || ''}
                  </div>
                  <div>
                    <h3 className="font-black text-base tracking-tight">{student.firstName} {student.lastName || ''}</h3>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      Class: <strong>{student.class?.grade || 'Class'}</strong> · Roll: {student.rollNo || 'N/A'} · ID: <span className="font-mono">{student.studentId}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Due</span>
                  <span className="text-lg font-black text-amber-400">{formatCurrency(totalSelectedDue)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Dues Checklist Card with PER-ITEM PARTIAL PAYMENT */}
          {student && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">2. Settle & Partial Payment</span>
                  <h3 className="text-sm font-black text-slate-900">Customize Payment per Fee Head</h3>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedItemIds(dueItems.filter(d => !d.isPaid).map(d => d.id))}
                    className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors"
                  >
                    Select All Unpaid
                  </button>
                  <button
                    onClick={() => setSelectedItemIds([])}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {dueItems.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FaCheckCircle className="mx-auto text-emerald-500 text-2xl mb-1.5" />
                  <p className="font-bold text-slate-700 text-sm">All Fees Settled!</p>
                  <p className="text-slate-400 text-xs mt-0.5">There are no outstanding invoices for this student.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {dueItems.map(item => {
                    const isChecked = selectedItemIds.includes(item.id);
                    const isPaid = item.isPaid;
                    const isOverdue = item.status === 'Overdue';
                    const isPartiallyPaying = isChecked && item.payingAmount < item.amount && item.payingAmount > 0;
                    const itemRemainingAfter = Math.max(0, item.amount - (item.payingAmount || 0));

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isPaid
                            ? 'bg-emerald-50/40 border-emerald-200 opacity-75'
                            : isChecked
                              ? 'bg-red-50/40 border-red-200 shadow-2xs'
                              : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Left Checkbox & Title */}
                          <div
                            onClick={() => {
                              if (isPaid) return;
                              setSelectedItemIds(prev =>
                                prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id]
                              );
                            }}
                            className={`flex items-start gap-3 ${isPaid ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <div className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center text-xs transition-colors shrink-0 ${
                              isPaid
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : isChecked
                                  ? 'bg-red-600 border-red-600 text-white'
                                  : 'border-slate-300 bg-white'
                            }`}>
                              {(isPaid || isChecked) && <FaCheck size={9} />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-bold text-xs ${isPaid ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{item.name}</p>
                                {isPaid && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-800">
                                    🔒 Paid (Cleared)
                                  </span>
                                )}
                                {item.status === 'Partially Paid' && !isPaid && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-100 text-amber-800">
                                    ⚡ Existing Partial
                                  </span>
                                )}
                                {isOverdue && !isPaid && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-100 text-red-700">
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                {isPaid ? `Paid in Full (${formatCurrency(item.paidAmount || item.fullAmount)})` : `Total Due: ${formatCurrency(item.amount)}`}
                              </p>
                            </div>
                          </div>

                          {/* Right Side: Total Amount */}
                          <div className="text-right shrink-0">
                            {isPaid ? (
                              <span className="font-bold text-emerald-700 text-xs">Cleared</span>
                            ) : (
                              <span className="font-black text-slate-900 text-sm">{formatCurrency(item.amount)}</span>
                            )}
                          </div>
                        </div>

                        {/* ⚡ PARTIAL PAYMENT CONTROLS (Active only when checked & unpaid) */}
                        {isChecked && !isPaid && (
                          <div className="mt-3 pt-3 border-t border-red-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/80 p-2.5 rounded-lg border border-red-100">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                <FaEdit size={10} className="text-red-500" /> Pay Partial:
                              </span>
                              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-28">
                                <span className="text-xs font-bold text-slate-400 mr-1">₹</span>
                                <input
                                  type="number"
                                  value={item.payingAmount}
                                  onChange={(e) => updateItemPayingAmount(item.id, e.target.value)}
                                  className="w-full text-right font-black text-slate-900 text-xs bg-transparent outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setQuickFraction(item.id, 0.5)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold"
                              >
                                50%
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickFraction(item.id, 1)}
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-[9px] font-bold"
                              >
                                Full
                              </button>
                            </div>

                            <div className="text-right text-[10px] font-bold">
                              {isPartiallyPaying ? (
                                <span className="text-amber-700">
                                  Remaining balance after pay: <strong>{formatCurrency(itemRemainingAfter)}</strong>
                                </span>
                              ) : (
                                <span className="text-emerald-700">Paying in Full</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ═══ RIGHT 5 COLS: PAYMENT TERMINAL & SUMMARY ═══ */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 sticky top-4">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">3. Checkout Terminal</span>
              <h3 className="text-base font-black text-slate-900">Payment & Receipt</h3>
            </div>

            {/* Payment Summary Breakdown */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Selected Items Due</span>
                <span className="font-bold text-slate-900">{formatCurrency(totalSelectedDue)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Amount Paying Now</span>
                <span className="font-bold text-red-600">{formatCurrency(finalAmountToPay)}</span>
              </div>
              {remainingBalanceAfter > 0 && (
                <div className="flex justify-between text-xs text-amber-700 font-bold border-t border-slate-200 pt-2">
                  <span>Balance Kept as Partial</span>
                  <span>{formatCurrency(remainingBalanceAfter)}</span>
                </div>
              )}
            </div>

            {/* Mode Selection */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Cash', label: 'Cash 💵' },
                  { id: 'UPI / Online', label: 'UPI / QR 📱' },
                  { id: 'Bank Transfer', label: 'Bank 🏦' }
                ].map(m => {
                  const isSelected = paymentMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMode(m.id)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border text-center ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* UPI QR Display */}
            {paymentMode === 'UPI / Online' && finalAmountToPay > 0 && (
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col items-center text-center space-y-2 animate-fade-in">
                <span className="text-[10px] font-black uppercase text-blue-700 tracking-widest flex items-center gap-1">
                  <FaQrcode /> Scan & Pay via UPI
                </span>
                <img
                  src={generateUpiQr(finalAmountToPay, `${student?.firstName || 'Student'} Fee`)}
                  alt="UPI QR Code"
                  className="w-36 h-36 bg-white p-2 rounded-xl border border-blue-200 shadow-sm"
                />
                <p className="text-sm font-black text-slate-900">{formatCurrency(finalAmountToPay)}</p>
                <p className="text-[10px] text-slate-500">Scan via Google Pay, PhonePe, Paytm, or BHIM</p>
              </div>
            )}

            {/* Cash Tendered Calculator */}
            {paymentMode === 'Cash' && finalAmountToPay > 0 && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1"><FaCalculator /> Cash Tendered</span>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1 w-28">
                    <span className="text-xs font-bold text-slate-400 mr-1">₹</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={finalAmountToPay.toString()}
                      className="w-full text-right font-black text-slate-900 text-xs outline-none"
                    />
                  </div>
                </div>

                {Number(cashTendered) > finalAmountToPay && (
                  <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-slate-200 text-emerald-700">
                    <span>Change to Return:</span>
                    <span className="text-sm font-black">{formatCurrency(changeReturnAmount)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Note / Remarks */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Receipt Note (Optional)</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Paid part fee at counter..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            {/* Total Due & Submit Button */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-slate-500">Amount to Collect</span>
                <span className="text-2xl font-black text-red-600">{formatCurrency(finalAmountToPay)}</span>
              </div>

              <button
                onClick={handleCollectPayment}
                disabled={processing || !student || finalAmountToPay <= 0}
                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-black text-sm transition-all shadow-md shadow-red-600/25 flex items-center justify-center gap-2 active:scale-98"
              >
                <FaReceipt />
                {processing ? 'Generating Official Receipt...' : `Collect ${formatCurrency(finalAmountToPay)} & Print Receipt`}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ═══ RECENT COUNTER RECEIPTS STRIP ═══ */}
      {recentCounterReceipts.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <FaHistory className="text-slate-400" /> Recent Receipts Issued Today
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentCounterReceipts.map(r => {
              const cleanPhone = (r.student.phone || '').replace(/[^0-9]/g, '');
              const waLink = cleanPhone ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(getWhatsAppMessage(r))}` : null;

              return (
                <div key={r.receiptNo} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{r.student.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{r.receiptNo}</p>
                    </div>
                    <span className="font-black text-slate-900 text-xs">{formatCurrency(r.total)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                    <span className="text-slate-400 font-medium">{r.time} · {r.paymentMethod}</span>
                    <div className="flex gap-1">
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="WhatsApp Receipt"
                        >
                          <FaWhatsapp size={12} />
                        </a>
                      )}
                      <button
                        onClick={() => { setReceipt(r); setShowReceiptModal(true); }}
                        className="p-1 text-slate-600 hover:bg-slate-200 rounded"
                        title="View & Print"
                      >
                        <FaPrint size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ OFFICIAL PRINTABLE RECEIPT MODAL ═══ */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-black">Payment Receipt</h3>
                <p className="text-xs text-slate-400 font-mono">{receipt.receiptNo}</p>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-white">
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
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{receipt.student.name}</p>
                  <p className="text-[10px] text-slate-400">ID: {receipt.student.studentId}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase text-slate-400">Class & Date</p>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">{receipt.student.grade}</p>
                  <p className="text-[10px] text-slate-400">{receipt.date}</p>
                </div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[9px] font-black uppercase text-slate-400">
                    <th className="pb-1.5">Description</th>
                    <th className="pb-1.5 text-center">Status</th>
                    <th className="pb-1.5 text-right">Amount Paid (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipt.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-bold text-slate-700">{it.name}</td>
                      <td className="py-2 text-center">
                        {it.remaining > 0 ? (
                          <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            Bal: ₹{it.remaining}
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Full
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right font-black text-slate-900">{formatCurrency(it.paying)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-800 font-black">
                    <td colSpan={2} className="pt-2 text-xs">Total Paid ({receipt.paymentMethod})</td>
                    <td className="pt-2 text-right text-sm text-emerald-600">{formatCurrency(receipt.total)}</td>
                  </tr>
                  {receipt.remainingDueAfter > 0 && (
                    <tr className="text-amber-700 font-bold text-[11px]">
                      <td colSpan={2} className="pt-1">Remaining Outstanding Balance</td>
                      <td className="pt-1 text-right">{formatCurrency(receipt.remainingDueAfter)}</td>
                    </tr>
                  )}
                </tfoot>
              </table>

              <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                <img
                  src={generateUpiQr(receipt.total, receipt.receiptNo)}
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
                onClick={() => setShowReceiptModal(false)}
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

    </div>
  );
};

export default QuickFeeCollection;
