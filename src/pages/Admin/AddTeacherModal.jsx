import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  FaTimes, FaArrowRight, FaCheck, FaUser, 
  FaGraduationCap, FaFileAlt, FaLock, FaUpload 
} from 'react-icons/fa';

const INITIAL_DATA = {
  fullName: '', gender: '', dob: '', email: '', permanentAddress: '', aadhaarNumber: '', bloodGroup: '',
  highestQualification: '', university: '', specialization: '', remarks: '', extraDuties: 'No',
  username: '', password: '', role: 'Teacher', status: 'Active', phone: ''
};

const AddTeacherModal = ({ isOpen, onClose, onRefresh, teacherToEdit }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_DATA);
  const [files, setFiles] = useState({ photo: null, resume: null, idProof: null });
  
  // Refs
  const photoInputRef = useRef(null);  
  const resumeInputRef = useRef(null);
  const idProofInputRef = useRef(null);

  // 1. DETECT EDIT MODE: If 'teacherToEdit' is passed, fill the form
  useEffect(() => {
    if (teacherToEdit) {
      setFormData({
        ...INITIAL_DATA, // Start with defaults to avoid undefined errors
        ...teacherToEdit, // Overwrite with teacher data
        password: '' // Don't fill password for security (leave empty to keep unchanged)
      });
    } else {
      setFormData(INITIAL_DATA);
    }
    setFiles({ photo: null, resume: null, idProof: null }); // Reset file inputs
  }, [teacherToEdit, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({ ...prev, [fieldName]: file }));
    }
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const dataToSend = new FormData();

    // Append text fields
    Object.keys(formData).forEach(key => {
      // Only append if it has a value (except password: only send if user typed a new one)
      if (formData[key] && key !== 'password') {
        dataToSend.append(key, formData[key]);
      } else if (key === 'password' && formData[key].length > 0) {
        dataToSend.append(key, formData[key]);
      }
    });

    // Append New Files (if any)
    if (files.photo) dataToSend.append('photo', files.photo);
    if (files.resume) dataToSend.append('resume', files.resume);
    if (files.idProof) dataToSend.append('idProof', files.idProof);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL;
      
      if (teacherToEdit) {
        // 2. EDIT MODE: Use PUT request
        await axios.put(`${BASE_URL}/api/teachers/${teacherToEdit._id}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Teacher Updated Successfully!");
      } else {
        // 3. ADD MODE: Use POST request
        await axios.post(`${BASE_URL}/api/teachers`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Teacher Added Successfully!");
      }

      onRefresh();
      onClose();
      setStep(1); // Reset step to 1
      
    } catch (error) {
      console.error("Error:", error);
      alert(`Error: ${error.response?.data?.message || "Operation Failed"}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#fdfdff] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-white max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-white px-8 py-5 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-700">
            {teacherToEdit ? "Edit Teacher" : "Add New Teacher"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><FaTimes size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          
          {/* STEP 1: Basic Info */}
          {step === 1 && (
             <div className="space-y-6 animate-slide-up">
               <h3 className="text-blue-900 font-bold flex items-center gap-2"><FaUser/> Basic Information</h3>
               <div className="grid grid-cols-12 gap-8">
                 <div className="col-span-12 sm:col-span-4 flex flex-col items-center gap-4">
                   {/* Photo Preview Logic */}
                   <div className="w-32 h-32 aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 overflow-hidden relative">
                     {files.photo ? (
                       <img src={URL.createObjectURL(files.photo)} alt="Preview" className="w-full h-full object-cover" />
                     ) : teacherToEdit?.photoUrl ? (
                        // Show existing photo in Edit Mode
                       <img src={`${import.meta.env.VITE_API_URL}/${teacherToEdit.photoUrl.replace(/\\/g, "/")}`} alt="Current" className="w-full h-full object-cover" />
                     ) : (
                       <FaUser size={40} />
                     )}
                   </div>
                   <input type="file" ref={photoInputRef} onChange={(e) => handleFileChange(e, 'photo')} style={{ display: 'none' }} accept="image/*"/>
                   <button type="button" onClick={() => photoInputRef.current.click()} className="text-blue-600 text-xs font-bold border border-blue-50 px-4 py-2 rounded-xl hover:bg-blue-50">
                     <FaUpload /> {files.photo ? "Changed" : "Upload Photo"}
                   </button>
                 </div>
                 
                 <div className="col-span-12 sm:col-span-8 space-y-4">
                   <input name="fullName" value={formData.fullName} onChange={handleChange} type="text" placeholder="Full Name" className="form-input-style w-full" required />
                   <div className="flex gap-6 text-xs font-bold text-slate-500">
                     {['Male', 'Female', 'Other'].map(g => (
                       <label key={g} className="flex items-center gap-2"><input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={handleChange} /> {g}</label>
                     ))}
                   </div>
                   <input name="dob" value={formData.dob ? formData.dob.split('T')[0] : ''} onChange={handleChange} type="date" className="form-input-style w-full" />
                   <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="Email Address" className="form-input-style w-full" required />
                   <input name="phone" value={formData.phone} onChange={handleChange} type="text" placeholder="Phone Number" className="form-input-style w-full" />
                 </div>
               </div>
               <div className="flex justify-end"><button type="button" onClick={nextStep} className="next-btn">Next <FaArrowRight /></button></div>
             </div>
          )}

          {/* STEP 2: Qualifications */}
          {step === 2 && (
            <div className="space-y-6 animate-slide-up">
              <h3 className="text-orange-600 font-bold flex items-center gap-2"><FaGraduationCap /> Qualification Details</h3>
              <div className="space-y-4">
                <select name="highestQualification" value={formData.highestQualification} onChange={handleChange} className="form-input-style w-full">
                  <option value="">Highest Qualification</option><option value="B.Ed">B.Ed</option><option value="M.Ed">M.Ed</option><option value="PhD">PhD</option>
                </select>
                <input name="university" value={formData.university} onChange={handleChange} placeholder="University / College Name" className="form-input-style w-full" />
                <input name="specialization" value={formData.specialization} onChange={handleChange} placeholder="Specialization (e.g. Math, Science)" className="form-input-style w-full" />
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Remarks" className="form-input-style w-full h-20" />
              </div>
              <div className="flex justify-between">
                <button type="button" onClick={prevStep} className="text-slate-400 font-bold">Back</button>
                <button type="button" onClick={nextStep} className="next-btn">Next <FaArrowRight /></button>
              </div>
            </div>
          )}

          {/* STEP 3: Finalize */}
          {step === 3 && (
            <div className="space-y-8 animate-slide-up">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-5">
                  <h3 className="text-green-600 font-bold flex items-center gap-2"><FaFileAlt /> Documents</h3>
                  {/* File Uploads UI (Simplified) */}
                  <div className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                    <span className="text-xs font-bold">Resume</span>
                    <button type="button" onClick={() => resumeInputRef.current.click()} className="text-blue-600 text-[10px] font-bold">{files.resume ? "Selected" : "Upload"}</button>
                    <input type="file" ref={resumeInputRef} onChange={(e) => handleFileChange(e, 'resume')} style={{display:'none'}} />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                    <span className="text-xs font-bold">ID Proof</span>
                    <button type="button" onClick={() => idProofInputRef.current.click()} className="text-blue-600 text-[10px] font-bold">{files.idProof ? "Selected" : "Upload"}</button>
                     <input type="file" ref={idProofInputRef} onChange={(e) => handleFileChange(e, 'idProof')} style={{display:'none'}} />
                  </div>
                </div>
                
                <div className="space-y-4 pl-0 md:pl-10 md:border-l border-slate-100">
                   <h3 className="text-blue-600 font-bold flex items-center gap-2"><FaLock /> Credentials</h3>
                   <input name="username" value={formData.username} onChange={handleChange} placeholder="Username" className="form-input-style w-full" />
                   <input name="password" value={formData.password} onChange={handleChange} type="password" placeholder="Password (Leave blank to keep current)" className="form-input-style w-full" />
                   <div className="grid grid-cols-2 gap-2">
                     <select name="status" value={formData.status} onChange={handleChange} className="form-input-style"><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
                   </div>
                </div>
              </div>
              <div className="flex justify-between pt-6 border-t">
                <button type="button" onClick={prevStep} className="text-slate-400 font-bold">Back</button>
                <button type="submit" className="bg-green-600 text-white px-10 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl hover:bg-green-700">
                  <FaCheck /> {teacherToEdit ? "Update Teacher" : "Submit Teacher"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddTeacherModal;