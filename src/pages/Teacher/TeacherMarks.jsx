import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaAward, FaBook, FaSave, FaUserGraduate, FaSearch,
  FaChalkboardTeacher, FaCheckCircle, FaStar, FaChartLine
} from 'react-icons/fa';

const EXAM_TYPES = [
  { label: 'Unit 1', max: 20 },
  { label: 'Unit 2', max: 20 },
  { label: 'Mid Term', max: 100 },
  { label: 'End Term', max: 100 }
];

const TeacherMarks = () => {
  const [schedule, setSchedule] = useState([]); // [{ _id, grade, section, subjects: ['Math', ...] }]
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [examType, setExamType] = useState('Unit 1');
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({}); // { studentId: score }
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const BASE_URL = import.meta.env.VITE_API_URL;

  const teacherName = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.fullName || u.name || '';
    } catch { return ''; }
  }, []);

  // 1. Fetch Teacher's Assigned Classes and Subjects
  useEffect(() => {
    fetchTeacherSchedule();
  }, []);

  const fetchTeacherSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/teachers/my-schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const schedList = Array.isArray(res.data.schedule) ? res.data.schedule : [];
      setSchedule(schedList);

      if (schedList.length > 0) {
        const first = schedList[0];
        setSelectedClassId(first._id);
        if (first.subjects && first.subjects.length > 0) {
          setSelectedSubject(first.subjects[0]);
        }
      } else if (res.data.classTeacher) {
        // Fallback: If teacher only has a class assigned as classTeacher
        const fallbackClass = res.data.classTeacher;
        setSelectedClassId(fallbackClass._id);
        const fallbackSubjects = (fallbackClass.subjects || [])
          .map(s => s.subject?.name || s.subject)
          .filter(Boolean);
        if (fallbackSubjects.length > 0) {
          setSelectedSubject(fallbackSubjects[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
      toast.error("Could not load your assigned teaching subjects.");
    } finally {
      setLoadingSchedule(false);
    }
  };

  // 2. Fetch Students for the Selected Assigned Class
  useEffect(() => {
    if (selectedClassId) {
      fetchClassStudents(selectedClassId);
    }
  }, [selectedClassId]);

  const fetchClassStudents = async (classId) => {
    setLoadingStudents(true);
    try {
      const token = localStorage.getItem('token');
      // Dedicated route for students by class
      const res = await axios.get(`${BASE_URL}/api/students/class/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let list = res.data.students || res.data || [];
      list.sort((a, b) => {
        if (a.rollNo && b.rollNo) return a.rollNo - b.rollNo;
        if (a.rollNo) return -1;
        if (b.rollNo) return 1;
        return (a.firstName || '').localeCompare(b.firstName || '');
      });

      setStudents(list);
    } catch (error) {
      console.error("Fetch students error:", error);
      // Fallback to my-students
      try {
        const token = localStorage.getItem('token');
        const backup = await axios.get(`${BASE_URL}/api/attendance/my-students?classId=${classId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudents(backup.data.students || []);
      } catch (err) {
        toast.error("Could not load students for this class.");
        setStudents([]);
      }
    } finally {
      setLoadingStudents(false);
    }
  };

  // 3. Fetch Existing Marks for (Class + Subject + ExamType)
  useEffect(() => {
    if (selectedClassId && selectedSubject && examType && students.length > 0) {
      fetchExistingMarks();
    }
  }, [selectedClassId, selectedSubject, examType, students]);

  const fetchExistingMarks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${BASE_URL}/api/marks?classId=${selectedClassId}&subject=${encodeURIComponent(selectedSubject)}&examType=${encodeURIComponent(examType)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const records = res.data || [];
      const scoreMap = {};

      records.forEach(r => {
        const sId = r.student?._id || r.student;
        if (sId) {
          scoreMap[sId] = r.score !== undefined && r.score !== null ? String(r.score) : '';
        }
      });

      // Populate empty strings for students without scores
      students.forEach(s => {
        if (scoreMap[s._id] === undefined) scoreMap[s._id] = '';
      });

      setMarks(scoreMap);
    } catch (error) {
      console.error("Fetch existing marks error:", error);
    }
  };

  // Current Exam Config (e.g., max 20, max 100)
  const currentExam = useMemo(() => {
    return EXAM_TYPES.find(e => e.label === examType) || { label: examType, max: 100 };
  }, [examType]);

  // Handle Score Input
  const handleScoreChange = (studentId, val) => {
    if (val === '') {
      setMarks(prev => ({ ...prev, [studentId]: '' }));
      return;
    }

    const num = Number(val);
    if (isNaN(num)) return;

    if (num > currentExam.max) {
      toast.warn(`Max score for ${currentExam.label} is ${currentExam.max}`);
      setMarks(prev => ({ ...prev, [studentId]: String(currentExam.max) }));
      return;
    }

    if (num < 0) return;

    setMarks(prev => ({ ...prev, [studentId]: val }));
  };

  // 💾 Submit Marks
  const handleSubmit = async () => {
    if (!selectedClassId || !selectedSubject) {
      return toast.error("Please select a class and assigned subject.");
    }

    // Filter students who have a score entered
    const marksData = [];
    students.forEach(s => {
      const scoreVal = marks[s._id];
      if (scoreVal !== undefined && scoreVal !== '' && scoreVal !== null) {
        marksData.push({
          studentId: s._id,
          score: Number(scoreVal),
          remarks: ''
        });
      }
    });

    if (marksData.length === 0) {
      return toast.warning("Please enter marks for at least one student.");
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        classId: selectedClassId,
        subject: selectedSubject,
        examType: examType,
        marksData
      };

      await axios.post(`${BASE_URL}/api/marks/submit`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Successfully saved marks for ${marksData.length} students!`);
    } catch (error) {
      console.error("Submit marks error:", error);
      toast.error(error.response?.data?.message || "Failed to submit marks.");
    } finally {
      setSaving(false);
    }
  };

  // Current Selected Class Object
  const currentClassObj = useMemo(() => {
    return schedule.find(c => c._id === selectedClassId) || null;
  }, [schedule, selectedClassId]);

  // Available subjects for the active class
  const availableSubjects = useMemo(() => {
    return currentClassObj?.subjects || [];
  }, [currentClassObj]);

  // Analytics on current entered marks
  const analytics = useMemo(() => {
    let sum = 0;
    let count = 0;
    let highest = 0;

    students.forEach(s => {
      const val = marks[s._id];
      if (val !== undefined && val !== '' && !isNaN(Number(val))) {
        const num = Number(val);
        sum += num;
        count++;
        if (num > highest) highest = num;
      }
    });

    const avg = count > 0 ? (sum / count).toFixed(1) : '0';
    return { gradedCount: count, total: students.length, avg, highest };
  }, [students, marks]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      const roll = String(s.rollNo || '');
      return name.includes(searchQuery.toLowerCase()) || roll.includes(searchQuery);
    });
  }, [students, searchQuery]);

  if (loadingSchedule) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
        <div className="w-8 h-8 border-3 border-[#8f0631] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Assigned Subjects...</p>
      </div>
    );
  }

  return (
    <div className="font-sans flex flex-col gap-4 max-w-5xl mx-auto w-full pb-20">
      
      {/* 🔴 HERO CARD: Gradebook Banner */}
      <div className="bg-gradient-to-br from-[#750426] via-[#8f0631] to-[#a81140] rounded-3xl p-5 text-white shadow-xl border border-white/10 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-yellow-300 border border-white/20 shrink-0">
              <FaAward size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-yellow-300">
                Subject Gradebook {teacherName ? `· ${teacherName}` : ''}
              </span>
              <h1 className="text-xl font-black leading-tight text-white truncate">
                {selectedSubject || 'Marks Entry'}
              </h1>
            </div>
          </div>
        </div>

        {/* 📚 ASSIGNED CLASS SELECTION CHIPS */}
        <div className="mt-3 pt-3 border-t border-white/15">
          <span className="text-[11px] font-bold text-white/80 block mb-1.5">
            Select Assigned Class:
          </span>
          {schedule.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
              {schedule.map(cls => (
                <button
                  key={cls._id}
                  onClick={() => {
                    setSelectedClassId(cls._id);
                    if (cls.subjects && cls.subjects.length > 0) {
                      setSelectedSubject(cls.subjects[0]);
                    } else {
                      setSelectedSubject('');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                    selectedClassId === cls._id
                      ? 'bg-yellow-400 text-slate-900 shadow-sm'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  {cls.grade?.toLowerCase().startsWith('class') ? cls.grade : `Class ${cls.grade}`} {cls.section ? `(${cls.section})` : ''}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-yellow-200 italic">
              No classes currently assigned to you.
            </div>
          )}
        </div>

        {/* 📖 ASSIGNED SUBJECT SELECTION (For Selected Class) */}
        {availableSubjects.length > 0 ? (
          <div className="mt-2.5">
            <span className="text-[11px] font-bold text-white/80 block mb-1.5">
              Assigned Subject:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
              {availableSubjects.map((sub, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 ${
                    selectedSubject === sub
                      ? 'bg-white text-[#8f0631] shadow-sm font-black'
                      : 'bg-white/10 text-white/90 hover:bg-white/20'
                  }`}
                >
                  <FaBook size={11} />
                  {sub}
                </button>
              ))}
            </div>
          </div>
        ) : (
          selectedClassId && (
            <div className="mt-2 text-xs text-yellow-200/90 italic bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 inline-block">
              ℹ️ No specific subjects assigned yet for this class.
            </div>
          )
        )}
      </div>

      {/* 📝 EXAM TYPE SELECTOR ROW */}
      <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {EXAM_TYPES.map(exam => (
            <button
              key={exam.label}
              onClick={() => setExamType(exam.label)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 flex-1 text-center ${
                examType === exam.label
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {exam.label}
              <span className="text-[10px] block opacity-70 font-normal">/{exam.max}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 📊 SUMMARY METRICS PILLS */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-2.5 rounded-2xl border border-slate-100 text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Graded</span>
          <span className="text-base font-black text-slate-800">
            {analytics.gradedCount}/{analytics.total}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-100 text-center shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Average</span>
          <span className="text-base font-black text-emerald-700">
            {analytics.avg}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-100 text-center shadow-xs">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Top Score</span>
          <span className="text-base font-black text-purple-700">
            {analytics.highest} <span className="text-[10px] font-normal text-slate-400">/{currentExam.max}</span>
          </span>
        </div>
      </div>

      {/* 🔍 SEARCH STUDENT BAR */}
      <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-slate-100 flex items-center gap-2">
        <FaSearch className="text-slate-400 ml-2" size={13} />
        <input
          type="text"
          placeholder="Search student by name or roll number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 placeholder:text-slate-400 outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 font-bold px-2 py-0.5 rounded-lg hover:bg-slate-100"
          >
            Clear
          </button>
        )}
      </div>

      {/* 📋 STUDENTS MARKS LIST */}
      {loadingStudents ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-[#8f0631] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading Students for Class...</span>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-xs flex flex-col items-center justify-center">
          <FaUserGraduate size={32} className="text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">No students enrolled</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery ? 'No match found for search.' : 'No students found in this assigned class.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredStudents.map((student) => {
            const score = marks[student._id] !== undefined ? marks[student._id] : '';
            const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';
            const isFilled = score !== '' && score !== null;
            const numScore = Number(score);
            const percentage = isFilled && !isNaN(numScore) ? Math.round((numScore / currentExam.max) * 100) : null;

            return (
              <div
                key={student._id}
                className={`bg-white rounded-2xl p-3 sm:p-3.5 shadow-xs border transition-all flex items-center justify-between gap-3 ${
                  isFilled ? 'border-amber-300 bg-amber-50/20 shadow-xs' : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Left: Roll No & Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs sm:text-sm text-slate-800 shrink-0">
                    {student.rollNo !== undefined && student.rollNo !== null ? `#${student.rollNo}` : '—'}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                      {fullName}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 truncate font-medium">
                        {student.fatherName ? `Father: ${student.fatherName}` : 'Student'}
                      </span>
                      {percentage !== null && (
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                          percentage >= 75 ? 'bg-emerald-100 text-emerald-800' :
                          percentage >= 40 ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Score Input Box with Max Limit Pill */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max={currentExam.max}
                      placeholder="—"
                      value={score}
                      onChange={(e) => handleScoreChange(student._id, e.target.value)}
                      className={`w-16 sm:w-20 py-2 px-2 text-center font-black text-sm rounded-xl border outline-none transition ${
                        isFilled
                          ? 'border-[#8f0631] bg-white text-[#8f0631] shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#8f0631]'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 font-bold ml-1.5">
                      /{currentExam.max}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 💾 FIXED / STICKY SAVE MARKS BUTTON (MOBILE-FIRST) */}
      {students.length > 0 && (
        <div className="sticky bottom-20 z-30 pt-2">
          <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200/90 flex items-center gap-2">
            <div className="px-3 py-1 flex flex-col">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Graded</span>
              <span className="text-xs font-black text-slate-800">
                {analytics.gradedCount}/{analytics.total}
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`flex-1 py-3.5 px-4 rounded-xl font-black text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 ${
                saving
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#8f0631] to-[#750426] hover:opacity-95 shadow-[#8f0631]/25'
              }`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Marks...</span>
                </>
              ) : (
                <>
                  <FaSave size={16} />
                  <span>Save {currentExam.label} Marks</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherMarks;
