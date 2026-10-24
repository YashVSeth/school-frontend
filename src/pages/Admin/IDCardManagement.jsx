import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaIdCard, FaPrint, FaSearch, FaFilter, FaUserGraduate,
  FaQrcode, FaDownload, FaPhoneAlt, FaTint, FaCalendarAlt,
  FaUniversity, FaCheck, FaTimes, FaBars, FaEye, FaSyncAlt,
  FaChalkboardTeacher, FaPalette, FaSlidersH, FaBus, FaMapMarkerAlt,
  FaCheckCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Sidebar from '../../components/Sidebar';

const TEMPLATES = [
  { id: 'crimson', name: 'Crimson Elite', bgHeader: 'from-red-700 to-red-900', accent: 'border-red-600', badge: 'bg-red-50 text-red-700', text: 'text-red-700' },
  { id: 'sapphire', name: 'Royal Sapphire', bgHeader: 'from-blue-700 to-indigo-900', accent: 'border-blue-600', badge: 'bg-blue-50 text-blue-700', text: 'text-blue-700' },
  { id: 'emerald', name: 'Emerald Scholar', bgHeader: 'from-emerald-700 to-teal-900', accent: 'border-emerald-600', badge: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700' },
  { id: 'slate', name: 'Monochrome Dark', bgHeader: 'from-slate-800 to-slate-950', accent: 'border-slate-800', badge: 'bg-slate-100 text-slate-800', text: 'text-slate-800' }
];

const IDCardManagement = () => {
  const BASE_URL = import.meta.env.VITE_API_URL;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Mode: 'students' or 'teachers'
  const [cardType, setCardType] = useState('students');
  const [currentTemplate, setCurrentTemplate] = useState(TEMPLATES[0]);
  const [cardSide, setCardSide] = useState('front'); // 'front' | 'back'

  // Student Data & Filters
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Preview State
  const [previewItem, setPreviewItem] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (cardType === 'students') {
      fetchStudents();
    } else {
      setSelectedIds(teachers.map(t => t._id));
      if (teachers.length > 0) setPreviewItem(teachers[0]);
    }
  }, [selectedClass, cardType]);

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

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = selectedClass
        ? `${BASE_URL}/api/students?classId=${selectedClass}`
        : `${BASE_URL}/api/students`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data.students || res.data || [];
      setStudents(list);
      setSelectedIds(list.map(s => s._id));
      if (list.length > 0) setPreviewItem(list[0]);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tList = res.data.teachers || res.data || [];
      setTeachers(tList);
    } catch {
      // silent
    }
  };

  const activeDataset = cardType === 'students' ? students : teachers;

  // Helper to normalize and resolve student/teacher photo URLs
  const getPhotoUrl = (item) => {
    if (!item) return null;
    const photo = item.photo || item.avatar || item.image || item.profilePic;
    if (!photo) return null;
    if (typeof photo === 'string' && photo.includes('drive.google.com')) {
      const match = photo.match(/\/d\/([a-zA-Z0-9_-]+)/) || photo.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
      }
    }
    return photo;
  };

  const filteredItems = activeDataset.filter(item => {
    const isStd = cardType === 'students';
    const name = isStd
      ? `${item.firstName} ${item.lastName || ''}`.toLowerCase()
      : (item.name || '').toLowerCase();
    const id = (item.studentId || item.employeeId || item._id || '').toLowerCase();
    const roll = (item.rollNo || '').toString();
    const q = searchTerm.toLowerCase();
    const matchesSearch = name.includes(q) || id.includes(q) || roll.includes(q);

    // Class Filter (Client-side fallback & confirmation)
    let matchesClass = true;
    if (isStd && selectedClass && selectedClass !== 'all' && selectedClass !== '') {
      const itemClassId = item.class?._id || item.class;
      matchesClass = itemClassId?.toString() === selectedClass.toString();
    }

    return matchesSearch && matchesClass;
  });

  const generateQrUrl = (item) => {
    const isStd = cardType === 'students';
    const payload = isStd
      ? `ID:${item.studentId}|NAME:${item.firstName} ${item.lastName || ''}|CLASS:${item.class?.grade || 'N/A'}|EMERGENCY:${item.phone || 'N/A'}`
      : `FACULTY:${item.name}|DESIG:${item.designation || 'Teacher'}|PHONE:${item.phone || 'N/A'}|EMAIL:${item.email || 'N/A'}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(payload)}`;
  };

  const handlePrint = () => {
    if (selectedIds.length === 0) return toast.warning("Please select at least one card to print");
    window.print();
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <FaBars />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FaIdCard className="text-red-600" /> ID Card Designer & Print Studio
              </h1>
              <p className="text-xs text-slate-400 font-medium">Batch generate PVC & A4 sheets for students & faculty with QR verification</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={selectedIds.length === 0}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-98"
            >
              <FaPrint /> Print {selectedIds.length} {cardType === 'students' ? 'Student' : 'Staff'} Cards
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6">

          {/* Control Strip (Tabs, Filter, Themes & Side Toggle) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">

              {/* Card Type Selector (Student vs Staff) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setCardType('students')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                    cardType === 'students' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FaUserGraduate /> Students ({students.length})
                </button>
                <button
                  onClick={() => setCardType('teachers')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                    cardType === 'teachers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FaChalkboardTeacher /> Faculty & Staff ({teachers.length})
                </button>
              </div>

              {/* Design Theme Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <FaPalette /> Theme:
                </span>
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setCurrentTemplate(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      currentTemplate.id === t.id
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              {/* Front / Back Side Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setCardSide('front')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    cardSide === 'front' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Front Side
                </button>
                <button
                  onClick={() => setCardSide('back')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    cardSide === 'back' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Back Side
                </button>
              </div>
            </div>

            {/* Sub-Filter Row */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                {cardType === 'students' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Filter Class:</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none cursor-pointer"
                    >
                      <option value="">All Classes</option>
                      {classes.map(c => (
                        <option key={c._id} value={c._id}>{c.grade} {c.section ? `(${c.section})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (selectedIds.length === filteredItems.length) setSelectedIds([]);
                    else setSelectedIds(filteredItems.map(i => i._id));
                  }}
                  className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
                >
                  {selectedIds.length === filteredItems.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="relative md:w-64">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${cardType === 'students' ? 'student' : 'staff'} name...`}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {loading ? (
              <div className="col-span-full py-16 text-center text-slate-400 font-bold animate-pulse">
                Loading ID cards...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold">
                No records found matching criteria
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedIds.includes(item._id);
                const isStd = cardType === 'students';
                const name = isStd ? `${item.firstName} ${item.lastName || ''}`.trim() : item.name;
                const idCode = isStd ? item.studentId : (item.employeeId || `FAC-${item._id.slice(-4)}`);
                const subLine = isStd ? (item.class?.grade || 'Class') : (item.designation || 'Faculty');

                return (
                  <div
                    key={item._id}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-xs relative flex flex-col ${
                      isSelected ? 'border-slate-800 ring-2 ring-slate-800/10' : 'border-slate-200 opacity-60'
                    }`}
                  >
                    {/* Top Action Ribbon */}
                    <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-100 flex items-center justify-between print:hidden">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedIds(prev =>
                              prev.includes(item._id) ? prev.filter(x => x !== item._id) : [...prev, item._id]
                            );
                          }}
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                        <span>Print</span>
                      </label>

                      <button
                        onClick={() => { setPreviewItem(item); setIsPreviewModalOpen(true); }}
                        className="text-slate-400 hover:text-slate-800 p-1"
                        title="HD Preview"
                      >
                        <FaEye size={13} />
                      </button>
                    </div>

                    {/* ID Card Front / Back */}
                    {cardSide === 'front' ? (
                      /* ─── FRONT SIDE ─── */
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white text-slate-800">
                        {/* Header */}
                        <div className={`bg-gradient-to-r ${currentTemplate.bgHeader} text-white rounded-xl p-3 text-center shadow-xs`}>
                          <div className="flex items-center justify-center gap-1.5 mb-0.5">
                            <FaUniversity className="text-amber-300 text-xs" />
                            <h4 className="text-[10px] font-black tracking-tight uppercase">RADHEY SHYAM SANSTHAAN</h4>
                          </div>
                          <p className="text-[7px] text-slate-200 tracking-widest uppercase font-bold">
                            {isStd ? 'Student Identity Card' : 'Faculty & Staff ID'} · 2026-27
                          </p>
                        </div>

                        {/* Photo & Info Row */}
                        <div className="flex gap-3 items-center">
                          <div className="w-16 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs relative">
                            {getPhotoUrl(item) ? (
                              <img
                                src={getPhotoUrl(item)}
                                alt={name}
                                className="w-full h-full object-cover object-top"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full bg-slate-900 text-white font-black text-lg items-center justify-center ${getPhotoUrl(item) ? 'hidden' : 'flex'}`}>
                              {name.charAt(0)}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1 text-xs">
                            <h3 className="font-black text-slate-900 text-sm truncate">{name}</h3>
                            <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[9px]">
                              <div>
                                <span className="text-slate-400 font-bold block">{isStd ? 'Class' : 'Designation'}</span>
                                <span className="font-bold text-slate-800 truncate block">{subLine}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block">{isStd ? 'Roll No' : 'Dept'}</span>
                                <span className="font-bold text-slate-800">{isStd ? (item.rollNo || 'N/A') : (item.department || 'Academics')}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-400 font-bold block">ID Number</span>
                                <span className={`font-mono font-bold ${currentTemplate.text}`}>{idCode}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Metadata Tag */}
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-[8px] grid grid-cols-2 gap-1 text-slate-600">
                          <div><span className="font-bold text-slate-400">{isStd ? "Father:" : "Phone:"}</span> {isStd ? (item.fatherName || 'Parent') : (item.phone || 'N/A')}</div>
                          <div><span className="font-bold text-slate-400">Emergency:</span> {item.phone || 'N/A'}</div>
                        </div>

                        {/* Footer with QR */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <img src={generateQrUrl(item)} alt="QR" className="w-8 h-8 p-0.5 rounded border border-slate-200" />
                          <div className="text-right">
                            <div className="w-14 border-b border-slate-300 mb-0.5 ml-auto"></div>
                            <span className="text-[7px] font-bold text-slate-400">Principal Signature</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ─── BACK SIDE ─── */
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-slate-50 text-slate-700 text-[9px]">
                        <div className="text-center pb-2 border-b border-slate-200">
                          <p className="font-black text-slate-900 uppercase text-[10px]">Institutional Terms & Contacts</p>
                          <p className="text-[8px] text-slate-400">Campus Road, Central District · Phone: +91 98765 43210</p>
                        </div>

                        <div className="space-y-1.5 text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                          <p className="flex items-center gap-1"><FaMapMarkerAlt className="text-red-500 shrink-0" /> <strong>Address:</strong> {item.address || 'District Campus Sector, Main City'}</p>
                          <p className="flex items-center gap-1"><FaBus className="text-amber-500 shrink-0" /> <strong>Route / Stop:</strong> {item.feeDetails?.transportRoute || 'Campus Walking Route'}</p>
                          <p className="flex items-center gap-1"><FaTint className="text-red-600 shrink-0" /> <strong>Blood Group:</strong> {item.bloodGroup || 'O+ Positive'}</p>
                        </div>

                        <div className="text-[7px] text-slate-400 space-y-0.5">
                          <p>• This identity card must be worn within the institutional campus.</p>
                          <p>• If found, please return to the school administration office.</p>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                          <span className="text-[7px] text-slate-400">Valid: Session 2026-27</span>
                          <span className="text-[8px] font-bold text-slate-700">Authorised Issuing Officer</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </main>
      </div>

      {/* ═══ HD MODAL PREVIEW ═══ */}
      {isPreviewModalOpen && previewItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-up p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-sm">HD Card Studio Preview</h3>
                <p className="text-[10px] text-slate-400 font-medium">PVC / Direct Card Layout ({cardSide.toUpperCase()})</p>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <FaTimes />
              </button>
            </div>

            {/* HD Card Body */}
            <div className={`bg-white rounded-2xl border-2 border-slate-800 p-4 shadow-xl space-y-3`}>
              <div className={`bg-gradient-to-r ${currentTemplate.bgHeader} text-white rounded-xl p-3 text-center shadow-xs`}>
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <FaUniversity className="text-amber-300 text-sm" />
                  <h4 className="text-xs font-black uppercase tracking-tight">RADHEY SHYAM SANSTHAAN</h4>
                </div>
                <p className="text-[8px] text-slate-200 tracking-widest uppercase font-bold">
                  {cardType === 'students' ? 'Student Identity Card' : 'Faculty ID'} · 2026-27
                </p>
              </div>

              <div className="flex gap-4 items-center">
                <div className="w-20 h-24 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm shrink-0 relative">
                  {getPhotoUrl(previewItem) ? (
                    <img
                      src={getPhotoUrl(previewItem)}
                      alt={cardType === 'students' ? previewItem.firstName : previewItem.name}
                      className="w-full h-full object-cover object-top"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full bg-slate-900 text-white font-black text-2xl items-center justify-center ${getPhotoUrl(previewItem) ? 'hidden' : 'flex'}`}>
                    {(cardType === 'students' ? previewItem.firstName : previewItem.name)?.[0]}
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <h3 className="font-black text-slate-900 text-base">
                    {cardType === 'students' ? `${previewItem.firstName} ${previewItem.lastName || ''}` : previewItem.name}
                  </h3>
                  <p className="text-slate-500 font-medium">
                    {cardType === 'students' ? 'Class:' : 'Designation:'} <strong className="text-slate-900">{cardType === 'students' ? (previewItem.class?.grade || 'Class') : (previewItem.designation || 'Teacher')}</strong>
                  </p>
                  <p className="text-slate-500 font-medium">
                    {cardType === 'students' ? 'Roll No:' : 'Department:'} <strong className="text-slate-900">{cardType === 'students' ? (previewItem.rollNo || 'N/A') : (previewItem.department || 'Academics')}</strong>
                  </p>
                  <p className={`font-mono font-bold text-xs ${currentTemplate.text}`}>
                    {cardType === 'students' ? previewItem.studentId : (previewItem.employeeId || 'EMP-1001')}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] space-y-1 text-slate-600">
                <p><strong className="text-slate-800">{cardType === 'students' ? "Father's Name:" : "Phone:"}</strong> {cardType === 'students' ? (previewItem.fatherName || 'Parent') : (previewItem.phone || 'N/A')}</p>
                <p><strong className="text-slate-800">Emergency Contact:</strong> {previewItem.phone || 'N/A'}</p>
                <p><strong className="text-slate-800">Address:</strong> {previewItem.address || 'Campus Road, School District'}</p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <img src={generateQrUrl(previewItem)} alt="QR" className="w-11 h-11 p-0.5 rounded border border-slate-300" />
                <div className="text-right">
                  <div className="w-24 border-b border-slate-400 mb-1 ml-auto"></div>
                  <span className="text-[8px] font-bold text-slate-500">Authorized Principal</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCardSide(cardSide === 'front' ? 'back' : 'front')}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 rounded-xl flex items-center justify-center gap-1.5"
              >
                <FaSyncAlt /> Flip Side
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 font-bold text-xs text-white rounded-xl flex items-center justify-center gap-1.5"
              >
                <FaPrint /> Print This Card
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default IDCardManagement;
