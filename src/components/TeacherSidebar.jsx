import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaHome, FaClipboardCheck, FaSignOutAlt, FaUniversity, FaTimes,
  FaCalendarDay, FaAward, FaUserCircle, FaShieldAlt
} from 'react-icons/fa';

const TeacherSidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState({ name: 'Faculty Member', role: 'Teacher', photo: '' });

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setTeacher({
          name: u.fullName || u.name || 'Faculty Member',
          role: u.specialization ? `Dept. of ${u.specialization}` : (u.role || 'Teacher'),
          photo: u.photoUrl || u.photo || ''
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      localStorage.clear();
      navigate('/');
    }
  };

  const isActive = (path) => {
    if (path === '/teacher/dashboard') {
      return location.pathname === '/teacher/dashboard' || location.pathname === '/teacher';
    }
    return location.pathname.startsWith(path);
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  const navLinks = [
    { to: '/teacher/dashboard', label: 'Dashboard', icon: FaHome },
    { to: '/teacher/attendance', label: 'Class Attendance', icon: FaClipboardCheck },
    { to: '/teacher/marks', label: 'Marks & Grading', icon: FaAward },
    { to: '/teacher/leave', label: 'Apply Leave', icon: FaCalendarDay },
    { to: '/teacher/profile', label: 'Faculty Profile', icon: FaUserCircle },
  ];

  return (
    <>
      {/* 🔹 MOBILE OVERLAY */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs transition-opacity lg:hidden ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={toggleSidebar}
      />

      {/* 🔹 ASIDE SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-72 bg-gradient-to-b from-[#0d1527] via-[#0f172a] to-[#0a0f1d]
          border-r border-slate-800/80 flex flex-col shadow-2xl text-white
          transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/80 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#a81140] via-[#8f0631] to-[#5f031e] p-0.5 shadow-lg shadow-[#8f0631]/30 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#8f0631] flex items-center justify-center text-yellow-300">
                <FaUniversity size={20} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black tracking-tight text-white leading-none">Radhey Shyam</h1>
              </div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block mt-1">
                Faculty Portal
              </span>
            </div>
          </div>

          <button
            onClick={toggleSidebar}
            className="lg:hidden text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition"
            aria-label="Close menu"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Institution Badge */}
        <div className="px-5 pt-4 pb-2">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Portal Mode</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Teacher Desk
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-3 overflow-y-auto space-y-1.5 custom-scrollbar">
          {navLinks.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={handleLinkClick}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 group relative ${
                  active
                    ? 'bg-gradient-to-r from-[#8f0631] via-[#750426] to-[#5f031e] text-white shadow-lg shadow-[#8f0631]/30 font-bold border-l-4 border-yellow-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05] font-medium'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      active
                        ? 'bg-white/20 text-yellow-300'
                        : 'text-slate-400 group-hover:text-yellow-400 group-hover:scale-110'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <span className="text-sm tracking-tight">{item.label}</span>
                </div>

                {active && (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Teacher Profile Footer Card */}
        <div className="p-4 border-t border-slate-800/80 bg-white/[0.01] shrink-0 flex flex-col gap-3">
          <Link
            to="/teacher/profile"
            onClick={handleLinkClick}
            className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/[0.04] transition group border border-transparent hover:border-white/5"
          >
            <div className="w-11 h-11 rounded-xl p-0.5 bg-gradient-to-br from-yellow-400 to-amber-600 shadow shrink-0">
              <div className="w-full h-full rounded-[10px] overflow-hidden bg-slate-900 flex items-center justify-center text-white font-black text-sm">
                {teacher.photo ? (
                  <img src={teacher.photo} alt={teacher.name} className="w-full h-full object-cover" />
                ) : (
                  teacher.name.charAt(0)
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate group-hover:text-yellow-400 transition">
                {teacher.name}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                {teacher.role}
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-red-600/90 text-slate-300 hover:text-white transition-all text-xs font-bold tracking-wide active:scale-98 border border-white/5 hover:border-red-500 shadow-sm"
          >
            <FaSignOutAlt size={13} />
            <span>Sign Out Portal</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default TeacherSidebar;
