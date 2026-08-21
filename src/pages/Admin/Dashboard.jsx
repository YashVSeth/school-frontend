import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import {
  FaUserGraduate, FaChalkboard, FaWallet, FaMoneyBillWave,
  FaTimes
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const BASE_URL = import.meta.env.VITE_API_URL;

  // Stats & Database Lists State
  const [stats, setStats] = useState({ students: 0, classes: 0, teachers: 0, totalFinance: 0, totalCollected: 0 });
  const [dashboardWidgets, setDashboardWidgets] = useState({ pendingActions: [] });

  // Leave Action Modal State
  const [selectedActionLeave, setSelectedActionLeave] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [studentRes, classRes, teacherRes, globalStatsRes, widgetRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/students`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/classes`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/teachers`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/fees/global-stats`, { headers }).catch(() => ({ data: {} })),
        axios.get(`${BASE_URL}/api/dashboard/widgets`, { headers }).catch(() => ({ data: { pendingActions: [], substitutions: [] } }))
      ]);

      const fetchedClasses = classRes.data?.classes || classRes.data || [];
      const fetchedTeachers = teacherRes.data?.teachers || teacherRes.data || [];

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

  const handleApproveLeave = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${BASE_URL}/api/leaves/${id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Leave request ${newStatus.toLowerCase()}!`);

      // Update widgets list
      setDashboardWidgets(prev => ({
        ...prev,
        pendingActions: prev.pendingActions.filter(a => !(a.type === 'LEAVE' && a.id === id))
      }));

      setSelectedActionLeave(null);

    } catch (error) {
      console.error("Leave update error:", error);
      toast.error("Failed to update leave status");
    }
  };

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

        {/* --- MAIN PENDING ACTIONS SECTION --- */}
        <div className="mt-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span className="text-rose-500 bg-rose-100 p-1.5 rounded-lg">
                  <FaTimes size={12} />
                </span>
                Pending Actions
              </h2>
              <button className="text-sm font-bold text-rose-500 hover:text-rose-600">View All Tasks</button>
            </div>

            {/* List Array from Backend */}
            {dashboardWidgets.pendingActions && dashboardWidgets.pendingActions.length > 0 ? (
              dashboardWidgets.pendingActions.map((action, idx) => {
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
                          {action.type === 'LEAVE' ? (
                            <button onClick={() => setSelectedActionLeave(action.leaveData)} className="px-5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-colors inline-block text-center">Action</button>
                          ) : (
                            <Link to="/admin" className="px-5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-colors inline-block text-center">Action</Link>
                          )}
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
        </div>
      </div>

      {/* LEAVE ACTION MODAL */}
      {selectedActionLeave && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Review Leave Request</h2>
              <button onClick={() => setSelectedActionLeave(null)} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl mb-6">
              <p className="font-bold text-slate-800 mb-2">{selectedActionLeave.teacher?.fullName || 'Teacher'}</p>
              <p className="text-sm text-slate-600 mb-2"><strong>Duration:</strong> {new Date(selectedActionLeave.startDate).toLocaleDateString()} to {new Date(selectedActionLeave.endDate).toLocaleDateString()}</p>
              <p className="text-sm text-slate-600"><strong>Reason:</strong> {selectedActionLeave.reason}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => handleApproveLeave(selectedActionLeave._id, 'Declined')} className="flex-1 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-bold transition-colors text-sm">
                Decline
              </button>
              <button onClick={() => handleApproveLeave(selectedActionLeave._id, 'Approved')} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors text-sm">
                Approve Leave
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
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