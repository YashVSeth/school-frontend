import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaTimes, FaTrash } from 'react-icons/fa';

const ClassDetailsModal = ({ isOpen, onClose, classData, onUpdate }) => {
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  
  const [classSubjects, setClassSubjects] = useState([]);
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState('');

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (isOpen) {
      fetchMetaData();
      setClassSubjects(classData?.subjects || []);
    }
  }, [isOpen, classData]);

  const fetchMetaData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [subRes, teachRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${BASE_URL}/api/teachers`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAvailableSubjects(subRes.data);
      setTeachers(teachRes.data);
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  const handleAddSubject = () => {
    if (!selectedSubjectToAdd) return;
    const exists = classSubjects.find(s => s.subject && s.subject._id === selectedSubjectToAdd);
    if (exists) return toast.warning("Subject already added");

    const fullSubject = availableSubjects.find(s => s._id === selectedSubjectToAdd);
    setClassSubjects([...classSubjects, { subject: fullSubject, teacher: null }]);
    setSelectedSubjectToAdd('');
  };

  const handleAssignTeacher = (subjectId, teacherId) => {
    const updated = classSubjects.map(item => {
      if (item.subject._id === subjectId) {
        return { ...item, teacher: teacherId || null }; 
      }
      return item;
    });
    setClassSubjects(updated);
  };

  const handleRemoveSubject = (subjectId) => {
    setClassSubjects(classSubjects.filter(item => item.subject._id !== subjectId));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = {
        subjects: classSubjects.map(item => ({
          subject: item.subject._id,
          teacher: (item.teacher && typeof item.teacher === 'object') ? item.teacher._id : item.teacher
        }))
      };

      await axios.put(`${BASE_URL}/api/classes/${classData._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Class updated!");
      onUpdate(); 
      onClose();
    } catch (error) { toast.error("Failed to update"); }
  };

  if (!isOpen || !classData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Changed: Width set to w-full for mobile, max-width constrained for desktop */}
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate pr-4">
            Manage: {classData.grade} - {classData.section}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 p-2"><FaTimes size={20}/></button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-6 overflow-y-auto">
          
          {/* Add Subject Section */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h3 className="text-sm font-bold text-blue-800 mb-2">Add Subject to Class</h3>
            {/* Changed: Stack vertically on mobile (flex-col), row on sm+ */}
            <div className="flex flex-col sm:flex-row gap-2">
              <select 
                className="flex-1 p-2.5 rounded-lg border border-blue-200 text-sm bg-white"
                value={selectedSubjectToAdd}
                onChange={(e) => setSelectedSubjectToAdd(e.target.value)}
              >
                <option value="">Select a Subject...</option>
                {availableSubjects.map(sub => (
                  <option key={sub._id} value={sub._id}>{sub.name}</option>
                ))}
              </select>
              <button onClick={handleAddSubject} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Add</button>
            </div>
          </div>

          {/* List Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Assigned Subjects & Teachers</h3>
            <div className="space-y-3">
              {classSubjects.length === 0 && <p className="text-slate-400 text-sm italic">No subjects assigned yet.</p>}
              
              {classSubjects.map((item, index) => (
                // Changed: Stack items on mobile
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border rounded-lg shadow-sm gap-3 sm:gap-0">
                  
                  {/* Subject Name */}
                  <div className="w-full sm:w-1/3 flex justify-between items-center">
                    <p className="font-bold text-slate-700">{item.subject?.name}</p>
                    {/* Trash icon visible here only on mobile? No, let's keep consistent */}
                  </div>
                  
                  {/* Teacher Dropdown & Delete Button Container */}
                  <div className="w-full sm:w-1/2 flex gap-2">
                    <select 
                      className="flex-1 p-2 bg-slate-50 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={item.teacher ? (item.teacher._id || item.teacher) : ""}
                      onChange={(e) => handleAssignTeacher(item.subject._id, e.target.value)}
                    >
                      <option value="">Assign Teacher...</option>
                      {teachers.map(t => (
                        <option key={t._id} value={t._id}>{t.fullName || t.name}</option>
                      ))}
                    </select>

                    <button 
                      onClick={() => handleRemoveSubject(item.subject._id)}
                      className="text-red-400 hover:text-red-600 p-2 bg-red-50 rounded sm:bg-transparent"
                    >
                      <FaTrash size={14}/>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white shrink-0 flex justify-end">
          <button onClick={handleSave} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all">
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
};

export default ClassDetailsModal;