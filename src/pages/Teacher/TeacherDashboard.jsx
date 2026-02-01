import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const TeacherDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // Stores { studentId: "Present/Absent" }
  const [loading, setLoading] = useState(false);

  // 1. Fetch Classes on Load
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(response.data);
    } catch (error) {
      console.error("Error fetching classes");
    }
  };

  // 2. Fetch Students when a Class is Selected
  useEffect(() => {
    if (selectedClass) {
      fetchStudentsByClass();
    }
  }, [selectedClass]);

  const fetchStudentsByClass = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // We fetch all students and filter them on the frontend for now
      const response = await axios.get('http://localhost:5000/api/students', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Filter students who belong to the selected class
      const classStudents = response.data.filter(
        (student) => student.classId && student.classId._id === selectedClass
      );
      
      setStudents(classStudents);

      // Initialize attendance state (Default: Present)
      const initialAttendance = {};
      classStudents.forEach(s => initialAttendance[s._id] = "Present");
      setAttendance(initialAttendance);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching students");
      setLoading(false);
    }
  };

  // 3. Handle Attendance Toggle
  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  // 4. Submit Attendance to Backend
  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const attendanceData = Object.keys(attendance).map(studentId => ({
        _id: studentId,
        status: attendance[studentId]
      }));

      await axios.post(
        'http://localhost:5000/api/students/attendance',
        {
          date: new Date(), // Today's date
          students: attendanceData
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Attendance Marked Successfully!");
    } catch (error) {
      toast.error("Failed to mark attendance");
    }
  };

  // Logout Function
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <ToastContainer />
      
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col p-6">
         <h2 className="text-2xl font-bold mb-8 text-center tracking-wider">TEACHER PORTAL</h2>
         <div className="flex-1">
            <div className="text-gray-400 uppercase text-xs font-bold mb-4">Menu</div>
            <button className="w-full text-left py-2 px-4 bg-gray-800 rounded text-white mb-2">
              📅 Attendance
            </button>
         </div>
         <button onClick={handleLogout} className="text-red-400 hover:text-red-300 mt-auto flex items-center gap-2">
             Logout
         </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Mark Attendance</h1>

        {/* Class Selector */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
          <select 
            className="w-full md:w-1/3 p-2 border rounded focus:ring-2 focus:ring-blue-500"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">-- Choose a Class --</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.grade} - {cls.section}
              </option>
            ))}
          </select>
        </div>

        {/* Student List */}
        {selectedClass && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-700">Student List</h2>
              <span className="text-gray-500 text-sm">{new Date().toDateString()}</span>
            </div>

            {loading ? (
              <p>Loading students...</p>
            ) : students.length === 0 ? (
              <p className="text-red-500">No students found in this class.</p>
            ) : (
              <>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-gray-600">Roll No</th>
                      <th className="p-3 text-gray-600">Name</th>
                      <th className="p-3 text-gray-600 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-gray-800">{student.rollNum}</td>
                        <td className="p-3 text-gray-800">{student.name}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleAttendanceChange(student._id, "Present")}
                              className={`px-3 py-1 rounded text-sm ${
                                attendance[student._id] === "Present" 
                                  ? "bg-green-600 text-white" 
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleAttendanceChange(student._id, "Absent")}
                              className={`px-3 py-1 rounded text-sm ${
                                attendance[student._id] === "Absent" 
                                  ? "bg-red-600 text-white" 
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handleSubmit}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow-lg transition"
                  >
                    Submit Attendance 🚀
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;