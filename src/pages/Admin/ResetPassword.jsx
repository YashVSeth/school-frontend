import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { FaLock, FaUniversity, FaCheckCircle } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';

// ✅ Import your logo
import logo from '../../assets/logo.png'; 

const ResetPassword = () => {
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const navigate = useNavigate();
  
  // usually the token comes from the URL: /reset-password/:token
  const { token } = useParams(); 
  const BASE_URL = import.meta.env.VITE_API_URL;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);
    
    try {
      // ✅ API Call to update the password
      const response = await axios.post(`${BASE_URL}/api/auth/reset-password/${token}`, {
        password: formData.password
      });

      toast.success("Password reset successful! Redirecting to login...");
      
      // Wait 2 seconds so user sees the success message, then go to login
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error("Reset Error:", error);
      toast.error(error.response?.data?.message || "Failed to reset password. Link might be expired.");
    } finally {
      setLoading(false);
    }
  };

  // Custom Colors
  const customRed = "rgba(195,32,41)";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
      <ToastContainer />
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* --- LEFT SIDE: BRANDING --- */}
        <div className="md:w-1/2 bg-slate-900 text-white p-10 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                 <FaUniversity size={400} className="absolute -left-20 -top-20" />
            </div>
            
            <div className="z-10 text-center flex flex-col items-center">
                <div className="mb-8">
                    {!logoError && logo ? (
                        <img 
                            src={logo} 
                            alt="School Logo" 
                            className="w-40 h-40 object-contain drop-shadow-2xl" 
                            onError={() => setLogoError(true)} 
                        />
                    ) : (
                        <FaUniversity className={`text-[${customRed}] text-8xl drop-shadow-lg`} />
                    )}
                </div>

                <h1 className="text-3xl font-bold font-serif mb-2 leading-tight">
                  Radhey Shyam <br /> Shakuntala Seth
                </h1>
                <h2 className={`text-xl text-[${customRed}] font-medium tracking-wide uppercase`}>
                  Shikshan Sansthaan
                </h2>
            </div>
        </div>

        {/* --- RIGHT SIDE: RESET FORM --- */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center bg-white">
            <h2 className="text-3xl font-bold text-slate-800 mb-1">Set New Password</h2>
            <p className="text-slate-500 mb-8">Please create a strong password for your admin account.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* New Password */}
                <div className="relative">
                    <FaLock className="absolute left-3 top-3.5 text-slate-400" />
                    <input 
                        type="password" 
                        name="password" 
                        value={formData.password} 
                        onChange={handleChange}
                        required 
                        placeholder="New Password"
                        className={`w-full pl-10 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[${customRed}] transition`}
                    />
                </div>

                {/* Confirm Password */}
                <div className="relative">
                    <FaCheckCircle className="absolute left-3 top-3.5 text-slate-400" />
                    <input 
                        type="password" 
                        name="confirmPassword" 
                        value={formData.confirmPassword} 
                        onChange={handleChange}
                        required 
                        placeholder="Confirm New Password"
                        className={`w-full pl-10 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[${customRed}] transition`}
                    />
                </div>

                <button 
                    disabled={loading}
                    className={`w-full text-white py-3 rounded-lg font-bold shadow-lg transition-all flex justify-center items-center gap-2
                        bg-[${customRed}] hover:bg-[rgba(170,28,36)] shadow-[${customRed}]/40`}
                >
                    {loading ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </div>

      </div>
    </div>
  );
};

export default ResetPassword;