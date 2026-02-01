import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddStudent = () => {
  const [classes, setClasses] = useState([]); 
  
  const [formData, setFormData] = useState({
    name: '', email: '', classId: '',
    dob: '', gender: '', nationality: '', bloodGroup: '', photo: ''
  });

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

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('import.meta.env.VITE_API_URL/api/students', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Student Added Successfully!");
      setFormData({ 
        name: '', email: '', classId: '',
        dob: '', gender: '', nationality: '', bloodGroup: '', photo: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add student.");
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <ToastContainer />
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Student Record</h2>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <input type="text" placeholder="Full Name" required className="p-2 border rounded"
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            
            <select required className="p-2 border rounded"
              value={formData.classId} onChange={(e) => setFormData({...formData, classId: e.target.value})}>
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>{cls.grade} - {cls.section}</option>
              ))}
            </select>

             <input type="email" placeholder="Contact Email (Optional)" className="p-2 border rounded"
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
             
            <div className='flex flex-col'>
                <span className='text-xs text-gray-500'>Date of Birth</span>
                <input type="date" className="p-2 border rounded w-full"
                value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} />
            </div>

            <select className="p-2 border rounded"
              value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Third Gender">Third Gender</option>
            </select>

            <input type="text" placeholder="Nationality" className="p-2 border rounded"
              value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} />

            <input type="text" placeholder="Blood Group" className="p-2 border rounded"
              value={formData.bloodGroup} onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})} />

            <input type="text" placeholder="Photo URL" className="p-2 border rounded"
              value={formData.photo} onChange={(e) => setFormData({...formData, photo: e.target.value})} />
            
            <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold md:col-span-3">
              + Save Student
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default AddStudent;