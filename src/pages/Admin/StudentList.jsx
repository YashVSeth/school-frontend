import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const StudentList = () => {
  const [students, setStudents] = useState([]);

  // 1. Define the BASE_URL correctly
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      // 2. Use the variable correctly with backticks ` `
      const response = await axios.get(`${BASE_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure? This will shift Roll Numbers for the whole class.")) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`import.meta.env.VITE_API_URL/api/students/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Student Deleted");
        fetchStudents();
      } catch (error) {
        toast.error("Failed to delete student");
      }
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <ToastContainer />
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Class List / Directory</h2>
            <button onClick={() => fetchStudents()} className="text-sm text-blue-600 hover:underline">Refresh List</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b-2 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">Roll No</th>
                  <th className="px-5 py-3 border-b-2 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                  <th className="px-5 py-3 border-b-2 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                  <th className="px-5 py-3 border-b-2 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">Details</th>
                  <th className="px-5 py-3 border-b-2 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id}>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm font-bold text-blue-600">
                        #{student.rollNum}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <div className='flex flex-col'>
                            <span className="font-bold text-gray-900">{student.name}</span>
                            <span className="text-xs text-gray-500">{student.email || "No Email"}</span>
                        </div>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-xs">
                        {student.classId?.grade} - {student.classId?.section}
                      </span>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        {student.gender} {student.bloodGroup ? `(${student.bloodGroup})` : ""}
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <button 
                        onClick={() => handleDelete(student._id)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StudentList;