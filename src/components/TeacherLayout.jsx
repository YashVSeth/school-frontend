import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';
import TeacherSidebar from './TeacherSidebar';

const TeacherLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherPhoto, setTeacherPhoto] = useState('');
  const [specialization, setSpecialization] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setTeacherName(u.fullName || u.name || 'Teacher');
        setTeacherPhoto(u.photoUrl || u.photo || '');
        setSpecialization(u.specialization || '');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans select-none text-slate-800">
      {/* Desktop / Tablet Sidebar */}
      <TeacherSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">

        {/* 📱 MOBILE TOP APP BAR */}
        <header className="lg:hidden bg-gradient-to-r from-[#6d0525] via-[#8f0631] to-[#750426] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="text-white/90 hover:text-white p-2 rounded-xl bg-white/10 active:scale-95 transition flex items-center justify-center border border-white/10"
              aria-label="Open Navigation Menu"
            >
              <FaBars size={17} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-black text-sm tracking-tight leading-tight">Faculty Portal</span>
              </div>
              <span className="text-[10px] text-rose-200/90 font-extrabold uppercase tracking-widest leading-none mt-0.5">
                Radhey Shyam Sansthaan
              </span>
            </div>
          </div>

          {/* Quick Profile Pill on Mobile Header */}
          <Link
            to="/teacher/profile"
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-full border border-white/20 transition active:scale-95 shadow-sm"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-900 flex items-center justify-center text-xs font-bold text-white">
              {teacherPhoto ? (
                <img src={teacherPhoto} alt="Me" className="w-full h-full object-cover" />
              ) : (
                teacherName?.charAt(0) || 'T'
              )}
            </div>
            <span className="text-xs font-bold text-white max-w-[85px] truncate hidden sm:inline">
              {teacherName.split(' ')[0]}
            </span>
          </Link>
        </header>

        {/* 🖥️ DESKTOP TOP BAR (Subtle breadcrumb/identity strip) */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>Faculty Workspace</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 capitalize font-extrabold">
                {location.pathname.replace('/teacher/', '') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-black text-slate-900 leading-tight">{teacherName}</p>
              <p className="text-[11px] font-semibold text-slate-500">
                {specialization ? `Dept. of ${specialization}` : 'Active Faculty'}
              </p>
            </div>
            <Link
              to="/teacher/profile"
              className="w-9 h-9 rounded-xl p-0.5 bg-slate-200 hover:bg-slate-300 shadow hover:scale-105 transition"
            >
              <div className="w-full h-full rounded-[10px] overflow-hidden bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                {teacherPhoto ? (
                  <img src={teacherPhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  teacherName?.charAt(0) || 'T'
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* 📄 SCROLLABLE PAGE VIEWPORT */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full custom-scrollbar relative px-3 py-4 lg:p-8 pb-10">
          {/* Subtle Maroon Top Accent Gradient on Large screens */}
          <div className="hidden lg:block absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#8f0631]/10 via-[#750426]/5 to-transparent -z-10 pointer-events-none" />

          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
