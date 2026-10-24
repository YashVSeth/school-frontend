import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    FaTrash, FaCheckCircle, FaRegSave, FaBus, FaArrowLeft,
    FaPlusCircle, FaCopy, FaTimes, FaExchangeAlt, FaEdit,
    FaGraduationCap, FaFlask, FaBook, FaRunning, FaLaptopCode,
    FaFileInvoiceDollar, FaCheck, FaLayerGroup, FaMagic
} from 'react-icons/fa';
import AddFeeTypeModal from './AddFeeTypeModal';
import TransportModal from './TransportModal';

const FREQUENCY_MULTIPLIERS = {
    'MONTHLY': 12,
    'QUARTERLY': 4,
    'HALF-YEARLY': 2,
    'YEARLY': 1,
    'ONE-TIME': 1
};

const FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'HALF-YEARLY', 'YEARLY', 'ONE-TIME'];

const PRESET_TEMPLATES = {
    'Primary (Class 1-5)': {
        mandatory: [
            { name: 'Tuition Fee', amount: 1200, frequency: 'MONTHLY' },
            { name: 'Examination & Assessment Fee', amount: 600, frequency: 'HALF-YEARLY' },
            { name: 'Computer & Digital Lab Fee', amount: 350, frequency: 'QUARTERLY' },
            { name: 'Annual Development & Sports Fee', amount: 1500, frequency: 'YEARLY' }
        ],
        optional: [
            { name: 'Activity & Martial Arts Club', amount: 400, frequency: 'MONTHLY' }
        ]
    },
    'Middle School (Class 6-8)': {
        mandatory: [
            { name: 'Tuition Fee', amount: 1600, frequency: 'MONTHLY' },
            { name: 'Science & Computer Lab Fee', amount: 500, frequency: 'QUARTERLY' },
            { name: 'Examination & Term Test Fee', amount: 800, frequency: 'HALF-YEARLY' },
            { name: 'Annual Library & Sports Maintenance', amount: 1800, frequency: 'YEARLY' }
        ],
        optional: [
            { name: 'Robotics & STEM Workshop', amount: 600, frequency: 'QUARTERLY' }
        ]
    },
    'Secondary (Class 9-10)': {
        mandatory: [
            { name: 'Tuition Fee', amount: 2200, frequency: 'MONTHLY' },
            { name: 'Physics/Chemistry/Bio Lab Fee', amount: 800, frequency: 'QUARTERLY' },
            { name: 'Board Prep & Term Exam Fee', amount: 1200, frequency: 'HALF-YEARLY' },
            { name: 'Annual Institutional Maintenance', amount: 2200, frequency: 'YEARLY' }
        ],
        optional: [
            { name: 'Special Coaching & Test Series', amount: 1000, frequency: 'MONTHLY' }
        ]
    },
    'Senior Secondary (Class 11-12)': {
        mandatory: [
            { name: 'Tuition Fee', amount: 2800, frequency: 'MONTHLY' },
            { name: 'Senior Science & IT Practical Lab', amount: 1200, frequency: 'QUARTERLY' },
            { name: 'Board Registration & Pre-Board Fee', amount: 2000, frequency: 'YEARLY' },
            { name: 'Annual Infrastructure Development', amount: 2500, frequency: 'YEARLY' }
        ],
        optional: [
            { name: 'Competitive Entrance Guidance (JEE/NEET)', amount: 1500, frequency: 'MONTHLY' }
        ]
    }
};

const getCategoryIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('tuition') || n.includes('academic')) return FaGraduationCap;
    if (n.includes('lab') || n.includes('science') || n.includes('practical')) return FaFlask;
    if (n.includes('computer') || n.includes('it') || n.includes('stem') || n.includes('digital')) return FaLaptopCode;
    if (n.includes('exam') || n.includes('assessment') || n.includes('test')) return FaFileInvoiceDollar;
    if (n.includes('sport') || n.includes('activity') || n.includes('club')) return FaRunning;
    return FaBook;
};

