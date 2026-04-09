import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaSearch, FaCheckCircle, FaMoneyBillWave, FaMobileAlt, FaHistory, FaExclamationCircle, FaReceipt, FaCalendarAlt, FaTimes } from 'react-icons/fa';
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

    // Fee Items State
    const [feeItems, setFeeItems] = useState([]);
    const [selectedFeeIds, setSelectedFeeIds] = useState([]);
    const [existingInvoices, setExistingInvoices] = useState([]);

    // Payment State
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [processing, setProcessing] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (selectedStudent && query !== `${selectedStudent.firstName} ${selectedStudent.lastName}`) {
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
            setSearchResults(res.data.students || res.data);
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
        setExistingInvoices([]);
    };

    const selectStudent = async (student) => {
        setSelectedStudent(student);
        setSearchQuery(`${student.firstName} ${student.lastName}`);
        setSearchResults([]);

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const classId = student.class?._id || student.class;

            // Fetch fee structure
            if (classId) {
                const res = await axios.get(`${BASE_URL}/api/fee-structure/${classId}`, { headers });
                if (res.data) {
                    const items = [];
                    (res.data.mandatoryFees || []).forEach((f, i) => {
                        items.push({
                            id: f._id || `m-${i}`,
                            name: f.name,
                            amount: f.amount,
                            frequency: f.frequency,
                            type: 'mandatory',
                            dueDate: getDueDate(f.frequency),
                            status: getStatus(f.frequency)
                        });
                    });
                    (res.data.optionalFees || []).forEach((f, i) => {
                        items.push({
                            id: f._id || `o-${i}`,
                            name: f.name,
                            amount: f.amount,
                            frequency: f.frequency,
                            type: 'optional',
                            dueDate: getDueDate(f.frequency),
                            status: getStatus(f.frequency)
                        });
                    });
                    setFeeItems(items);
                }
            }

            // Fetch existing invoices
            try {
                const invRes = await axios.get(`${BASE_URL}/api/fees/invoices/${student._id}`, { headers });
                setExistingInvoices(invRes.data || []);
            } catch {
                setExistingInvoices([]);
            }

            // Fetch payment history
            try {
                const histRes = await axios.get(`${BASE_URL}/api/fees/student/${student._id}`, { headers });
                const payments = histRes.data?.payments || histRes.data || [];
                setPaymentHistory(Array.isArray(payments) ? payments.slice(0, 5) : []);
            } catch {
                setPaymentHistory([]);
            }

        } catch {
            toast.error("Failed to load student data");
        }
    };

    const getDueDate = (frequency) => {
        const now = new Date();
        if (frequency === 'MONTHLY' || frequency === 'Monthly') {
            return new Date(now.getFullYear(), now.getMonth(), 15);
        }
        if (frequency === 'QUARTERLY' || frequency === 'Quarterly') {
            return new Date(now.getFullYear(), Math.ceil((now.getMonth() + 1) / 3) * 3, 1);
        }
        return new Date(now.getFullYear(), 2, 31);
    };

    const getStatus = (frequency) => {
        const due = getDueDate(frequency);
        const now = new Date();
        return now > due ? 'Overdue' : 'Due';
    };

    const toggleFeeItem = (id) => {
        setSelectedFeeIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectedTotal = feeItems
        .filter(f => selectedFeeIds.includes(f.id))
        .reduce((sum, f) => sum + (f.amount || 0), 0);

    const totalOutstanding = feeItems.reduce((sum, f) => sum + (f.amount || 0), 0);

    const formatCurrency = (amount) => '₹' + new Intl.NumberFormat('en-IN').format(amount || 0);

    const handleProcessPayment = async () => {
        if (!selectedStudent) return toast.error("Please select a student first.");
        if (selectedFeeIds.length === 0) return toast.error("Please select at least one fee item.");

        setProcessing(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const selectedItems = feeItems.filter(f => selectedFeeIds.includes(f.id));

            const invoiceIds = [];
            for (const item of selectedItems) {
                const invRes = await axios.post(`${BASE_URL}/api/fees/invoices`, {
                    studentId: selectedStudent._id,
                    title: item.name,
                    amount: item.amount
                }, { headers });
                if (invRes.data.invoice?._id) invoiceIds.push(invRes.data.invoice._id);
            }

            if (invoiceIds.length > 0) {
                await axios.post(`${BASE_URL}/api/fees/pay-cart`, {
                    studentId: selectedStudent._id,
                    amountPaid: selectedTotal,
                    paymentMethod: paymentMode,
                    invoicesToPay: invoiceIds
                }, { headers });
            }

            toast.success("Payment Processed Successfully!");
            if (onPaymentSuccess) onPaymentSuccess();
            onBack();
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Failed to process payment";
            toast.error(errorMessage);
        } finally {
            setProcessing(false);
        }
    };

    const initials = selectedStudent
        ? `${selectedStudent.firstName?.charAt(0) || ''}${selectedStudent.lastName?.charAt(0) || ''}`.toUpperCase()
        : '';
    const avatarColor = selectedStudent ? getAvatarColor(selectedStudent.firstName + selectedStudent.lastName) : '#94a3b8';

    return (
        <div className="flex flex-col h-full font-sans animate-fade-in relative z-10 w-full">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <button onClick={onBack} className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-[#800000] rounded-lg transition-colors">
                            <FaArrowLeft size={14} />
                        </button>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Record Payment</h1>
                    </div>
                    <p className="text-slate-500 font-medium ml-[46px]">Collect full or partial fee payments from students</p>
                </div>
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
                                placeholder="Search by name or student ID..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl text-slate-700 font-bold placeholder-slate-300 outline-none focus:ring-2 focus:ring-blue-100 transition-all border border-slate-100 text-sm"
                            />
                            {selectedStudent && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full text-white text-[10px] font-black flex items-center justify-center" style={{ backgroundColor: avatarColor }}>
                                        {initials}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                                    <button onClick={clearStudent} className="text-slate-300 hover:text-red-500 ml-1">
                                        <FaTimes size={12} />
                                    </button>
                                </div>
                            )}

                            {/* Dropdown */}
                            {searchResults.length > 0 && !selectedStudent && (
                                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-100 max-h-52 overflow-y-auto z-20 p-1.5">
                                    {searchResults.map(student => {
                                        const sInitials = `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`.toUpperCase();
                                        const sColor = getAvatarColor(student.firstName + student.lastName);
                                        return (
                                            <div
                                                key={student._id}
                                                onClick={() => selectStudent(student)}
                                                className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center gap-3 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0" style={{ backgroundColor: sColor }}>
                                                    {sInitials}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{student.firstName} {student.lastName}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">{student.studentId} · {student.class?.grade || ''}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {isSearching && searchResults.length === 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-slate-100 p-4 text-center text-sm font-bold text-slate-400 z-20">
                                    Searching...
                                </div>
                            )}
                        </div>

                        {/* Selected Student Card */}
                        {selectedStudent && (
                            <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4 border border-slate-100">
                                <div className="w-11 h-11 rounded-full text-white font-black text-sm flex items-center justify-center shrink-0" style={{ backgroundColor: avatarColor }}>
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-800">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        {selectedStudent.studentId} · {selectedStudent.class?.grade || 'N/A'} · Guardian: {selectedStudent.fatherName || 'N/A'}
                                    </p>
                                </div>
                                {selectedStudent.email && (
                                    <span className="text-xs text-blue-500 font-medium hidden md:block">{selectedStudent.email}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Step 2: Select Fee Items */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center ${selectedStudent ? 'bg-purple-500' : 'bg-slate-300'}`}>2</div>
                            <h3 className="text-sm font-black text-slate-800">Select Fee Items</h3>
                        </div>

                        {!selectedStudent ? (
                            <div className="py-8 text-center text-slate-300 text-sm font-bold">
                                Select a student first to view fee items
                            </div>
                        ) : feeItems.length === 0 ? (
                            <div className="py-8 text-center text-slate-300 text-sm font-bold">
                                No fee items found for this student's grade
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {feeItems.map(item => {
                                    const isSelected = selectedFeeIds.includes(item.id);
                                    const isOverdue = item.status === 'Overdue';
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleFeeItem(item.id)}
                                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'border-blue-200 bg-blue-50/40'
                                                    : 'border-slate-100 bg-white hover:border-slate-200'
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                                isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-200'
                                            }`}>
                                                {isSelected && <FaCheckCircle className="text-white text-[10px]" />}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <FaCalendarAlt className="text-slate-300 text-[9px]" />
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        Due {item.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Amount + Status */}
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-slate-800 text-sm">{formatCurrency(item.amount)}</p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ${
                                                    isOverdue
                                                        ? 'bg-red-50 text-red-500 border border-red-100'
                                                        : 'bg-blue-50 text-blue-500 border border-blue-100'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Step 3: Payment Mode + Confirm */}
                    {selectedFeeIds.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center">3</div>
                                <h3 className="text-sm font-black text-slate-800">Payment Mode</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                {[
                                    { id: 'Cash', icon: FaMoneyBillWave, label: 'Cash' },
                                    { id: 'Online', icon: FaMobileAlt, label: 'Online' }
                                ].map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setPaymentMode(mode.id)}
                                        className={`flex items-center justify-center gap-3 py-4 rounded-xl border-2 transition-all ${paymentMode === mode.id
                                            ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                                            : 'border-slate-100 bg-white hover:border-slate-200'
                                        }`}
                                    >
                                        <mode.icon className={`text-lg ${paymentMode === mode.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        <span className={`font-black text-sm ${paymentMode === mode.id ? 'text-emerald-700' : 'text-slate-600'}`}>
                                            {mode.label}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleProcessPayment}
                                disabled={processing}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 disabled:opacity-70 text-sm tracking-wide"
                            >
                                <FaCheckCircle />
                                {processing ? 'Processing...' : `Confirm Payment — ${formatCurrency(selectedTotal)}`}
                            </button>
                        </div>
                    )}
                </div>

                {/* ═══════ RIGHT COLUMN ═══════ */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Payment Summary */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <div className="flex items-center gap-2.5 mb-4">
                            <FaReceipt className="text-blue-500" />
                            <h3 className="text-sm font-black text-slate-800">Payment Summary</h3>
                        </div>

                        {selectedFeeIds.length === 0 ? (
                            <p className="text-center text-slate-300 text-sm font-medium py-6">No fee items selected</p>
                        ) : (
                            <div className="space-y-3">
                                {feeItems.filter(f => selectedFeeIds.includes(f.id)).map(item => (
                                    <div key={item.id} className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-600">{item.name}</span>
                                        <span className="text-sm font-black text-slate-800">{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                                    <span className="text-sm font-black text-slate-800">Total</span>
                                    <span className="text-lg font-black text-emerald-600">{formatCurrency(selectedTotal)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payment History */}
                    {selectedStudent && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-4">
                                <FaHistory className="text-teal-500" />
                                <h3 className="text-sm font-black text-slate-800">Payment History</h3>
                            </div>

                            {paymentHistory.length === 0 ? (
                                <p className="text-center text-slate-300 text-sm font-medium py-4">No payment history</p>
                            ) : (
                                <div className="space-y-3">
                                    {paymentHistory.map((tx, idx) => (
                                        <div key={tx._id || idx} className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                                                <FaCheckCircle size={10} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-700 truncate">
                                                    {Array.isArray(tx.monthsPaid) ? tx.monthsPaid.join(', ') : tx.title || 'Payment'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                    {tx.date ? new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'} · {tx.paymentMethod || 'Cash'}
                                                </p>
                                                {tx.remainingBalance > 0 && (
                                                    <p className="text-[10px] text-amber-500 font-bold mt-0.5">
                                                        {formatCurrency(tx.remainingBalance)} balance after
                                                    </p>
                                                )}
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
                                <h3 className="text-sm font-black text-slate-800">Outstanding Overview</h3>
                            </div>
                            <p className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(totalOutstanding)}</p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">total outstanding</p>
                            <p className="text-xs font-bold text-amber-600 mt-2">{feeItems.length} fee items pending</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecordPayment;
