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

  // Schedule State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [scheduleData, setScheduleData] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ day: 'Monday', timeSlot: '9:00 AM', subject: '', color: '#4285F4' });

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

      const [studentRes, classRes, teacherRes, globalStatsRes, subjectRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/students`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/classes`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/teachers`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/fees/global-stats`, { headers }).catch(() => ({ data: {} })),
        axios.get(`${BASE_URL}/api/subjects`, { headers }).catch(() => ({ data: [] })) 
      ]);

      const fetchedClasses = classRes.data?.classes || classRes.data || [];
      setClassesList(fetchedClasses);
      if (fetchedClasses.length > 0) setSelectedClassId(fetchedClasses[0]._id);

      const fetchedSubjects = subjectRes.data?.subjects || subjectRes.data || [];
      setSubjectsList(fetchedSubjects);

      const fetchedTeachers = teacherRes.data?.teachers || teacherRes.data || [];
      setTeachersList(fetchedTeachers);

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
    if (!subjectName) return "TBD";
    const searchName = subjectName.toLowerCase().trim();

    const globalSub = subjectsList.find(s => 
      (s.name && s.name.toLowerCase() === searchName) || 
      (s.subject && s.subject.toLowerCase() === searchName) || 
      (s.subjectName && s.subjectName.toLowerCase() === searchName)
    );

    let teacherData = globalSub?.teacher || null;
    if (!teacherData) return "TBD"; 

    if (typeof teacherData === 'string') {
        const found = teachersList.find(t => t._id === teacherData);
        if (found) return found.name || (found.firstName ? `${found.firstName} ${found.lastName || ''}` : "Teacher");
        return "TBD";
    }

    return teacherData.name || (teacherData.firstName ? `${teacherData.firstName} ${teacherData.lastName || ''}` : "TBD");
  };

  // ✅ SAFELY GET SUBJECTS FOR DROPDOWN
  const currentClassObj = classesList.find(c => c._id === selectedClassId);
  let dropdownSubjects = subjectsList; // Default to all subjects

  if (currentClassObj && currentClassObj.subjects?.length > 0) {
    // If class has specific subjects, map them safely!
    dropdownSubjects = currentClassObj.subjects.map(classSub => {
      if (typeof classSub === 'string') { 
        // If it's a raw DB ID, find the real subject object
        const found = subjectsList.find(s => s._id === classSub);
        return found || { _id: classSub, name: `Unknown (${classSub.slice(-4)})` };
      }
      return classSub;
    });
  }

  return (
    <Layout>
      <div className="space-y-8 pb-10 font-sans">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Radhey Shyam Sansthaan</h1>
            <p className="text-slate-500 font-medium mt-1">Academic Session 2026-27 | Admin Insights</p>
          </div>
          <div className="mt-4 sm:mt-0 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 text-sm font-bold shadow-sm">
            📅 {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Students" value={stats.students} icon={<FaUserGraduate/>} color="bg-blue-600" />
          <StatCard title="Outstanding Dues" value={`₹${stats.totalFinance.toLocaleString()}`} icon={<FaWallet/>} color="bg-rose-600" isFinance sub="Remaining to Collect"/>
          <StatCard title="Total Collected" value={`₹${stats.totalCollected.toLocaleString()}`} icon={<FaMoneyBillWave/>} color="bg-emerald-600" isFinance sub="Cash in Hand"/>
          <StatCard title="Live Classes" value={stats.classes} icon={<FaChalkboard/>} color="bg-amber-500" />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm mt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Class Schedule</h2>
              <div className="relative mt-2">
                <select 
                  value={selectedClassId} 
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-black text-lg rounded-xl pl-4 pr-10 py-2 outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                >
                  <option disabled value="">Select a Class...</option>
                  {classesList.map(c => (
                    <option key={c._id} value={c._id}>Grade {c.grade}</option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm" />
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex-1 md:flex-none px-5 py-2.5 font-bold rounded-xl transition-all ${isEditMode ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'}`}
              >
                {isEditMode ? 'Done Editing' : 'Edit Schedule'}
              </button>
              {isEditMode && (
                <button 
                  onClick={() => setShowModal(true)}
                  className="flex-1 md:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <FaPlus /> Add Subject
                </button>
              )}
            </div>
          </div>

          {selectedClassId ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 custom-scrollbar">
              <div className="min-w-[1050px] grid grid-cols-7 divide-x divide-slate-100 bg-slate-50">
                <div className="py-4 bg-white"></div>
                {DAYS.map(day => (
                  <div key={day} className="py-4 text-center text-sm font-bold text-slate-500 bg-white">{day}</div>
                ))}

                {TIME_SLOTS.map((time) => (
                  <React.Fragment key={time}>
                    <div className="py-4 pr-4 text-right text-xs font-bold text-slate-400 bg-white flex items-center justify-end h-32 border-t border-slate-100">
                      {time}
                    </div>
                    
                    {DAYS.map(day => {
                      const entry = scheduleData.find(s => s.day === day && s.timeSlot === time);
                      const teacherName = entry ? getTeacherForSubject(entry.subject) : null;

                      return (
                        <div key={`${day}-${time}`} className="p-2 border-t border-slate-100 bg-white h-32 relative group">
                          {entry && (
                            <div 
                              className="h-full rounded-xl p-3 text-white shadow-sm relative overflow-hidden transition-all flex flex-col justify-center items-start text-left"
                              style={{ backgroundColor: entry.color || '#4285F4' }}
                            >
                              <p className="font-bold text-sm leading-tight">{entry.subject} - {time}</p>
                              <p className="text-xs opacity-90 mt-1 font-medium">Teacher: {teacherName}</p>
                              
                              {isEditMode && (
                                <button 
                                  onClick={() => handleDeleteSchedule(entry._id)}
                                  className="absolute top-2 right-2 w-6 h-6 bg-white/20 hover:bg-white/40 rounded flex items-center justify-center transition-colors"
                                >
                                  <FaTrash size={10} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 font-bold">Please select a class to view its schedule.</div>
          )}
        </div>
      </div>

      {showModal && (
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
                  <select value={newEntry.day} onChange={e => setNewEntry({...newEntry, day: e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium">
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Time Slot</label>
                  <select value={newEntry.timeSlot} onChange={e => setNewEntry({...newEntry, timeSlot: e.target.value})} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-medium">
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
                  onChange={e => setNewEntry({...newEntry, subject: e.target.value})} 
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 outline-none focus:border-blue-500 font-medium cursor-pointer"
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
                      key={c.value} type="button" onClick={() => setNewEntry({...newEntry, color: c.value})}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${newEntry.color === c.value ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all">
                Save to Schedule
              </button>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
};

const StatCard = ({ title, value, icon, color, isFinance, sub }) => (
  <div className={`${color} rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 text-white relative overflow-hidden group hover:-translate-y-1 transition-all`}>
    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
      {React.cloneElement(icon, { size: 100 })}
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{title}</p>
    <h2 className="text-3xl font-black mb-1">{value}</h2>
    <p className="text-[11px] font-medium opacity-90">{sub || (isFinance ? "Real-time Update" : "System Records")}</p>
  </div>
);

export default Dashboard;