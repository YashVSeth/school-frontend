import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FaUserCheck, FaUsers, FaCalendarAlt, FaClock, 
  FaBullhorn, FaBirthdayCake, FaChartBar, FaSync,
  FaSignOutAlt, FaChalkboardTeacher, FaUserTie, FaBookOpen 
} from 'react-icons/fa';

const TeacherDashboard = () => {
  // 1. Stats State (Old)
  const [stats, setStats] = useState({
    studentCount: 0,
    presence: 0,
  });
  
  // 2. New Schedule States (New)
  const [myClass, setMyClass] = useState(null); // Monitor Class
  const [schedule, setSchedule] = useState([]); // Subject Classes
  
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL;

  // 🕒 Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔄 Data Fetching
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // A. Fetch Student Stats
      const statsRes = await axios.get(`${BASE_URL}/api/attendance/my-students`, { headers });
      if (statsRes.data) {
        setStats({
          studentCount: statsRes.data.students ? statsRes.data.students.length : 0,
          presence: 85, 
        });
      }

      // B. ✅ Fetch Schedule & Class Teacher Info
      const scheduleRes = await axios.get(`${BASE_URL}/api/teachers/my-schedule`, { headers });
      if (scheduleRes.data) {
        setMyClass(scheduleRes.data.classTeacher);
        setSchedule(scheduleRes.data.schedule);
      }

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Logout Function
  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (confirmLogout) {
      localStorage.clear();
      navigate('/login');
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans animate-fade-in">
      
      {/* 🌟 Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 md:p-8 rounded-3xl text-white shadow-xl mb-8 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

        <div className="z-10 w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
            Namaste, Teacher ji <span className="animate-pulse">🙏</span>
          </h1>
          
          {/* ✅ UPDATED: Class Teacher Info */}
          <p className="opacity-90 text-lg flex items-center gap-2 mt-2">
            <FaUserTie /> Class Teacher: 
            <span className="font-bold bg-white/20 px-3 py-1 rounded-lg border border-white/30">
              {myClass ? `Class ${myClass.grade} - ${myClass.section}` : "Not Assigned"}
            </span>
          </p>
        </div>
        
        <div className="mt-6 md:mt-0 z-10 flex flex-col md:items-end gap-3 w-full md:w-auto">
          <button onClick={handleLogout} className="self-end bg-red-500/20 hover:bg-red-500/40 text-white px-4 py-2 rounded-full backdrop-blur-md border border-red-200/30 transition-all flex items-center gap-2 text-sm font-bold shadow-lg">
            <FaSignOutAlt /> Logout
          </button>

          <div className="text-right bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20 min-w-[200px]">
            <p className="text-sm font-medium opacity-90 flex items-center gap-2 justify-end">
               <FaCalendarAlt /> {currentDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
            <p className="text-3xl font-bold flex items-center gap-2 justify-end tracking-wider">
               <FaClock className="text-sm" /> {currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* 📊 Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Total Students</h3>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:scale-110 transition-transform"><FaUsers size={20}/></div>
          </div>
          <p className="text-4xl font-extrabold text-slate-800">{loading ? "..." : stats.studentCount}</p>
          <p className="text-xs text-slate-400 mt-2 font-medium">Registered in DB</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Avg. Attendance</h3>
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl group-hover:scale-110 transition-transform"><FaChartBar size={20}/></div>
          </div>
          <p className="text-4xl font-extrabold text-emerald-500">{loading ? "..." : stats.presence}%</p>
          <p className="text-xs text-slate-400 mt-2 font-medium">Last 7 Days Average</p>
        </div>

        {/* Card 3: Quick Actions */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center gap-3">
            <div className="flex justify-between items-center">
                <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Quick Actions</h3>
                <button onClick={fetchDashboardData} className="text-slate-400 hover:text-indigo-600 transition"><FaSync/></button>
            </div>
          <button onClick={() => navigate('/teacher/attendance')} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-indigo-200 shadow-lg">
            <FaUserCheck /> Mark Attendance
          </button>
          <button onClick={() => navigate('/teacher/students')} className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-200 transition border border-slate-200">
            View Student List
          </button>
        </div>
      </div>

      {/* ✅ NEW SECTION: My Teaching Schedule */}
      <div className="mb-8">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-lg">
            <FaChalkboardTeacher className="text-blue-600"/> My Teaching Schedule
        </h3>
        {schedule.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedule.map((cls) => (
                    <div key={cls._id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="text-xl font-bold text-slate-800">
                                Class {cls.grade} - {cls.section}
                            </h4>
                            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded border border-blue-100">
                                {cls.subjects.length} Subjects
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {cls.subjects.map((sub, idx) => (
                                <span key={idx} className="text-xs font-bold bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1.5">
                                    <FaBookOpen size={10} className="text-blue-400"/> {sub}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center">
                <p className="text-slate-400">You have not been assigned any subjects yet.</p>
            </div>
        )}
      </div>

      {/* 🧩 Lower Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* 📢 Notice Board */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <FaBullhorn className="text-orange-500"/> Notice Board
            </h3>
            <div className="space-y-4">
                <div className="flex gap-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <div className="text-center min-w-[50px]">
                        <p className="text-xs font-bold text-orange-400 uppercase">Feb</p>
                        <p className="text-xl font-bold text-orange-600">12</p>
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 text-sm">Parent Teacher Meeting (PTM)</p>
                        <p className="text-xs text-slate-500 mt-1">Sabhi teachers ko 9:00 AM tak aana anivarya hai.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* 🎂 Birthdays */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <FaBirthdayCake className="text-pink-500"/> Upcoming Birthdays
            </h3>
            <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg">
                No birthdays this week 🎉
            </div>
        </div>

      </div>

    </div>
  );
};

export default TeacherDashboard;