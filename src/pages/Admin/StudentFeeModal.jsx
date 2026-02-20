import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  FaTimes, FaCheckCircle, FaExclamationTriangle, 
  FaFileDownload, FaFilter, FaChevronRight, FaPrint, FaSearch, FaArrowLeft
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';

const ACADEMIC_MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

const StudentFeeModal = ({ isOpen, onClose, student }) => {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [history, setHistory] = useState([]);
  const [feeStructure, setFeeStructure] = useState({ monthlyTuition: 0, admissionFee: 0, examFee: 0 });
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [isViewingReceipts, setIsViewingReceipts] = useState(false);
  const [receiptToPrint, setReceiptToPrint] = useState(null);
  
  const componentRef = useRef(null); // ✅ Added null initialization
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (student && isOpen) {
      setIsViewingReceipts(false); 
      refreshData();
    }
  }, [student, isOpen]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const invRes = await axios.get(`${BASE_URL}/api/fees/invoices/${student._id}`, { headers });
      const allInvoices = await axios.get(`${BASE_URL}/api/fees/invoices/${student._id}?all=true`, { headers }).catch(() => invRes); 
      setInvoices(allInvoices.data || invRes.data);

      const statusRes = await axios.get(`${BASE_URL}/api/fees/status/${student._id}`, { headers });
      setHistory(statusRes.data.history || []);
      setFeeStructure(statusRes.data.structure || { monthlyTuition: 0, admissionFee: 0, examFee: 0 });

      setSelectedInvoices([]);
      setAmountPaid('');
    } catch (err) {
      toast.error("Error refreshing financial data");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = async (title, defaultAmount) => {
    let inv = invoices.find(i => i.title.includes(title));

    if (!inv) {
      if (!defaultAmount || defaultAmount <= 0) return toast.warn("Fee amount is zero. Check Fee Structures.");
      const toastId = toast.loading(`Generating bill for ${title}...`);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post(`${BASE_URL}/api/fees/invoices`, {
          studentId: student._id, title: `${title} Tuition`, amount: defaultAmount
        }, { headers: { Authorization: `Bearer ${token}` } });
        inv = res.data.invoice;
        setInvoices(prev => [...prev, inv]);
        toast.dismiss(toastId);
      } catch (error) {
        toast.update(toastId, { render: "Failed to generate bill", type: "error", isLoading: false, autoClose: 2000 });
        return;
      }
    }

    if (inv.status === 'Paid') return;

    setSelectedInvoices(prev => 
      prev.includes(inv._id) ? prev.filter(id => id !== inv._id) : [...prev, inv._id]
    );
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (selectedInvoices.length === 0) return toast.warn("Select at least one pending due to pay");
    if (!amountPaid || Number(amountPaid) <= 0) return toast.error("Enter payment amount");

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/fees/pay-cart`, {
        studentId: student._id,
        amountPaid: Number(amountPaid),
        paymentMethod,
        invoicesToPay: selectedInvoices
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success("Payment Successful!");
      refreshData();
    } catch (error) {
      toast.error("Payment Failed");
    } finally {
      setProcessing(false);
    }
  };

  // ✅ V3 COMPATIBLE PRINT LOGIC
  const handlePrint = useReactToPrint({ 
    contentRef: componentRef, // Fixed for v3 update
    documentTitle: `${student?.firstName}_Fee_Receipt`
  });

  const triggerPrint = (txn) => {
    setReceiptToPrint(txn);
    setTimeout(() => {
      handlePrint();
    }, 150);
  };

  if (!isOpen || !student) return null;

  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.amount - inv.amountPaid), 0);
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const percentPaid = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
  
  const selectedTotal = invoices
    .filter(inv => selectedInvoices.includes(inv._id))
    .reduce((sum, inv) => sum + (inv.amount - inv.amountPaid), 0);

  const activeInvoice = invoices.find(inv => inv.status === 'Partially Paid') || invoices.find(inv => inv.status !== 'Paid');
  const activePrintTxn = receiptToPrint || (history.length > 0 ? history[0] : null);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-6 animate-fade-in font-sans">
      <div className="bg-slate-50 w-full max-w-7xl rounded-2xl shadow-2xl flex flex-col h-[95vh] overflow-hidden border border-slate-200 transition-all">
        
        {/* --- GLOBAL TOP HEADER --- */}
        <div className="bg-white px-8 py-5 flex justify-between items-center shrink-0 border-b border-slate-200 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-100 text-[#F05A28] rounded-full flex items-center justify-center text-2xl font-black border-2 border-orange-200 shadow-sm">
              {student.firstName?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{student.firstName} {student.lastName}</h2>
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mt-1">
                <span className="text-[#F05A28] bg-orange-50 px-2 py-0.5 rounded uppercase tracking-wider">ID: {student.studentId}</span>
                <span className="flex items-center gap-1"><FaChevronRight size={8}/> Grade {student.class?.grade || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Outstanding</p>
              <p className="text-2xl font-black text-[#F05A28]">₹{totalOutstanding.toLocaleString()}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-full transition-colors">
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* --- DYNAMIC BODY CONTENT --- */}
        {isViewingReceipts ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-50 flex flex-col">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">View Receipts</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Financial records for <span className="font-bold text-slate-700">{student.firstName} {student.lastName}</span> (Adm No: {student.studentId})
                </p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setIsViewingReceipts(false)} 
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl flex items-center gap-2 hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <FaArrowLeft /> Back
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Receipt No</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Month / Fee Type</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.length > 0 ? history.map((txn, index) => {
                      const displayMonth = txn.monthsPaid?.length > 0 ? txn.monthsPaid[0].split(' ')[0] : 'General';
                      const displayYear = new Date(txn.date).getFullYear();
                      
                      return (
                        <tr key={txn._id} className="hover:bg-slate-50 transition-colors group">
                          <td className="py-5 px-6 font-black text-slate-800 tracking-tight">
                            RE-{new Date(txn.date).getFullYear()}-{txn._id.slice(-4).toUpperCase()}
                          </td>
                          <td className="py-5 px-6 font-bold text-slate-600">
                            {new Date(txn.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-5 px-6">
                            <p className="font-bold text-slate-800">{displayMonth} {displayYear}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[200px]">{txn.monthsPaid?.join(' + ') || 'Fee Payment'}</p>
                          </td>
                          <td className="py-5 px-6 font-black text-slate-900">
                            ₹ {txn.amount.toLocaleString()}
                          </td>
                          <td className="py-5 px-6 text-right">
                            <button 
                              onClick={() => triggerPrint(txn)}
                              className="bg-orange-50 text-[#F05A28] border border-orange-100 hover:bg-orange-100 hover:border-orange-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ml-auto transition-all"
                            >
                              <FaPrint /> Print Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="5" className="py-16 text-center">
                           <FaFileDownload className="mx-auto text-slate-300 text-4xl mb-3" />
                           <p className="text-slate-500 font-bold">No historical receipts found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            <div className="w-full lg:w-2/3 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Fee Collection Status</h2>
              </div>

              {activeInvoice && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-[#F05A28] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F05A28]"></span> Current Action Required
                  </p>
                  
                  <div className={`bg-white rounded-2xl border-l-4 ${activeInvoice.status === 'Partially Paid' ? 'border-orange-400' : 'border-rose-500'} p-6 shadow-sm flex flex-col gap-6`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-black text-slate-800">{activeInvoice.title}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1">Main Tuition & Standard Charges</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${activeInvoice.status === 'Partially Paid' ? 'bg-orange-50 text-orange-600' : 'bg-rose-50 text-rose-600'}`}>
                        {activeInvoice.status}
                      </span>
                    </div>

                    <div className="flex gap-4">
                      <div className="bg-slate-50 flex-1 p-4 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Amount</p>
                        <p className="text-lg font-black text-slate-800 mt-1">₹{activeInvoice.amount.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 flex-1 p-4 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount Paid</p>
                        <p className="text-lg font-black text-emerald-600 mt-1">₹{activeInvoice.amountPaid.toLocaleString()}</p>
                      </div>
                      <div className="bg-orange-50 flex-1 p-4 rounded-xl border border-orange-100">
                        <p className="text-[10px] font-bold text-[#F05A28] uppercase tracking-widest">Balance</p>
                        <p className="text-lg font-black text-[#F05A28] mt-1">₹{(activeInvoice.amount - activeInvoice.amountPaid).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => toggleSelection(activeInvoice.title.replace(' Tuition', ''), feeStructure?.monthlyTuition || 0)}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${selectedInvoices.includes(activeInvoice._id) ? 'bg-[#d94e20] text-white shadow-md' : 'bg-[#F05A28] text-white hover:bg-[#d94e20]'}`}
                      >
                        {selectedInvoices.includes(activeInvoice._id) ? 'Selected for Payment' : 'Pay This Balance'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year Breakdown</p>
                  <button onClick={() => setIsViewingReceipts(true)} className="text-[10px] font-bold text-[#F05A28] hover:text-[#d94e20]">View All History</button>
                </div>

                {ACADEMIC_MONTHS.map((month) => {
                  const inv = invoices.find(i => i.title.includes(month));
                  const isPaid = inv?.status === 'Paid';
                  const isOverdue = inv?.status !== 'Paid' && inv !== activeInvoice;
                  const isSelected = inv && selectedInvoices.includes(inv._id);

                  if (inv && inv === activeInvoice) return null;

                  if (isPaid) {
                    return (
                      <div key={month} className="bg-white p-4 rounded-xl border-l-4 border-emerald-400 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center"><FaCheckCircle size={18} /></div>
                          <div>
                            <p className="font-bold text-slate-800">{month} Tuition</p>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase mt-0.5">Paid Successfully</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-800">₹{inv.amount.toLocaleString()}</p>
                          <p className="text-[10px] font-black text-emerald-500 tracking-widest uppercase mt-1">Cleared</p>
                        </div>
                      </div>
                    );
                  }

                  if (inv && isOverdue) {
                    return (
                      <div key={month} className={`bg-white p-4 rounded-xl border-l-4 ${isSelected ? 'border-[#F05A28] shadow-md ring-2 ring-orange-100' : 'border-rose-400 shadow-sm'} flex items-center justify-between transition-all`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-orange-100 text-[#F05A28]' : 'bg-rose-50 text-rose-500'}`}>
                            <FaExclamationTriangle size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{inv.title}</p>
                            <p className="text-[10px] font-bold text-rose-500 uppercase mt-0.5">Balance Pending</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-black text-rose-600">₹{(inv.amount - inv.amountPaid).toLocaleString()}</p>
                            <p className="text-[10px] font-black text-rose-500 tracking-widest uppercase mt-1">Outstanding</p>
                          </div>
                          <button 
                            onClick={() => toggleSelection(month, feeStructure?.monthlyTuition || 0)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${isSelected ? 'bg-[#F05A28] text-white' : 'bg-orange-100 text-[#F05A28] hover:bg-orange-200'}`}
                          >
                            {isSelected ? 'Selected' : 'Pay Now'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={month} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between opacity-70 hover:opacity-100 transition-opacity">
                      <div>
                        <p className="font-bold text-slate-600">{month} 2026</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Estimated: ₹{(feeStructure?.monthlyTuition || 0).toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => toggleSelection(month, feeStructure?.monthlyTuition || 0)}
                        className="px-3 py-1 bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-md hover:border-blue-400 hover:text-blue-500 transition-colors"
                      >
                        Not Due (Generate)
                      </button>
                    </div>
                  );
                })}
              </div>

            </div>

            <div className="w-full lg:w-1/3 bg-slate-100 p-6 lg:p-8 overflow-y-auto border-l border-slate-200 custom-scrollbar flex flex-col gap-6">
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-black text-slate-800 flex items-center gap-2 mb-6">
                  <span className="w-4 h-4 rounded bg-[#F05A28]"></span> Overall Summary
                </h3>

                <div className="space-y-4 text-sm font-medium text-slate-600 border-b border-slate-100 pb-6 mb-6">
                  <div className="flex justify-between">
                    <span>Last Payment Date</span>
                    <span className="font-bold text-slate-800">{history.length > 0 ? new Date(history[0].date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Session Dues</span>
                    <span className="font-bold text-slate-800">₹{totalBilled.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Total Payments Received</span>
                    <span className="font-bold">-₹{totalPaid.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-4">
                  <p className="font-black text-slate-800 text-lg">Net Outstanding</p>
                  <p className="font-black text-[#F05A28] text-2xl">₹{totalOutstanding.toLocaleString()}</p>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                  <div className="bg-[#F05A28] h-2.5 rounded-full" style={{ width: `${percentPaid}%` }}></div>
                </div>
                <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-widest mb-6">
                  {percentPaid}% OF TOTAL ACADEMIC YEAR PAID
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cart Total</span>
                    <span className="font-black text-lg text-slate-800">₹{selectedTotal}</span>
                  </div>
                  
                  <div className="relative mb-3">
                    <input 
                      type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="Enter amount to pay..."
                      className="w-full bg-white border border-slate-300 rounded-lg py-3 px-4 text-sm font-bold text-slate-800 outline-none focus:border-[#F05A28] focus:ring-1 focus:ring-[#F05A28] transition-all"
                    />
                    <button type="button" onClick={() => setAmountPaid(selectedTotal.toString())} className="absolute right-2 top-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-black uppercase">
                      Max
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['Cash', 'Online', 'Cheque'].map(mode => (
                      <button 
                        key={mode} type="button" onClick={() => setPaymentMethod(mode)}
                        className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${paymentMethod === mode ? 'bg-orange-100 border-[#F05A28] text-[#F05A28]' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={handleCheckout} disabled={processing || selectedInvoices.length === 0}
                    className="w-full bg-[#F05A28] hover:bg-[#d94e20] disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-orange-500/30 transition-all"
                  >
                    {processing ? 'Processing...' : 'Settle Selected Dues Now'}
                  </button>
                </div>

                <button 
                  onClick={() => setIsViewingReceipts(true)} 
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <FaFileDownload /> View Receipts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ HIDDEN RECEIPT DESIGN (FIXED FOR V3) */}
        <div className="absolute left-[-9999px] top-[-9999px] overflow-hidden opacity-0 pointer-events-none">
           <div ref={componentRef} className="p-12 bg-white text-slate-900 font-sans relative" style={{ width: '800px', minHeight: '1000px', margin: '0 auto' }}>
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.03]">
                <span className="text-[180px] font-black tracking-widest transform -rotate-45">PAID</span>
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center border border-orange-200 shrink-0">
                      <span className="text-orange-600 font-black text-2xl">RS</span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-slate-800 tracking-tight">Radhe Shyam School</h1>
                      <p className="text-xs text-slate-500 mt-1">123 Education Lane, Academic District</p>
                      <p className="text-xs text-slate-500">Contact: +91 80 1234 5678 | finance@radheshyam.edu</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="bg-orange-50 text-[#F05A28] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-orange-100">
                      Official Payment Receipt
                    </span>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Receipt Number</p>
                    <p className="text-lg font-black text-slate-800 mb-3">
                      {activePrintTxn ? `RE-${new Date(activePrintTxn.date).getFullYear()}-${activePrintTxn._id.slice(-4).toUpperCase()}` : 'N/A'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Issue Date</p>
                    <p className="text-sm font-bold text-slate-800">
                      {activePrintTxn ? new Date(activePrintTxn.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-12">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-200 flex items-center justify-center text-[8px]">👤</span> Student Information
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Name</span>
                        <span className="font-bold text-slate-800">{student.firstName} {student.lastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Student ID</span>
                        <span className="font-bold text-slate-800">{student.studentId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Grade</span>
                        <span className="font-bold text-slate-800">{student.class?.grade || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-200 flex items-center justify-center text-[8px]">💳</span> Payment Information
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Method</span>
                        <span className="font-bold text-slate-800">{activePrintTxn?.paymentMethod || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Transaction ID</span>
                        <span className="font-bold text-slate-800">{activePrintTxn?._id?.slice(0,9).toUpperCase() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-slate-500 font-medium">Status</span>
                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Paid Successfully
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-3 mb-4 px-2">
                    <span>Description</span>
                    <span>Amount (INR)</span>
                  </div>
                  <div className="space-y-4 px-2">
                    {activePrintTxn?.monthsPaid?.map((title, i) => (
                      <div key={i} className="flex justify-between items-start pb-4 border-b border-slate-50">
                        <div>
                          <p className="font-black text-slate-800 text-sm">{title}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">Academic Session 2026-27</p>
                        </div>
                        <p className="font-black text-slate-800">₹{activePrintTxn.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end mb-16 mt-8">
                  <div className="w-80">
                    <div className="flex justify-between text-sm mb-3 px-2">
                      <span className="text-slate-500 font-medium">Subtotal</span>
                      <span className="font-bold text-slate-800">₹{activePrintTxn?.amount.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-6 px-2">
                      <span className="text-slate-500 font-medium">Tax / Convenience Fee</span>
                      <span className="font-bold text-slate-800">₹0.00</span>
                    </div>
                    <div className="bg-[#F05A28] text-white p-5 rounded-2xl flex justify-between items-center shadow-lg shadow-orange-500/20">
                      <span className="font-bold text-sm">Total Amount Paid</span>
                      <span className="font-black text-2xl tracking-tight">₹{activePrintTxn?.amount.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end mt-32 pt-8">
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 border border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50 gap-0.5 p-2">
                      <div className="flex gap-0.5"><div className="w-3 h-3 bg-slate-300"></div><div className="w-3 h-3 bg-slate-300"></div></div>
                      <div className="flex gap-0.5"><div className="w-3 h-3 bg-slate-300"></div><div className="w-3 h-3 bg-slate-300"></div></div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium w-48 leading-relaxed italic">
                      Scan the QR code to verify this digital receipt online at radheshyam.edu/verify
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-48 border-b border-slate-400 mb-2"></div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Authorized Signatory</p>
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