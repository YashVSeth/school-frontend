import React, { useState } from 'react';
import { FaTimes, FaPlusCircle, FaTag, FaCheck, FaLayerGroup } from 'react-icons/fa';
import { toast } from 'react-toastify';

const FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'HALF-YEARLY', 'YEARLY', 'ONE-TIME'];

const QUICK_PRESETS = [
    { name: 'Tuition Fee', amount: 1500, frequency: 'MONTHLY', type: 'mandatory' },
    { name: 'Examination Fee', amount: 800, frequency: 'HALF-YEARLY', type: 'mandatory' },
    { name: 'Computer & IT Lab', amount: 450, frequency: 'QUARTERLY', type: 'mandatory' },
    { name: 'Annual Development', amount: 2000, frequency: 'YEARLY', type: 'mandatory' },
    { name: 'Library & Journal', amount: 500, frequency: 'YEARLY', type: 'mandatory' },
    { name: 'Sports & Activity Kit', amount: 600, frequency: 'YEARLY', type: 'optional' },
    { name: 'Science Practical Lab', amount: 750, frequency: 'QUARTERLY', type: 'mandatory' }
];

const AddFeeTypeModal = ({ isOpen, onClose, onAdd, onSave }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState('MONTHLY');
    const [type, setType] = useState('mandatory');

    if (!isOpen) return null;

    const handleApplyPreset = (p) => {
        setName(p.name);
        setAmount(p.amount);
        setFrequency(p.frequency);
        setType(p.type);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !amount) {
            toast.error("Please fill in fee name and amount");
            return;
        }

        const feeData = {
            name: name.trim(),
            amount: Number(amount),
            frequency,
            type
        };

        if (onAdd) onAdd(feeData);
        else if (onSave) onSave(feeData);

        // Reset
        setName('');
        setAmount('');
        setFrequency('MONTHLY');
        setType('mandatory');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-scale-up overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">

                {/* Modal Header */}
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-red-600 rounded-xl text-white">
                            <FaPlusCircle size={14} />
                        </div>
                        <div>
                            <h3 className="text-base font-black tracking-tight">Add Fee Category</h3>
                            <p className="text-xs text-slate-400 font-medium">Define a new fee head and billing cycle</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                    {/* Quick Presets */}
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest block mb-2">
                            Quick Presets (Click to Fill)
                        </span>
                        <div className="flex gap-1.5 flex-wrap">
                            {QUICK_PRESETS.map((p) => (
                                <button
                                    key={p.name}
                                    type="button"
                                    onClick={() => handleApplyPreset(p)}
                                    className="px-2.5 py-1 bg-slate-50 hover:bg-red-50 hover:border-red-200 border border-slate-200 text-slate-700 hover:text-red-700 rounded-lg text-[10px] font-bold transition-colors"
                                >
                                    + {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                Fee Item Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Science Lab & Practical Fee"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition-all placeholder:font-medium placeholder:text-slate-400"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                    Amount (₹)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:border-red-500 transition-all text-right"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                    Billing Frequency
                                </label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition-all cursor-pointer"
                                >
                                    {FREQUENCIES.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">
                                Invoicing Requirement
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    type === 'mandatory'
                                        ? 'border-red-600 bg-red-50/50 text-red-700 shadow-2xs'
                                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                                }`}>
                                    <input
                                        type="radio"
                                        name="feeType"
                                        checked={type === 'mandatory'}
                                        onChange={() => setType('mandatory')}
                                        className="hidden"
                                    />
                                    <span className="font-bold text-xs">Mandatory (All Students)</span>
                                </label>

                                <label className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    type === 'optional'
                                        ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-2xs'
                                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                                }`}>
                                    <input
                                        type="radio"
                                        name="feeType"
                                        checked={type === 'optional'}
                                        onChange={() => setType('optional')}
                                        className="hidden"
                                    />
                                    <span className="font-bold text-xs">Optional / Facility</span>
                                </label>
                            </div>
                        </div>

                        <div className="pt-3 flex gap-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 rounded-xl font-black bg-red-600 hover:bg-red-700 text-white text-xs shadow-md shadow-red-600/20 transition-all"
                            >
                                Add Fee Item
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddFeeTypeModal;
