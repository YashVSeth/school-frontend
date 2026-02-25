import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import {
  FaUserGraduate, FaChalkboard, FaWallet, FaMoneyBillWave,
  FaPlus, FaTrash, FaTimes, FaChevronDown
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = ['9:00 AM', '10:30 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:30 PM'];
const COLORS = [
  { label: 'Blue', value: '#4285F4' },
  { label: 'Green', value: '#34A853' },
  { label: 'Orange', value: '#F2994A' },
  { label: 'Purple', value: '#A158D3' },
  { label: 'Red', value: '#EA4335' }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const BASE_URL = import.meta.env.VITE_API_URL;

  // Stats & Database Lists State
  const [stats, setStats] = useState({ students: 0, classes: 0, teachers: 0, totalFinance: 0, totalCollected: 0 });
  const [classesList, setClassesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [dashboardWidgets, setDashboardWidgets] = useState({ pendingActions: [], substitutions: [] });

  // Schedule State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [scheduleData, setScheduleData] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);

  // Modal States
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showModal, setShowModal] = useState(false); // For adding a new subject
  const [newEntry, setNewEntry] = useState({ day: 'Monday', timeSlot: '9:00 AM', subject: '', color: '#4285F4' });

  // Substitute Teacher Modal State
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [substituteTeacherId, setSubstituteTeacherId] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClassId) fetchSchedule();
  }, [selectedClassId]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [studentRes, classRes, teacherRes, globalStatsRes, subjectRes, widgetRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/students`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/classes`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/teachers`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/fees/global-stats`, { headers }).catch(() => ({ data: {} })),
        axios.get(`${BASE_URL}/api/subjects`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/dashboard/widgets`, { headers }).catch(() => ({ data: { pendingActions: [], substitutions: [] } }))
      ]);

      const fetchedClasses = classRes.data?.classes || classRes.data || [];
      setClassesList(fetchedClasses);
      if (fetchedClasses.length > 0) setSelectedClassId(fetchedClasses[0]._id);

      const fetchedSubjects = subjectRes.data?.subjects || subjectRes.data || [];
      setSubjectsList(fetchedSubjects);

      const fetchedTeachers = teacherRes.data?.teachers || teacherRes.data || [];
      setTeachersList(fetchedTeachers);

      setDashboardWidgets(widgetRes.data || { pendingActions: [], substitutions: [] });

      setStats({
        students: studentRes.data?.students?.length || studentRes.data?.length || 0,
        classes: fetchedClasses.length || 0,
        teachers: fetchedTeachers.length || 0,
        totalFinance: globalStatsRes.data?.pendingDues || 0,
        totalCollected: globalStatsRes.data?.totalCollected || 0,
      });

    } catch (error) {
      console.error("Error fetching initial data", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/schedule/${selectedClassId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScheduleData(res.data);
    } catch (error) {
      console.error("Failed to fetch schedule");
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!newEntry.subject || newEntry.subject.trim() === '') return toast.error("Please select a Subject");

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/api/schedule`, { ...newEntry, classId: selectedClassId }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Class added to schedule!");
      setShowModal(false);
      setNewEntry({ ...newEntry, subject: '' });
      fetchSchedule();
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to add class";
      toast.error(errorMsg);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm("Delete this class from the schedule?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE_URL}/api/schedule/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Class removed!");
      fetchSchedule();
    } catch (error) {
      toast.error("Failed to delete class");
    }
  };

  const getTeacherForSubject = (subjectName) => {
    if (!subjectName || !selectedClassId) return "TBD";

    // 1. Find the current class context
    const currentClassObj = classesList.find(c => c._id === selectedClassId);
    if (!currentClassObj || !currentClassObj.subjects) return "TBD";

    // 2. Search for the subject inside this class specifically
    const classSubjectEntry = currentClassObj.subjects.find(subObj => {
      // Handle if subObj is just an ID string vs populated { subject: {...}, teacher: {...} }
      const actualSub = subObj.subject;
      if (!actualSub) return false;

      let sName = "";
      if (typeof actualSub === 'string') {
        const foundSub = subjectsList.find(s => s._id === actualSub);
        if (foundSub) sName = foundSub.name || foundSub.subject;
      } else {
        sName = actualSub.name || actualSub.subject || actualSub.subjectName;
      }

      return sName && sName.toLowerCase().trim() === subjectName.toLowerCase().trim();
    });

    // 3. Extract the class-specific teacher if found
    let teacherData = classSubjectEntry?.teacher || null;

    if (teacherData) {
      if (typeof teacherData === 'string') {
        const foundTeacher = teachersList.find(t => t._id === teacherData);
        if (foundTeacher) return foundTeacher.fullName || foundTeacher.name || (foundTeacher.firstName ? `${foundTeacher.firstName} ${foundTeacher.lastName || ''}` : "Teacher");
        return "TBD";
      }
      return teacherData.fullName || teacherData.name || (teacherData.firstName ? `${teacherData.firstName} ${teacherData.lastName || ''}` : "TBD");
    }

    // 4. Fallback (Optional): if no class-specific teacher, use global substitute
    const globalSub = subjectsList.find(s =>
      (s.name && s.name.toLowerCase() === subjectName.toLowerCase().trim())
    );
    let globalTeacherData = globalSub?.teacher || null;
    if (globalTeacherData) {
      if (typeof globalTeacherData === 'string') {
        const found = teachersList.find(t => t._id === globalTeacherData);
        if (found) return found.fullName || found.name || (found.firstName ? `${found.firstName} ${found.lastName || ''}` : "Teacher");
        return "TBD";
      }
      return globalTeacherData.fullName || globalTeacherData.name || (globalTeacherData.firstName ? `${globalTeacherData.firstName} ${globalTeacherData.lastName || ''}` : "TBD");
    }

    return "TBD";
  };

  // ✅ SAFELY GET SUBJECTS FOR DROPDOWN
  const currentClassObj = classesList.find(c => c._id === selectedClassId);
  let dropdownSubjects = subjectsList; // Default to all subjects

  if (currentClassObj && currentClassObj.subjects?.length > 0) {
    // If class has specific subjects, map them safely from { subject: {...}, teacher: {...} }
    dropdownSubjects = currentClassObj.subjects.map(classSub => {
      let rawSubject = classSub.subject;
      if (!rawSubject) return null;

      if (typeof rawSubject === 'string') {
        // If it's a raw DB ID, find the real subject object
        const found = subjectsList.find(s => s._id === rawSubject);
        return found || { _id: rawSubject, name: `Unknown (${rawSubject.slice(-4)})` };
      }
      return rawSubject;
    }).filter(Boolean); // Filter out any nulls
  }

  return (
    <Layout>
      <div className="space-y-8 pb-10 font-sans">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Radhey Shyam Sansthaan</h1>
            <p className="text-slate-500 font-medium mt-1">Academic Session 2026-27 | Admin Insights</p>
          </div>
          <div className="mt-4 sm:mt-0 bg-red-50 text-red-700 px-4 py-2 rounded-xl border border-red-100 text-sm font-bold shadow-sm">
            📅 {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* --- TOP STATS HEADER --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Students" value={stats.students} icon={<FaUserGraduate />} color="text-red-600" bgColor="bg-red-50" trend="+12%" />
          <StatCard title="Daily Attendance" value={`94%`} subText="Staff: 98%" icon={<FaChalkboard />} color="text-amber-600" bgColor="bg-amber-50" />
          <StatCard title="Fees Collected" value={`₹${(stats.totalCollected / 1000).toFixed(1)}K`} subText="Today" icon={<FaWallet />} color="text-amber-500" bgColor="bg-amber-50" />
          <StatCard title="Inventory Alerts" value={`08`} subText="Critical" subTextColor="text-rose-500" icon={<FaMoneyBillWave />} color="text-rose-500" bgColor="bg-rose-50" />
        </div>

        {/* --- MAIN 2-COLUMN LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

          {/* LEFT COLUMN: PENDING ACTIONS */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span className="text-rose-500 bg-rose-100 p-1.5 rounded-lg">
                  <FaTimes size={12} /> {/* Using an alert/exclamation stand-in */}
                </span>
                Pending Actions
              </h2>
              <button className="text-sm font-bold text-rose-500 hover:text-rose-600">View All Tasks</button>
            </div>

            {/* List Array from Backend */}
            {dashboardWidgets.pendingActions && dashboardWidgets.pendingActions.length > 0 ? (
              dashboardWidgets.pendingActions.map((action, idx) => {
                // Decide colors styling based on type
                let borderCol = "bg-slate-500", iconBg = "bg-slate-100 text-slate-600", badgeBg = "bg-slate-100 text-slate-700", iconOrText = action.iconText || <FaTimes />;

                if (action.type === 'LEAVE') {
                  borderCol = "bg-red-500"; iconBg = "bg-slate-600 text-white"; badgeBg = "bg-red-100 text-red-700";
                }
                else if (action.type === 'FEE') {
                  borderCol = "bg-amber-400"; iconBg = "bg-amber-100 text-amber-600"; badgeBg = "bg-amber-100 text-amber-700";
                  iconOrText = <FaWallet />;
                }
                else if (action.type === 'INVENTORY') {
                  borderCol = "bg-rose-400"; iconBg = "bg-rose-100 text-rose-500"; badgeBg = "bg-rose-100 text-rose-700";
                  iconOrText = <FaChalkboard />;
                }

                return (
                  <div key={action.id || idx} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center relative overflow-hidden group hover:shadow-md transition-all">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${borderCol} rounded-l-2xl`}></div>
                    <div className="flex items-center gap-4 pl-2">
                      <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center shrink-0 text-xl font-bold`}>
                        {iconOrText}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{action.title}</h3>
                        <p className="text-sm text-slate-500 font-medium">{action.subtitle}</p>
                        <div className="mt-3 flex gap-2">
                          <button className="px-5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-colors">Action</button>
                          <button className="px-5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors">Dismiss</button>
                        </div>
                      </div>
                    </div>
                    <span className={`${badgeBg} px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider md:self-start`}>
                      {action.type || 'Task'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-500 font-bold">
                No pending actions currently require your attention. You're all caught up! 🎉
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">

            {/* Substitution Board */}
            <div>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <span className="text-rose-700">
                    <FaUserGraduate size={20} />
                  </span>
                  <div>
                    <span className="block">Teacher</span>
                    <span className="block">Substitution Board</span>
                  </div>
                </h2>
                <span className="bg-yellow-100 text-yellow-800 text-[10px] font-black uppercase px-2 py-1 rounded">Live Updates</span>
              </div>

              <div className="space-y-3">
                {dashboardWidgets.substitutions && dashboardWidgets.substitutions.length > 0 ? (
                  dashboardWidgets.substitutions.map((sub, idx) => (
                    <div key={sub.id || idx} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex gap-2 text-xs font-bold text-slate-500">
                          <span className="bg-rose-50 text-rose-700 px-2 rounded-sm py-0.5">{sub.period}</span>
                          <span>{sub.className}</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Confirmed</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Subject</span>
                          <span className="font-bold text-slate-800">{sub.subject}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Substitute</span>
                          <span className="font-bold text-rose-600">{sub.substituteName}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 text-center text-slate-400 text-sm font-bold">
                    No active substitutions.
                  </div>
                )}
              </div>

              <button className="w-full mt-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-rose-700 font-bold text-sm rounded-xl transition-colors border border-amber-100">
                Manage All Substitutions
              </button>
            </div>

            {/* Today's Schedule Block */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <span className="text-rose-700"><FaMoneyBillWave size={18} /></span>
                  Today's Schedule
                </h2>
                <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-2 py-1 rounded">Current Day</span>
              </div>

              <div className="bg-rose-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-700 rounded-full blur-2xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>

                <div className="space-y-4 relative z-10 font-medium max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {scheduleData.filter(s => s.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })).length > 0 ? (
                    scheduleData
                      .filter(s => s.day === new Date().toLocaleDateString('en-US', { weekday: 'long' }))
                      // Sort by timeSlot naively (assuming sequential entry or basic AM/PM string sort)
                      // A more robust app would parse the times into actual Date objects for sorting
                      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                      .map((evt, idx) => (
                        <div key={evt._id || idx} className="flex items-center gap-4 pb-4 border-b border-rose-700/50 last:border-0 last:pb-0">
                          <span className="text-rose-200 font-black w-16 text-xs">{evt.timeSlot}</span>
                          <span className="font-bold text-sm">{evt.subject}</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-sm font-bold opacity-80 italic text-center py-4">
                      {selectedClassId ? "No classes scheduled for today." : "Select a class to view today's schedule."}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  if (classesList.length > 0 && !selectedClassId) {
                    setSelectedClassId(classesList[0]._id);
                  }
                  setShowTimetableModal(true);
                }}
                className="w-full mt-4 py-4 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                <FaChalkboard className="relative z-10" />
                <span className="relative z-10 tracking-wide">View Full Timetable</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* --- TIMETABLE MODAL --- */}
      {
        showTimetableModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-fade-in flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                  <FaChalkboard className="text-red-600" />
                  Class Timetable Management
                </h3>
                <button onClick={() => setShowTimetableModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-slate-800">Select Class Curriculum</h2>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                    >
                      <option value="" disabled>Select a Class</option>
                      {classesList.map(c => (
                        <option key={c._id} value={c._id}>Class {c.grade}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`px-4 py-2 font-bold rounded-xl flex items-center gap-2 transition-all ${isEditMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                      {isEditMode ? 'Done Editing' : 'Edit Schedule'}
                    </button>
                    {isEditMode && (
                      <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-500/20 flex items-center gap-2">
                        <FaPlus /> Add Subject Let
                      </button>
                    )}
                  </div>
                </div>

                {/* TIMETABLE GRID */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                    <div className="p-4 font-black text-slate-400 text-xs uppercase tracking-wider border-r border-slate-100 text-center">Time \ Day</div>
                    {DAYS.map(day => (
                      <div key={day} className="p-4 font-black text-slate-700 text-sm text-center border-r last:border-0 border-slate-100">{day}</div>
                    ))}
                  </div>

                  {TIME_SLOTS.map(time => (
                    <div key={time} className="grid grid-cols-7 border-b last:border-0 border-slate-50">
                      <div className="p-4 border-r border-slate-100 flex items-center justify-center">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide">{time}</span>
                      </div>

                      {DAYS.map(day => {
                        const lessons = scheduleData.filter(s => s.day === day && s.timeSlot === time);
                        return (
                          <div key={`${day}-${time}`} className="p-3 border-r last:border-0 border-slate-100 min-h-[120px] bg-white group hover:bg-slate-50 transition-colors relative">
                            {lessons.length > 0 ? (
                              lessons.map(lesson => {
                                const defaultTeacher = getTeacherForSubject(lesson.subject);
                                const hasSub = lesson.substituteTeacher && lesson.substituteTeacher !== null;
                                let subName = "";
                                if (hasSub) {
                                  subName = typeof lesson.substituteTeacher === 'object'
                                    ? (lesson.substituteTeacher.fullName || lesson.substituteTeacher.firstName + ' ' + lesson.substituteTeacher.lastName)
                                    : teachersList.find(t => t._id === lesson.substituteTeacher)?.fullName || 'Unknown';
                                }

                                return (
                                  <div key={lesson._id} className="relative mb-2 rounded-xl p-3 shadow-sm border border-black/5 flex flex-col justify-between h-full min-h-[90px] group/card transition-all hover:shadow-md" style={{ backgroundColor: lesson.color || '#4285F4', color: '#fff' }}>
                                    <div>
                                      <div className="font-black text-sm drop-shadow-sm pr-6 leading-tight mb-1">{lesson.subject}</div>
                                      {hasSub ? (
                                        <div className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm inline-block mb-1">
                                          <span className="line-through opacity-60 mr-1">{defaultTeacher}</span>
                                          <span className="text-yellow-200">{subName}</span>
                                        </div>
                                      ) : (
                                        <div className="text-[10px] font-bold opacity-90 truncate drop-shadow-sm flex items-center gap-1">
                                          <FaChalkboard size={10} className="opacity-70" /> {defaultTeacher}
                                        </div>
                                      )}
                                    </div>

                                    {isEditMode && (
                                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        <button onClick={() => {
                                          setSelectedScheduleId(lesson._id);
                                          setSubstituteTeacherId(hasSub ? (lesson.substituteTeacher._id || lesson.substituteTeacher) : '');
                                          setShowSubModal(true);
                                        }} className="w-6 h-6 bg-white/20 hover:bg-white/40 text-white rounded-md flex items-center justify-center backdrop-blur-sm transition-all" title="Assign Substitute">
                                          <FaChalkboard size={10} />
                                        </button>
                                        <button onClick={() => handleDeleteSchedule(lesson._id)} className="w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-md flex items-center justify-center backdrop-blur-sm transition-all shadow-sm">
                                          <FaTrash size={10} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })
                            ) : (
                              <div className="h-full w-full border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center text-slate-300 group-hover:border-slate-300 transition-colors">
                                <span className="text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">Empty</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* --- SUBSTITUTE ASSIGNMENT MODAL --- */}
      {
        showSubModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 font-sans">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-amber-50/50">
                <h3 className="font-black text-xl text-slate-800 text-amber-900 flex items-center gap-2">
                  <FaUserGraduate className="text-amber-600" /> Substitute
                </h3>
                <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="p-6">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Available Teachers</label>
                <select
                  value={substituteTeacherId}
                  onChange={(e) => setSubstituteTeacherId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 outline-none focus:border-amber-500 font-bold text-slate-700"
                >
                  <option value="">-- Clear Substitute / None --</option>
                  {teachersList.map(t => (
                    <option key={t._id} value={t._id}>{t.fullName || t.name || (t.firstName + " " + t.lastName)}</option>
                  ))}
                </select>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setShowSubModal(false)} className="px-4 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                  <button onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      await axios.put(`${BASE_URL}/api/schedule/${selectedScheduleId}`, { substituteTeacher: substituteTeacherId || null }, { headers: { Authorization: `Bearer ${token}` } });
                      setShowSubModal(false);
                      fetchSchedule(); // refresh
                      fetchInitialData(); // specifically refresh the dashboard widgets
                      toast.success("Substitute assigned!");
                    } catch (e) {
                      toast.error("Failed to assign substitute.");
                    }
                  }} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all">Save changes</button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-xl text-slate-800">Assign Subject</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <FaTimes size={20} />
                </button>
              </div>

              <form onSubmit={handleAddSchedule} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Day</label>
                    <select value={newEntry.day} onChange={e => setNewEntry({ ...newEntry, day: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-red-500 font-medium">
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Time Slot</label>
                    <select value={newEntry.timeSlot} onChange={e => setNewEntry({ ...newEntry, timeSlot: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-red-500 font-medium">
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* ✅ BULLETPROOF DROPDOWN: GUARANTEED TO ONLY RENDER STRINGS! */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Subject</label>
                  <select
                    required
                    value={newEntry.subject}
                    onChange={e => setNewEntry({ ...newEntry, subject: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 outline-none focus:border-red-500 font-medium cursor-pointer"
                  >
                    <option value="" disabled>Select Subject</option>
                    {dropdownSubjects.map((sub, idx) => {
                      // Extract the string name safely so React doesn't crash
                      if (!sub) return null;
                      const subName = sub.name || sub.subject || sub.subjectName || sub.title || `Subject ID: ${sub._id}`;

                      return (
                        <option key={sub._id || idx} value={subName}>
                          {subName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Card Color</label>
                  <div className="flex gap-3">
                    {COLORS.map(c => (
                      <button
                        key={c.value} type="button" onClick={() => setNewEntry({ ...newEntry, color: c.value })}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${newEntry.color === c.value ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-500/30 transition-all">
                  Save to Schedule
                </button>
              </form>
            </div>
          </div>
        )
      }

    </Layout >
  );
};

const StatCard = ({ title, value, icon, color, bgColor, trend, subText, subTextColor }) => (
  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
    <div className={`w-14 h-14 rounded-2xl ${bgColor} ${color} flex items-center justify-center text-2xl shrink-0`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xl font-black text-slate-800">{value}</h2>
        {trend && <span className="text-xs font-bold text-amber-500">{trend}</span>}
      </div>
      {subText && (
        <p className={`text-[11px] font-bold ${subTextColor || 'text-slate-400'} mt-0.5`}>{subText}</p>
      )}
    </div>
  </div>
);

export default Dashboard;