const FeeStructureManagement = ({ onBack }) => {
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [academicYear, setAcademicYear] = useState('2026-27');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isTransportModalOpen, setIsTransportModalOpen] = useState(false);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [copySourceClassId, setCopySourceClassId] = useState('');
    const [copyTargetClassIds, setCopyTargetClassIds] = useState([]);
    const [copying, setCopying] = useState(false);

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
    }, [selectedClassId, academicYear]);

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/classes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClasses(res.data || []);
            if (res.data && res.data.length > 0 && !selectedClassId) {
                setSelectedClassId(res.data[0]._id);
                setCopySourceClassId(res.data[0]._id);
            }
        } catch {
            toast.error("Failed to load classes");
        }
    };

    const fetchFeeStructure = async (classId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/fee-structure/${classId}?academicYear=${academicYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data) {
                setMandatoryFees(res.data.mandatoryFees || []);
                setOptionalFees(res.data.optionalFees || []);
            }
        } catch {
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
                academicYear,
                mandatoryFees,
                optionalFees
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Fee structure saved successfully!");
        } catch {
            toast.error("Failed to save fee structure");
        } finally {
            setSaving(false);
        }
    };

    const handleAddFeeItem = (newFee) => {
        const item = {
            name: newFee.name,
            amount: Number(newFee.amount),
            frequency: newFee.frequency || 'MONTHLY'
        };
        if (newFee.type === 'mandatory') {
            setMandatoryFees(prev => [...prev, item]);
        } else {
            setOptionalFees(prev => [...prev, item]);
        }
    };

    const handleRemoveFeeItem = (type, index) => {
        if (type === 'mandatory') {
            setMandatoryFees(prev => prev.filter((_, i) => i !== index));
        } else {
            setOptionalFees(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleUpdateItemAmount = (type, index, value) => {
        const val = Number(value) || 0;
        if (type === 'mandatory') {
            setMandatoryFees(prev => prev.map((item, i) => i === index ? { ...item, amount: val } : item));
        } else {
            setOptionalFees(prev => prev.map((item, i) => i === index ? { ...item, amount: val } : item));
        }
    };

    const handleUpdateItemFrequency = (type, index, freq) => {
        if (type === 'mandatory') {
            setMandatoryFees(prev => prev.map((item, i) => i === index ? { ...item, frequency: freq } : item));
        } else {
            setOptionalFees(prev => prev.map((item, i) => i === index ? { ...item, frequency: freq } : item));
        }
    };

    const applyPresetTemplate = (templateName) => {
        const tmpl = PRESET_TEMPLATES[templateName];
        if (!tmpl) return;
        setMandatoryFees(tmpl.mandatory.map(item => ({ ...item })));
        setOptionalFees(tmpl.optional.map(item => ({ ...item })));
        toast.info(`Applied template: ${templateName}`);
    };

    const handleCopyStructure = async () => {
        if (!copySourceClassId) return toast.error("Select source class");
        if (copyTargetClassIds.length === 0) return toast.error("Select at least one target class");

        setCopying(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${BASE_URL}/api/fee-structure/copy`, {
                sourceClassId: copySourceClassId,
                targetClassIds: copyTargetClassIds,
                academicYear
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(res.data.message || "Fee structure cloned successfully!");
            setIsCopyModalOpen(false);
            if (copyTargetClassIds.includes(selectedClassId)) {
                fetchFeeStructure(selectedClassId);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to copy fee structure");
        } finally {
            setCopying(false);
        }
    };

    // Calculations
    const calculateAnnualTotal = (items) => {
        return items.reduce((total, fee) => {
            const mult = FREQUENCY_MULTIPLIERS[(fee.frequency || 'MONTHLY').toString().toUpperCase()] || 1;
            return total + ((Number(fee.amount) || 0) * mult);
        }, 0);
    };

    const mandatoryAnnual = calculateAnnualTotal(mandatoryFees);
    const optionalAnnual = calculateAnnualTotal(optionalFees);
    const totalAnnual = mandatoryAnnual + optionalAnnual;

    const selectedClass = classes.find(c => c._id === selectedClassId);

    return (
        <div className="space-y-6 animate-fade-in font-sans">

            {/* Top Navigation & Action Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all hover:scale-105"
                        title="Back to Dashboard"
                    >
                        <FaArrowLeft size={14} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Fee Structure Designer</h2>
                            <span className="bg-red-50 text-red-700 text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                                {academicYear}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Configure mandatory tuition, labs, assessments & transport policies</p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={() => setIsTransportModalOpen(true)}
                        className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm"
                    >
                        <FaBus className="text-amber-600" /> Transport Slabs
                    </button>

                    <button
                        onClick={() => {
                            setCopySourceClassId(selectedClassId);
                            setCopyTargetClassIds([]);
                            setIsCopyModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm"
                    >
                        <FaCopy className="text-slate-500" /> Clone to Other Classes
                    </button>

                    <button
                        onClick={handleSaveStructure}
                        disabled={saving}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-red-600/25 active:scale-95"
                    >
                        <FaRegSave size={14} /> {saving ? "Saving..." : "Save Structure"}
                    </button>
                </div>
            </div>

            {/* Grade Selection Carousel */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <FaLayerGroup /> Select Academic Grade
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                        {classes.length} Classes Available
                    </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {classes.map(c => {
                        const isSelected = c._id === selectedClassId;
                        return (
                            <button
                                key={c._id}
                                onClick={() => setSelectedClassId(c._id)}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all border shrink-0 ${
                                    isSelected
                                        ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-600/20 scale-[1.02]'
                                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:border-slate-200'
                                }`}
                            >
                                {c.grade}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Quick Template Suggestions */}
            <div className="bg-gradient-to-r from-red-50/60 via-amber-50/40 to-blue-50/40 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                    <FaMagic className="text-red-500" />
                    <span className="font-bold">Quick Templates:</span>
                    <span className="text-slate-500">Load standardized structure presets in 1-click</span>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                    {Object.keys(PRESET_TEMPLATES).map(tmplName => (
                        <button
                            key={tmplName}
                            onClick={() => applyPresetTemplate(tmplName)}
                            className="px-2.5 py-1 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-700 rounded-lg text-[10px] font-bold transition-colors shadow-2xs"
                        >
                            + {tmplName.split(' ')[0]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content: Fee Cards & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ═══ LEFT 2 COLS: MANDATORY & OPTIONAL FEES ═══ */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Mandatory Fees Section */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-sm font-bold">
                                    <FaCheckCircle />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Mandatory Institutional Fees</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">Billed to every enrolled student in {selectedClass?.grade || 'Class'}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors"
                            >
                                <FaPlusCircle size={12} /> Add Fee Item
                            </button>
                        </div>

                        {loading ? (
                            <div className="py-12 text-center text-slate-400 font-bold animate-pulse">Loading structure...</div>
                        ) : mandatoryFees.length === 0 ? (
                            <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-sm font-bold text-slate-500">No mandatory fees defined</p>
                                <p className="text-xs text-slate-400 mt-1">Click "Add Fee Item" or choose a template above</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {mandatoryFees.map((fee, idx) => {
                                    const IconComponent = getCategoryIcon(fee.name);
                                    const mult = FREQUENCY_MULTIPLIERS[(fee.frequency || 'MONTHLY').toString().toUpperCase()] || 1;
                                    const itemAnnual = (Number(fee.amount) || 0) * mult;

                                    return (
                                        <div key={idx} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-white transition-all group space-y-3 shadow-2xs">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center text-slate-600 text-base shrink-0 shadow-2xs">
                                                        <IconComponent />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">{fee.name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                            Multiplier: ×{mult} · Annual Contribution: <strong className="text-slate-700">₹{itemAnnual.toLocaleString('en-IN')}</strong>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 self-end sm:self-center">
                                                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                                                        <span className="text-xs font-bold text-slate-400 mr-1">₹</span>
                                                        <input
                                                            type="number"
                                                            value={fee.amount}
                                                            onChange={(e) => handleUpdateItemAmount('mandatory', idx, e.target.value)}
                                                            className="w-20 font-black text-slate-800 text-sm outline-none text-right"
                                                        />
                                                    </div>

                                                    <button
                                                        onClick={() => handleRemoveFeeItem('mandatory', idx)}
                                                        className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                                        title="Delete Item"
                                                    >
                                                        <FaTrash size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Frequency Selector Pills */}
                                            <div className="flex gap-1.5 flex-wrap pt-2 border-t border-slate-100">
                                                {FREQUENCIES.map(freq => {
                                                    const isFreqActive = (fee.frequency || 'MONTHLY').toString().toUpperCase() === freq;
                                                    return (
                                                        <button
                                                            key={freq}
                                                            onClick={() => handleUpdateItemFrequency('mandatory', idx, freq)}
                                                            className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors border ${
                                                                isFreqActive
                                                                    ? 'bg-slate-900 text-white border-slate-900'
                                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            {freq}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Optional / Facility Fees Section */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                                    <FaExchangeAlt />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Optional / Facility Fees</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">Billed only to students who opt-in (Clubs, Workshops, Specialized Facilities)</p>
                                </div>
                            </div>
                        </div>

                        {optionalFees.length === 0 ? (
                            <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-xs font-bold text-slate-400">No optional fees configured for this class</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {optionalFees.map((fee, idx) => {
                                    const mult = FREQUENCY_MULTIPLIERS[(fee.frequency || 'MONTHLY').toString().toUpperCase()] || 1;
                                    const itemAnnual = (Number(fee.amount) || 0) * mult;

                                    return (
                                        <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{fee.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-medium">Annual: ₹{itemAnnual.toLocaleString('en-IN')}</p>
                                                </div>

                                                <div className="flex items-center gap-3 self-end sm:self-center">
                                                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                                                        <span className="text-xs font-bold text-slate-400 mr-1">₹</span>
                                                        <input
                                                            type="number"
                                                            value={fee.amount}
                                                            onChange={(e) => handleUpdateItemAmount('optional', idx, e.target.value)}
                                                            className="w-20 font-black text-slate-800 text-sm outline-none text-right"
                                                        />
                                                    </div>

                                                    <button
                                                        onClick={() => handleRemoveFeeItem('optional', idx)}
                                                        className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50"
                                                    >
                                                        <FaTrash size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex gap-1.5 flex-wrap pt-2 border-t border-slate-100">
                                                {FREQUENCIES.map(freq => {
                                                    const isFreqActive = (fee.frequency || 'MONTHLY').toString().toUpperCase() === freq;
                                                    return (
                                                        <button
                                                            key={freq}
                                                            onClick={() => handleUpdateItemFrequency('optional', idx, freq)}
                                                            className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors border ${
                                                                isFreqActive
                                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            {freq}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ RIGHT COLUMN: LIVE FINANCIAL COMPUTATION SUMMARY ═══ */}
                <div className="space-y-6">

                    {/* Summary Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6 sticky top-6">
                        <div>
                            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest block mb-1">
                                Annual Fee Projection
                            </span>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                {selectedClass?.grade || 'Class'} Overview
                            </h3>
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-600">Mandatory Annual Due</span>
                                <span className="font-black text-slate-900">₹{mandatoryAnnual.toLocaleString('en-IN')}</span>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-600">Optional Facilities Due</span>
                                <span className="font-black text-slate-900">₹{optionalAnnual.toLocaleString('en-IN')}</span>
                            </div>

                            <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                                <span className="text-xs font-black text-slate-800 uppercase">Total Annual / Student</span>
                                <span className="text-xl font-black text-red-600">₹{totalAnnual.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {/* Visual Proportion Bar */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                <span>Mandatory ({totalAnnual > 0 ? ((mandatoryAnnual / totalAnnual) * 100).toFixed(0) : 100}%)</span>
                                <span>Optional ({totalAnnual > 0 ? ((optionalAnnual / totalAnnual) * 100).toFixed(0) : 0}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                <div
                                    className="bg-red-600 h-full transition-all duration-500"
                                    style={{ width: `${totalAnnual > 0 ? (mandatoryAnnual / totalAnnual) * 100 : 100}%` }}
                                />
                                <div
                                    className="bg-blue-500 h-full transition-all duration-500"
                                    style={{ width: `${totalAnnual > 0 ? (optionalAnnual / totalAnnual) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Save Action */}
                        <button
                            onClick={handleSaveStructure}
                            disabled={saving}
                            className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-black text-sm transition-all shadow-md shadow-red-600/25 flex items-center justify-center gap-2 active:scale-95"
                        >
                            <FaRegSave /> {saving ? "Saving Changes..." : `Save ${selectedClass?.grade || 'Class'} Structure`}
                        </button>
                    </div>

                </div>
            </div>

            {/* Modal: Add Fee Item */}
            {isAddModalOpen && (
                <AddFeeTypeModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onAdd={handleAddFeeItem}
                />
            )}

            {/* Modal: Transport Slabs */}
            {isTransportModalOpen && (
                <TransportModal
                    isOpen={isTransportModalOpen}
                    onClose={() => setIsTransportModalOpen(false)}
                />
            )}

            {/* Modal: Clone Fee Structure */}
            {isCopyModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <FaCopy className="text-red-500" />
                                <div>
                                    <h3 className="text-base font-black">Clone Fee Structure</h3>
                                    <p className="text-xs text-slate-400">Replicate fee heads across other grades</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCopyModalOpen(false)} className="text-slate-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Source Class (Template)</label>
                                <select
                                    value={copySourceClassId}
                                    onChange={(e) => setCopySourceClassId(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                >
                                    {classes.map(c => (
                                        <option key={c._id} value={c._id}>{c.grade}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Target Classes (Select)</label>
                                    <button
                                        onClick={() => {
                                            const targets = classes.filter(c => c._id !== copySourceClassId).map(c => c._id);
                                            setCopyTargetClassIds(targets);
                                        }}
                                        className="text-[10px] font-bold text-red-600 hover:underline"
                                    >
                                        Select All
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50">
                                    {classes.filter(c => c._id !== copySourceClassId).map(c => {
                                        const isChecked = copyTargetClassIds.includes(c._id);
                                        return (
                                            <label
                                                key={c._id}
                                                className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                                                    isChecked
                                                        ? 'bg-red-50 border-red-200 text-red-700'
                                                        : 'bg-white border-slate-100 text-slate-600'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        setCopyTargetClassIds(prev =>
                                                            prev.includes(c._id) ? prev.filter(x => x !== c._id) : [...prev, c._id]
                                                        );
                                                    }}
                                                    className="rounded text-red-600 focus:ring-red-500"
                                                />
                                                <span>{c.grade}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setIsCopyModalOpen(false)}
                                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCopyStructure}
                                disabled={copying || copyTargetClassIds.length === 0}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                            >
                                {copying ? "Cloning..." : `Clone to (${copyTargetClassIds.length}) Classes`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default FeeStructureManagement;
