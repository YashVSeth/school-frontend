import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FaUserCheck, FaBookOpen, FaCalendarDay, FaStar,
  FaMapMarkerAlt, FaExclamationCircle
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

  // 3. Profile State
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL;

  // 🔄 Data Fetching
  const fetchDashboardData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // A. Fetch Teacher Identity/Profile (Most Important)
    const profileRes = await axios.get(`${BASE_URL}/api/teachers/my-profile`, { headers }).catch(e => {
      console.error("Profile Fetch Error:", e);
      return null;
    });
    if (profileRes?.data) setProfile(profileRes.data);

    // B. Fetch Student Stats
    const statsRes = await axios.get(`${BASE_URL}/api/attendance/my-students`, { headers }).catch(e => {
      console.error("Stats Fetch Error (Expected for new teachers):", e.response?.data?.message || e.message);
      return null;
    });
    if (statsRes?.data) {
      setStats({
        studentCount: statsRes.data.students ? statsRes.data.students.length : 0,
        presence: 98, // Mocking to match screenshot "98%"
      });
    }

    // C. Fetch Schedule & Class Teacher Info
    const scheduleRes = await axios.get(`${BASE_URL}/api/teachers/my-schedule`, { headers }).catch(e => {
      console.error("Schedule Fetch Error:", e.response?.data?.message || e.message);
      return null;
    });
    if (scheduleRes?.data) {
      setMyClass(scheduleRes.data.classTeacher || null);
      setSchedule(scheduleRes.data.schedule || []);
    }


    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <div className="text-center mt-10 text-slate-400 font-bold">Loading Portal...</div>;

  return (
    <div className="font-sans flex flex-col gap-6 px-1">

      {/* 🔴 OVERLAPPING PROFILE HEADER CARD */}
      <div className="bg-[#8b0025] rounded-[24px] shadow-xl p-5 border border-white/10 relative overflow-hidden z-10 w-full mt-2">
        {/* Top: Avatar & Name */}
        <div className="flex items-center gap-4 mb-5">

          {/* Avatar Box (Gold border based on mockup) */}
          <div className="w-16 h-16 rounded-[14px] border-[3px] border-yellow-400 overflow-hidden bg-slate-200 shrink-0 shadow-inner">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#ab0035] text-white font-bold text-xl">
                {profile?.fullName?.charAt(0) || 'T'}
              </div>
            )}
          </div>

          {/* Name Details */}
          <div className="flex flex-col text-white">
            <span className="text-yellow-400 font-semibold text-[11px] tracking-wide uppercase">Namaste,</span>
            <h2 className="text-lg font-bold leading-tight drop-shadow-sm">{profile?.fullName || 'Prof. Jitendra Dev'}</h2>
            <p className="text-[10px] text-white/80 mt-0.5">Dept. of {profile?.specialization || 'Mathematics'} • RSSS-402</p>
          </div>
        </div>

        {/* Bottom: 3 Stats Columns inside slightly lighter container wrapper */}
        <div className="bg-[#780020] rounded-[16px] py-3 px-4 flex justify-between items-center w-full">

          <div className="flex flex-col items-center flex-1">
            <span className="text-yellow-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">Attendance</span>
            <span className="text-white font-extrabold text-sm">{stats.presence}%</span>
          </div>

          <div className="w-px h-8 bg-white/10"></div>

          <div className="flex flex-col items-center flex-1">
            <span className="text-yellow-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">Classes</span>
            <span className="text-white font-extrabold text-sm">{schedule.length.toString().padStart(2, '0')}/06</span>
          </div>

          <div className="w-px h-8 bg-white/10"></div>

          <div className="flex flex-col items-center flex-1">
            <span className="text-yellow-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">Status</span>
            <span className="text-[#34d399] font-extrabold text-sm">{profile?.status || 'Active'}</span>
          </div>
        </div>
      </div>

      {/* 🖥️ DESKTOP 1-COLUMN (Schedule Only) */}
      <div className="grid grid-cols-1 gap-6 lg:gap-8 items-start">

        {/* 👉 MAIN SCHEDULE */}
        <div className="flex flex-col gap-6">
          {/* 📅 TODAY'S SCHEDULE (TIMELINE LIST) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-[#ab0035] rounded-full"></div>
                <h3 className="font-bold text-slate-800 text-lg">Today's Schedule</h3>
              </div>
              <button onClick={() => navigate('/teacher/schedule')} className="text-[#ab0035] font-bold text-xs uppercase tracking-wide">View All</button>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-50 flex flex-col gap-4">

              {schedule.length > 0 ? (
                schedule.map((cls, index) => {
                  // Create sequential mock times for UI visual purposes based on array index
                  const hour = 9 + Math.floor(index * 1.5);
                  const isAM = hour < 12;
                  const displayHour = hour > 12 ? hour - 12 : hour;
                  const displayTime = `${displayHour < 10 ? '0' : ''}${displayHour}:00`;

                  return (
                    <React.Fragment key={cls._id}>
                      <div className={`flex items-center gap-4 ${index > 0 ? 'opacity-80' : ''}`}>
                        {/* Left: Time Column */}
                        <div className="flex flex-col items-center justify-center min-w-[60px]">
                          <span className={`font-black text-lg leading-none ${index === 0 ? 'text-[#ab0035]' : 'text-slate-400'}`}>{displayTime}</span>
                          <span className="text-slate-400 text-[10px] font-bold uppercase mt-1">{isAM ? 'AM' : 'PM'}</span>
                        </div>

                        {/* Divider Line */}
                        <div className="w-px h-10 bg-slate-200"></div>

                        {/* Right: Class Core Info */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className={`font-bold text-sm ${index === 0 ? 'text-slate-800' : 'text-slate-700'}`}>
                              {cls.subjects && cls.subjects.length > 0 ? cls.subjects.join(', ') : 'Assigned Class'} - {cls.grade} ({cls.section})
                            </h4>
                            {index === 0 && (
                              <span className="bg-red-50 text-[#ab0035] text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-100">Next</span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-1 font-medium">
                            <FaMapMarkerAlt className="text-slate-300 text-[10px]" /> Main Building
                          </p>
                        </div>
                      </div>

                      {/* Separator if not the last item */}
                      {index < schedule.length - 1 && (
                        <hr className="border-slate-50 mx-2" />
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <div className="text-center p-4 text-sm text-slate-500 font-medium">
                  No classes assigned to your schedule yet.
                </div>
              )}

            </div>
          </div>
        </div> {/* END RIGHT COLUMN */}

      </div> {/* END DESKTOP GRID */}

    </div>
  );
};

export default TeacherDashboard;