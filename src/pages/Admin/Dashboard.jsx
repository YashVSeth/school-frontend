import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { 
  FaUserGraduate, 
  FaChalkboardTeacher, 
  FaChalkboard, 
  FaPlus, 
  FaListAlt,
  FaCheckCircle 
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    students: 0,
    classes: 0,
    teachers: 0 // Hardcoded placeholder
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      // 1. Define the Base URL properly
      const BASE_URL = import.meta.env.VITE_API_URL;

      // 2. Fetch Students, Classes, AND Teachers simultaneously
      const [studentRes, classRes, teacherRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/students`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/classes`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/teachers`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats({
        students: studentRes.data.length,
        classes: classRes.data.length,
        teachers: teacherRes.data.length
      });
    } catch (error) {
      console.error("Error fetching stats", error);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        
        {/* 🔹 HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end animate-slide-up">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Dashboard Overview</h1>
            <p className="text-gray-500 mt-2">Welcome back, Admin. Here is what’s happening today.</p>
          </div>
          <div className="mt-4 sm:mt-0 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-sm font-medium text-gray-600">
            📅 {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* 🔹 STATS CARDS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Students (Gradient Blue) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 shadow-lg transform hover:-translate-y-1 transition-all duration-300 animate-slide-up delay-100">
            <div className="relative z-10 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                  <FaUserGraduate className="text-2xl" />
                </div>
                <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded text-blue-50">+5% this month</span>
              </div>
              <h2 className="text-4xl font-bold">{stats.students}</h2>
              <p className="text-blue-100 text-sm font-medium mt-1">Total Students</p>
            </div>
            {/* Decorative Circle */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          </div>

          {/* Card 2: Classes (Gradient Purple) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 shadow-lg transform hover:-translate-y-1 transition-all duration-300 animate-slide-up delay-200">
            <div className="relative z-10 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                  <FaChalkboard className="text-2xl" />
                </div>
              </div>
              <h2 className="text-4xl font-bold">{stats.classes}</h2>
              <p className="text-purple-100 text-sm font-medium mt-1">Active Classes</p>
            </div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          </div>

          {/* Card 3: Teachers (Gradient Emerald) */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-6 shadow-lg transform hover:-translate-y-1 transition-all duration-300 animate-slide-up delay-300">
            <div className="relative z-10 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                  <FaChalkboardTeacher className="text-2xl" />
                </div>
              </div>
              <h2 className="text-4xl font-bold">{stats.teachers}</h2>
              <p className="text-emerald-100 text-sm font-medium mt-1">Total Teachers</p>
            </div>
            <div className="absolute bottom-0 right-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
          </div>
        </div>

        {/* 🔹 QUICK ACTIONS */}
        <div className="animate-slide-up delay-300">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <button 
              onClick={() => navigate('/admin/students/add')}
              className="flex items-center gap-4 p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FaPlus className="text-lg" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Add Student</p>
                <p className="text-xs text-gray-400">New admission</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/admin/attendance')}
              className="flex items-center gap-4 p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all group"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-purple-50 text-purple-600 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <FaCheckCircle className="text-lg" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-700 group-hover:text-purple-600 transition-colors">Attendance</p>
                <p className="text-xs text-gray-400">Mark today's status</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/admin/students/list')}
              className="flex items-center gap-4 p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-200 transition-all group"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-green-50 text-green-600 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
                <FaListAlt className="text-lg" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-700 group-hover:text-green-600 transition-colors">All Students</p>
                <p className="text-xs text-gray-400">View class list</p>
              </div>
            </button>
            
            {/* Disabled Action Example */}
            <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border border-gray-100 opacity-60 cursor-not-allowed">
               <div className="w-12 h-12 flex items-center justify-center bg-gray-200 text-gray-400 rounded-full">
                <FaChalkboardTeacher className="text-lg" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-500">Teachers</p>
                <p className="text-xs text-gray-400">Coming soon</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Dashboard;