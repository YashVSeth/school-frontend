import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaWallet, FaWhatsapp, FaHistory, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const TeacherSalaryModal = ({ isOpen, onClose, teacher }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form States
    const [amount, setAmount] = useState('');
    const [paymentType, setPaymentType] = useState('Full Salary');
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [remarks, setRemarks] = useState('');

    // Dynamic Validation State
    const [remainingBalance, setRemainingBalance] = useState(0);

    const BASE_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        if (isOpen && teacher) {
            fetchHistory();
            // Reset form
            setAmount('');
            setRemarks('');
        }
    }, [isOpen, teacher]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/salary/history/${teacher._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
            calculateRemainingBalance(res.data, month, teacher.baseSalary);
        } catch (error) {
            console.error("Failed to fetch salary history", error);
        } finally {
            setLoading(false);
        }
    };

    // Recalculate if month changes
    useEffect(() => {
        if (teacher) {
            calculateRemainingBalance(history, month, teacher.baseSalary);
        }
    }, [month, history, teacher]);

    const calculateRemainingBalance = (historyList, selectedMonth, baseSalary) => {
        const salaryCap = baseSalary || 0;

        // Sum all past Full or Partial advances for this specific month
        const sumPaid = historyList
            .filter(record => record.month === selectedMonth && record.paymentType !== 'Bonus')
            .reduce((acc, curr) => acc + curr.amountPaid, 0);

        setRemainingBalance(Math.max(0, salaryCap - sumPaid));
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                teacherId: teacher._id,
                amountPaid: Number(amount),
                paymentType,
                month,
                remarks
            };

            await axios.post(`${BASE_URL}/api/salary/pay`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Salary Payment Recorded Successfully!");

            // Send WhatsApp Notification
            const formattedDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const message = `Hello ${teacher.fullName},%0A%0AYour *${paymentType}* of *₹${amount}* for the month of *${month}* has been successfully credited on ${formattedDate}.%0A%0AThank you!`;

            // Format phone number for WhatsApp (assuming Indian numbers +91 by default if no country code)
            let phoneStr = teacher.phone || '';
            phoneStr = phoneStr.replace(/\D/g, ''); // strip non-digits
            if (phoneStr.length === 10) phoneStr = `91${phoneStr}`;

            const whatsappUrl = `https://wa.me/${phoneStr}?text=${message}`;

            // Open WhatsApp in new tab
            window.open(whatsappUrl, '_blank');

            // Refresh History & Reset Form
            fetchHistory();
            setAmount('');
            setRemarks('');
        } catch (error) {
            toast.error("Failed to process payment");
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !teacher) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 font-sans animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">

                {/* LEFT SIDE: PAYMENT FORM */}
                <div className="md:w-1/2 p-8 bg-slate-50 border-r border-slate-100 overflow-y-auto">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-amber-200">
                                <FaWallet size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800">Pay Salary</h2>
                            <p className="text-slate-500 text-sm font-medium">{teacher.fullName}</p>
                        </div>
                        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-rose-500">
                            <FaTimes size={24} />
                        </button>
                    </div>

                    <form onSubmit={handlePayment} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Payment Month</label>
                                <input
                                    type="month"
                                    required
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-amber-500 font-bold text-slate-700 shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Payment Type</label>
                                <select
                                    value={paymentType}
                                    onChange={(e) => setPaymentType(e.target.value)}
                                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-amber-500 font-bold text-slate-700 shadow-sm"
                                >
                                    <option value="Full Salary">Full Salary</option>
                                    <option value="Partial Advance">Partial Advance</option>
                                    <option value="Bonus">Bonus</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase">Amount (₹)</label>
                                {paymentType !== 'Bonus' && (
                                    <span className="text-xs font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">
                                        Max: ₹{remainingBalance.toLocaleString()}
                                    </span>
                                )}
                            </div>
                            <input
                                type="number"
                                required
                                min="1"
                                max={paymentType !== 'Bonus' ? remainingBalance : undefined}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g. 25000"
                                className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-amber-500 font-black text-xl text-amber-700 shadow-sm"
                            />
                            {paymentType !== 'Bonus' && amount > remainingBalance && (
                                <p className="text-rose-500 text-xs font-bold mt-1">Amount exceeds remaining monthly balance.</p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Remarks (Optional)</label>
                            <input
                                type="text"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="e.g. Diwali bonus, Advance for travel"
                                className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-amber-500 font-medium text-slate-700 shadow-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || (paymentType !== 'Bonus' && amount > remainingBalance) || (paymentType !== 'Bonus' && remainingBalance === 0)}
                            className={`w-full !mt-8 text-white font-black py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 group ${(paymentType !== 'Bonus' && (amount > remainingBalance || remainingBalance === 0))
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30'
                                }`}
                        >
                            {submitting ? 'Processing...' : (
                                <>
                                    <FaCheckCircle className="text-amber-200 group-hover:scale-110 transition-transform" />
                                    {paymentType !== 'Bonus' && remainingBalance === 0 ? 'Balance Fully Paid' : 'Pay & Notify'}
                                    <FaWhatsapp className="text-amber-200 ml-1 text-xl group-hover:rotate-12 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* RIGHT SIDE: PAST HISTORY */}
                <div className="md:w-1/2 p-8 bg-white flex flex-col relative">
                    <div className="absolute top-6 right-6 hidden md:block">
                        <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors bg-slate-100 hover:bg-rose-50 p-2 rounded-full">
                            <FaTimes size={16} />
                        </button>
                    </div>

                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6 uppercase tracking-wide">
                        <FaHistory className="text-red-500" /> Payment History
                    </h3>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {loading ? (
                            <div className="text-center py-10 text-slate-400 font-medium animate-pulse">Loading history...</div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50">
                                <p className="text-slate-400 font-bold">No payments recorded yet.</p>
                                <p className="text-slate-400 text-sm mt-1">Make the first payment on the left.</p>
                            </div>
                        ) : (
                            history.map(record => (
                                <div key={record._id} className="p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${record.paymentType.includes('Partial') ? 'bg-amber-100 text-amber-700' :
                                                record.paymentType === 'Bonus' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {record.paymentType}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400">{record.month}</span>
                                        </div>
                                        <p className="font-bold text-slate-700 text-sm">{new Date(record.paymentDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                                        {record.remarks && <p className="text-[11px] text-slate-500 mt-1 italic">"{record.remarks}"</p>}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-slate-800">₹{record.amountPaid.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TeacherSalaryModal;
