import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaAward, FaGraduationCap, FaPrint, FaSearch, FaFilter,
  FaFileExcel, FaTrophy, FaChartLine, FaCheckCircle,
  FaTimesCircle, FaBars, FaEye, FaTimes, FaUniversity,
  FaUserGraduate, FaMedal, FaStar
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import Sidebar from '../../components/Sidebar';

const DEFAULT_SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'Computer'];
const EXAM_TYPES = ['Annual Examination', 'Half-Yearly Examination', 'Unit Test 1', 'Unit Test 2', 'Pre-Board'];

const ResultManagement = () => {
  const BASE_URL = import.meta.env.VITE_API_URL;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [examType, setExamType] = useState('Annual Examination');
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({}); // { studentId: { subject: score } }
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Report Card Modal State
  const [selectedReportStudent, setSelectedReportStudent] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsAndMarks();
    }
  }, [selectedClass, examType]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(res.data || []);
      if (res.data?.length > 0 && !selectedClass) {
        setSelectedClass(res.data[0]._id);
      }
    } catch {
      // silent
    }
  };

  const fetchStudentsAndMarks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [stdRes, markRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/students?classId=${selectedClass}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/marks?classId=${selectedClass}&examType=${encodeURIComponent(examType)}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);

      const stdList = stdRes.data.students || stdRes.data || [];
      setStudents(stdList);

      // Build marks map
      const mMap = {};
      (markRes.data || []).forEach(m => {
        const sId = m.student?._id || m.student;
        if (!mMap[sId]) mMap[sId] = {};
        mMap[sId][m.subject] = m.score;
      });

      // Populate empty defaults
      stdList.forEach(s => {
        if (!mMap[s._id]) mMap[s._id] = {};
        DEFAULT_SUBJECTS.forEach(sub => {
          if (mMap[s._id][sub] === undefined) {
            mMap[s._id][sub] = null;
          }
        });
      });

      setMarksData(mMap);
    } catch {
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  // Grade & Stats Calculation Helper
  const calculateStudentStats = (studentId) => {
    const sMarks = marksData[studentId] || {};
    let totalObtained = 0;
    let filledCount = 0;

    DEFAULT_SUBJECTS.forEach(sub => {
      const val = sMarks[sub];
      if (val !== null && val !== undefined && val !== '') {
        totalObtained += Number(val);
        filledCount++;
      }
    });

    const maxMarks = filledCount > 0 ? filledCount * 100 : DEFAULT_SUBJECTS.length * 100;
    const percentage = filledCount > 0 ? (totalObtained / maxMarks) * 100 : 0;

    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 33) grade = 'D';

    const isPass = percentage >= 33;

    return {
      totalObtained,
      totalMax: maxMarks,
      percentage: Number(percentage.toFixed(1)),
      grade,
      isPass,
      hasMarks: filledCount > 0
    };
  };

  // Compute Class Overview KPIs & Rankings
  const studentResultsList = students.map(s => {
    const stats = calculateStudentStats(s._id);
    return {
      ...s,
      stats
    };
  });

  // Sort by percentage descending for rank
  const evaluatedStudents = studentResultsList
    .filter(s => s.stats.hasMarks)
    .sort((a, b) => b.stats.percentage - a.stats.percentage);

  const topper = evaluatedStudents.length > 0 ? evaluatedStudents[0] : null;
  const passCount = evaluatedStudents.filter(s => s.stats.isPass).length;
  const passPercentage = evaluatedStudents.length > 0 ? Math.round((passCount / evaluatedStudents.length) * 100) : 0;
  const classAvg = evaluatedStudents.length > 0
    ? Math.round(evaluatedStudents.reduce((acc, s) => acc + s.stats.percentage, 0) / evaluatedStudents.length)
    : 0;

  // Export to Excel
  const exportMarksToExcel = () => {
    if (students.length === 0) return toast.info("No student results to export");

    const rows = students.map(s => {
      const stats = calculateStudentStats(s._id);
      const row = {
        "Student ID": s.studentId,
        "Roll No": s.rollNo || 'N/A',
        "Student Name": `${s.firstName} ${s.lastName || ''}`.trim(),
        "Class": s.class?.grade || 'Class'
      };

      DEFAULT_SUBJECTS.forEach(sub => {
        const val = marksData[s._id]?.[sub];
        row[sub] = val !== null && val !== undefined ? val : '—';
      });

      row["Total (Obtained)"] = stats.totalObtained;
      row["Max Marks"] = stats.totalMax;
      row["Percentage (%)"] = `${stats.percentage}%`;
      row["Grade"] = stats.grade;
      row["Status"] = stats.isPass ? "PASS" : "NEEDS IMPROVEMENT";

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Class_Results");
    XLSX.writeFile(wb, `Results_${examType.replace(/\s+/g, '_')}.xlsx`);
    toast.success("Result sheet exported to Excel!");
  };

  const filteredStudents = studentResultsList.filter(s => {
    const name = `${s.firstName} ${s.lastName || ''}`.toLowerCase();
    const id = (s.studentId || '').toLowerCase();
    const roll = (s.rollNo || '').toString();
    const q = searchTerm.toLowerCase();
    const matchesSearch = name.includes(q) || id.includes(q) || roll.includes(q);

    // Explicit class matching
    let matchesClass = true;
    if (selectedClass && selectedClass !== 'all' && selectedClass !== '') {
      const sClassId = s.class?._id || s.class;
      matchesClass = sClassId?.toString() === selectedClass.toString();
    }

    return matchesSearch && matchesClass;
  });

  const selectedClassObj = classes.find(c => c._id === selectedClass);

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <FaBars />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FaAward className="text-red-600" /> Results & Report Cards
              </h1>
              <p className="text-xs text-slate-400 font-medium">Published examination results, class rankings & official printable progress report cards</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportMarksToExcel}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
            >
              <FaFileExcel className="text-emerald-600" /> Export Excel
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6">

          {/* Performance Overview KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-xl shrink-0">
                <FaTrophy />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Class Topper</span>
                <h4 className="text-sm font-black text-slate-900 truncate">
                  {topper ? `${topper.firstName} ${topper.lastName || ''}`.trim() : 'N/A'}
                </h4>
                <p className="text-xs font-bold text-amber-600">{topper ? `${topper.stats.percentage}% (${topper.stats.grade})` : '—'}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-xl shrink-0">
                <FaChartLine />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Class Average</span>
                <h4 className="text-2xl font-black text-slate-900">{classAvg}%</h4>
                <p className="text-xs font-bold text-slate-400">Mean Score</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                <FaCheckCircle />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pass Rate</span>
                <h4 className="text-2xl font-black text-emerald-600">{passPercentage}%</h4>
                <p className="text-xs font-bold text-slate-400">{passCount} of {evaluatedStudents.length} cleared</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center text-xl shrink-0">
                <FaUserGraduate />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Enrolled</span>
                <h4 className="text-2xl font-black text-slate-900">{students.length}</h4>
                <p className="text-xs font-bold text-slate-400">{selectedClassObj?.grade || 'Class'}</p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 print:hidden">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FaFilter className="text-slate-400 text-xs" />
                <span className="text-xs font-bold text-slate-600">Class:</span>
              </div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3.5 py-2.5 outline-none cursor-pointer"
              >
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.grade} {c.section ? `(${c.section})` : ''}</option>
                ))}
              </select>

              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <span className="text-xs font-bold text-slate-600">Exam Term:</span>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3.5 py-2.5 outline-none cursor-pointer"
                >
                  {EXAM_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative flex-1 md:w-64">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student or roll no..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Results Matrix Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedClassObj?.grade || 'Class'} · {examType} Results</h3>
                <p className="text-xs text-slate-400 font-medium">Published scores submitted by subject faculty and finalized report card generation</p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {filteredStudents.length} Students
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="pb-3 pl-2">Roll</th>
                    <th className="pb-3">Student Name</th>
                    {DEFAULT_SUBJECTS.map(sub => (
                      <th key={sub} className="pb-3 text-center">{sub}</th>
                    ))}
                    <th className="pb-3 text-center">Total</th>
                    <th className="pb-3 text-center">Percentage</th>
                    <th className="pb-3 text-center">Grade</th>
                    <th className="pb-3 text-right pr-2">Official Marksheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={DEFAULT_SUBJECTS.length + 5} className="py-12 text-center text-slate-400 font-bold animate-pulse">
                        Loading finalized class results...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={DEFAULT_SUBJECTS.length + 5} className="py-12 text-center text-slate-400 font-bold">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(s => {
                      const st = s.stats;

                      return (
                        <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 pl-2 font-bold text-slate-500">{s.rollNo || '—'}</td>
                          <td className="py-3 font-bold text-slate-900">
                            <p>{s.firstName} {s.lastName || ''}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Roll: #{s.rollNo || '—'}</p>
                          </td>

                          {/* Subject Scores */}
                          {DEFAULT_SUBJECTS.map(sub => {
                            const val = marksData[s._id]?.[sub];
                            return (
                              <td key={sub} className="py-3 text-center font-bold text-slate-700">
                                {val !== null && val !== undefined ? val : <span className="text-slate-300 font-normal">—</span>}
                              </td>
                            );
                          })}

                          {/* Total Score */}
                          <td className="py-3 text-center font-black text-slate-900">
                            {st.hasMarks ? `${st.totalObtained} / ${st.totalMax}` : '—'}
                          </td>

                          {/* Percentage */}
                          <td className="py-3 text-center font-bold text-slate-800">
                            {st.hasMarks ? `${st.percentage}%` : '—'}
                          </td>

                          {/* Grade Badge */}
                          <td className="py-3 text-center">
                            {st.hasMarks ? (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                st.grade === 'A+' || st.grade === 'A'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : st.grade === 'B+' || st.grade === 'B'
                                    ? 'bg-blue-100 text-blue-800'
                                    : st.grade === 'C' || st.grade === 'D'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-800'
                              }`}>
                                {st.grade}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Action Button: Print Marksheet */}
                          <td className="py-3 text-right pr-2">
                            <button
                              onClick={() => { setSelectedReportStudent(s); setIsReportModalOpen(true); }}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs"
                            >
                              <FaPrint size={11} /> Marksheet
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* ═══ OFFICIAL REPORT CARD / MARKSHEET MODAL ═══ */}
      {isReportModalOpen && selectedReportStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-black">Official Student Marksheet</h3>
                <p className="text-xs text-slate-400">{examType} · Session 2026-27</p>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            {/* Printable Report Card Sheet */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs bg-white text-slate-800">
              <div className="text-center pb-3 border-b-2 border-slate-800 space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <FaUniversity className="text-red-600 text-base" />
                  <h2 className="text-base font-black uppercase tracking-tight text-slate-900">RADHEY SHYAM SHIKSHAN SANSTHAAN</h2>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Affiliated to State Board of Secondary Education · Campus Road, District Centre</p>
                <p className="text-xs font-black uppercase text-red-700 tracking-wider">PROGRESS REPORT CARD ({examType})</p>
              </div>

              {/* Student Metadata Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400 font-bold text-[9px] uppercase">Student Name</p>
                  <p className="font-black text-slate-900">{selectedReportStudent.firstName} {selectedReportStudent.lastName || ''}</p>
                  <p className="text-[10px] text-slate-500 font-bold">Roll: #{selectedReportStudent.rollNo || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold text-[9px] uppercase">Class & Roll</p>
                  <p className="font-black text-slate-900">{selectedReportStudent.class?.grade || 'Class'} (Roll: {selectedReportStudent.rollNo || 'N/A'})</p>
                  <p className="text-[10px] text-slate-500">Father: {selectedReportStudent.fatherName || 'Parent'}</p>
                </div>
              </div>

              {/* Subject Breakdown Table */}
              <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[9px] font-black uppercase text-slate-700">
                    <th className="p-2 border-r border-slate-200">Subject</th>
                    <th className="p-2 text-center border-r border-slate-200">Max Marks</th>
                    <th className="p-2 text-center border-r border-slate-200">Min Pass</th>
                    <th className="p-2 text-right border-r border-slate-200">Marks Obtained</th>
                    <th className="p-2 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {DEFAULT_SUBJECTS.map(sub => {
                    const score = Number(marksData[selectedReportStudent._id]?.[sub]) || 0;
                    let subGrade = 'F';
                    if (score >= 90) subGrade = 'A+';
                    else if (score >= 80) subGrade = 'A';
                    else if (score >= 70) subGrade = 'B+';
                    else if (score >= 60) subGrade = 'B';
                    else if (score >= 50) subGrade = 'C';
                    else if (score >= 33) subGrade = 'D';

                    return (
                      <tr key={sub}>
                        <td className="p-2 font-bold text-slate-800 border-r border-slate-200">{sub}</td>
                        <td className="p-2 text-center text-slate-500 border-r border-slate-200">100</td>
                        <td className="p-2 text-center text-slate-500 border-r border-slate-200">33</td>
                        <td className="p-2 text-right font-black text-slate-900 border-r border-slate-200">{score}</td>
                        <td className="p-2 text-center font-bold text-slate-700">{subGrade}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {(() => {
                    const st = calculateStudentStats(selectedReportStudent._id);
                    return (
                      <tr className="bg-slate-50 border-t-2 border-slate-800 font-black text-xs">
                        <td className="p-2 border-r border-slate-200">Grand Total</td>
                        <td className="p-2 text-center border-r border-slate-200">{st.totalMax}</td>
                        <td className="p-2 text-center border-r border-slate-200">—</td>
                        <td className="p-2 text-right text-red-600 border-r border-slate-200">{st.totalObtained}</td>
                        <td className="p-2 text-center text-emerald-700">{st.percentage}% ({st.grade})</td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>

              {/* Remarks & Signatures */}
              <div className="pt-4 flex justify-between items-end border-t border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold">Result Status: <strong className="text-emerald-700 uppercase">PASS / PROMOTED</strong></p>
                  <p className="text-[9px] text-slate-400">Date: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="flex gap-8 text-center text-[9px] font-bold text-slate-400">
                  <div>
                    <div className="w-20 border-b border-slate-300 mb-1"></div>
                    <span>Class Teacher</span>
                  </div>
                  <div>
                    <div className="w-20 border-b border-slate-300 mb-1"></div>
                    <span>Principal</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FaPrint /> Print Official Marksheet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ResultManagement;
