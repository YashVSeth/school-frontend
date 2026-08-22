import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaUserEdit, FaTimes, FaSave, FaCamera, FaVideo } from 'react-icons/fa';
import CameraCaptureModal from '../../components/CameraCaptureModal';

const EditStudentModal = ({ isOpen, onClose, student, refreshData, classes = [] }) => {
  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '', 
    studentId: '', 
    class: '', 
    fatherName: '', 
    phone: '', 
    email: '', 
    dob: '', 
    gender: '',
    height: '',
    weight: ''
  });
  
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (isOpen && student) {
        setFormData({
            firstName: student.firstName || '',
            lastName: student.lastName || '',
            studentId: student.studentId || '',
            class: student.class?._id || student.class || '', 
            fatherName: student.fatherName || '',
            phone: student.phone || '',
            email: student.email || '',
            dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '', 
            gender: student.gender || '',
            height: student.height || '',
            weight: student.weight || ''
        });
        setPhotoPreview(student.photo || null);
        setPhotoFile(null);
    }
  }, [isOpen, student]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!student?._id) {
        toast.error("Error: Student ID is missing. Cannot update.");
        return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = `${BASE_URL}/api/students/${student._id}`;

      const updateData = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== undefined && formData[key] !== null) {
          updateData.append(key, formData[key]);
        }
      });

      if (photoFile) {
        updateData.append('photo', photoFile);
      }

      await axios.put(url, updateData, {
        headers: { 
          Authorization: `Bearer ${token}`
        }
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
            {/* Photo Preview & Selector */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
              <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-300 overflow-hidden flex items-center justify-center relative shadow-sm shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <FaCamera className="text-slate-400 text-xl" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1.5"
                  >
                    <FaCamera /> {photoFile ? "Change File" : "Choose File"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="text-xs font-bold px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition flex items-center gap-1.5"
                  >
                    <FaVideo className="text-red-400" /> Click Photo (USB)
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Upload or click live photo · Stored securely on Google Drive</p>

                {/* Camera Modal */}
                <CameraCaptureModal
                  isOpen={isCameraOpen}
                  onClose={() => setIsCameraOpen(false)}
                  onCapture={(file, previewUrl) => {
                    setPhotoFile(file);
                    setPhotoPreview(previewUrl);
                    toast.success("Photo captured successfully!");
                  }}
                />
              </div>
            </div>

            <form id="edit-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* First Name */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">First Name</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500 transition" />
                </div>

                {/* Last Name */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Last Name</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500 transition" />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Student ID</label>
                    <input type="text" name="studentId" value={formData.studentId} onChange={handleChange} required 
                        className="w-full border border-slate-300 bg-slate-50 p-2.5 rounded-lg text-slate-500 cursor-not-allowed" readOnly />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Class</label>
                    <select name="class" value={formData.class} onChange={handleChange} required 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500 bg-white transition">
                        <option value="">Select Class</option>
                        {classes && classes.map(cls => (
                            <option key={cls._id} value={cls._id}>{cls.grade} - {cls.section}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Father's Name</label>
                    <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} required 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500 transition" />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} required 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500 transition" />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                    <input type="date" name="dob" value={formData.dob} onChange={handleChange} 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500 transition" />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} 
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500 bg-white transition">
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Height</label>
                    <input type="text" name="height" value={formData.height} onChange={handleChange} placeholder="e.g. 150 cm"
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500 transition" />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Weight</label>
                    <input type="text" name="weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 45 kg"
                        className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500 transition" />
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
                className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Saving...' : <><FaSave /> Save Changes</>}
            </button>
        </div>

      </div>
    </div>
  );
};

export default EditStudentModal;