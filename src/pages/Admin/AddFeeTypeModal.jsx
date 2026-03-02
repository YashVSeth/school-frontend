import React, { useState } from 'react';
import { FaTimes, FaPlusCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'HALF-YEARLY', 'YEARLY', 'ONE-TIME'];

const AddFeeTypeModal = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState('MONTHLY');
    const [isMandatory, setIsMandatory] = useState(true);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !amount) {
            toast.error("Please fill all required fields");
            return;
        }

        onSave({
            name,
            amount: Number(amount),
            frequency,
            isMandatory
        });

        // Reset
        setName('');
        setAmount('');
        setFrequency('MONTHLY');
        setIsMandatory(true);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl animate-slide-up overflow-hidden">

                {/* HEAD */}
                <div className="bg-[#fcfafa] px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#800000] text-white p-1.5 rounded-md">
                            <FaPlusCircle size={14} />
                        </div>
                        <h2 className="text-[#800000] font-black tracking-tight text-base">Add Fee Type</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div>
                            <label className="text-[11px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-2 block">Fee Item Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Tuition Fee, Bus Fee"
                                className="w-full px-4 py-3 bg-[#f8f8fb] border border-slate-200 rounded-xl text-[#1e293b] font-bold outline-none focus:border-[#800000]/30 transition-all placeholder:font-normal"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-2 block">Amount (₹)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    min="0"
                                    className="w-full px-4 py-3 bg-[#f8f8fb] border border-slate-200 rounded-xl text-[#1e293b] font-bold outline-none focus:border-[#800000]/30 transition-all placeholder:font-normal"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-2 block">Frequency</label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#f8f8fb] border border-slate-200 rounded-xl text-[#1e293b] font-bold outline-none focus:border-[#800000]/30 transition-all cursor-pointer"
                                >
                                    {FREQUENCIES.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-extrabold text-[#7a1717] tracking-wider uppercase mb-3 block">Type Profile</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${isMandatory ? 'border-[#800000] bg-[#faf0f1]' : 'border-slate-100 hover:border-slate-300'}`}>
                                    <input type="radio" checked={isMandatory} onChange={() => setIsMandatory(true)} className="hidden" />
                                    <span className={`font-bold text-sm ${isMandatory ? 'text-[#800000]' : 'text-slate-500'}`}>Mandatory</span>
                                </label>
                                <label className={`flex-1 flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${!isMandatory ? 'border-[#800000] bg-[#faf0f1]' : 'border-slate-100 hover:border-slate-300'}`}>
                                    <input type="radio" checked={!isMandatory} onChange={() => setIsMandatory(false)} className="hidden" />
                                    <span className={`font-bold text-sm ${!isMandatory ? 'text-[#800000]' : 'text-slate-500'}`}>Optional</span>
                                </label>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 py-3.5 rounded-xl font-bold bg-[#800000] text-white hover:bg-[#600000] shadow-lg shadow-red-900/20 transition-all">
                                Add to Structure
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddFeeTypeModal;
