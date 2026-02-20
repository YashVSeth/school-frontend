import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaSave, FaPlus, FaTrash, FaCopy, 
  FaInfoCircle, FaCheckCircle, FaBookOpen, FaBus
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sidebar from '../../components/Sidebar'; 

const FREQUENCIES = ['Monthly', 'Quarterly', 'Yearly', 'One-time'];

const Fees = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Dynamic Fee Arrays
  const [mandatoryFees, setMandatoryFees] = useState([]);
  const [optionalFees, setOptionalFees] = useState([]);

  const BASE_URL = import.meta.env.VITE_API_URL;

  // Fetch classes on initial load
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch fee structure when a new class is selected
  useEffect(() => {
    if (selectedClass) {
      fetchFeeStructure(selectedClass._id);
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(res.data);
      if (res.data.length > 0) setSelectedClass(res.data[0]);
    } catch (error) {
      toast.error("Failed to fetch classes");
      // Fallback for UI testing
      setClasses([{_id: '1', grade: 'Class 1'}, {_id: '2', grade: 'Class 2'}]);
      setSelectedClass({_id: '1', grade: 'Class 1'});
    }
  };

  // --- CONNECTED FETCH LOGIC ---
  const fetchFeeStructure = async (classId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/fees/structure/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Load data into state if it exists, otherwise set defaults
      if (res.data && res.data.mandatoryFees && res.data.mandatoryFees.length > 0) {
        setMandatoryFees(res.data.mandatoryFees);
        setOptionalFees(res.data.optionalFees || []);
      } else {
        // Defaults if no structure exists for this class
        setMandatoryFees([
          { id: '1', name: 'Tuition Fee', frequency: 'Monthly', amount: 0 },
          { id: '2', name: 'Admission Fee', frequency: 'One-time', amount: 0 },
          { id: '3', name: 'Examination Fee', frequency: 'Yearly', amount: 0 }
        ]);
        setOptionalFees([
          { id: '4', name: 'Transport Facility', frequency: 'Monthly', amount: 0 }
        ]);
      }
    } catch (error) {
      toast.error("Failed to fetch fee structure");
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers for Dynamic Rows ---
  const handleAddFee = (type) => {
    const newFee = { id: Date.now().toString(), name: '', frequency: 'Monthly', amount: 0 };
    if (type === 'mandatory') setMandatoryFees([...mandatoryFees, newFee]);
    else setOptionalFees([...optionalFees, newFee]);
  };

  const handleRemoveFee = (type, id) => {
    if (type === 'mandatory') setMandatoryFees(mandatoryFees.filter(f => f.id !== id));
    else setOptionalFees(optionalFees.filter(f => f.id !== id));
  };

  const handleFeeChange = (type, id, field, value) => {
    const updatedFees = (type === 'mandatory' ? mandatoryFees : optionalFees).map(fee => {
      if (fee.id === id) {
        return { ...fee, [field]: field === 'amount' ? Number(value) : value };
      }
      return fee;
    });

    if (type === 'mandatory') setMandatoryFees(updatedFees);
    else setOptionalFees(updatedFees);
  };

  // --- CONNECTED SAVE LOGIC ---
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/fees/structure`, {
        classId: selectedClass._id,
        mandatoryFees,
        optionalFees,
        academicYear: '2026-27'
      }, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Fee structure saved for ${selectedClass.grade}!`);
    } catch (error) {
      toast.error("Failed to save fee structure");
    } finally {
      setSaving(false);
    }
  };

  // --- Calculations ---
  const calculateYearlyTotal = (fees) => {
    return fees.reduce((total, fee) => {
      let multiplier = 1;
      if (fee.frequency === 'Monthly') multiplier = 12;
      if (fee.frequency === 'Quarterly') multiplier = 4;
      return total + (fee.amount * multiplier);
    }, 0);
  };

  const totalMandatory = calculateYearlyTotal(mandatoryFees);
  const totalOptional = calculateYearlyTotal(optionalFees);
  const grandTotal = totalMandatory + totalOptional;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* --- MAIN HEADER --- */}
        <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center shrink-0 z-10">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Admin Dashboard <span className="mx-2">›</span> <span className="text-orange-500">Fee Management</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fee Structure Management</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Configure and manage fee categories for the Academic Year 2026-27</p>
          </div>
          
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all">
              <FaCopy className="text-slate-400" /> Copy to Grade...
            </button>
            <button 
              onClick={handleSave} disabled={saving}
              className="px-6 py-2 bg-[#F05A28] hover:bg-[#d94e20] text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all disabled:opacity-70"
            >
              {saving ? 'Saving...' : <><FaSave /> Save Changes</>}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden p-6 gap-6">
          
          {/* --- LEFT SIDEBAR (Grades & Total) --- */}
          <div className="w-full lg:w-72 flex flex-col gap-6 shrink-0">
            
            {/* Grade Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[50vh]">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Select Grade</h3>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
                {classes.map(c => {
                  const isActive = selectedClass?._id === c._id;
                  return (
                    <button
                      key={c._id}
                      onClick={() => setSelectedClass(c)}
                      className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${
                        isActive 
                          ? 'bg-orange-50 text-[#F05A28]' 
                          : 'bg-transparent text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <FaBookOpen className={isActive ? 'text-[#F05A28]' : 'text-slate-400'} />
                      {c.grade}
                      {isActive && <span className="ml-auto">›</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total Calculator Card */}
            <div className="bg-[#1B2533] rounded-2xl p-6 text-white shadow-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Total {selectedClass?.grade} Fees</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black tracking-tight">₹{grandTotal.toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-400">/ year</span>
              </div>
              
              <div className="space-y-3 text-sm font-medium border-t border-slate-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Mandatory</span>
                  <span className="font-bold">₹{totalMandatory.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Variable (Max)</span>
                  <span className="font-bold">₹{totalOptional.toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>

          {/* --- RIGHT AREA (Fee Builders) --- */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 pb-20">
            
            {loading ? (
              <div className="h-full flex items-center justify-center font-bold text-slate-400 animate-pulse">Loading Configuration...</div>
            ) : (
              <>
                {/* Mandatory Fees Box */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-100 text-[#F05A28] rounded-full flex items-center justify-center text-lg">
                        <FaCheckCircle />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-800">Mandatory Fees</h2>
                        <p className="text-xs font-bold text-slate-400 mt-1">Compulsory payments for all enrolled students</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAddFee('mandatory')}
                      className="text-[#F05A28] hover:bg-orange-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                      <FaPlus size={12}/> Add Fee Type
                    </button>
                  </div>

                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">
                    <div className="col-span-6">Fee Description</div>
                    <div className="col-span-3">Frequency</div>
                    <div className="col-span-3 text-right pr-8">Amount (₹)</div>
                  </div>

                  {/* Rows */}
                  <div className="space-y-3">
                    {mandatoryFees.map(fee => (
                      <div key={fee.id} className="grid grid-cols-12 gap-4 items-center group">
                        <div className="col-span-6">
                          <input 
                            type="text" value={fee.name} onChange={(e) => handleFeeChange('mandatory', fee.id, 'name', e.target.value)}
                            placeholder="e.g. Tuition Fee"
                            className="w-full bg-transparent border-b border-slate-200 hover:border-slate-300 focus:border-[#F05A28] py-2 outline-none font-bold text-slate-700 transition-colors"
                          />
                        </div>
                        <div className="col-span-3">
                          <select 
                            value={fee.frequency} onChange={(e) => handleFeeChange('mandatory', fee.id, 'frequency', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 outline-none focus:border-[#F05A28] appearance-none cursor-pointer"
                          >
                            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div className="col-span-3 flex items-center gap-3">
                          <input 
                            type="number" value={fee.amount} onChange={(e) => handleFeeChange('mandatory', fee.id, 'amount', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 text-right outline-none focus:border-[#F05A28]"
                          />
                          <button onClick={() => handleRemoveFee('mandatory', fee.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Fees Box */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg">
                        <FaBus />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-800">Optional / Variable Fees</h2>
                        <p className="text-xs font-bold text-slate-400 mt-1">Fees applied based on specific services used</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAddFee('optional')}
                      className="text-[#F05A28] hover:bg-orange-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                      <FaPlus size={12}/> Add Fee Type
                    </button>
                  </div>

                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">
                    <div className="col-span-6">Fee Description</div>
                    <div className="col-span-3">Frequency</div>
                    <div className="col-span-3 text-right pr-8">Amount (₹)</div>
                  </div>

                  {/* Rows */}
                  <div className="space-y-3">
                    {optionalFees.map(fee => (
                      <div key={fee.id} className="grid grid-cols-12 gap-4 items-center group">
                        <div className="col-span-6 relative flex items-center">
                          <input 
                            type="text" value={fee.name} onChange={(e) => handleFeeChange('optional', fee.id, 'name', e.target.value)}
                            placeholder="e.g. Transport Facility"
                            className="w-full bg-transparent border-b border-slate-200 hover:border-slate-300 focus:border-[#F05A28] py-2 pr-6 outline-none font-bold text-slate-700 transition-colors"
                          />
                          <FaInfoCircle className="absolute right-2 text-slate-300 text-xs" />
                        </div>
                        <div className="col-span-3">
                          <select 
                            value={fee.frequency} onChange={(e) => handleFeeChange('optional', fee.id, 'frequency', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 outline-none focus:border-[#F05A28] appearance-none cursor-pointer"
                          >
                            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div className="col-span-3 flex items-center gap-3">
                          <input 
                            type="number" value={fee.amount} onChange={(e) => handleFeeChange('optional', fee.id, 'amount', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 text-right outline-none focus:border-[#F05A28]"
                          />
                          <button onClick={() => handleRemoveFee('optional', fee.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Fees;