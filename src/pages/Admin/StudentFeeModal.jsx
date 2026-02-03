import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaTimes, FaPrint, FaSave, FaHistory, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';

const StudentFeeModal = ({ isOpen, onClose, student }) => {
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const componentRef = useRef(); 
  const BASE_URL = import.meta.env.VITE_API_URL;

  // ✅ UPDATED: Get the REAL fee from the database (or default to 0)
  const MONTHLY_FEE = student?.class?.feeStructure?.monthlyFee || 0;

  const allMonths = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (student) {
      fetchHistory();
    }
  }, [student]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/fees/student/${student._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!amount) return toast.error("Enter amount");
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/fees`, {
        studentId: student._id,
        amount: Number(amount),
        feeType: `Tuition - ${month}`,
        paymentMethod,
        status: 'Paid',
        date: new Date()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Payment Recorded!");
      setAmount('');
      fetchHistory(); 
    } catch (error) {
      toast.error("Failed to save payment");
    } finally {
      setSubmitting(false);
    }
  };

  const getMonthStats = (targetMonth) => {
    const payments = history.filter(h => h.feeType.includes(targetMonth));
    const totalPaid = payments.reduce((sum, record) => sum + record.amount, 0);
    
    // ✅ Uses the dynamic MONTHLY_FEE variable
    const pending = MONTHLY_FEE - totalPaid;

    return { 
      totalPaid, 
      pending: pending > 0 ? pending : 0, 
      status: pending <= 0 ? 'Paid' : 'Pending' 
    };
  };

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Receipt_${student?.firstName || 'Student'}`,
  });

  if (!isOpen || !student) return null;

  const classDisplay = student.class?.grade 
    ? `${student.class.grade} - ${student.class.section}` 
    : (student.class || 'N/A');

  const filteredHistory = history.filter(h => h.feeType.includes(month));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* --- Header --- */}
        <div className="bg-slate-800 text-white p-5 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold">{student.firstName} {student.lastName}</h2>
            <p className="text-slate-400 text-sm">Class: {classDisplay} | ID: {student.studentId}</p>
          </div>
          <button onClick={onClose} className="hover:text-red-400 transition"><FaTimes size={24} /></button>
        </div>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          
          {/* --- LEFT COLUMN --- */}
          <div className="w-full md:w-5/12 p-6 bg-slate-50 border-r border-slate-200 overflow-y-auto flex flex-col gap-6">
              
             {/* Warning if no fee set */}
             {MONTHLY_FEE === 0 && (
               <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                 <FaExclamationTriangle />
                 <span>Warning: No Fee Structure set for this class.</span>
               </div>
             )}

             {/* Payment Form */}
             <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-700 mb-4 text-lg border-b pb-2">Record Payment</h3>
               <form onSubmit={handlePayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Month</label>
                    <select 
                      value={month} 
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full p-2.5 border rounded-lg font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {allMonths.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-8 p-2.5 border rounded-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Method</label>
                      <select 
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full p-2.5 border rounded-lg text-slate-700 bg-white"
                      >
                         <option>Cash</option>
                         <option>Online</option>
                         <option>Cheque</option>
                      </select>
                  </div>

                  <button 
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex justify-center items-center gap-2"
                  >
                      {submitting ? 'Saving...' : <><FaSave /> Save Payment</>}
                  </button>
               </form>
             </div>

             {/* Monthly Status Table */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 font-bold text-slate-700 text-sm border-b border-slate-200 flex justify-between items-center">
                  <span>Fee Summary</span>
                  <span className="text-xs font-normal text-slate-500">Monthly Due: <span className="font-bold text-slate-800">${MONTHLY_FEE}</span></span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10 text-xs text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-2">Month</th>
                        <th className="px-4 py-2 text-right">Paid</th>
                        <th className="px-4 py-2 text-right">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allMonths.map((m) => {
                        const { totalPaid, pending, status } = getMonthStats(m);
                        const isCurrentSelection = m === month;
                        
                        return (
                          <tr 
                            key={m} 
                            onClick={() => setMonth(m)} 
                            className={`cursor-pointer transition ${isCurrentSelection ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                          >
                            <td className="px-4 py-2.5 font-medium text-slate-700 flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${status === 'Paid' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                               {m}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                              ${totalPaid}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-bold ${pending > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                              ${pending}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>

          {/* --- RIGHT COLUMN (History & Receipt) --- */}
          <div className="w-full md:w-7/12 p-6 flex flex-col bg-white overflow-hidden">
            
            <div className="flex justify-between items-center mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
               <div>
                 <div className="text-blue-500 text-xs font-bold uppercase tracking-wider">Viewing Details For</div>
                 <h3 className="font-bold text-blue-800 text-xl flex items-center gap-2">
                   <FaHistory className="text-blue-400" /> {month}
                 </h3>
               </div>
               <div className="text-right">
                  <div className="text-blue-500 text-xs font-bold uppercase">Total Collected</div>
                  <div className="text-2xl font-bold text-blue-700">
                    ${filteredHistory.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                  </div>
               </div>
            </div>

            <div className="flex justify-end mb-2">
               <button 
                  onClick={handlePrint}
                  className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"
               >
                  <FaPrint /> Print Official Receipt
               </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl mb-4 relative">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold sticky top-0">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan="4" className="p-10 text-center text-slate-400">No payment records found for {month}</td></tr>
                  ) : (
                    filteredHistory.map(rec => (
                      <tr key={rec._id} className="hover:bg-slate-50">
                        <td className="p-3 text-sm text-slate-600">{new Date(rec.date).toLocaleDateString()}</td>
                        <td className="p-3 text-sm font-medium text-slate-800">{rec.feeType}</td>
                        <td className="p-3 text-xs text-slate-400 uppercase tracking-wide">{rec.paymentMethod}</td>
                        <td className="p-3 text-sm font-bold text-emerald-600 text-right">+${rec.amount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Hidden Print Area */}
            <div style={{ display: "none" }}>
              <div ref={componentRef} className="p-10 font-serif text-slate-800">
                <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
                  <h1 className="text-3xl font-bold uppercase tracking-widest">School Name</h1>
                  <p className="text-sm text-slate-500">Excellence in Education</p>
                </div>
                <div className="flex justify-between mb-8">
                  <div className="space-y-1">
                      <p className="text-sm text-slate-500 uppercase">Student Name</p>
                      <p className="font-bold text-xl">{student.firstName} {student.lastName}</p>
                  </div>
                  <div className="space-y-1 text-right">
                      <p className="text-sm text-slate-500 uppercase">Receipt Details</p>
                      <p className="font-bold">Month: {month}</p>
                      <p className="text-sm">Class: {classDisplay}</p>
                  </div>
                </div>
                <table className="w-full text-left border-collapse mb-8">
                  <thead>
                    <tr className="bg-slate-100 border-y border-slate-300">
                      <th className="py-3 px-2 font-bold uppercase text-xs">Date</th>
                      <th className="py-3 px-2 font-bold uppercase text-xs">Description</th>
                      <th className="py-3 px-2 font-bold uppercase text-xs">Payment Mode</th>
                      <th className="py-3 px-2 font-bold uppercase text-xs text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map(rec => (
                      <tr key={rec._id} className="border-b border-slate-200">
                        <td className="py-3 px-2 text-sm">{new Date(rec.date).toLocaleDateString()}</td>
                        <td className="py-3 px-2 text-sm">{rec.feeType}</td>
                        <td className="py-3 px-2 text-sm">{rec.paymentMethod}</td>
                        <td className="py-3 px-2 text-right font-bold text-sm">${rec.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end">
                    <div className="w-1/2 border-t border-slate-800 pt-2">
                       <div className="flex justify-between text-xl font-bold">
                         <span>Grand Total:</span>
                         <span>${filteredHistory.reduce((acc, curr) => acc + curr.amount, 0)}</span>
                       </div>
                    </div>
                </div>
                <div className="mt-16 flex justify-between text-xs text-slate-400">
                    <div className="pt-2 border-t w-32 text-center border-slate-400">Authorized Signatory</div>
                    <div className="pt-2 border-t w-32 text-center border-slate-400">Parent Signature</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentFeeModal;