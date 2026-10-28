import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaUserGraduate, FaUserTie, FaMapMarkerAlt, FaCalendarAlt,
  FaPhone, FaIdCard, FaBus, FaWhatsapp, FaEnvelope, FaVenusMars,
  FaCamera, FaTimes, FaCloudUploadAlt, FaCheckCircle, FaImage, FaVideo,
  FaShieldAlt, FaBolt, FaArrowRight, FaLock, FaSpinner, FaAward
} from 'react-icons/fa';
import CameraCaptureModal from '../../components/CameraCaptureModal';

// Reusable InputField
const InputField = ({ label, name, type = "text", value, onChange, placeholder, required = false, icon }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
      {icon && <span className="text-red-500">{icon}</span>} {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required}
      autoComplete="off"
      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-red-500 block p-3 transition-all outline-none shadow-sm"
    />
  </div>
);

const AddStudent = () => {
  const [classes, setClasses] = useState([]);
  const [transportRoutes, setTransportRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: '',
    class: '',
    fatherName: '',
    motherName: '',
    phone: '',
    email: '',
    address: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    aadharNo: '',
    abcId: '',
    previousSchool: '',
    height: '', weight: '',
    whatsappEnabled: true,
    isUsingTransport: false,
    transportRoute: '',
    transportFee: 0
  });

  // ⚡ DIGILOCKER ABC ID / APAAR ID AUTO-FILL STATE
  const [abcInput, setAbcInput] = useState('');
  const [isFetchingAbc, setIsFetchingAbc] = useState(false);
  const [isAbcModalOpen, setIsAbcModalOpen] = useState(false);
  const [abcModalStep, setAbcModalStep] = useState('otp'); // 'otp' | 'preview'
  const [abcOtp, setAbcOtp] = useState(['1', '2', '3', '4', '5', '6']);
  const [fetchedAbcResult, setFetchedAbcResult] = useState(null);
  const [isDigiLockerDismissed, setIsDigiLockerDismissed] = useState(true);

  // Helper: Apply student data directly to form
  const applyStudentDataToForm = (s, targetAbc) => {
    if (!s) return;
    setFormData(prev => ({
      ...prev,
      fullName: s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
      fatherName: s.fatherName || prev.fatherName,
      motherName: s.motherName || prev.motherName,
      dob: s.dob || prev.dob,
      gender: s.gender || prev.gender,
      bloodGroup: s.bloodGroup || prev.bloodGroup,
      phone: s.phone || prev.phone,
      email: s.email || prev.email,
      address: s.address || prev.address,
      aadharNo: s.aadharNo || prev.aadharNo,
      abcId: s.abcId || targetAbc || prev.abcId,
      previousSchool: s.previousSchool || prev.previousSchool
    }));

    // Auto-scroll smoothly to Class & Section
    setTimeout(() => {
      const classElem = document.getElementById('student-class-selector');
      if (classElem) {
        classElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  };

  // Direct 1-Click Live Fetch & Auto-Fill
  const handleDirectOneClickFetch = async (overrideId) => {
    const target = overrideId !== undefined ? overrideId : abcInput;
    const cleanDigits = String(target || '').replace(/\D/g, '');
    if (cleanDigits.length !== 12) {
      return toast.warn("Please enter a valid 12-digit ABC ID (e.g. 8294-0192-8419).");
    }

    try {
      setIsFetchingAbc(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`${BASE_URL}/api/digilocker/gateway/fetch-by-abc`, {
        abcId: cleanDigits,
        skipOtp: true
      }, { headers });

      if (res.data?.success && res.data.studentData) {
        setFetchedAbcResult(res.data);
        applyStudentDataToForm(res.data.studentData, cleanDigits);
        toast.success(`✅ Auto-filled "${res.data.studentData.fullName || 'Student'}" from DigiLocker!`);
      } else {
        toast.error(res.data?.message || "No record found for this ABC ID");
      }
    } catch (err) {
      console.error("DigiLocker ABC fetch error:", err);
      toast.error(err.response?.data?.message || "Failed to retrieve student from DigiLocker Gateway");
    } finally {
      setIsFetchingAbc(false);
    }
  };


  // Step 1: Open DigiLocker Gateway Verification Modal
  const handleOpenDigiLockerModal = (e) => {
    if (e) e.preventDefault();
    const cleanDigits = (abcInput || '').replace(/\D/g, '');
    if (cleanDigits.length !== 12) {
      return toast.warn("Please enter a 12-digit ABC ID to verify with OTP.");
    }
    setAbcModalStep('otp');
    setAbcOtp(['1', '2', '3', '4', '5', '6']);
    setIsAbcModalOpen(true);
  };

  // Step 2: Call DigiLocker Gateway with OTP
  const handleExecuteAbcFetch = async (bypassOtp = false) => {
    try {
      setIsFetchingAbc(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`${BASE_URL}/api/digilocker/gateway/fetch-by-abc`, {
        abcId: abcInput,
        otp: abcOtp.join(''),
        skipOtp: bypassOtp
      }, { headers });

      if (res.data?.success) {
        setFetchedAbcResult(res.data);
        setAbcModalStep('preview');
        toast.success(res.data.message || "Student identity verified with DigiLocker!");
      }
    } catch (err) {
      console.error("DigiLocker ABC fetch error:", err);
      toast.error(err.response?.data?.message || "Failed to retrieve student from DigiLocker Gateway");
    } finally {
      setIsFetchingAbc(false);
    }
  };

  // Step 3: Apply verified data directly to Admission Form
  const handleApplyAbcDataToForm = () => {
    if (!fetchedAbcResult?.studentData) return;
    applyStudentDataToForm(fetchedAbcResult.studentData, abcInput);
    setIsAbcModalOpen(false);
    toast.success("🎉 DigiLocker student records applied to Admission Form!");
  };

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => { 
    fetchClasses(); 
    fetchTransportRoutes();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(Array.isArray(response.data) ? response.data : []);
    } catch (error) { console.error("Error fetching classes"); }
    finally { setLoading(false); }
  };

  const fetchTransportRoutes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/transport`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransportRoutes(Array.isArray(response.data) ? response.data : []);
    } catch (error) { console.error("Error fetching transport routes"); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Photo size should be less than 10MB");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTransportChange = (e) => {
    const placeName = e.target.value;
    const selectedRoute = transportRoutes.find(r => r.placeName === placeName);
    setFormData(prev => ({
      ...prev,
      transportRoute: placeName,
      transportFee: selectedRoute ? selectedRoute.fare : 0
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '.';

    const submissionData = new FormData();
    submissionData.append('firstName', firstName);
    submissionData.append('lastName', lastName);
    submissionData.append('fatherName', formData.fatherName);
    submissionData.append('motherName', formData.motherName || '');
    submissionData.append('phone', formData.phone);
    submissionData.append('email', formData.email || '');
    submissionData.append('address', formData.address || '');
    submissionData.append('dob', formData.dob || '');
    submissionData.append('gender', formData.gender || '');
    submissionData.append('bloodGroup', formData.bloodGroup || '');
    submissionData.append('aadharNo', formData.aadharNo || '');
    submissionData.append('abcId', formData.abcId || '');
    submissionData.append('previousSchool', formData.previousSchool || '');
    submissionData.append('height', formData.height || '');
    submissionData.append('weight', formData.weight || '');
    submissionData.append('class', formData.class);
    submissionData.append('whatsappEnabled', formData.whatsappEnabled);
    submissionData.append('feeDetails[isUsingTransport]', formData.isUsingTransport);
    submissionData.append('feeDetails[transportRoute]', formData.transportRoute || '');
    submissionData.append('feeDetails[transportFee]', formData.transportFee || 0);

    if (photoFile) {
      submissionData.append('photo', photoFile);
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/students`, submissionData, {
        headers: { 
          Authorization: `Bearer ${token}`
        },
      });

      toast.success("Student Admitted Successfully!");

      // Clear Form
      setFormData({
        fullName: '', class: '', fatherName: '', motherName: '',
        phone: '', email: '', address: '', dob: '', gender: '',
        bloodGroup: '', aadharNo: '', abcId: '', previousSchool: '',
        height: '', weight: '',
        whatsappEnabled: true, isUsingTransport: false, transportRoute: '', transportFee: 0
      });
      setAbcInput('');
      removePhoto();

    } catch (error) {
      const errorMsg = error.response?.data?.message || "Check Student ID - it must be unique!";
      toast.error(errorMsg);
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto animate-fade-in-up pb-10">
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-red-800 to-red-600 rounded-2xl p-8 mb-8 text-white shadow-xl flex items-center justify-between">
          <div> 
            <h1 className="text-3xl font-bold tracking-tight">Student Admission</h1>
            <p className="text-red-100 mt-2 opacity-90">Register new student profile with photo and complete records.</p> 
          </div>
          <FaUserGraduate size={40} className="opacity-20 hidden md:block" />
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* DIGILOCKER / ABC ID AUTO-FILL */}
        {!isDigiLockerDismissed ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm mb-6 space-y-4 opacity-60 hover:opacity-100 transition-opacity duration-300 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm font-bold">
                  <FaShieldAlt />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">DigiLocker / ABC ID Auto-Fill</h2>
                  <p className="text-xs text-slate-400">Enter student's 12-digit ABC ID (APAAR) to auto-fill details from DigiLocker</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <FaTimes className="text-amber-600 text-[10px]" /> Under Development
                </span>
                <button
                  type="button"
                  onClick={() => setIsDigiLockerDismissed(true)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                  title="Close / Dismiss Section"
                >
                  <FaTimes size={14} />
                </button>
              </div>
            </div>

          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
            {/* Under Development Notice */}
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900">
              <span className="font-bold shrink-0 flex items-center gap-1">
                ⚠️ Under Development:
              </span>
              <span className="text-amber-800 text-[11px]">
                This DigiLocker Gateway auto-fill module is currently in the development phase. Live Government portal verification is active in beta sandbox mode.
              </span>
            </div>

            {/* Input & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter 12-Digit ABC ID (e.g. 8294-0192-8419)"
                  value={abcInput}
                  onChange={(e) => setAbcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleDirectOneClickFetch();
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
                />
                {abcInput && (
                  <button
                    type="button"
                    onClick={() => setAbcInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDirectOneClickFetch}
                  disabled={isFetchingAbc}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-red-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isFetchingAbc ? (
                    <>
                      <FaSpinner className="animate-spin text-sm" /> Fetching...
                    </>
                  ) : (
                    <>
                      <FaBolt /> Auto-Fill
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenDigiLockerModal}
                  disabled={isFetchingAbc}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                  title="Verify with DigiLocker OTP"
                >
                  <FaLock size={10} className="text-slate-400" /> OTP Verify
                </button>
              </div>
            </div>


            {/* Active DigiLocker Record Banner */}
            {fetchedAbcResult?.studentData && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 animate-fade-in">
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-600 shrink-0 text-sm" />
                  <span>
                    DigiLocker Data Applied: <strong className="text-emerald-950 font-bold">{fetchedAbcResult.studentData.fullName}</strong> ({fetchedAbcResult.studentData.abcId || abcInput})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setAbcModalStep('preview'); setIsAbcModalOpen(true); }}
                  className="text-emerald-700 hover:text-emerald-900 font-bold text-xs underline shrink-0 self-start sm:self-auto"
                >
                  View DigiLocker Certificate Card →
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center justify-between text-xs text-slate-500 bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs">
          <span className="flex items-center gap-2 text-slate-500 font-medium">
            <FaShieldAlt className="text-slate-400" /> DigiLocker Auto-Fill (Under Development) is closed
          </span>
          <button
            type="button"
            onClick={() => setIsDigiLockerDismissed(false)}
            className="text-red-600 hover:text-red-700 font-bold text-xs"
          >
            Reopen Section
          </button>
        </div>
      )}

        <form onSubmit={handleAddSubmit} className="space-y-6">

          {/* ══════════════════════════════════════════════════════════ */}
          {/* SECTION 1: STUDENT PHOTOGRAPH UPLOAD */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-sm font-bold">
                  <FaCamera />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Student Photograph</h2>
                  <p className="text-xs text-slate-400">Official passport photo for student profile, ID card & portal</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                <FaCloudUploadAlt className="text-red-500" /> Cloud Storage
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50/70 rounded-xl border border-slate-200/80">
              {/* Photo Preview Thumbnail */}
              <div className="relative group shrink-0">
                <div className="w-32 h-32 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-sm transition-all group-hover:border-red-400">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Student Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 text-center p-2">
                      <FaImage size={32} className="opacity-40 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No Photo</span>
                    </div>
                  )}
                </div>

                {photoPreview && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md transition-transform hover:scale-110"
                    title="Remove Photo"
                  >
                    <FaTimes size={11} />
                  </button>
                )}
              </div>

              {/* Upload Controls & Instructions */}
              <div className="flex-1 space-y-2.5 text-center sm:text-left">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                />

                <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-red-500/20 active:scale-95"
                  >
                    <FaCamera /> {photoFile ? "Change File" : "Choose Student Photo"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm active:scale-95"
                  >
                    <FaVideo className="text-red-400" /> Click Photo (USB / Camera)
                  </button>

                  {photoFile && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Camera Capture Modal */}
                <CameraCaptureModal
                  isOpen={isCameraOpen}
                  onClose={() => setIsCameraOpen(false)}
                  onCapture={(file, previewUrl) => {
                    setPhotoFile(file);
                    setPhotoPreview(previewUrl);
                    toast.success("Photo captured successfully!");
                  }}
                />

                {photoFile ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                    <FaCheckCircle /> {photoFile.name} ({(photoFile.size / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Accepts <strong>JPG, PNG, WebP</strong> up to <strong>10 MB</strong>. Stored automatically in Google Drive / Cloud.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* SECTION 2: BASIC IDENTITY & CLASS */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <FaUserGraduate className="text-red-500" /> Basic Student Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required icon={<FaUserGraduate />} placeholder="e.g. Rahul Sharma" />

              <div className="space-y-1.5" id="student-class-selector">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assign Class *</label>
                <select name="class" value={formData.class} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-red-500">
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>{cls.grade}{cls.section ? ` - ${cls.section}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* SECTION 3: PARENT & CONTACT DETAILS */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <FaUserTie className="text-red-500" /> Parent & Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label="Father's Name" name="fatherName" value={formData.fatherName} onChange={handleChange} required icon={<FaUserTie />} placeholder="e.g. Ramesh Sharma" />
              <InputField label="Mother's Name" name="motherName" value={formData.motherName} onChange={handleChange} placeholder="e.g. Sunita Sharma" />
              <InputField label="WhatsApp / Contact Phone" name="phone" value={formData.phone} onChange={handleChange} required icon={<FaPhone />} placeholder="e.g. 9876543210" />
              <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} icon={<FaEnvelope />} placeholder="e.g. parent@email.com" />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* SECTION 4: PERSONAL DETAILS & PREFERENCES */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <FaIdCard className="text-red-500" /> Personal & Medical Records
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} />
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><FaVenusMars className="text-red-500" /> Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Height" name="height" value={formData.height} onChange={handleChange} placeholder="e.g. 150 cm" />
                <InputField label="Weight" name="weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 45 kg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Blood Group</label>
                  <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none">
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <InputField label="Aadhar No" name="aadharNo" value={formData.aadharNo} onChange={handleChange} placeholder="e.g. 1234 5678 9012" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="ABC ID / APAAR ID (12 Digits)" name="abcId" value={formData.abcId} onChange={handleChange} icon={<FaShieldAlt className="text-blue-600" />} placeholder="e.g. 8294-0192-8419" />
                <InputField label="Previous School" name="previousSchool" value={formData.previousSchool} onChange={handleChange} placeholder="e.g. XYZ Public School" />
              </div>
              <InputField label="Full Address" name="address" value={formData.address} onChange={handleChange} icon={<FaMapMarkerAlt />} placeholder="Full residential address" />
            </div>

            {/* Transport & WhatsApp settings */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-center gap-5">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <FaBus className="text-red-500" /> Transport & Alerts
              </h2>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="whatsappEnabled" checked={formData.whatsappEnabled} onChange={handleChange} className="w-6 h-6 rounded-lg accent-green-600 cursor-pointer" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><FaWhatsapp className="text-green-500 text-lg" /> Enable WhatsApp Notifications</span>
                  <span className="text-[10px] text-slate-500">Fee alerts & attendance updates will be sent to {formData.phone || 'Phone Number'}</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="isUsingTransport" checked={formData.isUsingTransport} onChange={handleChange} className="w-6 h-6 rounded-lg accent-red-600 cursor-pointer" />
                <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><FaBus className="text-red-500 text-lg" /> Student uses School Transport</span>
              </label>

              {formData.isUsingTransport && (
                <div className="space-y-1.5 ml-9 animate-fade-in">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    Select Transport Route *
                  </label>
                  <select 
                    name="transportRoute" 
                    value={formData.transportRoute} 
                    onChange={handleTransportChange} 
                    required={formData.isUsingTransport}
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl text-sm outline-none shadow-sm focus:border-red-500 transition-colors cursor-pointer"
                  >
                    <option value="">Select a place...</option>
                    {transportRoutes.map((route) => (
                      <option key={route._id} value={route.placeName}>
                        {route.placeName} (₹{route.fare}/month)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-700 transition-all active:scale-[0.98] shadow-lg shadow-red-100 disabled:opacity-50"
          >
            {loading ? "SAVING TO DATABASE..." : "COMPLETE ADMISSION"}
          </button>
        </form>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* DIGILOCKER GATEWAY VERIFICATION & PREVIEW MODAL */}
        {/* ══════════════════════════════════════════════════════════ */}
        {isAbcModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-in">
              {/* Modal Header */}
              <div className="bg-slate-800 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center text-sm font-bold">
                    <FaShieldAlt />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-wide text-white">
                      DigiLocker Verification
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      National Academic Depository (NAD)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAbcModalOpen(false)}
                  className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
                >
                  <FaTimes size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {/* STEP 1: OTP VERIFICATION */}
                {abcModalStep === 'otp' && (
                  <div className="space-y-5">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span>Candidate ABC ID:</span>
                        <span className="font-mono text-sm text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                          {abcInput}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Aadhaar-Linked Mobile:</span>
                        <span className="font-mono font-bold text-slate-700">+91 ******4821</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                        A simulated 6-digit DigiLocker OTP has been generated for verification.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-700">
                          Enter 6-Digit DigiLocker OTP
                        </label>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                          Test OTP: 123456
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {abcOtp.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`abc-otp-${idx}`}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => {
                              const val = e.target.value.slice(-1);
                              const newOtp = [...abcOtp];
                              newOtp[idx] = val;
                              setAbcOtp(newOtp);
                              if (val && idx < 5) {
                                document.getElementById(`abc-otp-${idx + 1}`)?.focus();
                              }
                            }}
                            className="w-12 h-13 text-center text-lg font-bold font-mono border-2 border-slate-200 rounded-xl focus:border-red-500 focus:bg-red-50/20 outline-none transition"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAbcModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecuteAbcFetch(false)}
                        disabled={isFetchingAbc}
                        className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {isFetchingAbc ? (
                          <>
                            <FaSpinner className="animate-spin" /> Verifying...
                          </>
                        ) : (
                          <>
                            Verify & Fetch Profile <FaArrowRight size={11} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: PREVIEW VERIFIED STUDENT RECORD */}
                {abcModalStep === 'preview' && fetchedAbcResult?.studentData && (
                  <div className="space-y-4">
                    {/* Official Verified Status Badge */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FaCheckCircle className="text-emerald-600 text-lg" />
                        <div>
                          <p className="text-xs font-black text-emerald-900">
                            DigiLocker Identity Verified
                          </p>
                          <p className="text-[10px] text-emerald-700">
                            Issued by Ministry of Education (NAD Depository)
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-white text-emerald-800 px-2 py-1 rounded-lg border border-emerald-200">
                        {fetchedAbcResult.studentData.abcId}
                      </span>
                    </div>

                    {/* Student Info Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-slate-500 font-bold">Student Full Name:</span>
                        <span className="font-black text-sm text-slate-900">
                          {fetchedAbcResult.studentData.fullName}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-500 font-bold block text-[10px]">Father's Name:</span>
                          <span className="font-bold text-slate-800">
                            {fetchedAbcResult.studentData.fatherName || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block text-[10px]">Mother's Name:</span>
                          <span className="font-bold text-slate-800">
                            {fetchedAbcResult.studentData.motherName || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block text-[10px]">Date of Birth / Gender:</span>
                          <span className="font-bold text-slate-800">
                            {fetchedAbcResult.studentData.dob} · {fetchedAbcResult.studentData.gender}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block text-[10px]">Aadhaar No:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {fetchedAbcResult.studentData.aadharNo || '—'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 font-bold block text-[10px]">Previous School:</span>
                          <span className="font-medium text-slate-700">
                            {fetchedAbcResult.studentData.previousSchool || '—'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 font-bold block text-[10px]">Permanent Address:</span>
                          <span className="font-medium text-slate-700">
                            {fetchedAbcResult.studentData.address || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SVG Certificate Preview Thumbnail */}
                    {fetchedAbcResult.digilockerCertificate?.fileUrl && (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-100 max-h-36 flex items-center justify-center p-1">
                        <img
                          src={fetchedAbcResult.digilockerCertificate.fileUrl}
                          alt="DigiLocker APAAR ID Card"
                          className="w-full max-h-32 object-contain rounded-xl"
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAbcModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyAbcDataToForm}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition active:scale-95 flex items-center gap-2"
                      >
                        <FaCheckCircle /> Apply to Admission Form
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AddStudent;