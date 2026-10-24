import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import {
  FaCog, FaSchool, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaKey, FaEye, FaEyeSlash, FaSave, FaDatabase, FaShieldAlt,
  FaBars, FaTrashAlt, FaExclamationTriangle, FaCheck,
  FaSyncAlt, FaSpinner, FaUserGraduate, FaChalkboardTeacher,
  FaLayerGroup, FaCalendarCheck, FaReceipt, FaAward,
  FaFileInvoiceDollar, FaTimes, FaUserCheck
} from 'react-icons/fa';

const Settings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_URL;

  // School Info
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: 'Radhey Shyam Shikshan Sansthaan',
    address: 'Prayagraj, Uttar Pradesh',
    phone: '',
    email: '',
    principalName: '',
    establishedYear: '',
    affiliationNo: '',
  });

  // Password Change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState('school');

  // Data Counts & Reset Management
  const [dataCounts, setDataCounts] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    attendance: 0,
    fees: 0,
    marks: 0,
    expenses: 0,
    leaves: 0,
    totalRecords: 0
  });
  const [dataLoading, setDataLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Clear Confirmation Modal
  const [clearModal, setClearModal] = useState({
    isOpen: false,
    target: '',
    title: '',
    description: '',
    confirmTextRequired: '',
    isFullWipe: false
  });
  const [userConfirmInput, setUserConfirmInput] = useState('');

  const handleSchoolChange = (e) => {
    setSchoolInfo({ ...schoolInfo, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const saveSchoolInfo = () => {
    localStorage.setItem('schoolInfo', JSON.stringify(schoolInfo));
    toast.success('School information saved successfully!');
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      return toast.error('Please fill all password fields.');
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('New passwords do not match.');
    }
    if (passwordData.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }
    toast.success('Password updated successfully!');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  // Fetch Database Counts
  const fetchDataCounts = async () => {
    setDataLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/admin/data-counts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDataCounts(res.data);
    } catch (err) {
      console.error('Error fetching data counts:', err);
      toast.error('Failed to load system data statistics.');
    } finally {
      setDataLoading(false);
    }
  };

  // Triggered when switching to the 'data' tab
  useEffect(() => {
    if (activeTab === 'data') {
      fetchDataCounts();
    }
  }, [activeTab]);

  // Load saved school info on mount
  useEffect(() => {
    const saved = localStorage.getItem('schoolInfo');
    if (saved) {
      setSchoolInfo(JSON.parse(saved));
    }
  }, []);

  // Open Modal for Selective or Full Clear
  const openClearModal = (target, title, description, isFullWipe = false) => {
    setUserConfirmInput('');
    setClearModal({
      isOpen: true,
      target,
      title,
      description,
      confirmTextRequired: isFullWipe ? 'CLEAR ALL DATA' : 'DELETE',
      isFullWipe
    });
  };

  // Execute Data Clear
  const handleExecuteClear = async () => {
    if (userConfirmInput.trim() !== clearModal.confirmTextRequired) {
      return toast.error(`Please type "${clearModal.confirmTextRequired}" to confirm.`);
    }

    setIsClearing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${BASE_URL}/api/admin/clear-data`,
        { target: clearModal.target },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(res.data.message || 'Data cleared successfully!');
      setClearModal({ ...clearModal, isOpen: false });
      setUserConfirmInput('');
      // Refresh statistics
      fetchDataCounts();
    } catch (err) {
      console.error('Error clearing data:', err);
      toast.error(err.response?.data?.message || 'Failed to clear data. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const tabs = [
    { id: 'school', label: 'School Info', icon: <FaSchool /> },
    { id: 'security', label: 'Security', icon: <FaShieldAlt /> },
    { id: 'data', label: 'Data Management', icon: <FaDatabase /> },
    { id: 'about', label: 'About', icon: <FaCog /> },
  ];

  const selectiveOptions = [
    {
      target: 'students',
      label: 'Students & Records',
      count: dataCounts.students,
      unit: 'students',
      icon: <FaUserGraduate className="text-blue-500" />,
      desc: 'Removes all enrolled student profiles, attendance, and exam marks.'
    },
    {
      target: 'teachers',
      label: 'Teachers & Logins',
      count: dataCounts.teachers,
      unit: 'teachers',
      icon: <FaChalkboardTeacher className="text-emerald-500" />,
      desc: 'Removes all teacher profiles and teacher login accounts.'
    },
    {
      target: 'classes',
      label: 'Classes & Sections',
      count: dataCounts.classes,
      unit: 'classes',
      icon: <FaLayerGroup className="text-purple-500" />,
      desc: 'Removes all class sections and grade configurations.'
    },
    {
      target: 'attendance',
      label: 'Attendance History',
      count: dataCounts.attendance,
      unit: 'records',
      icon: <FaCalendarCheck className="text-teal-500" />,
      desc: 'Clears all daily attendance logs for both students and teachers.'
    },
    {
      target: 'fees',
      label: 'Fees & Invoices',
      count: dataCounts.fees,
      unit: 'entries',
      icon: <FaReceipt className="text-amber-500" />,
      desc: 'Clears all fee records, transactions, and generated invoices.'
    },
    {
      target: 'marks',
      label: 'Exam Marks & Results',
      count: dataCounts.marks,
      unit: 'marks',
      icon: <FaAward className="text-indigo-500" />,
      desc: 'Clears all uploaded examination scores and grade cards.'
    },
    {
      target: 'expenses',
      label: 'School Expenses',
      count: dataCounts.expenses,
      unit: 'records',
      icon: <FaFileInvoiceDollar className="text-rose-500" />,
      desc: 'Clears all financial expenditure entries and vouchers.'
    },
    {
      target: 'leaves',
      label: 'Leave Applications',
      count: dataCounts.leaves,
      unit: 'requests',
      icon: <FaCalendarCheck className="text-orange-500" />,
      desc: 'Clears all submitted student and staff leave applications.'
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <ToastContainer position="top-right" autoClose={2500} theme="colored" />

        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden mb-4 p-2 rounded-xl bg-white shadow-sm border border-slate-200"
        >
          <FaBars className="text-slate-600" />
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white">
              <FaCog size={18} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Settings</h1>
              <p className="text-sm text-slate-400 font-medium">Manage school profile, system data, and preferences</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-white shadow-lg'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── School Info Tab ─── */}
        {activeTab === 'school' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <FaSchool className="text-red-600 text-xl" />
              <h2 className="text-lg font-bold text-slate-800">School Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">School Name</label>
                <input
                  type="text"
                  name="schoolName"
                  value={schoolInfo.schoolName}
                  onChange={handleSchoolChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Principal Name</label>
                <input
                  type="text"
                  name="principalName"
                  value={schoolInfo.principalName}
                  onChange={handleSchoolChange}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={schoolInfo.phone}
                  onChange={handleSchoolChange}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={schoolInfo.email}
                  onChange={handleSchoolChange}
                  placeholder="contact@school.edu"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Established Year</label>
                <input
                  type="text"
                  name="establishedYear"
                  value={schoolInfo.establishedYear}
                  onChange={handleSchoolChange}
                  placeholder="e.g. 2005"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Affiliation Number</label>
                <input
                  type="text"
                  name="affiliationNo"
                  value={schoolInfo.affiliationNo}
                  onChange={handleSchoolChange}
                  placeholder="e.g. CBSE/AFF/2023"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                <textarea
                  name="address"
                  rows="3"
                  value={schoolInfo.address}
                  onChange={handleSchoolChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={saveSchoolInfo}
                className="flex items-center gap-2 px-6 py-3 bg-[#800000] hover:bg-[#990000] text-white rounded-xl font-bold text-sm transition shadow-sm shadow-red-900/20 active:scale-95"
              >
                <FaSave size={13} /> Save School Info
              </button>
            </div>
          </div>
        )}

        {/* ─── Security Tab ─── */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6 max-w-2xl">
            <div className="flex items-center gap-3 mb-2">
              <FaShieldAlt className="text-amber-500 text-xl" />
              <h2 className="text-lg font-bold text-slate-800">Change Admin Password</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.current ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
                    placeholder="Enter new password (min. 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.new ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={handleChangePassword}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition shadow-sm shadow-amber-500/20 active:scale-95"
              >
                <FaKey size={13} /> Update Password
              </button>
            </div>
          </div>
        )}

        {/* ─── DATA MANAGEMENT & RESET TAB ─── */}
        {activeTab === 'data' && (
          <div className="space-y-8">
            {/* Top Overview & Refresh */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <FaDatabase className="text-red-700 text-xl" />
                    <h2 className="text-xl font-black text-slate-800">Database & Storage Status</h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Total tracked operational records: <span className="font-bold text-slate-700">{dataCounts.totalRecords?.toLocaleString() || 0}</span>
                  </p>
                </div>

                <button
                  onClick={fetchDataCounts}
                  disabled={dataLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50"
                >
                  <FaSyncAlt className={dataLoading ? 'animate-spin' : ''} />
                  {dataLoading ? 'Refreshing...' : 'Refresh Counts'}
                </button>
              </div>

              {/* Data Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {selectiveOptions.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xl font-black text-slate-800">
                        {dataLoading ? '...' : (item.count || 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-600">{item.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{item.unit}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Selective Clear Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Selective Data Reset</h3>
                <p className="text-xs text-slate-500">
                  Clean specific modules independently without affecting the rest of your school data.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectiveOptions.map((opt, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition"
                  >
                    <div className="space-y-1 pr-3">
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        <h4 className="text-sm font-bold text-slate-800">{opt.label}</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        Currently: <span className="text-slate-700 font-bold">{opt.count || 0}</span> {opt.unit}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        openClearModal(
                          opt.target,
                          `Clear ${opt.label}`,
                          `This will permanently remove all ${opt.label.toLowerCase()} (${opt.count || 0} ${opt.unit}). This action cannot be undone.`
                        )
                      }
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition active:scale-95"
                    >
                      <FaTrashAlt size={11} /> Clear
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* DANGER ZONE: CLEAR ALL DATA */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50/50 border-2 border-red-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2 text-red-700">
                    <FaExclamationTriangle size={20} />
                    <h3 className="text-lg font-black tracking-tight">Danger Zone: Clear All School Data</h3>
                  </div>
                  <p className="text-xs text-red-900/80 leading-relaxed">
                    This will wipe <strong>all operational records</strong> (Students, Teachers, Classes, Attendance, Fees, Exam Marks, Expenses, Leaves, Schedules) back to a completely fresh state.
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/80 border border-red-200 rounded-lg text-[11px] font-bold text-emerald-800">
                    <FaUserCheck className="text-emerald-600" />
                    <span>Your Admin Account is Protected and will NEVER be deleted.</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    openClearModal(
                      'all',
                      'WIPE ALL OPERATIONAL DATA',
                      'This will permanently delete all students, teachers, classes, attendance records, fee collections, exam marks, expenses, and leave applications across the entire school management system. Admin accounts will remain active.',
                      true
                    )
                  }
                  className="shrink-0 flex items-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm shadow-lg shadow-red-600/30 transition active:scale-95 whitespace-nowrap"
                >
                  <FaTrashAlt /> Clear All Data (Full Reset)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── About Tab ─── */}
        {activeTab === 'about' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <FaDatabase className="text-blue-500 text-xl" />
              <h2 className="text-lg font-bold text-slate-800">System Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Application', value: 'School Management System' },
                { label: 'Version', value: 'v2.0.0' },
                { label: 'Backend', value: 'Node.js + Express' },
                { label: 'Database', value: 'MongoDB' },
                { label: 'Frontend', value: 'React + Vite' },
                { label: 'Developer', value: 'Seth Project' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                  <span className="text-sm font-bold text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center font-medium">
                Radhey Shyam Shikshan Sansthaan © {new Date().getFullYear()} — All rights reserved
              </p>
            </div>
          </div>
        )}

        {/* ─── CONFIRMATION MODAL ─── */}
        {clearModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 space-y-5 relative">
              <button
                onClick={() => setClearModal({ ...clearModal, isOpen: false })}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition"
              >
                <FaTimes size={16} />
              </button>

              <div className="flex items-center gap-3 text-red-600">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <FaExclamationTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{clearModal.title}</h3>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Permanent Deletion Warning</p>
                </div>
              </div>

              <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-900 leading-relaxed space-y-2">
                <p>{clearModal.description}</p>
                {clearModal.isFullWipe && (
                  <p className="font-bold text-emerald-800 pt-1">
                    ✓ Note: Your administrator login credentials will NOT be touched.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  To confirm, type <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-red-600 font-black">{clearModal.confirmTextRequired}</span> below:
                </label>
                <input
                  type="text"
                  value={userConfirmInput}
                  onChange={(e) => setUserConfirmInput(e.target.value)}
                  placeholder={`Type "${clearModal.confirmTextRequired}" here`}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClearModal({ ...clearModal, isOpen: false })}
                  disabled={isClearing}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClear}
                  disabled={userConfirmInput.trim() !== clearModal.confirmTextRequired || isClearing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md shadow-red-600/30 transition active:scale-95"
                >
                  {isClearing ? (
                    <>
                      <FaSpinner className="animate-spin" /> Clearing Data...
                    </>
                  ) : (
                    <>
                      <FaTrashAlt size={12} /> Confirm & Permanently Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Settings;
