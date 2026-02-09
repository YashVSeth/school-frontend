import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Login from './pages/Login';
import ResetPassword from "./pages/Admin/ResetPassword";
import Dashboard from './pages/Admin/Dashboard'; 
import Classes from './pages/Admin/Classes';
import AddStudent from './pages/Admin/AddStudent';
import StudentList from './pages/Admin/StudentList';
import Attendance from './pages/Admin/Attendance';
import Teachers from './pages/Admin/Teachers';
import Fees from './pages/Admin/Fees';
import FinanceDashboard from './pages/Admin/FinanceDashboard'; // ✅ Naya Finance Page
import FeeStructure from './pages/Admin/FeeStructure';
// Teacher Portal Pages
import TeacherDashboard from './pages/Teacher/Dashboard';

// --- PROTECTED ROUTE LOGIC ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) return <Navigate to="/" replace />;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === 'teacher' ? '/teacher/dashboard' : '/admin/dashboard'} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* ✅ ADMIN PROTECTED ROUTES */}
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Routes>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="classes" element={<Classes />} />
              <Route path="students/add" element={<AddStudent />} />
              <Route path="students/list" element={<StudentList />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="fees" element={<Fees />} />
              <Route path="finance" element={<FinanceDashboard />} /> {/* ✅ Dashboard se link yahan ayega */}
              <Route path="teachers" element={<Teachers />} />
              <Route path="fee-structure" element={<FeeStructure />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* ✅ TEACHER PROTECTED ROUTES */}
        <Route path="/teacher/*" element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <Routes>
              <Route path="dashboard" element={<TeacherDashboard />} />
              {/* Teacher specific routes like Profile or ClassReports can go here */}
            </Routes>
          </ProtectedRoute>
        } />

        {/* Fallbacks */}
        <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;