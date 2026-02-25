import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Attendance = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default today
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // { studentId: "Present" }

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(import.meta.env.VITE_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(response.data);
    } catch (error) {
      console.error("Error fetching classes");
    }
  };

  const handleLoadStudents = async () => {
    if (!selectedClass) {
      toast.error("Please select a class first");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      // We need an endpoint to filter students by class. 
      // For now, we fetch all and filter client-side (Optimizable later)
      const response = await axios.get('import.meta.env.VITE_API_URL/api/students', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const classStudents = response.data.filter(s => s.classId._id === selectedClass);
      setStudents(classStudents);
      
      // Initialize all as Present by default
      const initialStatus = {};
      classStudents.forEach(s => initialStatus[s._id] = "Present");
      setAttendanceData(initialStatus);

    } catch (error) {
      toast.error("Error loading students");
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Convert state object to array for backend
      const studentsArray = Object.keys(attendanceData).map(id => ({
        _id: id,
        status: attendanceData[id]
      }));

      await axios.post(import.meta.env.VITE_API_URL, {
        date,
        students: studentsArray
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Attendance Marked Successfully!");
    } catch (error) {
      toast.error("Failed to mark attendance");
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <ToastContainer />
        <h2 className="text-2xl font-bold text-gray-800">Mark Attendance</h2>

        {/* CONTROLS */}
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-wrap gap-4 items-end">
          
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Select Date</label>
            <input 
              type="date" 
              className="p-2 border rounded"
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>

          <div className="flex flex-col w-48">
            <label className="text-sm text-gray-600 mb-1">Select Class</label>
            <select 
              className="p-2 border rounded"
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">-- Choose Class --</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>{cls.grade} - {cls.section}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleLoadStudents}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 font-bold mb-[1px]"
          >
            Load Students
          </button>
        </div>

        {/* STUDENT LIST */}
        {students.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="overflow-x-auto">
              <table className="min-w-full leading-normal">
                <thead>
                  <tr>
                    <th className="px-5 py-3 border-b-2 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">Roll No</th>
                    <th className="px-5 py-3 border-b-2 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="px-5 py-3 border-b-2 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">Mark Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        #{student.rollNum}
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm font-bold">
                        {student.name}
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <div className="flex gap-4">
                          <label className="flex items-center cursor-pointer">
                            <input 
                              type="radio" 
                              name={`status-${student._id}`} 
                              checked={attendanceData[student._id] === "Present"}
                              onChange={() => handleStatusChange(student._id, "Present")}
                              className="mr-2 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-green-700 font-bold">Present</span>
                          </label>

                          <label className="flex items-center cursor-pointer">
                            <input 
                              type="radio" 
                              name={`status-${student._id}`} 
                              checked={attendanceData[student._id] === "Absent"}
                              onChange={() => handleStatusChange(student._id, "Absent")}
                              className="mr-2 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-red-700 font-bold">Absent</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleSubmit}
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold text-lg shadow-lg"
              >
                Submit Attendance
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Attendance;