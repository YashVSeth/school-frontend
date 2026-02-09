import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { FaArrowUp, FaCalendarAlt, FaChartPie, FaCoins, FaExclamationTriangle } from 'react-icons/fa';

const FinanceDashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        // ✅ CORRECTED PATH: Changed /api/finance to /api/fees to match server.js
        const res = await axios.get(`${BASE_URL}/api/fees/global-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error("Dashboard Load Error:", err);
        setError("Could not load financial data. Please check your connection.");
      }
    };
    fetchStats();
  }, [BASE_URL]);

  if (error) return (
    <Layout>
      <div className="p-20 text-center">
        <p className="text-rose-500 font-bold">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl">Retry</button>
      </div>
    </Layout>
  );

  if (!stats) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Calculating Sansthaan Finances...</div>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">FINANCE INSIGHTS</h1>
          <p className="text-blue-600 font-bold text-sm uppercase tracking-widest">Real-time Waterfall Analytics</p>
        </div>

        {/* TOP ROW: OVERALL HEALTH */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <FaCoins className="text-blue-500 mb-4" size={30} />
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Total Outstanding</p>
            <h2 className="text-5xl font-black mt-2">₹{stats.grandTotalDue?.toLocaleString()}</h2>
            <div className="mt-6 flex items-center gap-2 text-emerald-400 text-xs font-bold">
               <FaArrowUp /> <span>Live Database Sync</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-center">
            <FaChartPie className="text-blue-500 mb-4" size={24} />
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Active Student Count</p>
            <h2 className="text-3xl font-black text-slate-800">{stats.totalStudents}</h2>
            <div className="w-full bg-slate-100 h-2 mt-4 rounded-full overflow-hidden">
               <div className="bg-blue-600 h-full w-full"></div>
            </div>
          </div>

          <div className="bg-rose-50 p-8 rounded-[3rem] border border-rose-100 flex flex-col justify-center">
            <FaExclamationTriangle className="text-rose-500 mb-4" size={24} />
            <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest">High Priority Arrears</p>
            <h2 className="text-3xl font-black text-rose-600">₹{stats.totalArrears2024?.toLocaleString()}</h2>
            <p className="text-rose-400 text-xs font-bold mt-1">Pending from 2024</p>
          </div>
        </div>

        {/* BOTTOM ROW: WATERFALL BREAKDOWN */}
        <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
             <FaCalendarAlt className="text-blue-500"/> Revenue Distribution by Academic Year
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* 2024 Card */}
              <div className="space-y-4">
                 <div className="flex justify-between items-end">
                    <span className="text-4xl font-black text-slate-200">2024</span>
                    <span className="text-lg font-black text-rose-500">₹{stats.totalArrears2024?.toLocaleString()}</span>
                 </div>
                 <div className="h-1.5 bg-slate-100 rounded-full">
                    <div className="h-full bg-rose-500 rounded-full" style={{width: '100%'}}></div>
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Oldest Debt (Urgent Recovery)</p>
              </div>

              {/* 2025 Card */}
              <div className="space-y-4 border-x border-slate-50 px-0 md:px-12">
                 <div className="flex justify-between items-end">
                    <span className="text-4xl font-black text-slate-200">2025</span>
                    <span className="text-lg font-black text-amber-500">₹{stats.totalArrears2025?.toLocaleString()}</span>
                 </div>
                 <div className="h-1.5 bg-slate-100 rounded-full">
                    <div className="h-full bg-amber-500 rounded-full" style={{width: '100%'}}></div>
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Previous Session Arrears</p>
              </div>

              {/* 2026 Card */}
              <div className="space-y-4">
                 <div className="flex justify-between items-end">
                    <span className="text-4xl font-black text-slate-200">2026</span>
                    <span className="text-lg font-black text-blue-500">₹{stats.totalCurrent2026?.toLocaleString()}</span>
                 </div>
                 <div className="h-1.5 bg-slate-100 rounded-full">
                    <div className="h-full bg-blue-500 rounded-full" style={{width: '100%'}}></div>
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">Current Session Fees</p>
              </div>
           </div>
        </div>
      </div>
    </Layout>
  );
};

export default FinanceDashboard;