import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FaTimes, FaWallet, FaWhatsapp, FaHistory, FaCheckCircle,
    FaCalculator, FaMagic, FaSlidersH, FaInfoCircle, FaPrint
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import TeacherPayslipModal from './TeacherPayslipModal';

const TeacherSalaryModal = ({ isOpen, onClose, teacher, initialMonth, proratedInfo }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form States
    const [amount, setAmount] = useState('');
    const [paymentType, setPaymentType] = useState('Prorated Salary');
    const [month, setMonth] = useState(initialMonth || new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [remarks, setRemarks] = useState('');

    // Attendance & Proration States
    const [useProration, setUseProration] = useState(true);
    const [attendanceStats, setAttendanceStats] = useState({
        daysInMonth: 30,
        present: 0,
        absent: 0,
        halfDay: 0,
        leave: 0,
        effectiveAbsent: 0,
        dailyRate: 0,
        deduction: 0,
        netPayable: 0
    });
    const [loadingAttendance, setLoadingAttendance] = useState(false);

    // Dynamic Balance States
    const [sumPaidThisMonth, setSumPaidThisMonth] = useState(0);
    const [unproratedRemaining, setUnproratedRemaining] = useState(0);
    const [proratedRemaining, setProratedRemaining] = useState(0);

    // Payslip Modal State
    const [selectedPayslipRecord, setSelectedPayslipRecord] = useState(null);
    const [isPayslipOpen, setIsPayslipOpen] = useState(false);

    const BASE_URL = import.meta.env.VITE_API_URL;

    // Reset when modal opens
    useEffect(() => {
        if (isOpen && teacher) {
            fetchHistory();
            fetchTeacherAttendanceAndProrate(month);
            setAmount('');
            setRemarks('');
            setPaymentType('Prorated Salary');
            setUseProration(true);
        }
    }, [isOpen, teacher]);

    // Recalculate if month changes
    useEffect(() => {
        if (isOpen && teacher) {
            fetchTeacherAttendanceAndProrate(month);
        }
    }, [month]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/salary/history/${teacher._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data || []);
        } catch (error) {
            console.error("Failed to fetch salary history", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeacherAttendanceAndProrate = async (targetMonth) => {
        setLoadingAttendance(true);
        try {
            const [yearStr, monthStr] = targetMonth.split('-');
            const year = parseInt(yearStr, 10);
            const monthNum = parseInt(monthStr, 10);
            const daysInMonth = new Date(year, monthNum, 0).getDate();

            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/attendance/teacher/${teacher._id}`, {
                params: { month: targetMonth },
                headers: { Authorization: `Bearer ${token}` }
            });

            const records = res.data || [];
            let present = 0;
            let absent = 0;
            let halfDay = 0;
            let leave = 0;

            records.forEach(r => {
                if (r.status === 'Present') present++;
                else if (r.status === 'Absent') absent++;
                else if (r.status === 'Half Day') halfDay++;
                else if (r.status === 'On Leave') leave++;
            });

            const effectiveAbsent = absent + (halfDay * 0.5);
            const baseSalary = teacher.baseSalary || 0;
            const dailyRate = daysInMonth > 0 ? (baseSalary / daysInMonth) : 0;
            const deduction = Math.round(effectiveAbsent * dailyRate);
            const netPayable = Math.max(0, baseSalary - deduction);

            setAttendanceStats({
                daysInMonth,
                present,
                absent,
                halfDay,
                leave,
                effectiveAbsent,
                dailyRate: Math.round(dailyRate),
                deduction,
                netPayable
            });
        } catch (err) {
            console.error("Failed to load attendance for proration:", err);
        } finally {
            setLoadingAttendance(false);
        }
    };

    // Calculate balances whenever history, month, or attendance changes
    useEffect(() => {
        if (!teacher) return;
        const baseSalary = teacher.baseSalary || 0;

        const sumPaid = history
            .filter(r => r.month === month && r.paymentType !== 'Bonus')
            .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

        setSumPaidThisMonth(sumPaid);
        setUnproratedRemaining(Math.max(0, baseSalary - sumPaid));

        const proratedNet = attendanceStats.netPayable;
        const proratedRem = Math.max(0, proratedNet - sumPaid);
        setProratedRemaining(proratedRem);

        // Auto-suggest amount if not manually typed yet
        if (!amount || amount === 0) {
            if (useProration) {
                setAmount(proratedRem > 0 ? proratedRem : '');
            } else {
                setAmount((baseSalary - sumPaid) > 0 ? (baseSalary - sumPaid) : '');
            }
        }
    }, [history, month, attendanceStats, teacher, useProration]);

    // Handle Quick Apply Prorated Amount
    const handleApplyProrated = () => {
        setUseProration(true);
        setPaymentType('Prorated Salary');
        setAmount(proratedRemaining);
        if (attendanceStats.deduction > 0) {
            setRemarks(`Prorated for ${month}: Deducted ₹${attendanceStats.deduction.toLocaleString()} for ${attendanceStats.effectiveAbsent} absent days.`);
        } else {
            setRemarks(`Full attendance for ${month} (${attendanceStats.present} days present).`);
        }
    };

    const handleApplyStandardFull = () => {
        setUseProration(false);
        setPaymentType('Full Salary');
        setAmount(unproratedRemaining);
        setRemarks(`Standard salary for ${month}.`);
    };

    const maxAllowedAmount = paymentType === 'Bonus'
        ? 1000000
        : useProration
            ? proratedRemaining
            : unproratedRemaining;

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
                attendanceDeduction: useProration ? attendanceStats.deduction : 0,
                effectiveAbsentDays: useProration ? attendanceStats.effectiveAbsent : 0,
                remarks
            };

            const res = await axios.post(`${BASE_URL}/api/salary/pay`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Salary Payment Recorded Successfully!");

            // Send WhatsApp Notification with breakdown
            const formattedDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            let msg = `🧾 *Salary Disbursement Receipt*\n\nDear *${teacher.fullName}*,\nYour payment of *₹${Number(amount).toLocaleString()}* for *${month}* has been credited on ${formattedDate}.\nType: ${paymentType}\n`;

            if (useProration && attendanceStats.deduction > 0) {
                msg += `Base Salary: ₹${teacher.baseSalary?.toLocaleString()}\nAttendance Deductions (${attendanceStats.effectiveAbsent} days): -₹${attendanceStats.deduction?.toLocaleString()}\nNet Credited: ₹${Number(amount).toLocaleString()}\n`;
            }

            if (remarks) msg += `Note: "${remarks}"\n`;
            msg += `\nRadhey Shyam Shikshan Sansthan`;

            let phoneStr = (teacher.phone || '').replace(/\D/g, '');
            if (phoneStr.length === 10) phoneStr = `91${phoneStr}`;

            const whatsappUrl = `https://wa.me/${phoneStr}?text=${encodeURIComponent(msg)}`;
            window.open(whatsappUrl, '_blank');

            // Refresh History
            fetchHistory();
            fetchTeacherAttendanceAndProrate(month);
            setAmount('');
            setRemarks('');
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to process payment");
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !teacher) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 font-sans animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[92vh]">

                {/* LEFT SIDE: PAYMENT & PRORATION FORM */}
                <div className="md:w-1/2 p-6 sm:p-8 bg-slate-50 border-r border-slate-100 overflow-y-auto">
                    <div className="flex justify-between items-start mb-5">
                        <div>
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-amber-200">
                                <FaWallet size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pay Salary</h2>
                            <p className="text-slate-500 text-xs sm:text-sm font-medium">{teacher.fullName} • Base: ₹{(teacher.baseSalary || 0).toLocaleString()}</p>
                        </div>
                        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-rose-500 p-2">
                            <FaTimes size={20} />
                        </button>
                    </div>

                    <form onSubmit={handlePayment} className="space-y-4">

                        {/* Month & Payment Type */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Payroll Month</label>
                                <input
                                    type="month"
                                    required
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500 font-bold text-slate-800 text-sm shadow-xs"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Payment Type</label>
                                <select
                                    value={paymentType}
                                    onChange={(e) => {
                                        setPaymentType(e.target.value);
                                        if (e.target.value === 'Prorated Salary') setUseProration(true);
                                    }}
                                    className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500 font-bold text-slate-800 text-sm shadow-xs"
                                >
                                    <option value="Prorated Salary">Prorated Salary</option>
                                    <option value="Full Salary">Full Salary</option>
                                    <option value="Partial Advance">Partial Advance</option>
                                    <option value="Bonus">Bonus</option>
                                </select>
                            </div>
                        </div>

                        {/* ✨ PRORATION BREAKDOWN CARD */}
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 uppercase tracking-wide">
                                    <FaCalculator className="text-amber-600" /> Attendance Proration
                                </div>
                                <span className="text-[10px] font-black bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
                                    {attendanceStats.daysInMonth} Days in Month
                                </span>
                            </div>

                            {/* Attendance mini-pills */}
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                                <div className="bg-white p-2 rounded-xl border border-amber-100 shadow-2xs">
                                    <span className="text-[9px] font-black text-slate-400 block uppercase">Present</span>
                                    <span className="font-black text-emerald-600 text-xs sm:text-sm">{attendanceStats.present}</span>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-amber-100 shadow-2xs">
                                    <span className="text-[9px] font-black text-slate-400 block uppercase">Absent</span>
                                    <span className="font-black text-rose-600 text-xs sm:text-sm">{attendanceStats.absent}</span>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-amber-100 shadow-2xs">
                                    <span className="text-[9px] font-black text-slate-400 block uppercase">Half-Day</span>
                                    <span className="font-black text-amber-600 text-xs sm:text-sm">{attendanceStats.halfDay}</span>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-amber-100 shadow-2xs">
                                    <span className="text-[9px] font-black text-slate-400 block uppercase">On Leave</span>
                                    <span className="font-black text-blue-600 text-xs sm:text-sm">{attendanceStats.leave}</span>
                                </div>
                            </div>

                            {/* Calculations */}
                            <div className="space-y-1 text-xs pt-1 border-t border-amber-200/60">
                                <div className="flex justify-between text-slate-600">
                                    <span>Daily Rate:</span>
                                    <span className="font-bold text-slate-800">₹{attendanceStats.dailyRate}/day</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Absent Deduction ({attendanceStats.effectiveAbsent} days):</span>
                                    <span className="font-black text-rose-600">-₹{attendanceStats.deduction.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-amber-200/40">
                                    <span>Net Prorated Payable:</span>
                                    <span className="font-black text-emerald-700 text-sm">₹{attendanceStats.netPayable.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Proration vs Standard Buttons */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleApplyProrated}
                                    className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 border ${
                                        useProration
                                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                                    }`}
                                >
                                    <FaMagic size={10} /> Apply Prorated (₹{proratedRemaining.toLocaleString()})
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplyStandardFull}
                                    className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition border ${
                                        !useProration
                                            ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    Full Base
                                </button>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div>
                            <div className="flex justify-between items-center">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Amount to Disburse (₹)</label>
                                {paymentType !== 'Bonus' && (
                                    <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                        Max Due: ₹{maxAllowedAmount.toLocaleString()}
                                    </span>
                                )}
                            </div>
                            <input
                                type="number"
                                required
                                min="1"
                                max={paymentType !== 'Bonus' ? maxAllowedAmount : undefined}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-500 font-black text-xl text-amber-700 shadow-xs"
                            />
                            {paymentType !== 'Bonus' && Number(amount) > maxAllowedAmount && (
                                <p className="text-rose-500 text-xs font-bold mt-1">Amount exceeds remaining due balance.</p>
                            )}
                        </div>

                        {/* Remarks Input */}
                        <div>
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Remarks / Breakdown Note</label>
                            <input
                                type="text"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="e.g. Attendance prorated, Deducted 2 absent days"
                                className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-amber-500 font-medium text-slate-700 text-xs shadow-xs"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting || (paymentType !== 'Bonus' && (Number(amount) > maxAllowedAmount || maxAllowedAmount === 0))}
                            className={`w-full !mt-5 text-white font-black py-3.5 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 group text-sm ${
                                paymentType !== 'Bonus' && (Number(amount) > maxAllowedAmount || maxAllowedAmount === 0)
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30 active:scale-98'
                            }`}
                        >
                            {submitting ? 'Recording Payment...' : (
                                <>
                                    <FaCheckCircle className="text-amber-200 group-hover:scale-110 transition-transform" />
                                    {paymentType !== 'Bonus' && maxAllowedAmount === 0 ? 'Month Fully Settled' : 'Disburse & Send Receipt'}
                                    <FaWhatsapp className="text-amber-200 ml-1 text-lg group-hover:rotate-12 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* RIGHT SIDE: PAST HISTORY */}
                <div className="md:w-1/2 p-6 sm:p-8 bg-white flex flex-col relative">
                    <div className="absolute top-6 right-6 hidden md:block">
                        <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors bg-slate-100 hover:bg-rose-50 p-2 rounded-full">
                            <FaTimes size={16} />
                        </button>
                    </div>

                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2 mb-4 uppercase tracking-wide">
                        <FaHistory className="text-amber-500" /> Payment History
                    </h3>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                        {loading ? (
                            <div className="text-center py-10 text-slate-400 font-medium animate-pulse">Loading receipts...</div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50">
                                <p className="text-slate-400 font-bold">No payments recorded yet.</p>
                                <p className="text-slate-400 text-xs mt-1">Disburse your first payment on the left.</p>
                            </div>
                        ) : (
                            history.map(record => (
                                <div key={record._id} className="p-3.5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1
                                                ${record.paymentType === 'Leave Deduction' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                                    record.paymentType === 'Prorated Salary' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                        record.paymentType.includes('Partial') ? 'bg-amber-50 text-amber-700' :
                                                            record.paymentType === 'Bonus' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-700'
                                                }`}>
                                                {record.paymentType}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400">{record.month}</span>
                                        </div>
                                        <p className="font-bold text-slate-700 text-xs">{new Date(record.paymentDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                                        {record.remarks && <p className="text-[11px] text-slate-500 mt-0.5 italic">"{record.remarks}"</p>}
                                    </div>
                                    <div className="text-right space-y-1">
                                        <div className="text-base font-black text-slate-800">
                                            ₹{record.amountPaid?.toLocaleString()}
                                        </div>
                                        {record.attendanceDeduction > 0 && (
                                            <span className="text-[10px] font-bold text-rose-500 block">
                                                -₹{record.attendanceDeduction.toLocaleString()} ded.
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedPayslipRecord(record);
                                                setIsPayslipOpen(true);
                                            }}
                                            className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1 transition"
                                            title="Print Payslip"
                                        >
                                            <FaPrint size={9} /> Slip
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* Payslip Modal Component */}
            {isPayslipOpen && selectedPayslipRecord && (
                <TeacherPayslipModal
                    isOpen={isPayslipOpen}
                    onClose={() => {
                        setIsPayslipOpen(false);
                        setSelectedPayslipRecord(null);
                    }}
                    teacher={teacher}
                    paymentRecord={selectedPayslipRecord}
                    proratedInfo={attendanceStats}
                    month={selectedPayslipRecord.month}
                />
            )}
        </div>
    );
};

export default TeacherSalaryModal;
