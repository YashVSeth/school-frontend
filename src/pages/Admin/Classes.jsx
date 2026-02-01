import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from '../../components/Layout';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({ grade: '', section: '' });

  // 1. Fetch Classes on Page Load
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
      console.error("Error fetching classes", error);
    }
  };

  // 2. Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Submit New Class
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        import.meta.env.VITE_API_URL,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Class Added Successfully!");
      setFormData({ grade: '', section: '' }); // Clear form
      fetchClasses(); // Refresh list
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding class");
    }
  };

  return (
    <Layout>
      <ToastContainer />
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* === Left Side: Add Class Form === */}
        <div className="w-full md:w-1/3 bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Add New Class</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Grade Name</label>
              <input
                type="text"
                name="grade"
                placeholder="e.g. Grade 10"
                value={formData.grade}
                onChange={handleChange}
                className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Section</label>
              <input
                type="text"
                name="section"
                placeholder="e.g. A"
                value={formData.section}
                onChange={handleChange}
                className="w-full border p-2 rounded mt-1 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              Add Class
            </button>
          </form>
        </div>

        {/* === Right Side: Class List === */}
        <div className="w-full md:w-2/3 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Existing Classes</h2>
          
          {classes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No classes added yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div key={cls._id} className="p-4 border rounded-lg hover:shadow-md transition bg-gray-50 border-l-4 border-blue-500">
                  <h3 className="text-lg font-bold text-gray-800">{cls.grade}</h3>
                  <p className="text-gray-600">Section: <span className="font-semibold">{cls.section}</span></p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default Classes;