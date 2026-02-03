import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';

// ✅ UPDATE THIS IMPORT
import Dashboard from './pages/Admin/Dashboard'; 

import Classes from './pages/Admin/Classes';
import AddStudent from './pages/Admin/AddStudent';
import StudentList from './pages/Admin/StudentList';
import Attendance from './pages/Admin/Attendance';
import Teachers from './pages/Admin/Teachers';
import Fees from './pages/Admin/Fees';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* ✅ The route stays the same, only the file changed */}
        <Route path="/admin/dashboard" element={<Dashboard />} />
        
        <Route path="/admin/classes" element={<Classes />} />
        <Route path="/admin/students/add" element={<AddStudent />} />
        <Route path="/admin/students/list" element={<StudentList />} />
        <Route path="/admin/attendance" element={<Attendance />} />
        <Route path="/admin/fees" element={<Fees />} />

        <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/teachers" element={<Teachers />} />
      </Routes>
    </Router>
  );
}

export default App;