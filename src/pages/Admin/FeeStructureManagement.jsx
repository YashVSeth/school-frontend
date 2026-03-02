import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaTrash, FaCheckCircle, FaRegSave, FaCopy, FaArrowLeft, FaPlusCircle } from 'react-icons/fa';
import AddFeeTypeModal from './AddFeeTypeModal';

const FeeStructureManagement = ({ onBack }) => {
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('mandatory'); // 'mandatory' or 'optional'

    const [mandatoryFees, setMandatoryFees] = useState([]);
    const [optionalFees, setOptionalFees] = useState([]);

    const BASE_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchFeeStructure(selectedClassId);
        }
    }, [selectedClassId]);

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/classes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Sort classes logically if needed, assuming the backend returns them sorted or we sort by grade
            setClasses(res.data);
            if (res.data.length > 0) {
                setSelectedClassId(res.data[0]._id);
            }
        } catch (error) {
            toast.error("Failed to load classes");
        }
    };

    const fetchFeeStructure = async (classId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/fee-structure/${classId}?academicYear=2026-27`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data) {
                setMandatoryFees(res.data.mandatoryFees || []);
                setOptionalFees(res.data.optionalFees || []);
            }
        } catch (error) {
            toast.error("Failed to load fee structure");
            setMandatoryFees([]);
            setOptionalFees([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveStructure = async () => {
        if (!selectedClassId) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${BASE_URL}/api/fee-structure/${selectedClassId}`, {
                academicYear: '2026-27',
                mandatoryFees,
                optionalFees
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Fee structure saved successfully");
        } catch (error) {
            toast.error("Failed to save fee structure");
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN').format(amount || 0);
    };

    const handleAddFee = (feeData) => {
        // Omitting _id so mongoose generates it on save
        const newFee = {
            name: feeData.name,
            desc: '',
            frequency: feeData.frequency,
            amount: feeData.amount
        };

        if (feeData.isMandatory) {
            setMandatoryFees([...mandatoryFees, newFee]);
        } else {
            setOptionalFees([...optionalFees, newFee]);
        }
    };

    const deleteFee = (indexToRemove, type) => {
        if (type === 'mandatory') {
            setMandatoryFees(mandatoryFees.filter((_, idx) => idx !== indexToRemove));
        } else {
            setOptionalFees(optionalFees.filter((_, idx) => idx !== indexToRemove));
        }
    };

    // Calculate Totals
    const totalMandatory = mandatoryFees.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalOptional = optionalFees.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalAnnual = totalMandatory + totalOptional; // Usually optional isn't forced, but matching mockup's "Total Annual" math

    const selectedClassObj = classes.find(c => c._id === selectedClassId);
    const gradeTitle = selectedClassObj ? selectedClassObj.grade : 'Loading Dashboard...';

    return (
        <div className="flex flex-col h-full font-sans animate-fade-in relative z-10 w-full">

            {/* Action Header bar inside the content area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <button onClick={onBack} className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-[#800000] rounded-lg transition-colors">
                            <FaArrowLeft size={14} />
                        </button>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fee Structure Management</h1>
                    </div>
                    <p className="text-slate-500 font-medium ml-[46px]">Configure and manage fee categories for the Academic Year <span className="text-[#800000] font-black tracking-widest">2026-27</span>.</p>
                </div>
                <div className="flex gap-3 ml-[46px] md:ml-0">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-800 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                        <FaCopy className="text-slate-400" /> Copy to Grade...
                    </button>
                    <button
                        onClick={handleSaveStructure}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#800000] text-white font-bold text-sm tracking-wide rounded-xl hover:bg-[#660000] disabled:opacity-70 transition-colors shadow-md shadow-red-900/20"
                    >
                        {saving ? 'Saving...' : <><FaRegSave /> Save Changes</>}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Sidebar - Grade Selection */}
                <div className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden pt-4">
                        <div className="px-6 pb-2 text-[10px] font-extrabold text-[#8fa0b5] tracking-widest uppercase">Select Grade</div>
                        <div className="flex flex-col p-2 space-y-1">
                            {classes.map(cls => (
                                <button
                                    key={cls._id}
                                    onClick={() => setSelectedClassId(cls._id)}
                                    className={`flex justify-between items-center px-4 py-3 rounded-xl transition-all ${selectedClassId === cls._id
                                            ? 'bg-[#fdedee] text-[#7a1717] font-black border border-[#f5d7d7]'
                                            : 'text-slate-600 font-bold hover:bg-slate-50 border border-transparent'
                                        }`}
                                >
                                    <span>{cls.grade}</span>
                                </button>
                            ))}
                            {classes.length === 0 && <p className="text-xs text-center text-slate-400 py-4">Loading classes...</p>}
                        </div>
                    </div>

                    {/* Summary Card Wrapper mimicking the mockup */}
                    <div className="bg-[#800000] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        {/* Decorative background element mimicking the mockup's red overlay look */}
                        <div className="absolute -bottom-8 -right-8 opacity-10 font-black text-9xl pointer-events-none">₹</div>

                        <h3 className="text-[10px] font-extrabold text-red-200 tracking-widest uppercase mb-6">{selectedClassObj ? selectedClassObj.grade.toUpperCase() : 'N/A'} SUMMARY</h3>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center text-sm font-semibold text-red-50">
                                <span>Mandatory</span>
                                <span className="font-extrabold">₹ {formatCurrency(totalMandatory)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-semibold text-red-50">
                                <span>Variable (Avg)</span>
                                <span className="font-extrabold">₹ {formatCurrency(totalOptional)}</span>
                            </div>
                        </div>

                        <div className="pt-5 border-t border-red-900/50 flex justify-between items-center">
                            <span className="font-bold text-red-100">Total Annual</span>
                            <span className="text-2xl font-black">₹ {formatCurrency(totalAnnual)}</span>
                        </div>
                    </div>
                </div>

                {/* Right Content Area - Fee Lists */}
                <div className="flex-1 flex flex-col gap-8">

                    {loading ? (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 flex items-center justify-center text-slate-400 font-bold animate-pulse">
                            Syncing structure from ledger...
                        </div>
                    ) : (
                        <>
                            {/* Mandatory Fees Table-Card */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfafa]">
                                    <div className="flex items-center gap-3">
                                        <FaCheckCircle className="text-[#800000] text-lg" />
                                        <h2 className="text-base font-black text-slate-800">Mandatory Fees</h2>
                                    </div>
                                    <button
                                        onClick={() => { setActiveSection('mandatory'); setIsAddModalOpen(true); }}
                                        className="text-xs font-black text-[#800000] tracking-wide flex items-center gap-1.5 hover:underline"
                                    >
                                        <FaPlusCircle /> Add Fee Type
                                    </button>
                                </div>

                                <div className="p-2">
                                    <table className="w-full text-left bg-white">
                                        <thead>
                                            <tr className="text-[10px] font-extrabold text-[#8fa0b5] tracking-widest uppercase">
                                                <th className="px-6 py-4">Fee Item Name</th>
                                                <th className="px-6 py-4">Frequency</th>
                                                <th className="px-6 py-4 text-right">Amount (₹)</th>
                                                <th className="px-4 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mandatoryFees.map((fee, idx) => (
                                                <tr key={fee._id || idx} className="border-t border-slate-50 group hover:bg-[#fafafe] transition-colors">
                                                    <td className="px-6 py-5">
                                                        <p className="font-bold text-slate-800">{fee.name}</p>
                                                        {fee.desc && <p className="text-xs text-slate-400 font-medium mt-1">{fee.desc}</p>}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className={`px-2.5 py-1 rounded text-[9px] font-black tracking-widest uppercase ${fee.frequency === 'MONTHLY' ? 'bg-blue-50 text-blue-600' :
                                                                fee.frequency === 'ONE-TIME' ? 'bg-orange-50 text-orange-600' :
                                                                    'bg-purple-50 text-purple-600'
                                                            }`}>
                                                            {fee.frequency}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black text-slate-800 tracking-wide">
                                                        {formatCurrency(fee.amount)}
                                                    </td>
                                                    <td className="px-4 py-5 text-center">
                                                        <button onClick={() => deleteFee(idx, 'mandatory')} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                            <FaTrash size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {mandatoryFees.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-6 text-slate-400 text-sm font-bold">No mandatory fees defined.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Optional Fees Table-Card */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-12">
                                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-[#fcfafa]">
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 6H20M4 12H20M9 18H15" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <h2 className="text-base font-black text-slate-800">Optional / Variable Fees</h2>
                                    </div>
                                    <button
                                        onClick={() => { setActiveSection('optional'); setIsAddModalOpen(true); }}
                                        className="text-xs font-black text-[#800000] tracking-wide flex items-center gap-1.5 hover:underline"
                                    >
                                        <FaPlusCircle /> Add Fee Type
                                    </button>
                                </div>

                                <div className="p-2">
                                    <table className="w-full text-left bg-white">
                                        <thead>
                                            <tr className="text-[10px] font-extrabold text-[#8fa0b5] tracking-widest uppercase">
                                                <th className="px-6 py-4">Fee Item Name</th>
                                                <th className="px-6 py-4">Frequency</th>
                                                <th className="px-6 py-4 text-right">Amount (₹)</th>
                                                <th className="px-4 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {optionalFees.map((fee, idx) => (
                                                <tr key={fee._id || idx} className="border-t border-slate-50 group hover:bg-[#fafafe] transition-colors">
                                                    <td className="px-6 py-5">
                                                        <p className="font-bold text-slate-800">{fee.name}</p>
                                                        {fee.desc && <p className="text-xs text-slate-400 font-medium mt-1">{fee.desc}</p>}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className={`px-2.5 py-1 rounded text-[9px] font-black tracking-widest uppercase ${fee.frequency === 'MONTHLY' ? 'bg-blue-50 text-blue-600' :
                                                                fee.frequency === 'ONE-TIME' ? 'bg-orange-50 text-orange-600' :
                                                                    'bg-purple-50 text-purple-600'
                                                            }`}>
                                                            {fee.frequency}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black text-slate-800 tracking-wide">
                                                        {formatCurrency(fee.amount)}
                                                    </td>
                                                    <td className="px-4 py-5 text-center">
                                                        <button onClick={() => deleteFee(idx, 'optional')} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                            <FaTrash size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {optionalFees.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-6 text-slate-400 text-sm font-bold">No optional fees defined.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </div>

            <AddFeeTypeModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddFee}
            />
        </div>
    );
};

export default FeeStructureManagement;
