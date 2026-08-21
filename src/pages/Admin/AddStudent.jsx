import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaUserGraduate, FaUserTie, FaMapMarkerAlt, FaCalendarAlt,
  FaPhone, FaIdCard, FaBus, FaWhatsapp, FaEnvelope, FaVenusMars,
  FaCamera, FaTimes
} from 'react-icons/fa';

// Component outside to avoid keyboard refocus on mobile
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
    previousSchool: '',
    height: '', weight: '',
    whatsappEnabled: true,
    isUsingTransport: false,
    transportRoute: '',
    transportFee: 0
  });

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
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
      });

      toast.success("Student Admitted Successfully!");

      // Clear Form
      setFormData({
        fullName: '', class: '', fatherName: '', motherName: '',
        phone: '', email: '', address: '', dob: '', gender: '',
        bloodGroup: '', aadharNo: '', previousSchool: '',
        whatsappEnabled: true, isUsingTransport: false, transportRoute: '', transportFee: 0
      });
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
        <div className="bg-gradient-to-r from-red-800 to-red-600 rounded-2xl p-8 mb-8 text-white shadow-xl flex items-center justify-between">
          <div> 
            <h1 className="text-3xl font-bold tracking-tight">Student Admission</h1>
            <p className="text-red-100 mt-2 opacity-90">Register new student profile with photo storage.</p> 
          </div>
          <FaUserGraduate size={40} className="opacity-20 hidden md:block" />
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-6">

          {/* Section 0: Photo Upload & Identity */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-28 h-28 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative shadow-inner group">
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition"
                    >
                      <FaTimes size={10} />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <FaCamera size={26} />
                    <span className="text-[10px] font-bold mt-1 uppercase">Photo</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                {photoFile ? "Change Photo" : "Upload Photo"}
              </button>
            </div>

            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required icon={<FaUserGraduate />} />

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assign Class *</label>
                <select name="class" value={formData.class} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none shadow-sm">
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>{cls.grade} - {cls.section}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Family & Contact */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Father's Name" name="fatherName" value={formData.fatherName} onChange={handleChange} required icon={<FaUserTie />} />
            <InputField label="Mother's Name" name="motherName" value={formData.motherName} onChange={handleChange} />
            <InputField label="WhatsApp/Phone No" name="phone" value={formData.phone} onChange={handleChange} required icon={<FaPhone />} />
            <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} icon={<FaEnvelope />} />
          </div>

          {/* Section 3: Personal Details & Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
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
              <InputField label="Previous School" name="previousSchool" value={formData.previousSchool} onChange={handleChange} placeholder="e.g. XYZ Public School" />
              <InputField label="Full Address" name="address" value={formData.address} onChange={handleChange} icon={<FaMapMarkerAlt />} />
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-center gap-5">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="whatsappEnabled" checked={formData.whatsappEnabled} onChange={handleChange} className="w-6 h-6 rounded-lg accent-green-600 cursor-pointer" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><FaWhatsapp className="text-green-500 text-lg" /> Enable WhatsApp Notifications</span>
                  <span className="text-[10px] text-slate-500">Fee alerts & attendance will be sent on {formData.phone || 'Phone No'}</span>
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
      </div>
    </Layout>
  );
};

export default AddStudent;