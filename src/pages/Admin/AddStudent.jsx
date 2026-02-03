import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaUserGraduate, FaUserTie, FaMapMarkerAlt, FaCalendarAlt, 
  FaPhone, FaIdCard, FaVenusMars 
} from 'react-icons/fa';

const AddStudent = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Expanded Form State
  const [formData, setFormData] = useState({
    name: '',
    studentId: '', // Roll Number
    classId: '',
    admissionDate: new Date().toISOString().split('T')[0], // Default to today
    
    fatherName: '',
    motherName: '',
    phone: '',
    email: '',
    address: '',
    
    dob: '',
    gender: '',
    bloodGroup: '',
    nationality: 'Indian',
    photo: ''
  });

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching classes");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Split Full Name into First and Last Name
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '.'; // Use '.' if no last name provided to satisfy required validation

    // 2. Prepare the Payload (Match Backend Expectations)
    const payload = {
        ...formData,
        firstName: firstName,
        lastName: lastName,
        class: formData.classId, // Map 'classId' to 'class'
    };

    try {
      const token = localStorage.getItem('token');
      
      // 3. Send the processed payload
      await axios.post(`${BASE_URL}/api/students`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Student Admitted Successfully!");
      
      // 4. Reset Form
      setFormData({
        name: '', studentId: '', classId: '', admissionDate: new Date().toISOString().split('T')[0],
        fatherName: '', motherName: '', phone: '', email: '', address: '',
        dob: '', gender: '', bloodGroup: '', nationality: 'Indian', photo: ''
      });

    } catch (error) {
      console.error(error);
      // Show specific error message from backend if available
      const errorMsg = error.response?.data?.message || "Failed to add student.";
      toast.error(errorMsg);
    } finally {
        setLoading(false);
    }
  };
  // Modern Input Component
  const InputField = ({ label, name, type = "text", value, onChange, placeholder, required = false, icon }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
        {icon && <span className="text-blue-500">{icon}</span>} {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none block p-3 transition-all"
      />
    </div>
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto animate-fade-in-up pb-10">
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />

        {/* === HEADER === */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-2xl p-8 mb-8 text-white shadow-xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Student Admission</h1>
            <p className="text-blue-100 mt-2 opacity-90">Complete the form below to register a new student.</p>
          </div>
          <div className="hidden md:block p-4 bg-white/10 rounded-full backdrop-blur-md">
            <FaUserGraduate size={32} className="text-white" />
          </div>
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-8">
          
          {/* === SECTION 1: BASIC INFO === */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
              <FaIdCard className="text-blue-600" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InputField label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Arjun Singh" required />
              <InputField label="Student ID / Roll No" name="studentId" value={formData.studentId} onChange={handleChange} placeholder="e.g. 2024001" required />
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Gender <span className="text-red-500">*</span></label>
                <select name="gender" value={formData.gender} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 p-3 outline-none">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <InputField label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
              <InputField label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} placeholder="e.g. Indian" />
              <InputField label="Blood Group" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} placeholder="e.g. O+" />
            </div>
          </div>

          {/* === SECTION 2: ACADEMIC DETAILS === */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
              <FaCalendarAlt className="text-blue-600" /> Academic Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assign Class <span className="text-red-500">*</span></label>
                <select name="classId" value={formData.classId} onChange={handleChange} required className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 p-3 outline-none">
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>{cls.grade} - {cls.section}</option>
                  ))}
                </select>
              </div>
              <InputField label="Admission Date" name="admissionDate" type="date" value={formData.admissionDate} onChange={handleChange} required />
            </div>
          </div>

          {/* === SECTION 3: PARENT & CONTACT === */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
              <FaUserTie className="text-blue-600" /> Parents & Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label="Father's Name" name="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="Mr. Name" required />
              <InputField label="Mother's Name" name="motherName" value={formData.motherName} onChange={handleChange} placeholder="Mrs. Name" />
              <InputField label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} placeholder="9876543210" required icon={<FaPhone className="text-xs" />} />
              <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="parent@example.com" />
              
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                  <span className="text-blue-500"><FaMapMarkerAlt /></span> Residential Address
                </label>
                <textarea 
                  name="address" value={formData.address} onChange={handleChange} placeholder="Enter full address here..." 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 p-3 outline-none h-24 resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          {/* === SECTION 4: DOCUMENTS === */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Student Photo URL</label>
                <input 
                  type="text" name="photo" value={formData.photo} onChange={handleChange} placeholder="https://image-link.com/photo.jpg" 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 p-3 outline-none"
                />
                <p className="text-xs text-slate-400">Paste a direct link to the image (Cloudinary, Firebase, etc.)</p>
             </div>
          </div>

          {/* === SUBMIT BUTTON === */}
          <button 
            type="submit" 
            className="w-full bg-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition shadow-xl shadow-blue-500/20 active:scale-95"
          >
            Submit Student Admission
          </button>

        </form>
      </div>
    </Layout>
  );
};

export default AddStudent;