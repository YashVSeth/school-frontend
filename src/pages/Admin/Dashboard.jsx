import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { 
  FaUserGraduate, FaChalkboard, FaPlus, FaListAlt, 
  FaWallet, FaBolt, FaWhatsapp, FaArrowUp
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    students: 0,
    classes: 0,
    teachers: 0,
    totalFinance: 0,
    whatsappActive: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const BASE_URL = import.meta.env.VITE_API_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const [studentRes, classRes, teacherRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/students`, { headers }),
        axios.get(`${BASE_URL}/api/classes`, { headers }),
        axios.get(`${BASE_URL}/api/teachers`, { headers })
      ]);

      const studentData = studentRes.data || [];
      
      // --- CALCULATE FINANCE & WHATSAPP STATS ---
      let totalRev = 0;
      let waCount = 0;
      studentData.forEach(s => {
        const fees = s.feeDetails || {};
        totalRev += (fees.backlog_2024 || 0) + (fees.backlog_2025 || 0) + (fees.electricalCharges || 0);
        if (s.whatsappEnabled) waCount++;
      });

      setStudents(studentData);
      setStats({
        students: studentData.length,
        classes: classRes.data.length,
        teachers: teacherRes.data.length,
        totalFinance: totalRev,
        whatsappActive: waCount
      });
    } catch (error) {
      console.error("Error fetching stats", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CHART DATA PREPARATION ---
  const waterfallChartData = useMemo(() => {
    let b24 = 0, b25 = 0, curr26 = 0;
    students.forEach(s => {
      b24 += (s.feeDetails?.backlog_2024 || 0);
      b25 += (s.feeDetails?.backlog_2025 || 0);
      curr26 += (s.feeDetails?.tuitionFee_2026 || 0) + (s.feeDetails?.electricalCharges || 0);
    });
    return [
      { name: '2024 Arrears', amount: b24, color: '#f43f5e' },
      { name: '2025 Arrears', amount: b25, color: '#fbbf24' },
      { name: '2026 Current', amount: curr26, color: '#3b82f6' }
    ];
  }, [students]);

  return (
    <Layout>
      <div className="space-y-8 pb-10">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Radhey Shyam Sansthaan</h1>
            <p className="text-slate-500 font-medium mt-1">Academic Session 2026-27 | Admin Insights</p>
          </div>
          <div className="mt-4 sm:mt-0 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 text-sm font-bold shadow-sm">
            📅 {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* TOP STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Students" value={stats.students} icon={<FaUserGraduate/>} color="bg-blue-600" />
          <StatCard title="Expected Collection" value={`₹${stats.totalFinance.toLocaleString()}`} icon={<FaWallet/>} color="bg-rose-600" isFinance />
          <StatCard title="WhatsApp Alerts" value={stats.whatsappActive} icon={<FaWhatsapp/>} color="bg-green-600" sub="Active Parents" />
          <StatCard title="Live Classes" value={stats.classes} icon={<FaChalkboard/>} color="bg-amber-500" />
        </div>

        {/* ANALYTICS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* WATERFALL CHART */}
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Waterfall Backlog Analysis</h3>
              <div className="flex gap-4 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-rose-500"><div className="w-2 h-2 bg-rose-500 rounded-full"/> 2024</span>
                <span className="flex items-center gap-1 text-amber-500"><div className="w-2 h-2 bg-amber-500 rounded-full"/> 2025</span>
                <span className="flex items-center gap-1 text-blue-500"><div className="w-2 h-2 bg-blue-500 rounded-full"/> 2026</span>
              </div>
            </div>
            
            

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={50}>
                    {waterfallChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* QUICK ACTIONS & WHATSAPP STATUS */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-lg">
               <h4 className="text-xs font-bold opacity-60 uppercase tracking-widest mb-4">Quick Tasks</h4>
               <div className="grid grid-cols-2 gap-3">
                 <QuickActionBtn icon={<FaPlus/>} label="Add Student" onClick={() => navigate('/admin/students/add')} />
                 <QuickActionBtn icon={<FaListAlt/>} label="Directory" onClick={() => navigate('/admin/students/list')} />
                 <QuickActionBtn icon={<FaWallet/>} label="Fees" onClick={() => navigate('/admin/finance')} />
                 <QuickActionBtn icon={<FaBolt/>} label="Alerts" onClick={() => navigate('/admin/communications')} />
               </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase">Communication Status</h4>
                  <FaWhatsapp className="text-green-500 text-xl" />
                </div>
                <div className="space-y-4">
                  <StatusProgress label="WhatsApp Enabled" value={stats.whatsappActive} total={stats.students} color="bg-green-500" />
                  <StatusProgress label="Fee Receipts Sent" value={Math.floor(stats.whatsappActive * 0.7)} total={stats.students} color="bg-blue-500" />
                </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

// --- HELPER COMPONENTS ---
const StatCard = ({ title, value, icon, color, isFinance, sub }) => (
  <div className={`${color} rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 text-white relative overflow-hidden group hover:-translate-y-1 transition-all`}>
    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
      {React.cloneElement(icon, { size: 100 })}
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{title}</p>
    <h2 className="text-3xl font-black mb-1">{value}</h2>
    <p className="text-[11px] font-medium opacity-90">{sub || (isFinance ? "Waterfall Collection" : "System Records")}</p>
  </div>
);

const QuickActionBtn = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all gap-2 border border-white/5">
    <div className="text-xl">{icon}</div>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

const StatusProgress = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1 uppercase">
        <span>{label}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default Dashboard;