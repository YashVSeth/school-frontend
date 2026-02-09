import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaExchangeAlt, FaTimes, FaUsers, FaArrowRight } from 'react-icons/fa';

const PromoteClassModal = ({ isOpen, onClose, classes, refreshData, defaultClassId }) => {
  const [fromClass, setFromClass] = useState('');
  const [toClass, setToClass] = useState('');
  const [loading, setLoading] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_URL;

  // ✅ NEW: Auto-fill logic jab modal khule
  useEffect(() => {
    if (isOpen && defaultClassId) {
      setFromClass(defaultClassId);

      // Smart Logic: Koshish karo agli class dhundne ki (e.g., 1 -> 2)
      const current = classes.find(c => c._id === defaultClassId);
      if (current && !isNaN(current.grade)) {
        const nextGrade = parseInt(current.grade) + 1;
        const nextClassObj = classes.find(c => c.grade == nextGrade); // Loose equality for string/number match
        if (nextClassObj) {
          setToClass(nextClassObj._id);
        }
      }
    } else if (isOpen && !defaultClassId) {
        // Reset agar koi class select nahi hai
        setFromClass('');
        setToClass('');
    }
  }, [isOpen, defaultClassId, classes]);

  if (!isOpen) return null;

  const handleBulkPromote = async () => {
    if (!fromClass || !toClass) return toast.warn("Please select both classes!");
    if (fromClass === toClass) return toast.error("Source and Target class cannot be same!");

    // Class Names dhundo confirmation ke liye
    const fromName = classes.find(c => c._id === fromClass)?.grade;
    const toName = classes.find(c => c._id === toClass)?.grade;

    if(!window.confirm(`CONFIRM PROMOTION?\n\nMove ALL students from Class ${fromName} to Class ${toName}?`)) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${BASE_URL}/api/students/promote-class`, {
        currentClassId: fromClass,
        nextClassId: toClass
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Batch Promoted Successfully!");
      refreshData();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Promotion failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-fadeIn border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <FaUsers className="text-orange-400"/> Class Promotion Wizard
            </h2>
            <p className="text-slate-400 text-xs mt-1">Move an entire batch to the next academic level</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-all"><FaTimes size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          
          <div className="flex items-center gap-6">
            {/* FROM CLASS (Locked if pre-selected) */}
            <div className="flex-1 space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">From Current Class</label>
                <div className={`p-4 rounded-xl border-2 ${defaultClassId ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                    <select 
                        className="w-full bg-transparent font-black text-slate-700 outline-none text-lg"
                        value={fromClass} 
                        onChange={e => setFromClass(e.target.value)}
                        disabled={!!defaultClassId} // 🔒 Lock if selected from filter
                    >
                        <option value="">Select Class...</option>
                        {classes.map(c => <option key={c._id} value={c._id}>Class {c.grade} ({c.section})</option>)}
                    </select>
                </div>
            </div>

            <FaArrowRight className="text-slate-300 text-2xl mt-6" />

            {/* TO CLASS */}
            <div className="flex-1 space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">To New Class</label>
                <div className="p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-violet-400 transition-colors">
                    <select 
                        className="w-full bg-transparent font-black text-violet-700 outline-none text-lg"
                        value={toClass} 
                        onChange={e => setToClass(e.target.value)}
                    >
                        <option value="">Select Next Class...</option>
                        {classes
                            .filter(c => c._id !== fromClass) // Same class hide karo
                            .map(c => <option key={c._id} value={c._id}>Class {c.grade} ({c.section})</option>)
                        }
                    </select>
                </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start">
             <div className="bg-blue-100 p-2 rounded-full text-blue-600"><FaExchangeAlt /></div>
             <div>
                <h4 className="font-bold text-blue-900 text-sm">What happens next?</h4>
                <p className="text-xs text-blue-700 mt-1">All active students in the "From" class will be instantly updated to the "To" class. Their ID cards and records will reflect the new class immediately.</p>
             </div>
          </div>

          <button 
            onClick={handleBulkPromote}
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            {loading ? "Processing Transfer..." : "Confirm & Promote Students"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoteClassModal;