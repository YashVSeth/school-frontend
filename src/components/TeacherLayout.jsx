import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaHome, FaCalendarAlt, FaUsers, FaUser } from 'react-icons/fa';
import TeacherSidebar from './TeacherSidebar';

const TeacherLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">

            {/* Teacher Specific Sidebar */}
            <TeacherSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">

                {/* Mobile Header (Only visible on small screens to un-collapse sidebar) */}
                <header className="lg:hidden bg-[#ab0035] text-white border-b border-white/10 p-4 flex items-center justify-between shrink-0 shadow-md z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={toggleSidebar} className="text-white hover:text-yellow-400 p-2.5 rounded-lg hover:bg-white/10 transition border border-transparent hover:border-white/20 flex items-center justify-center">
                            <FaBars size={20} />
                        </button>
                        <div className="flex flex-col">
                            <span className="font-extrabold text-sm sm:text-base tracking-tight leading-tight">Faculty Portal</span>
                            <span className="text-[10px] sm:text-xs text-yellow-400 font-bold uppercase tracking-widest leading-none">Radhe Shyam</span>
                        </div>
                    </div>
                </header>

                {/* Scrollable Page Content (Dashboard/Attendance Render Here) */}
                {/* We keep the maroon background block from the App design behind the top content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto w-full custom-scrollbar relative p-4 lg:p-8">
                    <div className="absolute top-0 left-0 right-0 h-48 bg-[#ab0035] lg:rounded-b-[40px] rounded-b-3xl -z-10 shadow-inner"></div>
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>

            </div>

            {/* ⬜ FIXED BOTTOM TAB BAR (MOBILE ONLY) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 z-50 flex justify-around items-center px-2 sm:px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] shrink-0">
                <Link to="/teacher/dashboard" className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive('/teacher/dashboard') ? 'text-[#ab0035]' : 'text-slate-400 hover:text-slate-600'}`}>
                    <FaHome size={20} className={isActive('/teacher/dashboard') ? 'scale-110 transition-transform' : ''} />
                    <span className="text-[10px] font-bold">Home</span>
                </Link>

                <Link to="/teacher/schedule" className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive('/teacher/schedule') ? 'text-[#ab0035]' : 'text-slate-400 hover:text-slate-600'}`}>
                    <FaCalendarAlt size={18} className={isActive('/teacher/schedule') ? 'scale-110 transition-transform' : ''} />
                    <span className="text-[10px] font-bold">Schedule</span>
                </Link>

                <Link to="/teacher/students" className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive('/teacher/students') ? 'text-[#ab0035]' : 'text-slate-400 hover:text-slate-600'}`}>
                    <FaUsers size={20} className={isActive('/teacher/students') ? 'scale-110 transition-transform' : ''} />
                    <span className="text-[10px] font-bold">Students</span>
                </Link>

                <Link to="/teacher/profile" className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive('/teacher/profile') ? 'text-[#ab0035]' : 'text-slate-400 hover:text-slate-600'}`}>
                    <FaUser size={18} className={isActive('/teacher/profile') ? 'scale-110 transition-transform' : ''} />
                    <span className="text-[10px] font-bold">Profile</span>
                </Link>
            </nav>

        </div>
    );
};

export default TeacherLayout;
