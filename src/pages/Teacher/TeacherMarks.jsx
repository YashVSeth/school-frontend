import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSave, FaBook, FaUserGraduate } from 'react-icons/fa';

const TeacherMarks = () => {
    const [schedule, setSchedule] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [students, setStudents] = useState([]);
    const [marks, setMarks] = useState({}); // { studentId: score }
    const [examType, setExamType] = useState('Unit Test');
    const [loading, setLoading] = useState(true);

    const BASE_URL = import.meta.env.VITE_API_URL;

    // 1. Fetch Teacher's Schedule (Assigned Classes and Subjects)
    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/teachers/my-schedule`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSchedule(res.data.schedule || []);

            // Auto-select first class if available
            if (res.data.schedule && res.data.schedule.length > 0) {
                setSelectedClass(res.data.schedule[0]._id);
                if (res.data.schedule[0].subjects.length > 0) {
                    setSelectedSubject(res.data.schedule[0].subjects[0]);
                }
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching schedule:", error);
            toast.error("Could not load assigned subjects.");
            setLoading(false);
        }
    };

    // 2. Fetch Students for Selected Class
    useEffect(() => {
        if (selectedClass) {
            fetchStudents(selectedClass);
        }
    }, [selectedClass]);

    const fetchStudents = async (classId) => {
        try {
            const token = localStorage.getItem('token');
            // Re-using the attendance logic trick: We temporarily pretend we are querying for attendance just to get the class roster
            // Note: Ideally, a dedicated generic /students/by-class API would be better, but this works using existing models
            const res = await axios.get(`${BASE_URL}/api/attendance/my-students`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Filter the returned students based on the explicitly selected class in the dropdown
            // (Since my-students defaults to the class teacher class, not necessarily the subject class)
            // Actually, since we don't have a generic class-student lookup hooked to the frontend yet, 
            // let's fetch students via the admin generic route using the new auth bypass or generic fetch
            const studentRes = await axios.get(`${BASE_URL}/api/students/class/${classId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (studentRes.data.students) {
                setStudents(studentRes.data.students);
            } else {
                setStudents(studentRes.data);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
            // Fallback logic if the above generic route isn't perfectly mapped
            try {
                const token = localStorage.getItem('token');
                const backupRes = await axios.get(`${BASE_URL}/api/attendance/my-students`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStudents(backupRes.data.students || []);
            } catch (err) {
                toast.error("Could not load students for this class.");
            }
        }
    };

    // 3. Fetch Existing Marks whenever Class, Subject, or ExamType changes
    useEffect(() => {
        if (selectedClass && selectedSubject && students.length > 0) {
            fetchExistingMarks();
        }
    }, [selectedClass, selectedSubject, examType, students]);

    const fetchExistingMarks = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BASE_URL}/api/marks?classId=${selectedClass}&subject=${selectedSubject}&examType=${examType}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const records = res.data;
            const newMarks = {};

            if (records && records.length > 0) {
                records.forEach(r => {
                    if (r.student && r.student._id) {
                        newMarks[r.student._id] = r.score;
                    } else if (r.student) {
                        newMarks[r.student] = r.score;
                    }
                });
            } else {
                students.forEach(s => newMarks[s._id] = '');
            }

            setMarks(newMarks);
        } catch (error) {
            console.error("Error fetching marks:", error);
        }
    };

    // Handle Input Change
    const handleMarkChange = (studentId, value) => {
        setMarks(prev => ({
            ...prev,
            [studentId]: value
        }));
    };

    // Submit Marks
    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem('token');

            // Construct Payload
            const marksData = students.map(s => ({
                studentId: s._id,
                score: marks[s._id] !== '' ? Number(marks[s._id]) : 0,
                remarks: ''
            }));

            const payload = {
                classId: selectedClass,
                subject: selectedSubject,
                examType: examType,
                marksData: marksData
            };

            await axios.post(`${BASE_URL}/api/marks/submit`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Marks saved successfully!");
        } catch (error) {
            console.error("Error saving marks:", error);
            toast.error(error.response?.data?.message || "Failed to save marks");
        }
    };

    if (loading) return <div className="text-center mt-10 text-slate-400 font-bold">Loading Module...</div>;

    // Helper to find available subjects based on selected class
    const availableSubjects = schedule.find(c => c._id === selectedClass)?.subjects || [];

    return (
        <div className="font-sans flex flex-col gap-6 px-1">
            {/* 🔴 OVERLAPPING HEADER CARD */}
            <div className="bg-[#8b0025] rounded-[24px] shadow-xl p-5 border border-white/10 relative overflow-hidden z-10 w-full mt-2">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-[14px] bg-white/10 flex items-center justify-center text-yellow-400 border border-white/20">
                        <FaBook size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-wide drop-shadow-sm">Gradebook</h2>
                        <p className="text-white/80 text-[11px] font-medium tracking-wide">Submit assessment scores</p>
                    </div>
                </div>
            </div>

            {/* 🟡 CONTROLS/FILTERS PANEL */}
            <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-5 mt-[-1rem] z-20 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Class</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => {
                            setSelectedClass(e.target.value);
                            const subs = schedule.find(c => c._id === e.target.value)?.subjects || [];
                            if (subs.length > 0) setSelectedSubject(subs[0]);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#ab0035] transition-all"
                    >
                        {schedule.map(cls => (
                            <option key={cls._id} value={cls._id}>{cls.grade} ({cls.section})</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Subject</label>
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#ab0035] transition-all"
                    >
                        {availableSubjects.map((sub, idx) => (
                            <option key={idx} value={sub}>{sub}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Exam Type</label>
                    <select
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#ab0035] transition-all"
                    >
                        <option value="Unit Test">Unit Test (out of 20)</option>
                        <option value="Mid Term">Mid Term (out of 100)</option>
                        <option value="Final Exam">Final Exam (out of 100)</option>
                        <option value="Assignment">Assignment (out of 10)</option>
                        <option value="Practical">Practical (out of 30)</option>
                    </select>
                </div>
            </div>

            {/* 📄 STUDENTS LIST */}
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-1 flex flex-col min-h-[300px]">
                {students.length > 0 ? (
                    <div className="flex flex-col gap-1 p-2">
                        {students.map((student) => (
                            <div key={student._id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition border border-transparent border-b-slate-50 last:border-b-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                        <FaUserGraduate size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800 text-sm leading-tight">
                                            {student.fullName || `${student.firstName} ${student.lastName}`}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                            Roll: {student.rollNum || student.rollNumber || student.studentId || '--'}
                                        </span>
                                    </div>
                                </div>

                                {/* Score Input */}
                                <div className="w-24">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="Score"
                                        value={marks[student._id] !== undefined ? marks[student._id] : ''}
                                        onChange={(e) => handleMarkChange(student._id, e.target.value)}
                                        className="w-full bg-white border border-slate-200 text-center font-bold text-[#ab0035] rounded-xl py-2 px-2 outline-none focus:border-[#ab0035] focus:ring-4 focus:ring-red-100 transition-all placeholder:text-slate-300 placeholder:font-normal"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <FaUserGraduate size={24} className="text-slate-300" />
                        </div>
                        <p className="font-bold text-slate-500">No students found.</p>
                        <p className="text-xs mt-1 text-center">Please ensure students are enrolled in this class.</p>
                    </div>
                )}
            </div>

            {/* 🟢 FLOATING SAVE BUTTON */}
            {students.length > 0 && (
                <div className="sticky bottom-6 mt-2 left-0 right-0 px-2 lg:px-0 flex justify-center z-30">
                    <button
                        onClick={handleSubmit}
                        className="bg-[#ab0035] hover:bg-[#8b0025] text-white font-extrabold text-sm py-4 px-10 rounded-2xl shadow-[0_8px_20px_rgba(171,0,53,0.3)] transition-all flex items-center gap-3 w-full sm:w-auto mx-auto justify-center border border-red-500/30"
                    >
                        <FaSave size={18} /> Save {examType} Marks
                    </button>
                </div>
            )}

            {/* Extra space for scrolling past the floating button on mobile */}
            <div className="h-20 lg:h-10"></div>
        </div>
    );
};

export default TeacherMarks;
