import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FaArrowLeft, FaSearch, FaCheckCircle, FaMoneyBillWave,
    FaMobileAlt, FaHistory, FaExclamationCircle, FaReceipt,
    FaCalendarAlt, FaTimes, FaPrint, FaUniversity, FaQrcode,
    FaCertificate, FaAward
} from 'react-icons/fa';
import { toast } from 'react-toastify';

// Avatar color palette
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
];
const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const RecordPayment = ({ onBack, onPaymentSuccess }) => {
    const BASE_URL = import.meta.env.VITE_API_URL;

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    // Fee Items
    const [feeItems, setFeeItems] = useState([]);
    const [selectedFeeIds, setSelectedFeeIds] = useState([]);

    // Payment State
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [processing, setProcessing] = useState(false);
    const [remarks, setRemarks] = useState('');

    // Transaction history
    const [paymentHistory, setPaymentHistory] = useState([]);

    // Receipt Modal State
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [receiptData, setReceiptData] = useState(null);

    // No-Dues Clearance Modal State
    const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);
    const [clearanceData, setClearanceData] = useState(null);
    const [clearanceLoading, setClearanceLoading] = useState(false);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (selectedStudent && query !== `${selectedStudent.firstName} ${selectedStudent.lastName || ''}`.trim()) {
            setSelectedStudent(null);
            setFeeItems([]);
            setSelectedFeeIds([]);
            setPaymentHistory([]);
        }

        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            setIsSearching(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/students?search=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchResults(res.data.students || res.data || []);
        } catch {
            // silent
        } finally {
            setIsSearching(false);
        }
    };

    const clearStudent = () => {
        setSelectedStudent(null);
        setSearchQuery('');
        setFeeItems([]);
        setSelectedFeeIds([]);
        setPaymentHistory([]);
    };

    const selectStudent = async (student) => {
        setSelectedStudent(student);
        setSearchQuery(`${student.firstName} ${student.lastName || ''}`.trim());
        setSearchResults([]);

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const classId = student.class?._id || student.class;

            // 1. Fetch fee structure & existing invoices concurrently
            const [structureRes, invRes, statusRes] = await Promise.all([
                classId ? axios.get(`${BASE_URL}/api/fee-structure/${classId}`, { headers }).catch(() => ({ data: null })) : { data: null },
                axios.get(`${BASE_URL}/api/fees/invoices/${student._id}`, { headers }).catch(() => ({ data: [] })),
                axios.get(`${BASE_URL}/api/fees/status/${student._id}`, { headers }).catch(() => ({ data: {} }))
            ]);

            const invoices = invRes.data || [];
            const structure = structureRes.data || { mandatoryFees: [], optionalFees: [] };
            const history = statusRes.data?.history || [];
            setPaymentHistory(Array.isArray(history) ? history.slice(0, 5) : []);

            // 2. Build fee items list
            const finalItems = [];
            const invoicedTitles = new Set();

            // Add unpaid/partially paid invoices from DB
            invoices.forEach(inv => {
                const remaining = inv.amount - (inv.amountPaid || 0);
                if (remaining > 0) {
                    invoicedTitles.add(inv.title.toLowerCase());
                    finalItems.push({
                        id: inv._id,
                        name: inv.title,
                        amount: remaining,
                        fullAmount: inv.amount,
                        amountPaid: inv.amountPaid || 0,
                        dueDate: new Date(inv.dueDate),
                        status: new Date() > new Date(inv.dueDate) ? 'Overdue' : 'Due',
                        source: 'invoice',
                        invoiceId: inv._id,
                        isPartial: (inv.amountPaid || 0) > 0
                    });
                }
            });

            // Add fee structure template items not yet invoiced
            (structure.mandatoryFees || []).forEach((f, i) => {
                if (!invoicedTitles.has(f.name.toLowerCase())) {
                    finalItems.push({
                        id: f._id || `m-${i}`,
                        name: f.name,
                        amount: f.amount,
                        fullAmount: f.amount,
                        amountPaid: 0,
                        frequency: f.frequency,
                        dueDate: getDueDate(f.frequency),
                        status: 'New',
                        source: 'structure',
                        type: 'mandatory'
                    });
                }
            });

            (structure.optionalFees || []).forEach((f, i) => {
                if (!invoicedTitles.has(f.name.toLowerCase())) {
                    finalItems.push({
                        id: f._id || `o-${i}`,
                        name: f.name,
                        amount: f.amount,
                        fullAmount: f.amount,
                        amountPaid: 0,
                        frequency: f.frequency,
                        dueDate: getDueDate(f.frequency),
                        status: 'New',
                        source: 'structure',
                        type: 'optional'
                    });
                }
            });

            // Add transport fee if student opted in
            if (student.feeDetails?.isUsingTransport) {
                const transportName = `Transport (${student.feeDetails.transportRoute || 'Facility'})`;
                if (!invoicedTitles.has(transportName.toLowerCase())) {
                    finalItems.push({
                        id: 'transport-fee',
                        name: transportName,
                        amount: student.feeDetails.transportFee || 0,
                        fullAmount: student.feeDetails.transportFee || 0,
                        amountPaid: 0,
                        frequency: 'MONTHLY',
                        dueDate: getDueDate('MONTHLY'),
                        status: 'New',
                        source: 'structure',
                        type: 'optional'
                    });
                }
            }

            setFeeItems(finalItems);
            // Default: select all due / overdue items
            const defaultSelected = finalItems.filter(f => f.status === 'Overdue' || f.status === 'Due').map(f => f.id);
            setSelectedFeeIds(defaultSelected.length > 0 ? defaultSelected : (finalItems.length > 0 ? [finalItems[0].id] : []));

        } catch {
            toast.error("Failed to load student financial details");
        }
    };

    const getDueDate = (frequency) => {
        const now = new Date();
        const freq = (frequency || 'MONTHLY').toString().toUpperCase();
        if (freq === 'MONTHLY') {
            return new Date(now.getFullYear(), now.getMonth(), 15);
        }
        if (freq === 'QUARTERLY') {
            return new Date(now.getFullYear(), Math.ceil((now.getMonth() + 1) / 3) * 3, 1);
        }
        if (freq.includes('HALF')) {
            return new Date(now.getFullYear(), now.getMonth() < 6 ? 8 : 2, 1);
        }
        return new Date(now.getFullYear() + 1, 2, 31);
    };

    const toggleFeeItem = (id) => {
        setSelectedFeeIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAllFees = () => {
        setSelectedFeeIds(feeItems.map(f => f.id));
    };

    const clearAllSelections = () => {
        setSelectedFeeIds([]);
    };

    const selectMandatoryOnly = () => {
        setSelectedFeeIds(feeItems.filter(f => f.type === 'mandatory' || f.source === 'invoice').map(f => f.id));
    };

    const selectedTotal = feeItems
        .filter(f => selectedFeeIds.includes(f.id))
        .reduce((sum, f) => sum + (f.amount || 0), 0);

    const totalOutstanding = feeItems.reduce((sum, f) => sum + (f.amount || 0), 0);

    const formatCurrency = (amount) => '₹' + new Intl.NumberFormat('en-IN').format(amount || 0);

    // UPI QR Code URI Generator
    const generateUpiQrUrl = (amount, note) => {
        const cleanAmount = Number(amount) || 0;
        const upiString = `upi://pay?pa=radheyshyam@upi&pn=Radhey%20Shyam%20Shikshan%20Sansthaan&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(note || 'Fee Payment')}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiString)}`;
    };

    const handleProcessPayment = async () => {
        if (!selectedStudent) return toast.error("Please select a student first.");
        if (selectedFeeIds.length === 0) return toast.error("Please select at least one fee item.");

        setProcessing(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const selectedItems = feeItems.filter(f => selectedFeeIds.includes(f.id));

            // Step 1: Create invoices for structure items if needed
            const invoiceIds = [];
            for (const item of selectedItems) {
                if (item.source === 'invoice' && item.invoiceId) {
                    invoiceIds.push(item.invoiceId);
                } else {
                    const invRes = await axios.post(`${BASE_URL}/api/fees/invoices`, {
                        studentId: selectedStudent._id,
                        title: item.name,
                        amount: item.fullAmount || item.amount
                    }, { headers });
                    if (invRes.data.invoice?._id) {
                        invoiceIds.push(invRes.data.invoice._id);
                    }
                }
            }

            // Step 2: Process cart payment
            const payRes = await axios.post(`${BASE_URL}/api/fees/pay-cart`, {
                studentId: selectedStudent._id,
                amountPaid: selectedTotal,
                paymentMethod: paymentMode,
                invoicesToPay: invoiceIds,
                remarks
            }, { headers });

            const receiptInfo = {
                receiptNo: payRes.data.receiptNo || `REC-${Date.now().toString().slice(-6)}`,
                date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                student: {
                    name: `${selectedStudent.firstName} ${selectedStudent.lastName || ''}`.trim(),
                    studentId: selectedStudent.studentId,
                    grade: selectedStudent.class?.grade || 'N/A',
                    rollNo: selectedStudent.rollNo || 'N/A'
                },
                items: selectedItems.map(item => ({
                    name: item.name,
                    amount: item.amount
                })),
                total: selectedTotal,
                paymentMethod: paymentMode,
                remarks
            };

            setReceiptData(receiptInfo);
            setIsReceiptModalOpen(true);
            toast.success("Payment Processed Successfully!");

            if (onPaymentSuccess) onPaymentSuccess();
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Failed to process payment";
            toast.error(errorMessage);
        } finally {
            setProcessing(false);
        }
    };

    const handleFetchClearanceCertificate = async () => {
        if (!selectedStudent) return toast.error("Select a student first.");
        setClearanceLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/fees/clearance/${selectedStudent._id}?academicYear=2026-27`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClearanceData(res.data);
            setIsClearanceModalOpen(true);
        } catch {
            toast.error("Failed to generate clearance certificate");
        } finally {
            setClearanceLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const initials = selectedStudent
        ? `${selectedStudent.firstName?.charAt(0) || ''}${selectedStudent.lastName?.charAt(0) || ''}`.toUpperCase()
        : '';
    const avatarColor = selectedStudent ? getAvatarColor(selectedStudent.firstName + (selectedStudent.lastName || '')) : '#94a3b8';

    return (
        <div className="flex flex-col h-full font-sans animate-fade-in relative z-10 w-full">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <button onClick={onBack} className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-red-600 rounded-xl transition-colors">
                            <FaArrowLeft size={14} />
                        </button>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Record Payment</h1>
                    </div>
                    <p className="text-slate-500 font-medium ml-[46px]">Collect full or partial fee payments, scan UPI QR, and generate official receipts</p>
                </div>

                {selectedStudent && (
                    <button
                        onClick={handleFetchClearanceCertificate}
                        disabled={clearanceLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-xs transition-colors shadow-sm"
                    >
                        <FaCertificate className="text-emerald-600" />
                        {clearanceLoading ? "Generating..." : "No-Dues Clearance Slip"}
                    </button>
                )}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 flex-1">

                {/* ═══════ LEFT COLUMN ═══════ */}
                <div className="lg:col-span-3 space-y-5">

                    {/* Step 1: Select Student */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center">1</div>
                            <h3 className="text-sm font-black text-slate-800">Select Student</h3>
                        </div>

                        {/* Search */}
                        <div className="relative mb-3">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearch}
                                placeholder="Search student by name or roll / student ID..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl text-slate-700 font-bold placeholder-slate-300 outline-none focus:ring-2 focus:ring-blue-100 transition-all border border-slate-100 text-sm"
                            />
                            {selectedStudent && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <FaCheckCircle size={9} /> Selected
                                    </span>
                                    <button onClick={clearStudent} className="text-xs text-slate-400 hover:text-red-500 font-bold p-1">
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Search Dropdown */}
                        {searchResults.length > 0 && !selectedStudent && (
                            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-lg bg-white mb-3 max-h-56 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
                                {searchResults.map((s) => (
                                    <div
                                        key={s._id}
                                        onClick={() => selectStudent(s)}
                                        className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-full text-white font-black text-xs flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: getAvatarColor(`${s.firstName} ${s.lastName || ''}`) }}
                                            >
                                                {`${s.firstName?.charAt(0) || ''}${s.lastName?.charAt(0) || ''}`.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{s.firstName} {s.lastName || ''}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">ID: {s.studentId} · Roll: {s.rollNo || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                            {s.class?.grade || 'Class'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Selected Student Card */}
                        {selectedStudent && (
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div
                                        className="w-12 h-12 rounded-xl text-white font-black text-base flex items-center justify-center shadow-sm shrink-0"
                                        style={{ backgroundColor: avatarColor }}
                                    >
                                        {initials}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 text-base">{selectedStudent.firstName} {selectedStudent.lastName || ''}</h4>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-xs font-semibold text-slate-500">{selectedStudent.class?.grade} {selectedStudent.class?.section ? `(${selectedStudent.class.section})` : ''}</span>
                                            <span className="text-slate-300">·</span>
                                            <span className="text-xs font-mono font-bold text-slate-400">ID: {selectedStudent.studentId}</span>
                                            {selectedStudent.rollNo && (
                                                <>
                                                    <span className="text-slate-300">·</span>
                                                    <span className="text-xs font-medium text-slate-400">Roll: {selectedStudent.rollNo}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={clearStudent}
                                    className="text-xs font-bold text-slate-400 hover:text-red-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Select Fee Items */}
                    {selectedStudent && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">2</div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800">Select Fee Items to Pay</h3>
                                        <p className="text-[11px] text-slate-400 font-medium">Select one or multiple items for payment</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={selectAllFees}
                                        className="text-[10px] font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-2.5 py-1 rounded-md transition-colors"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={selectMandatoryOnly}
                                        className="text-[10px] font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-2.5 py-1 rounded-md transition-colors"
                                    >
                                        Mandatory
                                    </button>
                                    <button
                                        onClick={clearAllSelections}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-slate-50 px-2 py-1 rounded-md transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            {feeItems.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <FaCheckCircle className="mx-auto text-emerald-500 text-2xl mb-2" />
                                    <p className="font-bold text-slate-600 text-sm">No pending dues found</p>
                                    <p className="text-slate-400 text-xs mt-0.5">All fees for this student appear to be cleared</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {feeItems.map((item) => {
                                        const isSelected = selectedFeeIds.includes(item.id);
                                        const isOverdue = item.status === 'Overdue';

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => toggleFeeItem(item.id)}
                                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                                    isSelected
                                                        ? 'bg-red-50/50 border-red-200 shadow-sm'
                                                        : 'bg-white border-slate-100 hover:border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                                        isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-slate-300 bg-white'
                                                    }`}>
                                                        {isSelected && <FaCheckCircle size={10} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                                                            {isOverdue && (
                                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-100 text-red-700">
                                                                    Overdue
                                                                </span>
                                                            )}
                                                            {item.isPartial && (
                                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-100 text-amber-700">
                                                                    Partially Paid
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                            Due: {item.dueDate ? item.dueDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className="font-black text-slate-900 text-sm">{formatCurrency(item.amount)}</span>
                                                    {item.amountPaid > 0 && (
                                                        <p className="text-[9px] text-slate-400">Paid: {formatCurrency(item.amountPaid)}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══════ RIGHT COLUMN ═══════ */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Step 3: Payment Summary & Checkout */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center">3</div>
                            <h3 className="text-sm font-black text-slate-800">Payment Summary</h3>
                        </div>

                        {/* Payment Mode Selection */}
                        <div>
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Payment Method</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'Cash', label: 'Cash', icon: FaMoneyBillWave },
                                    { id: 'UPI / Online', label: 'UPI / QR', icon: FaMobileAlt },
                                    { id: 'Bank Transfer', label: 'Bank', icon: FaUniversity },
                                ].map(mode => {
                                    const Icon = mode.icon;
                                    const isSelected = paymentMode === mode.id;
                                    return (
                                        <button
                                            key={mode.id}
                                            type="button"
                                            onClick={() => setPaymentMode(mode.id)}
                                            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all border ${
                                                isSelected
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            <Icon className={isSelected ? 'text-white' : 'text-slate-400'} size={14} />
                                            {mode.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Dynamic UPI QR Code Box when UPI selected */}
                        {paymentMode === 'UPI / Online' && selectedTotal > 0 && (
                            <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-100 flex flex-col items-center text-center space-y-2 animate-fade-in">
                                <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-widest flex items-center gap-1">
                                    <FaQrcode /> Scan & Pay via UPI
                                </p>
                                <img
                                    src={generateUpiQrUrl(selectedTotal, `${selectedStudent?.firstName || 'Student'} Fee`)}
                                    alt="UPI QR Code"
                                    className="w-32 h-32 rounded-lg bg-white p-2 shadow-sm border border-blue-200"
                                />
                                <p className="text-xs font-black text-slate-800">{formatCurrency(selectedTotal)}</p>
                                <p className="text-[10px] text-slate-500">Scan using PhonePe, Google Pay, or Paytm</p>
                            </div>
                        )}

                        {/* Remarks */}
                        <div>
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Remarks / Note (Optional)</label>
                            <input
                                type="text"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="e.g. Paid by father via GPay..."
                                className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-medium text-slate-700 outline-none border border-slate-100 focus:border-slate-300"
                            />
                        </div>

                        {/* Breakdown */}
                        <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-500 font-medium">
                                <span>Selected Items</span>
                                <span className="font-bold text-slate-800">{selectedFeeIds.length} item(s)</span>
                            </div>
                            <div className="flex justify-between text-slate-500 font-medium">
                                <span>Subtotal</span>
                                <span className="font-bold text-slate-800">{formatCurrency(selectedTotal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-black text-slate-900 border-t border-slate-100 pt-2">
                                <span>Total Amount to Pay</span>
                                <span className="text-lg text-red-600">{formatCurrency(selectedTotal)}</span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleProcessPayment}
                            disabled={processing || !selectedStudent || selectedTotal <= 0}
                            className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-black text-sm transition-all shadow-md shadow-red-600/20 active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            <FaReceipt />
                            {processing ? "Processing..." : `Collect ${formatCurrency(selectedTotal)}`}
                        </button>
                    </div>

                    {/* Step 4: Recent History */}
                    {selectedStudent && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-4">
                                <FaHistory className="text-teal-500" />
                                <h3 className="text-sm font-black text-slate-800">Recent Payment History</h3>
                            </div>

                            {paymentHistory.length === 0 ? (
                                <p className="text-center text-slate-300 text-sm font-medium py-4">No previous payment history found</p>
                            ) : (
                                <div className="space-y-3">
                                    {paymentHistory.map((tx, idx) => (
                                        <div key={tx._id || idx} className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                                                <FaCheckCircle size={10} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-700 truncate">
                                                    {Array.isArray(tx.monthsPaid) && tx.monthsPaid.length > 0 ? tx.monthsPaid.join(', ') : 'Fee Payment'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                    {tx.date ? new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'} · {tx.paymentMethod || 'Cash'}
                                                </p>
                                            </div>
                                            <span className="text-sm font-black text-slate-800 shrink-0">{formatCurrency(tx.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Outstanding Overview */}
                    {selectedStudent && (
                        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
                            <div className="flex items-center gap-2.5 mb-3">
                                <FaExclamationCircle className="text-amber-500" />
                                <h3 className="text-sm font-black text-slate-800">Total Outstanding</h3>
                            </div>
                            <p className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(totalOutstanding)}</p>
                            <p className="text-xs font-bold text-amber-600 mt-2">{feeItems.length} fee item(s) in ledger</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════ OFFICIAL PAYMENT RECEIPT MODAL (WITH QR CODE) ═══════ */}
            {isReceiptModalOpen && receiptData && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-red-600 rounded-xl">
                                    <FaUniversity className="text-lg" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black tracking-wide">Fee Payment Receipt</h3>
                                    <p className="text-slate-400 text-xs font-mono">{receiptData.receiptNo}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsReceiptModalOpen(false); onBack(); }}
                                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Printable Receipt Body */}
                        <div id="receipt-printable" className="p-6 overflow-y-auto custom-scrollbar space-y-5 bg-white text-slate-800">
                            {/* School Header */}
                            <div className="text-center pb-4 border-b border-slate-100">
                                <h2 className="text-xl font-black tracking-tight text-slate-900">RADHEY SHYAM SHIKSHAN SANSTHAAN</h2>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">Official Fee Acknowledgment & Receipt</p>
                            </div>

                            {/* Student & Receipt Meta */}
                            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase">Student Name</p>
                                    <p className="font-black text-slate-800 text-sm mt-0.5">{receiptData.student.name}</p>
                                    <p className="text-slate-500 font-medium">ID: {receiptData.student.studentId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase">Class & Date</p>
                                    <p className="font-black text-slate-800 text-sm mt-0.5">{receiptData.student.grade}</p>
                                    <p className="text-slate-500 font-medium">{receiptData.date}</p>
                                </div>
                            </div>

                            {/* Itemized Table */}
                            <div>
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase">
                                            <th className="pb-2">Description</th>
                                            <th className="pb-2 text-right">Amount (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {receiptData.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="py-2.5 font-bold text-slate-700">{item.name}</td>
                                                <td className="py-2.5 font-black text-slate-900 text-right">{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-slate-800 font-black">
                                            <td className="pt-3 text-sm">Total Paid ({receiptData.paymentMethod})</td>
                                            <td className="pt-3 text-right text-base text-emerald-600">{formatCurrency(receiptData.total)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Authentication QR & Signature */}
                            <div className="pt-4 flex justify-between items-center text-xs text-slate-400 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <img
                                        src={generateUpiQrUrl(receiptData.total, receiptData.receiptNo)}
                                        alt="Verify Receipt QR"
                                        className="w-16 h-16 rounded border border-slate-200 p-1"
                                    />
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-600">Scan to Verify</p>
                                        <p className="text-[8px] text-slate-400 font-mono">{receiptData.receiptNo}</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="w-32 border-b border-slate-300 pb-1 mb-1"></div>
                                    <p className="text-[10px] font-bold text-slate-500">Authorized Signature</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                            <button
                                onClick={() => { setIsReceiptModalOpen(false); onBack(); }}
                                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-100 transition-colors"
                            >
                                Done
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-red-600/20"
                            >
                                <FaPrint /> Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ NO-DUES CLEARANCE CERTIFICATE MODAL ═══════ */}
            {isClearanceModalOpen && clearanceData && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2.5">
                                <FaAward className="text-amber-400 text-xl" />
                                <div>
                                    <h3 className="text-base font-black">Fee Clearance Certificate</h3>
                                    <p className="text-xs text-slate-400 font-mono">{clearanceData.certificateNo}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsClearanceModalOpen(false)} className="text-slate-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-slate-800 bg-white">
                            <div className="text-center border-b border-slate-100 pb-4">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">RADHEY SHYAM SHIKSHAN SANSTHAAN</h2>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">Certificate of Institutional Fee Clearance</p>
                            </div>

                            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-3 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Student Name</p>
                                        <p className="font-black text-slate-800 text-sm">{clearanceData.student?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Student ID / Roll</p>
                                        <p className="font-black text-slate-800">{clearanceData.student?.studentId} (Roll: {clearanceData.student?.rollNo || 'N/A'})</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Father's Name</p>
                                        <p className="font-bold text-slate-700">{clearanceData.student?.fatherName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Class / Grade</p>
                                        <p className="font-bold text-slate-700">{clearanceData.student?.grade}</p>
                                    </div>
                                </div>
                            </div>

                            {clearanceData.isCleared ? (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 uppercase tracking-wider bg-emerald-100 px-3 py-1 rounded-full">
                                        <FaCheckCircle /> All Dues Cleared
                                    </span>
                                    <p className="text-xs text-emerald-900 font-medium pt-2">
                                        This certifies that the student has cleared all tuition, examination, and institutional dues for Session {clearanceData.financialSummary?.academicYear}. Eligible for Exam Admit Card and TC issuance.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center space-y-1">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-red-800 uppercase tracking-wider bg-red-100 px-3 py-1 rounded-full">
                                        <FaExclamationCircle /> Outstanding Balance Remaining
                                    </span>
                                    <p className="text-xs text-red-700 font-bold pt-2">
                                        Remaining Due: {formatCurrency(clearanceData.financialSummary?.remainingBalance)}
                                    </p>
                                </div>
                            )}

                            <div className="pt-6 flex justify-between items-end text-xs text-slate-400 border-t border-slate-100">
                                <div>
                                    <p className="text-[10px]">Issued on: <span className="font-bold text-slate-700">{clearanceData.issuedDate}</span></p>
                                </div>
                                <div className="text-center">
                                    <div className="w-32 border-b border-slate-300 pb-1 mb-1"></div>
                                    <p className="text-[10px] font-bold text-slate-500">Accounts Officer / Principal</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                            <button
                                onClick={() => setIsClearanceModalOpen(false)}
                                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                            >
                                Close
                            </button>
                            {clearanceData.isCleared && (
                                <button
                                    onClick={handlePrint}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <FaPrint /> Print Certificate
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default RecordPayment;
