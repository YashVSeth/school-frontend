import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  FaTimes, FaArrowRight, FaCheck, FaUser, 
  FaGraduationCap, FaFileAlt, FaLock, FaUpload, 
  FaMagic, FaEye, FaEyeSlash 
} from 'react-icons/fa';

const INITIAL_DATA = {
  fullName: '', gender: '', dob: '', email: '', permanentAddress: '', aadhaarNumber: '', bloodGroup: '',
  highestQualification: '', university: '', specialization: '', remarks: '', extraDuties: 'No',
  password: '', role: 'Teacher', status: 'Active', phone: '' 
};

const AddTeacherModal = ({ isOpen, onClose, onRefresh, teacherToEdit }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_DATA);
  const [files, setFiles] = useState({ photo: null, resume: null, idProof: null });
  
  const [showPassword, setShowPassword] = useState(false);

  const photoInputRef = useRef(null);  
  const resumeInputRef = useRef(null);
  const idProofInputRef = useRef(null);

  useEffect(() => {
    if (teacherToEdit) {
      setFormData({ ...INITIAL_DATA, ...teacherToEdit, password: '' });
    } else {
      setFormData(INITIAL_DATA);
    }
    setFiles({ photo: null, resume: null, idProof: null });
  }, [teacherToEdit, isOpen]);

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#";
    let pass = "";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pass }));
    setShowPassword(true); 
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) setFiles(prev => ({ ...prev, [fieldName]: file }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const dataToSend = new FormData();

    Object.keys(formData).forEach(key => {
      if (formData[key] && key !== 'password') {
        dataToSend.append(key, formData[key]);
      } else if (key === 'password' && formData[key].length > 0) {
        dataToSend.append(key, formData[key]);
      }
    });

    if (files.photo) dataToSend.append('photo', files.photo);
    if (files.resume) dataToSend.append('resume', files.resume);
    if (files.idProof) dataToSend.append('idProof', files.idProof);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL;
      if (teacherToEdit) {
        // ✅ ADDED MULTIPART HEADER HERE FOR EDITING
        await axios.put(`${BASE_URL}/api/teachers/${teacherToEdit._id}`, dataToSend, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data' 
          }
        });
        alert("Teacher updated successfully!");
      } else {
        // ✅ ADDED MULTIPART HEADER HERE FOR ADDING
        await axios.post(`${BASE_URL}/api/teachers`, dataToSend, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        alert("Teacher added successfully!");
      }
      onRefresh();
      onClose();
      setStep(1);
    } catch (error) {
      alert(`Error: ${error.response?.data?.message || "Operation Failed"}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="bg-[#fdfdff] w-full max-w-3xl sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden border border-white h-[90vh] sm:h-auto flex flex-col">
        
        <div className="bg-white px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-700">
              {teacherToEdit ? "Edit Teacher" : "Add New Teacher"}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wider">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <FaTimes size={20}/>
          </button>
        </div>

        <div className="overflow-y-auto flex-grow p-6 sm:p-8">
          <form onSubmit={handleSubmit}>
            
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6 animate-slide-up">
                <h3 className="text-blue-900 font-bold flex items-center gap-2"><FaUser/> Basic Information</h3>
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-1/3 flex flex-col items-center gap-4">
                    <div className="w-32 h-32 aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 overflow-hidden relative shadow-inner">
                      {files.photo ? (
                        <img src={URL.createObjectURL(files.photo)} alt="Preview" className="w-full h-full object-cover" />
                      ) : teacherToEdit?.photoUrl ? (
                        <img src={teacherToEdit.photoUrl} alt="Current" className="w-full h-full object-cover" />
                      ) : (
                        <FaUser size={40} />
                      )}
                    </div>
                    <input type="file" ref={photoInputRef} onChange={(e) => handleFileChange(e, 'photo')} className="hidden" accept="image/*"/>
                    <button type="button" onClick={() => photoInputRef.current.click()} className="w-full max-w-[160px] flex items-center justify-center gap-2 text-blue-600 text-xs font-bold border border-blue-100 px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-all">
                      <FaUpload /> {files.photo ? "Change Photo" : "Upload Photo"}
                    </button>
                  </div>
                  
                  <div className="w-full md:w-2/3 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
                        <input name="fullName" value={formData.fullName} onChange={handleChange} type="text" placeholder="John Doe" className="form-input-style w-full" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Gender</label>
                        <div className="flex flex-wrap gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          {['Male', 'Female', 'Other'].map(g => (
                            <label key={g} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                <input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={handleChange} className="text-blue-600 focus:ring-blue-500" /> {g}
                            </label>
                          ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">DOB</label>
                            <input name="dob" value={formData.dob ? formData.dob.split('T')[0] : ''} onChange={handleChange} type="date" className="form-input-style w-full" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Phone</label>
                            <input name="phone" value={formData.phone} onChange={handleChange} type="text" placeholder="+91..." className="form-input-style w-full" />
                        </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4"><button type="button" onClick={nextStep} className="next-btn w-full sm:w-auto">Next Step <FaArrowRight /></button></div>
              </div>
            )}

            {/* STEP 2: Qualifications */}
            {step === 2 && (
              <div className="space-y-6 animate-slide-up">
                <h3 className="text-orange-600 font-bold flex items-center gap-2"><FaGraduationCap /> Qualification Details</h3>
                <div className="space-y-4">
                  
                  {/* Qualification Dropdown */}
                  <select name="highestQualification" value={formData.highestQualification} onChange={handleChange} className="form-input-style w-full appearance-none">
                    <option value="">Select Highest Qualification</option>
                    <option value="B.Ed">B.Ed</option><option value="M.Ed">M.Ed</option><option value="PhD">PhD</option>
                    <option value="M.Sc">M.Sc</option><option value="M.A">M.A</option><option value="B.Tech">B.Tech</option>
                  </select>

                  {/* University */}
                  <input name="university" value={formData.university} onChange={handleChange} placeholder="University / College Name" className="form-input-style w-full" />
                  
                  {/* Specialization */}
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Specialization (Major Subject)</label>
                      <input 
                        name="specialization" 
                        value={formData.specialization} 
                        onChange={handleChange} 
                        placeholder="e.g. Mathematics, Physics, English Literature" 
                        className="form-input-style w-full" 
                      />
                      <p className="text-[10px] text-slate-400 ml-1 italic">
                          * Teacher's academic major (not necessarily the subject they will teach).
                      </p>
                  </div>

                  <textarea name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Any additional remarks..." className="form-input-style w-full h-24 resize-none" />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4">
                  <button type="button" onClick={prevStep} className="order-2 sm:order-1 text-slate-400 font-bold py-3 px-6 hover:text-slate-600 transition-colors">Back</button>
                  <button type="button" onClick={nextStep} className="order-1 sm:order-2 next-btn w-full sm:w-auto">Next Step <FaArrowRight /></button>
                </div>
              </div>
            )}

            {/* STEP 3: Finalize */}
            {step === 3 && (
              <div className="space-y-8 animate-slide-up">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-5">
                    <h3 className="text-green-600 font-bold flex items-center gap-2"><FaFileAlt /> Documents</h3>
                    <div className="space-y-3">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-blue-200 transition-all">
                        <span className="text-sm font-bold text-slate-600">Resume / CV</span>
                        <button type="button" onClick={() => resumeInputRef.current.click()} className="text-blue-600 text-xs font-bold bg-white px-3 py-1.5 rounded-lg border border-blue-50 shadow-sm">{files.resume ? "Selected ✅" : "Upload File"}</button>
                        <input type="file" ref={resumeInputRef} onChange={(e) => handleFileChange(e, 'resume')} className="hidden" />
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-blue-200 transition-all">
                        <span className="text-sm font-bold text-slate-600">ID Proof (Aadhaar)</span>
                        <button type="button" onClick={() => idProofInputRef.current.click()} className="text-blue-600 text-xs font-bold bg-white px-3 py-1.5 rounded-lg border border-blue-50 shadow-sm">{files.idProof ? "Selected ✅" : "Upload File"}</button>
                        <input type="file" ref={idProofInputRef} onChange={(e) => handleFileChange(e, 'idProof')} className="hidden" />
                        </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 lg:pl-10 lg:border-l border-slate-100">
                      <h3 className="text-blue-600 font-bold flex items-center gap-2"><FaLock /> System Access</h3>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email ID (Login Username)</label>
                        <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="teacher@school.com" className="form-input-style w-full" required />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Password</label>
                        <div className="flex gap-2 relative">
                            <input 
                                name="password" 
                                value={formData.password} 
                                onChange={handleChange} 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                className="form-input-style w-full pr-10" 
                            />
                            
                            <button type="button" onClick={() => setShowPassword(!showPassword)} 
                                className="absolute right-14 top-3 text-slate-400 hover:text-blue-600">
                                {showPassword ? <FaEyeSlash/> : <FaEye/>}
                            </button>

                            <button 
                                type="button" 
                                onClick={generatePassword} 
                                className="bg-purple-100 text-purple-600 p-3 rounded-xl hover:bg-purple-200 transition-all"
                                title="Auto Generate Password"
                            >
                                <FaMagic />
                            </button>
                        </div>
                        {teacherToEdit && <p className="text-[10px] text-slate-400 italic mt-1">* Leave blank to keep current password</p>}
                      </div>

                      <div className="space-y-1 pt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Account Status</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="form-input-style w-full"><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
                      </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-between pt-6 border-t border-slate-100">
                  <button type="button" onClick={prevStep} className="order-2 sm:order-1 text-slate-400 font-bold py-3 px-6">Back</button>
                  <button type="submit" className="order-1 sm:order-2 bg-green-600 text-white px-10 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-green-600/20 hover:bg-green-700 transition-all">
                    <FaCheck /> {teacherToEdit ? "Update Teacher Profile" : "Create Teacher Profile"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTeacherModal;