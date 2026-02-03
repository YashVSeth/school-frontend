import React, { useState } from 'react';
import axios from 'axios';
import { FaTimes, FaSave, FaMoneyBillWave } from 'react-icons/fa';
import { toast } from 'react-toastify';

const FeeStructureModal = ({ isOpen, onClose, classes }) => {
  const [formData, setFormData] = useState({
    classId: '',
    monthlyFee: '',
    yearlyFee: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  
  const BASE_URL = import.meta.env.VITE_API_URL;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.classId) return toast.error("Please select a class");

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // ✅ Make sure this route exists in your backend!
      await axios.post(`${BASE_URL}/api/classes/fee-structure`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Fee Structure Added Successfully!");
      setFormData({ classId: '', monthlyFee: '', yearlyFee: '', description: '' });
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to add fee structure");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800 p-5 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FaMoneyBillWave className="text-emerald-400" /> Set Fee Structure
          </h2>
          <button onClick={onClose} className="hover:text-red-400 transition"><FaTimes size={20} /></button>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Select Class */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Class</label>
              <select 
                name="classId" 
                value={formData.classId} 
                onChange={handleChange}
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">-- Choose Class --</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.grade} - {cls.section}
                  </option>
                ))}
              </select>
            </div>

            {/* Monthly Fee Input */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monthly Fee</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                    <input 
                        type="number" 
                        name="monthlyFee" 
                        value={formData.monthlyFee} 
                        onChange={handleChange}
                        className="w-full pl-7 p-3 border border-slate-300 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        required 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Yearly Fee (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                    <input 
                        type="number" 
                        name="yearlyFee" 
                        value={formData.yearlyFee} 
                        onChange={handleChange}
                        className="w-full pl-7 p-3 border border-slate-300 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                    />
                  </div>
                </div>
            </div>

            {/* Description / Note */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description (Optional)</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange}
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                placeholder="e.g. Tuition fee for academic year 2024..."
              />
            </div>

            {/* Submit Button */}
            <button 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition flex justify-center items-center gap-2"
            >
              {loading ? 'Saving...' : <><FaSave /> Save Fee Structure</>}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default FeeStructureModal;