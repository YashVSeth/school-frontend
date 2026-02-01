import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaHome, FaChalkboardTeacher, FaUserGraduate, FaClipboardList, 
  FaSignOutAlt, FaChevronDown, FaChevronRight, FaPlus, FaList, FaUniversity 
} from 'react-icons/fa';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showStudentMenu, setShowStudentMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/'); 
  };

  const isActive = (path) => location.pathname === path;
  const isStudentSection = location.pathname.includes('/students');

  return (
    <aside className="bg-slate-900 text-white h-screen w-64 fixed left-0 top-0 flex flex-col shadow-2xl z-50 overflow-hidden">
      
      {/* 🔹 LOGO AREA */}
      <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
          <FaUniversity className="text-xl text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-wide">EduManager</h1>
          <p className="text-xs text-slate-400 font-medium">Admin Portal</p>
        </div>
      </div>

      {/* 🔹 NAVIGATION LINKS */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-2">
        
        <Link 
          to="/admin/dashboard" 
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            isActive('/admin/dashboard') 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FaHome /> <span className="font-medium">Dashboard</span>
        </Link>

        <Link 
          to="/admin/classes" 
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            isActive('/admin/classes') 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FaChalkboardTeacher /> <span className="font-medium">Classes</span>
        </Link>

        {/* Students Dropdown */}
        <div className="space-y-1">
          <button 
            onClick={() => setShowStudentMenu(!showStudentMenu)}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
              isStudentSection ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <FaUserGraduate className={isStudentSection ? 'text-blue-400' : ''} /> 
              <span className="font-medium">Students</span>
            </div>
            {showStudentMenu || isStudentSection ? <FaChevronDown className="text-xs" /> : <FaChevronRight className="text-xs" />}
          </button>

          {(showStudentMenu || isStudentSection) && (
            <div className="ml-4 pl-4 border-l-2 border-slate-700 space-y-1 mt-1">
              <Link to="/admin/students/add" className={`block p-2 text-sm rounded ${isActive('/admin/students/add') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                Add Student
              </Link>
              <Link to="/admin/students/list" className={`block p-2 text-sm rounded ${isActive('/admin/students/list') ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                Class List
              </Link>
            </div>
          )}
        </div>

        <Link 
          to="/admin/attendance" 
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            isActive('/admin/attendance') 
              ? 'bg-emerald-600 text-white shadow-lg' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FaClipboardList /> <span className="font-medium">Attendance</span>
        </Link>
        {/* Replace the grayed-out Teacher div with this link */}
<Link 
  to="/admin/teachers" 
  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
    isActive('/admin/teachers') 
      ? 'bg-gradient-to-r from-orange-500 to-orange-400 shadow-lg text-white' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
  }`}
>
  <FaChalkboardTeacher /> 
  <span className="font-medium">Teachers</span>
</Link>
      </nav>

      {/* 🔹 LOGOUT */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout} 
          className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-slate-800 hover:bg-red-600 transition-colors text-slate-400 hover:text-white"
        >
          <FaSignOutAlt /> <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;