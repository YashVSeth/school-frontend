import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FaUserTie, FaEnvelope, FaPhoneAlt, FaMapMarkerAlt, FaIdCard,
  FaGraduationCap, FaUniversity, FaAward, FaCalendarAlt, FaRupeeSign,
  FaChalkboardTeacher, FaBook, FaSignOutAlt, FaShieldAlt, FaWhatsapp,
  FaCheckCircle, FaBriefcase, FaTint, FaInfoCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const TeacherProfile = () => {
  const [profile, setProfile] = useState(null);
  const [scheduleData, setScheduleData] = useState({ classTeacher: null, schedule: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Teacher Profile
      const [profileRes, scheduleRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/teachers/my-profile`, { headers }).catch(err => {
          console.error("Profile fetch error:", err);
          return null;
        }),
        axios.get(`${BASE_URL}/api/teachers/my-schedule`, { headers }).catch(err => {
          console.error("Schedule fetch error:", err);
          return null;
        })
      ]);

      if (profileRes?.data) {
        setProfile(profileRes.data);
      } else {
        // Fallback to local storage user
        const localUser = localStorage.getItem('user');
        if (localUser) setProfile(JSON.parse(localUser));
      }

      if (scheduleRes?.data) {
        setScheduleData(scheduleRes.data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Could not load full profile details");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.clear();
      toast.info("Logged out successfully");
      navigate('/');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not Provided';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹ 0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <div className="w-10 h-10 border-4 border-[#8f0631] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Loading Faculty Profile...</p>
      </div>
    );
  }

  const avatarUrl = profile?.photo || profile?.photoUrl;
  const initial = profile?.fullName?.charAt(0) || 'T';

  return (
    <div className="font-sans flex flex-col gap-5 pb-16 max-w-5xl mx-auto w-full">
      {/* 🔴 HERO CARD: Profile Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#750426] via-[#8f0631] to-[#a81140] text-white shadow-xl p-6 border border-white/10">
        {/* Background decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-yellow-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          {/* Avatar with Status Ring */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl p-1 bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-lg">
              <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-900 flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile?.fullName || "Teacher"}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-3xl font-black text-white">{initial}</span>
                )}
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white flex items-center gap-1 shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Active
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1 border border-yellow-300/30">
              <FaShieldAlt size={10} />
              {profile?.role || 'Faculty Member'}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white truncate">
              {profile?.fullName || 'Teacher Name'}
            </h1>
            <p className="text-sm text-white/80 font-medium mt-0.5">
              Specialization: <span className="text-yellow-300 font-bold">{profile?.specialization || 'General'}</span>
            </p>

            {/* Quick Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              <span className="text-xs bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl text-white/90 border border-white/10 flex items-center gap-1.5">
                <FaGraduationCap className="text-yellow-300" />
                {profile?.highestQualification || 'B.Ed'}
              </span>
              <span className="text-xs bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl text-white/90 border border-white/10 flex items-center gap-1.5">
                <FaBriefcase className="text-yellow-300" />
                {profile?.experience || 'Experienced'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Contact Action Pills */}
        <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-white/15">
          {profile?.phone ? (
            <a
              href={`tel:${profile.phone}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition text-xs font-bold text-white shadow-sm"
            >
              <FaPhoneAlt size={12} className="text-yellow-300" />
              Call
            </a>
          ) : (
            <span className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/5 text-xs text-white/40 cursor-not-allowed">
              <FaPhoneAlt size={12} /> Call
            </span>
          )}

          {profile?.phone ? (
            <a
              href={`https://wa.me/${profile.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 active:scale-95 transition text-xs font-bold text-white shadow-sm"
            >
              <FaWhatsapp size={14} />
              WhatsApp
            </a>
          ) : (
            <span className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/5 text-xs text-white/40 cursor-not-allowed">
              <FaWhatsapp size={14} /> WhatsApp
            </span>
          )}

          {profile?.email ? (
            <a
              href={`mailto:${profile.email}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition text-xs font-bold text-white shadow-sm"
            >
              <FaEnvelope size={12} className="text-yellow-300" />
              Email
            </a>
          ) : (
            <span className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/5 text-xs text-white/40 cursor-not-allowed">
              <FaEnvelope size={12} /> Email
            </span>
          )}
        </div>
      </div>

      {/* 🏛️ TWO-COLUMN DOSSIER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* 🏫 SECTION 1: Current Teaching Responsibilities */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <span className="w-8 h-8 rounded-xl bg-red-50 text-[#8f0631] flex items-center justify-center">
              <FaChalkboardTeacher size={16} />
            </span>
            <span>Teaching Assignments</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Current Session</span>
        </div>

        {/* Class Teacher of */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-100/60 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Class Monitor / Class Teacher</span>
            <span className="text-base font-black text-slate-800">
              {scheduleData?.classTeacher
                ? `${scheduleData.classTeacher.grade?.toLowerCase().startsWith('class') ? scheduleData.classTeacher.grade : `Class ${scheduleData.classTeacher.grade}`}${scheduleData.classTeacher.section ? ` - ${scheduleData.classTeacher.section}` : ''}`
                : 'Not Assigned as Class Teacher'}
            </span>
          </div>
          <span className="text-xs bg-white text-red-600 font-bold px-3 py-1 rounded-xl shadow-sm border border-red-100">
            {scheduleData?.classTeacher ? 'Assigned' : 'None'}
          </span>
        </div>

        {/* Assigned Subjects across Classes */}
        <div className="flex flex-col gap-2 mt-1">
          <span className="text-xs font-bold text-slate-600 ml-1">Subjects You Teach:</span>
          {scheduleData?.schedule && scheduleData.schedule.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scheduleData.schedule.map((item, idx) => (
                <div key={item._id || idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-800">
                      {item.grade?.toLowerCase().startsWith('class') ? item.grade : `Class ${item.grade}`} {item.section ? `(${item.section})` : ''}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.subjects?.map((sub, sIdx) => (
                        <span key={sIdx} className="text-[11px] font-semibold bg-white text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                  <FaBook className="text-[#8f0631] shrink-0 mt-1" size={14} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
              No subjects currently mapped by administration.
            </div>
          )}
        </div>
      </div>

      {/* 👤 SECTION 2: Personal Details */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3">
          <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FaUserTie size={15} />
          </span>
          <span>Personal Details</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Email Address</span>
            <span className="font-bold text-slate-800 break-all">{profile?.email || '—'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Contact Number</span>
            <span className="font-bold text-slate-800">{profile?.phone || '—'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Gender</span>
            <span className="font-bold text-slate-800">{profile?.gender || '—'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Date of Birth</span>
            <span className="font-bold text-slate-800">{formatDate(profile?.dob)}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Blood Group</span>
            <span className="font-bold text-red-600 flex items-center gap-1">
              <FaTint size={11} /> {profile?.bloodGroup || '—'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Aadhaar Card No.</span>
            <span className="font-bold text-slate-800 tracking-wider">
              {profile?.aadhaarNumber ? `•••• •••• ${profile.aadhaarNumber.slice(-4)}` : '—'}
            </span>
          </div>

          <div className="sm:col-span-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Permanent Address</span>
            <span className="font-bold text-slate-800">{profile?.permanentAddress || 'Not Provided'}</span>
          </div>
        </div>
      </div>

      {/* 🎓 SECTION 3: Academic & Professional Credentials */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3">
          <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FaGraduationCap size={16} />
          </span>
          <span>Academic & Experience</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Highest Qualification</span>
            <span className="font-bold text-slate-800">{profile?.highestQualification || '—'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">University / Board</span>
            <span className="font-bold text-slate-800">{profile?.university || '—'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Specialization</span>
            <span className="font-bold text-slate-800">{profile?.specialization || '—'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Teaching Experience</span>
            <span className="font-bold text-slate-800">{profile?.experience || '—'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Assigned Extra Duties</span>
            <span className="font-bold text-slate-800">{profile?.extraDuties || 'None'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-medium mb-0.5">Remarks / Notes</span>
            <span className="font-bold text-slate-800">{profile?.remarks || 'None'}</span>
          </div>
        </div>
      </div>
    </div>

      {/* 🚪 LOGOUT BUTTON */}
      <button
        onClick={handleLogout}
        className="w-full py-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-sm flex items-center justify-center gap-2 border border-red-200 transition-all active:scale-[0.99] shadow-xs"
      >
        <FaSignOutAlt />
        <span>Log Out of Faculty Portal</span>
      </button>
    </div>
  );
};

export default TeacherProfile;
