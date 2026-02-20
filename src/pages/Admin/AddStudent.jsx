import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaUserGraduate, FaUserTie, FaMapMarkerAlt, FaCalendarAlt, 
  FaPhone, FaIdCard, FaBus, FaWhatsapp, FaEnvelope, FaVenusMars
} from 'react-icons/fa';

// ✅ Keyboard band na ho, isliye component se bahar define kiya
const InputField = ({ label, name, type = "text", value, onChange, placeholder, required = false, icon }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
      {icon && <span className="text-blue-500">{icon}</span>} {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input 
      type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required}
      autoComplete="off"
      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 block p-3 transition-all outline-none shadow-sm"
    />
  </div>
);

const AddStudent = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    fullName: '',       // Hum split karke firstName/lastName banayenge
    studentId: '',      // Schema: studentId (Required/Unique)
    class: '',          // Schema: class (ObjectId)
    fatherName: '',     // Schema: fatherName (Required)
    motherName: '',     // Schema: motherName
    phone: '',          // Schema: phone (WhatsApp alerts ke liye)
    email: '',          
    address: '',        
    dob: '',            
    gender: '',         
    bloodGroup: '', 
    height: '', weight: '',    
    whatsappEnabled: true,
    isUsingTransport: false
  });

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => { fetchClasses(); }, []);

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Schema ke hisaab se name split logic
    const nameParts = formData.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '.';

    // ✅ PAYLOAD EXACTLY ACCORDING TO YOUR SCHEMA
    const payload = {
        studentId: formData.studentId,
        firstName: firstName,
        lastName: lastName,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        dob: formData.dob,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        height: formData.height, // ✅ Added to payload
        weight: formData.weight,
        class: formData.class,
        whatsappEnabled: formData.whatsappEnabled,
        feeDetails: {
            isUsingTransport: formData.isUsingTransport
        }
    };

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/students`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Student Admitted Successfully!");
      
      // Clear Form
      setFormData({
        fullName: '', studentId: '', class: '', fatherName: '', motherName: '', 
        phone: '', email: '', address: '', dob: '', gender: '', 
        bloodGroup: '', whatsappEnabled: true, isUsingTransport: false
      });

    } catch (error) {
      const errorMsg = error.response?.data?.message || "Check Student ID - it must be unique!";
      toast.error(errorMsg);
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto animate-fade-in-up pb-10">
        <ToastContainer position="top-right" autoClose={3000} theme="colored" /> 
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-2xl p-8 mb-8 text-white shadow-xl flex items-center justify-between">
           <div> <h1 className="text-3xl font-bold tracking-tight">Student Admission</h1> 
           <p className="text-blue-100 mt-2 opacity-90">Register new profile for the current session.</p> </div> 
           <FaUserGraduate size={40} className="opacity-20 hidden md:block" /> 
           </div>

        <form onSubmit={handleAddSubmit} className="space-y-6">
          
          {/* Section 1: Identity */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <InputField label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required icon={<FaUserGraduate/>} />
            <InputField label="Student ID / Adm No" name="studentId" value={formData.studentId} onChange={handleChange} required icon={<FaIdCard/>} />
            
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

          {/* Section 2: Family & Contact */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Father's Name" name="fatherName" value={formData.fatherName} onChange={handleChange} required icon={<FaUserTie/>} />
            <InputField label="Mother's Name" name="motherName" value={formData.motherName} onChange={handleChange} />
            <InputField label="WhatsApp/Phone No" name="phone" value={formData.phone} onChange={handleChange} required icon={<FaPhone/>} />
            <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} icon={<FaEnvelope/>} />
          </div>

          {/* Section 3: Personal Details & Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <InputField label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} />
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><FaVenusMars className="text-blue-500"/> Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
               </div>
               {/* ✅ NEW HEIGHT AND WEIGHT FIELDS */}
               <div className="grid grid-cols-2 gap-4">
                  <InputField label="Height" name="height" value={formData.height} onChange={handleChange} placeholder="e.g. 150 cm" />
                  <InputField label="Weight" name="weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 45 kg" />
               </div>
               
              
               <InputField label="Full Address" name="address" value={formData.address} onChange={handleChange} icon={<FaMapMarkerAlt/>} />
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-center gap-5">
               <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" name="whatsappEnabled" checked={formData.whatsappEnabled} onChange={handleChange} className="w-6 h-6 rounded-lg accent-green-600 cursor-pointer" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><FaWhatsapp className="text-green-500 text-lg"/> Enable WhatsApp Notifications</span>
                    <span className="text-[10px] text-slate-500">Fee alerts & attendance will be sent on {formData.phone || 'Phone No'}</span>
                  </div>
               </label>

               <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" name="isUsingTransport" checked={formData.isUsingTransport} onChange={handleChange} className="w-6 h-6 rounded-lg accent-blue-600 cursor-pointer" />
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><FaBus className="text-blue-500 text-lg"/> Student uses School Transport</span>
               </label>
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-100 disabled:opacity-50"
          >
            {loading ? "SAVING TO DATABASE..." : "COMPLETE ADMISSION"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default AddStudent;