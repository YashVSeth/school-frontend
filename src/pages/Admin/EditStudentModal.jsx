import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaUserEdit, FaTimes, FaSave } from 'react-icons/fa';

const EditStudentModal = ({ isOpen, onClose, student, refreshData, classes = [] }) => {
  // ✅ 1. Split Name into First/Last to match database schema
  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '', 
    studentId: '', 
    class: '', 
    fatherName: '', 
    phone: '', 
    email: '', 
    dob: '', 
    gender: ''
  });
  
  const [loading, setLoading] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (isOpen && student) {
        // ✅ 2. Pre-fill form safely
        setFormData({
            firstName: student.firstName || '',
            lastName: student.lastName || '',
            studentId: student.studentId || '',
            // Handle if class is populated object OR just an ID string
            class: student.class?._id || student.class || '', 
            fatherName: student.fatherName || '',
            phone: student.phone || '',
            email: student.email || '',
            dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '', 
            gender: student.gender || ''
        });
    }
  }, [isOpen, student]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🔍 DEBUGGING: Check the ID before sending
    console.log("Attempting to update Student ID:", student?._id);
    console.log("Sending Data:", formData);

    if (!student?._id) {
        toast.error("Error: Student ID is missing. Cannot update.");
        return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // ✅ FIX: Ensure URL is correct. (If your backend is singular '/student', change 'students' to 'student' below)
      const url = `${BASE_URL}/api/students/${student._id}`;
      console.log("Request URL:", url); // <--- Check this in your browser console if 404 persists

      await axios.put(url, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Student Updated Successfully!");
      if (refreshData) refreshData(); 
      onClose(); 
    } catch (error) {
      console.error("Update Error:", error);
      toast.error(error.response?.data?.message || "Update Failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800 p-5 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FaUserEdit /> Edit Student Details
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition">
            <FaTimes size={22} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
            <form id="edit-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* First Name */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">First Name</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>

                {/* Last Name */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Last Name</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Student ID</label>
                    <input type="text" name="studentId" value={formData.studentId} onChange={handleChange} required 
                        className="w-full border border-slate-300 bg-slate-50 p-2.5 rounded-lg text-slate-500 cursor-not-allowed" readOnly />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Class</label>
                    {/* ✅ Uses the 'classes' prop safely with fallback */}
                    <select name="class" value={formData.class} onChange={handleChange} required 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white transition">
                        <option value="">Select Class</option>
                        {classes && classes.map(cls => (
                            <option key={cls._id} value={cls._id}>{cls.grade} - {cls.section}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Father's Name</label>
                    <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} required 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} required 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                    <input type="date" name="dob" value={formData.dob} onChange={handleChange} 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white transition">
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

            </form>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
            <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition">
                Cancel
            </button>
            <button 
                type="submit" 
                form="edit-form" 
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Saving...' : <><FaSave /> Save Changes</>}
            </button>
        </div>

      </div>
    </div>
  );
};

export default EditStudentModal;