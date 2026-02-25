import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    FaHome, FaClipboardCheck, FaSignOutAlt, FaUniversity, FaTimes,
    FaBookOpen, FaCalendarDay, FaStar
} from 'react-icons/fa';

const TeacherSidebar = ({ isOpen, toggleSidebar }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const isActive = (path) => location.pathname === path;

    // Helper to close sidebar on mobile when a link is clicked
    const handleLinkClick = () => {
        if (window.innerWidth < 1024) { // 1024px is the 'lg' breakpoint
            toggleSidebar();
        }
    };

    return (
        <>
            {/* 🔹 MOBILE OVERLAY (Click outside to close) */}
            <div
                className={`fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={toggleSidebar}
            ></div>

            {/* 🔹 SIDEBAR CONTAINER */}
            <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-white shadow-2xl overflow-hidden flex flex-col
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

                {/* 🔹 LOGO AREA */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-600 p-2 rounded-lg shadow-lg">
                            <FaUniversity className="text-xl text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-wide">Radhe Shyam</h1>
                            <p className="text-xs text-orange-400 font-medium">Faculty Portal</p>
                        </div>
                    </div>

                    {/* Close Button (Mobile Only) */}
                    <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white p-2">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* 🔹 NAVIGATION LINKS */}
                <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-2 custom-scrollbar">

                    <Link
                        to="/teacher/dashboard"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive('/teacher/dashboard')
                            ? 'bg-orange-600 text-white shadow-lg'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <FaHome /> <span className="font-medium">Dashboard</span>
                    </Link>

                    <Link
                        to="/teacher/attendance"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive('/teacher/attendance')
                            ? 'bg-amber-500 text-white shadow-lg'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <FaClipboardCheck /> <span className="font-medium">Mark Attendance</span>
                    </Link>

                    <Link
                        to="/teacher/lesson-plan"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive('/teacher/lesson-plan')
                            ? 'bg-amber-500 text-white shadow-lg'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <FaBookOpen /> <span className="font-medium">Lesson Plan</span>
                    </Link>

                    <Link
                        to="/teacher/leave"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive('/teacher/leave')
                            ? 'bg-amber-500 text-white shadow-lg'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <FaCalendarDay /> <span className="font-medium">Apply Leave</span>
                    </Link>

                    <Link
                        to="/teacher/marks"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive('/teacher/marks')
                            ? 'bg-amber-500 text-white shadow-lg'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <FaStar /> <span className="font-medium">Submit Marks</span>
                    </Link>

                </nav>

                {/* 🔹 LOGOUT */}
                <div className="p-4 border-t border-slate-800 shrink-0">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-slate-800 hover:bg-red-600 transition-colors text-slate-400 hover:text-white font-bold tracking-wide"
                    >
                        <FaSignOutAlt /> <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default TeacherSidebar;
