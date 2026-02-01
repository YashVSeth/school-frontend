import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  FaTimes, FaArrowRight, FaCheck, FaUser, 
  FaGraduationCap, FaFileAlt, FaLock, FaUpload 
} from 'react-icons/fa';

const INITIAL_DATA = {
  fullName: '', gender: '', dob: '', email: '', permanentAddress: '', aadhaarNumber: '', bloodGroup: '',
  highestQualification: '', university: '', specialization: '', remarks: '', extraDuties: 'No',
  username: '', password: '', role: 'Teacher', status: 'Active'
};

const AddTeacherModal = ({ isOpen, onClose, onRefresh }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_DATA);
  
  // 1. NEW: State to store the actual file objects
  const [files, setFiles] = useState({ photo: null, resume: null, idProof: null });

  // Refs to click the hidden inputs
  const photoInputRef = useRef(null);  
  const resumeInputRef = useRef(null);
  const idProofInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 2. NEW: Function to handle file selection
  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({ ...prev, [fieldName]: file }));
    }
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleClose = () => {
    setFormData(INITIAL_DATA);
    setFiles({ photo: null, resume: null }); // Reset files
    setStep(1);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Get the token from Local Storage (Standard way)
    const token = localStorage.getItem('token');
    
    // 3. CRITICAL: Use FormData instead of JSON
    const dataToSend = new FormData();

    // Append all text fields
    Object.keys(formData).forEach(key => {
      if (formData[key]) {
        dataToSend.append(key, formData[key]);
      }
    });

    // Append Files
    if (files.photo) dataToSend.append('photo', files.photo);
    if (files.resume) dataToSend.append('resume', files.resume);
    if (files.idProof) dataToSend.append('idProof', files.idProof);

    try {
      // NEW
// Note: Do not add a slash (/) at the very end of the URL
const BASE_URL = import.meta.env.VITE_API_URL;

await axios.post(`${BASE_URL}/api/teachers`, dataToSend, {
  headers: { Authorization: `Bearer ${token}` }
});
      alert("Teacher Added Successfully!");
      onRefresh();
      handleClose();
      
    } catch (error) {
      console.error("Backend Error Details:", error.response?.data);
      alert(`Error: ${error.response?.data?.message || "Upload Failed"}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#fdfdff] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-white">
        
        {/* Header */}
        <div className="bg-white px-8 py-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-6 text-sm font-bold text-slate-400">
            <span className={step >= 1 ? "text-blue-600" : ""}>1. Basic Info</span>
            <span className={step >= 2 ? "text-blue-600" : ""}>2. Qualifications</span>
            <span className={step === 3 ? "text-blue-600" : ""}>3. Finalize</span>
          </div>
          <button onClick={handleClose} className="text-slate-400"><FaTimes size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          
          {/* STEP 1: Basic Info */}
          {step === 1 && (
             <div className="space-y-6">
               <h3 className="text-blue-900 font-bold flex items-center gap-2"><FaUser/> Basic Information</h3>
               <div className="grid grid-cols-12 gap-8">
                 <div className="col-span-4 flex flex-col items-center gap-4">
                   
                   {/* 4. FIXED: Photo Upload UI */}
                   <div className="w-full aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 overflow-hidden relative">
                     {files.photo ? (
                       <img src={URL.createObjectURL(files.photo)} alt="Preview" className="w-full h-full object-cover" />
                     ) : (
                       <FaUser size={50} />
                     )}
                   </div>

                   {/* Hidden Input connected to Ref */}
                   <input 
                     type="file" 
                     ref={photoInputRef} 
                     onChange={(e) => handleFileChange(e, 'photo')} 
                     style={{ display: 'none' }} 
                     accept="image/*"
                   />
                   
                   {/* Button that clicks the hidden input */}
                   <button 
                     type="button" 
                     onClick={() => photoInputRef.current.click()} 
                     className="text-blue-600 text-xs font-bold border border-blue-50 px-4 py-2 rounded-xl hover:bg-blue-50"
                   >
                     <FaUpload /> {files.photo ? "Change Photo" : "Upload Photo"}
                   </button>
                 
                 </div>
                 
                 <div className="col-span-8 space-y-4">
                   <input name="fullName" value={formData.fullName} onChange={handleChange} type="text" placeholder="Full Name" className="form-input-style w-full" required />
                   <div className="flex gap-6 text-xs font-bold text-slate-500">
                     {['Male', 'Female', 'Other'].map(g => (
                       <label key={g} className="flex items-center gap-2"><input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={handleChange} /> {g}</label>
                     ))}
                   </div>
                   <input name="dob" value={formData.dob} onChange={handleChange} type="date" className="form-input-style w-full" />
                   <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="Email Address" className="form-input-style w-full" required />
                   <input name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} type="text" placeholder="Permanent Address" className="form-input-style w-full" />
                   <div className="grid grid-cols-2 gap-4">
                      <input name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} placeholder="Aadhaar Number" className="form-input-style" />
                      <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="form-input-style">
                        <option value="">Blood Group</option><option value="A+">A+</option><option value="B+">B+</option><option value="O+">O+</option>
                      </select>
                   </div>
                 </div>
               </div>
               <div className="flex justify-end"><button type="button" onClick={nextStep} className="next-btn">Next <FaArrowRight /></button></div>
             </div>
          )}

          {/* STEP 2: Qualifications (Unchanged) */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-orange-600 font-bold flex items-center gap-2"><FaGraduationCap /> Qualification Details</h3>
              <div className="space-y-4">
                <select name="highestQualification" value={formData.highestQualification} onChange={handleChange} className="form-input-style w-full">
                  <option value="">Highest Qualification</option><option value="B.Ed">B.Ed</option><option value="M.Ed">M.Ed</option>
                </select>
                <input name="university" value={formData.university} onChange={handleChange} placeholder="University / College Name" className="form-input-style w-full" />
                <select name="specialization" value={formData.specialization} onChange={handleChange} className="form-input-style w-full">
                  <option value="">Specialization Subject</option><option value="Math">Math</option><option value="Science">Science</option>
                </select>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Remarks" className="form-input-style w-full h-20" />
                <div className="flex gap-4 items-center">
                  <span className="text-sm font-bold text-slate-500">Extra Duties</span>
                  <label className="flex items-center gap-2 text-xs"><input type="radio" name="extraDuties" value="Yes" checked={formData.extraDuties === "Yes"} onChange={handleChange}/> Yes</label>
                  <label className="flex items-center gap-2 text-xs"><input type="radio" name="extraDuties" value="No" checked={formData.extraDuties === "No"} onChange={handleChange}/> No</label>
                </div>
              </div>
              <div className="flex justify-between">
                <button type="button" onClick={prevStep} className="text-slate-400 font-bold">Back</button>
                <button type="button" onClick={nextStep} className="next-btn">Next <FaArrowRight /></button>
              </div>
            </div>
          )}

          {/* STEP 3: Documents */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-5">
                  <h3 className="text-green-600 font-bold flex items-center gap-2"><FaFileAlt /> Documents</h3>
                  
                  {/* 5. FIXED: Resume Upload UI */}
                  <div className="flex justify-between p-3 bg-slate-50 rounded-xl border items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">Resume (PDF)</span>
                        {files.resume && <FaCheck className="text-green-500"/>}
                    </div>
                    
                    <input 
                        type="file" 
                        ref={resumeInputRef} 
                        onChange={(e) => handleFileChange(e, 'resume')} 
                        style={{ display: 'none' }} 
                        accept=".pdf"
                    />
                    <button type="button" onClick={() => resumeInputRef.current.click()} className="text-blue-600 text-[10px] font-bold">
                        {files.resume ? "Change" : "Upload"}
                    </button>
                  </div>

                  
                  {/* 1. ID PROOF UPLOAD (Working) */}
<div className="flex justify-between p-3 bg-slate-50 rounded-xl border items-center">
  <div className="flex items-center gap-2">
      <span className="text-xs font-bold">ID Proof (PDF/Image)</span>
      {/* Show Green Checkmark if file selected */}
      {files.idProof && <FaCheck className="text-green-500"/>}
  </div>
  
  {/* Hidden Input */}
  <input 
      type="file" 
      ref={idProofInputRef} 
      onChange={(e) => handleFileChange(e, 'idProof')} 
      style={{ display: 'none' }} 
      accept=".pdf,image/*" 
  />

  {/* Visible Button */}
  <button 
      type="button" 
      onClick={() => idProofInputRef.current.click()} 
      className="text-blue-600 text-[10px] font-bold"
  >
      {files.idProof ? "Change" : "Upload"}
  </button>
</div>

{/* 2. CERTIFICATE (Placeholder for future) */}
<div className="flex justify-between p-3 bg-slate-50 rounded-xl border opacity-50">
  <span className="text-xs font-bold">Certificate</span>
  <span className="text-[10px] text-slate-400">Not implemented</span>
</div>

                </div>
                <div className="space-y-4 pl-10 border-l border-slate-100">
                   <h3 className="text-blue-600 font-bold flex items-center gap-2"><FaLock /> Credentials</h3>
                   <input name="username" value={formData.username} onChange={handleChange} placeholder="Username" className="form-input-style w-full" required />
                   <input name="password" value={formData.password} onChange={handleChange} type="password" placeholder="Password" className="form-input-style w-full" required />
                   <div className="grid grid-cols-2 gap-2">
                     <select name="role" value={formData.role} onChange={handleChange} className="form-input-style"><option value="Teacher">Teacher</option></select>
                     <select name="status" value={formData.status} onChange={handleChange} className="form-input-style"><option value="Active">Active</option></select>
                   </div>
                </div>
              </div>
              <div className="flex justify-between pt-6 border-t">
                <button type="button" onClick={prevStep} className="text-slate-400 font-bold">Back</button>
                <button type="submit" className="bg-green-600 text-white px-10 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl hover:bg-green-700">
                  <FaCheck /> Submit Teacher
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