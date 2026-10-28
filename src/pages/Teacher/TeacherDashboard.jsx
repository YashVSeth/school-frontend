import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import {
  FaUserCheck, FaBookOpen, FaAward,
  FaMapMarkerAlt, FaClipboardCheck, FaUserCircle,
  FaChalkboardTeacher, FaClock, FaArrowRight, FaCheckCircle,
  FaCalendarAlt, FaUsers, FaShieldAlt
} from 'react-icons/fa';

const TeacherDashboard = () => {
  const [stats, setStats] = useState({
    studentCount: 0,
    presence: 98,
  });
  const [myClass, setMyClass] = useState(null); // Monitor Class
  const [schedule, setSchedule] = useState([]); // Subject Classes
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL;

  // 🔄 Time-based Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // 🔄 Data Fetching
  const fetchDashboardData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // A. Profile
      const profileRes = await axios.get(`${BASE_URL}/api/teachers/my-profile`, { headers }).catch(e => {
        console.error("Profile Fetch Error:", e);
        return null;
      });
      if (profileRes?.data) {
        setProfile(profileRes.data);
      } else {
        const stored = localStorage.getItem('user');
        if (stored) setProfile(JSON.parse(stored));
      }

      // B. Stats (Attendance & Student Count)
      const statsRes = await axios.get(`${BASE_URL}/api/attendance/my-students`, { headers }).catch(e => {
        return null;
      });
      if (statsRes?.data) {
        setStats({
          studentCount: statsRes.data.students ? statsRes.data.students.length : 0,
          presence: 98,
        });
      }

      // C. Schedule & Class Teacher Info
      const scheduleRes = await axios.get(`${BASE_URL}/api/teachers/my-schedule`, { headers }).catch(e => {
        return null;
      });
      if (scheduleRes?.data) {
        setMyClass(scheduleRes.data.classTeacher || null);
        setSchedule(scheduleRes.data.schedule || []);
      }
    } catch (err) {
      console.error("Error loading dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <div className="w-10 h-10 border-4 border-[#8f0631] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Faculty Portal...</p>
      </div>
    );
  }

  const avatarUrl = profile?.photo || profile?.photoUrl;
  const teacherName = profile?.fullName || profile?.name || myClass?.classTeacher?.fullName || (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.fullName || u.name || '';
    } catch { return ''; }
  })() || 'Faculty Member';
  const initial = teacherName.charAt(0) || 'T';

  return (
    <div className="font-sans flex flex-col gap-6">

      {/* 🔴 EXECUTIVE WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6d0525] via-[#8f0631] to-[#750426] text-white shadow-xl p-6 sm:p-7 border border-white/10">
        {/* Subtle background ambient lights */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Avatar + Details */}
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Avatar with sleek frosted glass frame */}
            <div className="relative shrink-0">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl p-1 bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-900 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-white">{initial}</span>
                  )}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Active
              </span>
            </div>

            {/* Teacher Details */}
            <div className="flex flex-col text-white">
              <div className="flex items-center gap-2">
                <span className="text-rose-200 font-extrabold text-xs tracking-wider uppercase">
                  {greeting},
                </span>
                <span className="hidden sm:inline-block text-[11px] bg-white/15 px-2 py-0.5 rounded-full font-bold text-white/90">
                  {todayFormatted}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight mt-0.5 drop-shadow-sm">
                {teacherName}
              </h1>
              <p className="text-xs text-white/80 font-medium mt-1 flex items-center gap-2">
                <span>Dept. of {profile?.specialization || 'Academics'}</span>
                <span>•</span>
                <span className="text-rose-100 font-semibold">{profile?.phone || 'Faculty Desk'}</span>
              </p>
            </div>
          </div>

          {/* Right / Bottom: Executive Metric Badges */}
          <div className="grid grid-cols-3 gap-2 bg-black/20 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/10 md:min-w-[320px]">
            <div className="flex flex-col items-center justify-center text-center px-2 py-1">
              <span className="text-[10px] font-bold text-rose-200/90 uppercase tracking-wider">Attendance</span>
              <span className="text-lg font-black text-white">{stats.presence}%</span>
              <span className="text-[9px] text-white/60 font-medium">Record</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-2 py-1 border-x border-white/10">
              <span className="text-[10px] font-bold text-rose-200/90 uppercase tracking-wider">Lectures</span>
              <span className="text-lg font-black text-white">{schedule.length}</span>
              <span className="text-[9px] text-white/60 font-medium">Assigned</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-2 py-1">
              <span className="text-[10px] font-bold text-rose-200/90 uppercase tracking-wider">Students</span>
              <span className="text-lg font-black text-white">
                {myClass ? stats.studentCount : schedule.length > 0 ? `${schedule.length * 30}+` : '—'}
              </span>
              <span className="text-[9px] text-white/60 font-medium">Strength</span>
            </div>
          </div>
        </div>
      </div>

      {/* ⚡ QUICK ACTIONS HUB */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-[#8f0631] rounded-full" />
            <h2 className="font-extrabold text-slate-800 text-base tracking-tight">Faculty Quick Actions</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">Direct Shortcuts</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Attendance */}
          <Link
            to="/teacher/attendance"
            className="group relative bg-white hover:bg-gradient-to-br hover:from-white hover:to-red-50/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="w-11 h-11 rounded-xl bg-red-50 text-[#8f0631] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#8f0631] group-hover:text-white transition-all shadow-xs">
              <FaClipboardCheck size={20} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-[#8f0631] transition leading-tight">
              Class Attendance
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Mark today's present, absent & late roll calls
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-black text-[#8f0631] opacity-0 group-hover:opacity-100 transition">
              <span>Open Desk</span> <FaArrowRight size={10} />
            </div>
          </Link>

          {/* Card 2: Marks */}
          <Link
            to="/teacher/marks"
            className="group relative bg-white hover:bg-gradient-to-br hover:from-white hover:to-amber-50/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-xs">
              <FaAward size={20} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-amber-600 transition leading-tight">
              Submit Marks
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Enter unit tests, mid-terms & practical scores
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-black text-amber-600 opacity-0 group-hover:opacity-100 transition">
              <span>Gradebook</span> <FaArrowRight size={10} />
            </div>
          </Link>

          {/* Card 4: DigiLocker Vault */}
          <Link
            to="/teacher/digilocker"
            className="group relative bg-white hover:bg-gradient-to-br hover:from-white hover:to-blue-900/10 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-900/10 text-blue-900 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-900 group-hover:text-yellow-300 transition-all shadow-xs">
              <FaShieldAlt size={20} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-900 transition leading-tight">
              DigiLocker Vault
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Aadhaar, B.Ed degree & e-credentials
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-black text-blue-900 opacity-0 group-hover:opacity-100 transition">
              <span>Open Vault</span> <FaArrowRight size={10} />
            </div>
          </Link>

          {/* Card 5: Profile */}
          <Link
            to="/teacher/profile"
            className="group relative bg-white hover:bg-gradient-to-br hover:from-white hover:to-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
              <FaUserCircle size={20} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-600 transition leading-tight">
              My Profile
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
              Official faculty ID, assigned classes & details
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-black text-emerald-600 opacity-0 group-hover:opacity-100 transition">
              <span>View ID Card</span> <FaArrowRight size={10} />
            </div>
          </Link>
        </div>
      </div>

      {/* 🖥️ MAIN TWO-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* 📅 LEFT / 2-COLS: TODAY'S SCHEDULE */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-[#8f0631] rounded-full" />
              <h3 className="font-extrabold text-slate-800 text-base">Today's Class Schedule</h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {schedule.length} Periods Scheduled
            </span>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 flex flex-col gap-3">
            {schedule.length > 0 ? (
              schedule.map((cls, index) => {
                const hour = 9 + Math.floor(index * 1.5);
                const isAM = hour < 12;
                const displayHour = hour > 12 ? hour - 12 : hour;
                const displayTime = `${displayHour < 10 ? '0' : ''}${displayHour}:00`;
                const isFirst = index === 0;

                return (
                  <div
                    key={cls._id || index}
                    className={`flex items-center gap-4 p-3.5 rounded-2xl transition border ${
                      isFirst
                        ? 'bg-gradient-to-r from-red-50/60 to-white border-red-200/80 shadow-xs'
                        : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'
                    }`}
                  >
                    {/* Time Slot Pill */}
                    <div className="flex flex-col items-center justify-center min-w-[64px] py-1 px-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                      <span className={`font-black text-base leading-none ${isFirst ? 'text-[#8f0631]' : 'text-slate-700'}`}>
                        {displayTime}
                      </span>
                      <span className="text-slate-400 text-[10px] font-extrabold uppercase mt-1">
                        {isAM ? 'AM' : 'PM'}
                      </span>
                    </div>

                    {/* Class Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate">
                          {cls.subjects && cls.subjects.length > 0 ? cls.subjects.join(', ') : 'Assigned Subject'}
                        </h4>
                        {isFirst ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-[#8f0631] text-[10px] font-black px-2.5 py-0.5 rounded-full border border-red-200 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8f0631] animate-ping" />
                            Next Up
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-bold shrink-0">
                            Period #{index + 1}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
                          {cls.grade?.toLowerCase().startsWith('class') ? cls.grade : `Class ${cls.grade}`} {cls.section ? `(${cls.section})` : ''}
                        </span>
                        <span className="text-slate-400 text-[11px] flex items-center gap-1 font-medium">
                          <FaMapMarkerAlt className="text-slate-400 text-[10px]" />
                          Academic Block
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                  <FaBookOpen size={20} />
                </div>
                <p className="text-sm font-bold text-slate-700">No Teaching Classes Assigned</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Your teaching schedule has not been assigned yet. Please contact the administrator.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 📋 RIGHT / 1-COL: CLASS MONITOR & NOTICES */}
        <div className="flex flex-col gap-5">
          {/* Class Teacher Card */}
          <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] rounded-3xl p-5 text-white shadow-lg border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-yellow-400/20 text-yellow-400">
                  <FaChalkboardTeacher size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                  Class Monitor Role
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {myClass ? (
              <div>
                <h3 className="text-xl font-black text-white">
                  {teacherName}
                </h3>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs font-black text-yellow-300 bg-yellow-400/15 px-2.5 py-0.5 rounded-lg border border-yellow-400/20">
                    Class Teacher · {myClass.grade?.toLowerCase().startsWith('class') ? myClass.grade : `Class ${myClass.grade}`} {myClass.section ? `(${myClass.section})` : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  You are officially designated as the Class Teacher for {myClass.grade?.toLowerCase().startsWith('class') ? myClass.grade : `Class ${myClass.grade}`} {myClass.section ? `(${myClass.section})` : ''}.
                </p>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Class Strength</span>
                    <span className="text-base font-black text-white">{stats.studentCount} Students</span>
                  </div>
                  <Link
                    to="/teacher/attendance"
                    className="px-3.5 py-2 rounded-xl bg-[#8f0631] hover:bg-[#750426] text-white text-xs font-extrabold transition shadow-md active:scale-95"
                  >
                    Take Attendance
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-black text-white">
                  {teacherName}
                </h3>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                    Subject Faculty
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  You are currently active as a Subject Teacher across assigned classes.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <Link
                    to="/teacher/attendance"
                    className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                  >
                    <FaClipboardCheck size={12} /> View Attendance Desk
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default TeacherDashboard;