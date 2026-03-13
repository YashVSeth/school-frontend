import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaSearch, FaCheckCircle, FaMoneyBillWave, FaCreditCard, FaGlobe } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ACADEMIC_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

const CollectFeeModal = ({ isOpen, onClose, onPaymentSuccess }) => {
    const BASE_URL = import.meta.env.VITE_API_URL;

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    // Form State
    const [category, setCategory] = useState('');
    const [month, setMonth] = useState(ACADEMIC_MONTHS[0]);

    // Amount State
    const [baseAmount, setBaseAmount] = useState('0.00');
    const [discount, setDiscount] = useState('0.00');
    const [amountToPay, setAmountToPay] = useState('0.00');

    // Fee Maps 
    const [feeStructureMap, setFeeStructureMap] = useState({});
    const [existingInvoices, setExistingInvoices] = useState([]);

    // Payment State
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [printReceipt, setPrintReceipt] = useState(true);
    const [processing, setProcessing] = useState(false);

    // History
    const [lastTxn, setLastTxn] = useState(null);

    useEffect(() => {
        if (!isOpen) {
            resetForm();
        } else {
            fetchLastTxn();
            fetchAvailableFees();
        }
    }, [isOpen]);

    // Derived Amounts
    const totalToPay = Math.max(0, parseFloat(baseAmount || 0) - parseFloat(discount || 0));
    const remainingBalance = Math.max(0, totalToPay - parseFloat(amountToPay || 0));

    const resetForm = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedStudent(null);
        setCategory('');
        setMonth(ACADEMIC_MONTHS[0]);
        setBaseAmount('0.00');
        setDiscount('0.00');
        setAmountToPay('0.00');
        setPaymentMode('Cash');
        setFeeStructureMap({});
        setExistingInvoices([]);
    };

    const fetchLastTxn = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/fees/global-stats`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.recentTransactions && res.data.recentTransactions.length > 0) {
                setLastTxn(res.data.recentTransactions[0]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        setSelectedStudent(null);

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
        } catch (error) {
            console.error("Search failed");
        } finally {
            setIsSearching(false);
        }
    };

    const fetchAvailableFees = async () => {
        // You could pre-fetch all or just when student clicked. 
    };

    const selectStudent = async (student) => {
        setSelectedStudent(student);
        setSearchQuery(`${student.firstName} ${student.lastName} (${student.studentId})`);
        setSearchResults([]);

        // Fetch their Class Fee Structure
        try {
            const token = localStorage.getItem('token');
            const classId = student.class?._id || student.class;
            if (!classId) return;

            const res = await axios.get(`${BASE_URL}/api/fee-structure/${classId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data) {
                // Map out all the fees by name so changing dropdown alters Base Amount
                const map = {};
                res.data.mandatoryFees?.forEach(f => map[f.name] = f.amount);
                res.data.optionalFees?.forEach(f => map[f.name] = f.amount);
                setFeeStructureMap(map);

                // Automatically attempt to match current category or set first one
                const availableKeys = Object.keys(map);
                const firstKey = availableKeys.length > 0 ? availableKeys[0] : '';

                const matchedAmount = map[category] || map[firstKey];

                if (firstKey && !map[category]) {
                    setCategory(firstKey);
                }

                if (matchedAmount !== undefined) {
                    setBaseAmount(matchedAmount.toFixed(2));
                    setAmountToPay(matchedAmount.toFixed(2));
                } else {
                    // Fallback to total or 0
                    setBaseAmount('0.00');
                    setAmountToPay('0.00');
                }
            }

            // Fetch existing invoices for the student to check for partial payments
            const invRes = await axios.get(`${BASE_URL}/api/fees/invoices/${student._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExistingInvoices(invRes.data || []);

        } catch (error) {
            console.error("Failed to fetch struct", error);
        }
    };

    // Listen to Category Changes
    useEffect(() => {
        const titleToLookFor = `${month} ${category}`;
        const existingInvoice = existingInvoices.find(inv => inv.title === titleToLookFor);

        if (existingInvoice) {
            // Already generated, show remaining balance
            const remaining = existingInvoice.amount - existingInvoice.amountPaid;
            setBaseAmount(remaining.toFixed(2));
            setAmountToPay(remaining.toFixed(2));
        } else if (feeStructureMap[category] !== undefined) {
            // New invoice
            setBaseAmount(feeStructureMap[category].toFixed(2));
            setAmountToPay(feeStructureMap[category].toFixed(2));
        } else {
            setBaseAmount('0.00');
            setAmountToPay('0.00');
        }
    }, [category, month, feeStructureMap, existingInvoices]);

    const handleProcessPayment = async () => {
        if (!selectedStudent) return toast.error("Please select a student first.");
        const payAmount = parseFloat(amountToPay);
        if (isNaN(payAmount) || payAmount <= 0) return toast.error("Invalid payment amount.");

        setProcessing(true);
        try {
            const token = localStorage.getItem('token');

            // 1. Generate an invoice internally targeting this month
            const invRes = await axios.post(`${BASE_URL}/api/fees/invoices`, {
                studentId: selectedStudent._id,
                title: `${month} ${category}`,
                amount: totalToPay
            }, { headers: { Authorization: `Bearer ${token}` } });

            const invoiceId = invRes.data.invoice?._id;

            // 2. Process cart payment against it
            if (invoiceId) {
                await axios.post(`${BASE_URL}/api/fees/pay-cart`, {
                    studentId: selectedStudent._id,
                    amountPaid: payAmount,
                    paymentMethod: paymentMode,
                    invoicesToPay: [invoiceId]
                }, { headers: { Authorization: `Bearer ${token}` } });
            }

            toast.success("Payment Processed Successfully!");
            if (onPaymentSuccess) onPaymentSuccess();
            onClose();

            if (printReceipt) {
                // Trigger hypothetical print logic
                toast.info("Receipt printing...");
            }

        } catch (error) {
            const errorMessage = error.response?.data?.message || "Failed to process payment";
            toast.error(errorMessage);
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
            <div className="bg-white w-full max-w-3xl rounded-[24px] overflow-hidden flex flex-col shadow-2xl animate-slide-up max-h-[90vh] relative">

                {/* Free Floating Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-full shadow-sm border border-slate-100 transition-all"
                >
                    <FaTimes size={18} />
                </button>

                {/* Header Strip - EduPay Manager Header mapping to standard App structure */}
                <div className="bg-[#fcfafa] px-6 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
                    <div className="bg-[#800000] text-white p-1.5 rounded-md">
                        <FaMoneyBillWave size={14} />
                    </div>
                    <h2 className="text-[#800000] font-black tracking-tight text-base">EduPay Manager</h2>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-white">

                    {/* Modal Title */}
                    <div className="mb-8 border-b border-slate-100 pb-6">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Collect Fee</h1>
                        <p className="text-sm font-medium text-slate-500 mt-2">Generate invoices and process student fee payments securely.</p>
                    </div>

                    {/* SEARCH STUDENT */}
                    <div className="mb-8 relative">
                        <label className="text-[11px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-3 block">Search Student</label>
                        <div className="relative">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c28b8b] text-sm" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearch}
                                placeholder="Enter Student Name or Admission ID (e.g. ADM-2024-001)"
                                className="w-full pl-11 pr-4 py-4 bg-[#f2eaea] rounded-xl text-[#7a8599] font-bold placeholder-[#a7afbf] outline-none focus:ring-2 focus:ring-[#800000]/20 transition-all border border-transparent"
                            />
                        </div>

                        {/* Dropdown Results */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-64 overflow-y-auto z-20 p-2">
                                {searchResults.map(student => (
                                    <div
                                        key={student._id}
                                        onClick={() => selectStudent(student)}
                                        className="p-3 hover:bg-[#F2EBEC] rounded-lg cursor-pointer flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-white border border-[#800000]/20 text-[#800000] rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                                            {student.firstName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{student.firstName} {student.lastName}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{student.studentId}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {isSearching && searchResults.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-100 p-4 text-center text-sm font-bold text-slate-400 z-20">
                                Searching...
                            </div>
                        )}
                    </div>

                    {/* CATEGORY & MONTH */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="text-[10px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-3 block">Fee Category</label>
                            <select
                                value={category} onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3.5 bg-[#f8f8fb] border border-slate-200 rounded-xl text-[#1e293b] font-bold outline-none focus:border-[#800000]/30 transition-all cursor-pointer"
                            >
                                <option value="" disabled>Select Category</option>
                                {/* Combine static categories with dynamically pulled struct map keys */}
                                {Object.keys(feeStructureMap).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-3 block">Month / Quarter</label>
                            <select
                                value={month} onChange={(e) => setMonth(e.target.value)}
                                className="w-full px-4 py-3.5 bg-[#f8f8fb] border border-slate-200 rounded-xl text-[#1e293b] font-bold outline-none focus:border-[#800000]/30 transition-all cursor-pointer"
                            >
                                {ACADEMIC_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* AMOUNTS ROW 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="text-[10px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-3 block">Base Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#8fa0b5]">₹</span>
                                <input
                                    type="text" value={baseAmount} readOnly
                                    className="w-full pl-8 pr-4 py-3.5 border border-slate-100 bg-[#f4f7fb] text-[#1e293b] rounded-xl font-bold outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-3 block">Discount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#8fa0b5]">₹</span>
                                <input
                                    type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} min="0"
                                    className="w-full pl-8 pr-4 py-3.5 bg-[#fefdfa] border border-slate-100 rounded-xl text-[#1e293b] font-bold outline-none focus:border-amber-300 transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-3 block">Total To Pay</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#8fa0b5]">₹</span>
                                <input
                                    type="text" value={totalToPay.toFixed(2)} readOnly
                                    className="w-full pl-8 pr-4 py-3.5 border border-slate-100 bg-[#f4f7fb] text-[#1e293b] rounded-xl font-bold outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* AMOUNTS ROW 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 w-full md:w-[65%] pr-3">
                        <div>
                            <label className="text-[10px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-3 block">Amount To Pay</label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-[#7a1717] text-lg">₹</span>
                                <input
                                    type="number" value={amountToPay} onChange={(e) => setAmountToPay(e.target.value)} min="0"
                                    className="w-full pl-10 pr-4 py-4 bg-[#f9elel] bg-[#faf0f1] border border-[#f0d4d6] rounded-xl text-[#7a1717] text-lg font-black outline-none focus:ring-2 focus:ring-[#800000]/20 transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-3 block">Remaining Balance</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#8fa0b5]">₹</span>
                                <input
                                    type="text" value={remainingBalance.toFixed(2)} readOnly
                                    className="w-full pl-8 pr-4 py-4 border border-slate-100 bg-[#f4f7fb] text-[#8fa0b5] rounded-xl font-bold outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* PAYMENT MODE */}
                    <div className="mb-10 border-t border-slate-100 pt-8">
                        <label className="text-[10px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-4 block">Payment Mode</label>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { id: 'Cash', icon: FaMoneyBillWave },
                                { id: 'Card', icon: FaCreditCard },
                                { id: 'Online', icon: FaGlobe }
                            ].map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setPaymentMode(mode.id)}
                                    className={`flex flex-col items-center justify-center py-6 rounded-xl border-2 transition-all ${paymentMode === mode.id
                                        ? 'border-[#800000] bg-[#FFFafa] shadow-sm'
                                        : 'border-slate-100 bg-white hover:border-slate-200'
                                        }`}
                                >
                                    <mode.icon className={`text-xl mb-3 ${paymentMode === mode.id ? 'text-[#800000]' : 'text-[#800000]'}`} />
                                    <span className={`font-black tracking-wide text-sm ${paymentMode === mode.id ? 'text-slate-900' : 'text-slate-700'}`}>
                                        {mode.id}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div className="border-t border-slate-100 pt-6 flex flex-col md:flex-row justify-between items-center gap-6 pb-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${printReceipt ? 'bg-[#800000]' : 'bg-slate-200 group-hover:bg-slate-300'}`}>
                                {printReceipt && <FaCheckCircle className="text-white text-xs" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={printReceipt} onChange={() => setPrintReceipt(!printReceipt)} />
                            <span className="font-bold text-slate-700 select-none tracking-tight">Print Receipt Automatically</span>
                        </label>

                        <div className="flex gap-4 w-full md:w-auto">
                            <button
                                onClick={onClose}
                                className="flex-1 md:flex-none px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-[#800000] rounded-xl font-black transition-all text-sm tracking-wide"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleProcessPayment}
                                disabled={processing}
                                className="flex-1 md:flex-none px-8 py-4 bg-[#800000] hover:bg-[#600000] text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 disabled:opacity-70 text-sm tracking-wide"
                            >
                                <FaCheckCircle /> {processing ? 'Processing...' : 'Process Payment'}
                            </button>
                        </div>
                    </div>

                </div>

                {/* BOTTOM HISTORY STRIP */}
                <div className="bg-[#FAF8F8] px-10 py-4 border-t border-slate-100 flex justify-between items-center shrink-0">
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        Last transaction: {lastTxn?.student ? `${lastTxn.student.firstName} ${lastTxn.student.lastName}` : 'N/A'} (₹{lastTxn?.amount || 0})
                        - {lastTxn?.date ? new Date(lastTxn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                    </p>
                    <button className="text-[#800000] text-xs font-black uppercase tracking-wider hover:underline">
                        View History
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CollectFeeModal;
