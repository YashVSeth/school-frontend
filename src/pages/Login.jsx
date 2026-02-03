import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { FaEnvelope, FaLock, FaUniversity, FaArrowLeft } from 'react-icons/fa';
import 'react-toastify/dist/ReactToastify.css';

// ✅ Import your logo
import logo from '../assets/logo.png'; 

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  
  // State to toggle between Login and Forgot Password view
  const [isForgotPassword, setIsForgotPassword] = useState(false); 

  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL;

  // --- HANDLERS ---

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: formData.email,
        password: formData.password
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user || response.data)); 
      
      const userRole = response.data.role || (response.data.user && response.data.user.role);
      
      toast.success(`Welcome back!`);

      if (userRole === "Admin" || userRole === "admin") {
        navigate("/admin/dashboard");
      } else if (userRole === "Teacher" || userRole === "teacher") {
        navigate("/teacher/dashboard");
      } else {
        navigate("/student/dashboard");
      }

    } catch (error) {
      console.error("Login Error:", error);
      toast.error(error.response?.data?.message || "Invalid Credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    console.log("Attempting to post to:", `${BASE_URL}/api/auth/forgot-password`);
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/forgot-password`, { 
            email: formData.email 
        });
        
        toast.success(response.data.message); 
        
        // Return to login screen after 3 seconds
        setTimeout(() => {
            setIsForgotPassword(false);
            setLoading(false);
        }, 3000);

    } catch (error) {
        console.error("Forgot Password Error:", error);
        toast.error(error.response?.data?.message || "Error sending email.");
        setLoading(false);
    }
  };

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
                        <FaUniversity className="text-[rgba(195,32,41)] text-8xl drop-shadow-lg" />
                    )}
                </div>

                <h1 className="text-3xl font-bold font-serif mb-2 leading-tight">
                  Radhey Shyam <br /> Shakuntala Seth
                </h1>
                <h2 className="text-xl text-[rgba(195,32,41)] font-medium tracking-wide uppercase">
                  Shikshan Sansthaan
                </h2>
                <p className="mt-6 text-slate-400 text-sm max-w-xs mx-auto italic">
                  "Empowering minds and shaping futures with excellence in education."
                </p>
            </div>
        </div>

        {/* --- RIGHT SIDE: DYNAMIC FORMS --- */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center bg-white">
            
            {!isForgotPassword ? (
                // === LOGIN FORM ===
                <>
                    <h2 className="text-3xl font-bold text-slate-800 mb-1">Welcome Back</h2>
                    <p className="text-slate-500 mb-8">Please sign in to your account.</p>

                    <form onSubmit={handleLoginSubmit} className="space-y-6">
                        <div className="relative">
                            <FaEnvelope className="absolute left-3 top-3.5 text-slate-400" />
                            <input 
                                type="email" name="email" value={formData.email} onChange={handleChange} required 
                                placeholder="Email Address"
                                className="w-full pl-10 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[rgba(195,32,41)] transition"
                            />
                        </div>

                        <div className="relative">
                            <FaLock className="absolute left-3 top-3.5 text-slate-400" />
                            <input 
                                type="password" name="password" value={formData.password} onChange={handleChange} required 
                                placeholder="Password"
                                className="w-full pl-10 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[rgba(195,32,41)] transition"
                            />
                        </div>

                        <div className="flex justify-end">
                            {/* ✅ THIS IS THE MAGIC PART: Auto-fills email on click */}
                            <button 
                                type="button"
                                onClick={() => {
                                    // 1. Set the email state manually
                                    setFormData({ ...formData, email: 'yash29seth@gmail.com' });
                                    // 2. Switch to Forgot Password view
                                    setIsForgotPassword(true);
                                }}
                                className="text-xs text-[rgba(195,32,41)] font-bold hover:underline"
                            >
                                Forgot Password?
                            </button>
                        </div>

                        <button 
                            disabled={loading}
                            className="w-full text-white py-3 rounded-lg font-bold shadow-lg transition-all flex justify-center items-center gap-2 bg-[rgba(195,32,41)] hover:bg-[rgba(175,28,37)] shadow-[rgba(195,32,41)]/40"
                        >
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>
                </>
            ) : (
                // === FORGOT PASSWORD FORM ===
                <>
                    <button 
                        onClick={() => setIsForgotPassword(false)}
                        className="flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors"
                    >
                        <FaArrowLeft className="mr-2" /> Back to Login
                    </button>

                    <h2 className="text-3xl font-bold text-slate-800 mb-1">Reset Password</h2>
                    <p className="text-slate-500 mb-8">Confirm your email to receive a reset link.</p>

                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                        <div className="relative">
                            <FaEnvelope className="absolute left-3 top-3.5 text-slate-400" />
                            
                            {/* The value here is controlled by formData.email, which we just set */}
                            <input 
                                type="email" name="email" value={formData.email} onChange={handleChange} required 
                                placeholder="Enter your registered email"
                                className="w-full pl-10 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[rgba(195,32,41)] transition"
                            />
                        </div>

                        <button 
                            disabled={loading}
                            className="w-full text-white py-3 rounded-lg font-bold shadow-lg transition-all flex justify-center items-center gap-2 bg-[rgba(195,32,41)] hover:bg-[rgba(175,28,37)] shadow-[rgba(195,32,41)]/40"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                </>
            )}

        </div>
      </div>
    </div>
  );
};

export default Login;