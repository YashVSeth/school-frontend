import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- PAGES IMPORTS ---
import Login from './pages/Login';
import ResetPassword from "./pages/Admin/ResetPassword"; 

// Admin Pages
import Dashboard from './pages/Admin/Dashboard'; 
import Classes from './pages/Admin/Classes';
import AddStudent from './pages/Admin/AddStudent';
import StudentList from './pages/Admin/StudentList';
import AttendanceAdmin from './pages/Admin/Attendance'; 
import Teachers from './pages/Admin/Teachers';
import Fees from './pages/Admin/Fees';
import FinanceDashboard from './pages/Admin/FinanceDashboard';
import FeeStructure from './pages/Admin/FeeStructure';

// Teacher Pages
import TeacherDashboard from './pages/Teacher/TeacherDashboard';
import TeacherAttendance from './pages/Teacher/TeacherAttendance'; // ✅ Sirf ye ek import rahega

// --- PROTECTED ROUTE COMPONENT ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Ensure role matches
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (userRole === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    if (userRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* --- Public Routes --- */}
        <Route path="/" element={<Login />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* --- ADMIN ROUTES --- */}
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Routes>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="classes" element={<Classes />} />
              <Route path="students/add" element={<AddStudent />} />
              <Route path="students/list" element={<StudentList />} />
              <Route path="attendance" element={<AttendanceAdmin />} />
              <Route path="fees" element={<Fees />} />
              <Route path="finance" element={<FinanceDashboard />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="fee-structure" element={<FeeStructure />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* --- TEACHER ROUTES --- */}
        <Route path="/teacher/*" element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <Routes>
              {/* Dashboard */}
              <Route path="dashboard" element={<TeacherDashboard />} />
              
              {/* ✅ Attendance Page (Sahi Route) */}
              {/* Note: Parent /teacher/* hai, isliye yahan sirf "attendance" likhenge */}
              <Route path="attendance" element={<TeacherAttendance />} />
              
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* --- Fallbacks --- */}
        <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;