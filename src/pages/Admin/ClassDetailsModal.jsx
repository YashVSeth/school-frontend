import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaTimes, FaTrash, FaChalkboardTeacher, FaUserTie } from 'react-icons/fa';

const ClassDetailsModal = ({ isOpen, onClose, classData, onUpdate }) => {
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  
  // States for Data
  const [classSubjects, setClassSubjects] = useState([]);
  const [assignedClassTeacher, setAssignedClassTeacher] = useState(""); // ✅ New State for Class Teacher
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState('');

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (isOpen) {
      fetchMetaData();
    }
  }, [isOpen, classData]); 

  const fetchMetaData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // 1. Fetch Master Data
      const [subRes, teachRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/subjects`, { headers }),
        axios.get(`${BASE_URL}/api/teachers`, { headers })
      ]);
      
      const allSubjects = subRes.data;
      const allTeachers = teachRes.data;

      setAvailableSubjects(allSubjects);
      setTeachers(allTeachers);

      // 2. Set Class Teacher (Handle Object or ID)
      if (classData && classData.classTeacher) {
          const teacherId = typeof classData.classTeacher === 'object' 
              ? classData.classTeacher._id 
              : classData.classTeacher;
          setAssignedClassTeacher(teacherId);
      } else {
          setAssignedClassTeacher("");
      }

      // 3. Hydrate Subjects (Unknown Subject Fix)
      if (classData && classData.subjects) {
        const formattedSubjects = classData.subjects.map(item => {
          if (!item.subject) return null;
          const subjectId = typeof item.subject === 'object' ? item.subject._id : item.subject;
          
          const fullSubject = allSubjects.find(s => s._id === subjectId) || { name: "Unknown Subject", _id: subjectId };
          
          return {
            ...item,
            subject: fullSubject,
            teacher: item.teacher
          };
        }).filter(Boolean);
        setClassSubjects(formattedSubjects);
      } else {
        setClassSubjects([]);
      }

    } catch (error) {
      console.error("Error fetching data", error);
      toast.error("Failed to load data.");
    }
  };

  // Add Subject
  const handleAddSubject = () => {
    if (!selectedSubjectToAdd) return;
    const exists = classSubjects.find(s => s.subject && s.subject._id === selectedSubjectToAdd);
    if (exists) return toast.warning("Subject already added!");

    const fullSubject = availableSubjects.find(s => s._id === selectedSubjectToAdd);
    setClassSubjects([...classSubjects, { subject: fullSubject, teacher: null }]);
    setSelectedSubjectToAdd('');
  };

  // Assign Subject Teacher
  const handleAssignSubjectTeacher = (subjectId, teacherId) => {
    const updated = classSubjects.map(item => {
      if (item.subject && item.subject._id === subjectId) {
        return { ...item, teacher: teacherId || null }; 
      }
      return item;
    });
    setClassSubjects(updated);
  };

  // Remove Subject
  const handleRemoveSubject = (subjectId) => {
    setClassSubjects(classSubjects.filter(item => item.subject._id !== subjectId));
  };

  // ✅ SAVE ALL CHANGES (Class Teacher + Subjects)
  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        // 1. Send Class Teacher ID
        classTeacher: assignedClassTeacher || null, 

        // 2. Send Subjects Array (IDs only)
        subjects: classSubjects.map(item => ({
          subject: item.subject._id,
          teacher: (item.teacher && typeof item.teacher === 'object') ? item.teacher._id : item.teacher
        }))
      };

      await axios.put(`${BASE_URL}/api/classes/${classData._id}`, payload, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      toast.success("Class details updated successfully!");
      onUpdate(); 
      onClose();
    } catch (error) { 
        toast.error("Failed to update class details"); 
    }
  };

  if (!isOpen || !classData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Manage Class Details</h2>
            <p className="text-sm text-slate-500 font-medium">Class: {classData.grade} - {classData.section}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 p-2 rounded-full">
            <FaTimes size={20}/>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* ✅ SECTION 1: ASSIGN CLASS TEACHER */}
          <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
             <h3 className="text-sm font-bold text-orange-800 mb-3 uppercase tracking-wide flex items-center gap-2">
                <FaUserTie /> Assign Class Teacher
             </h3>
             <select 
                className="w-full p-3 rounded-lg border border-orange-200 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                value={assignedClassTeacher}
                onChange={(e) => setAssignedClassTeacher(e.target.value)}
             >
                <option value="">-- Select Class Monitor --</option>
                {teachers.map(t => (
                    <option key={t._id} value={t._id}>{t.fullName} ({t.email})</option>
                ))}
             </select>
          </div>

          <hr className="border-slate-100" />

          {/* SECTION 2: SUBJECTS & TEACHERS */}
          <div>
              {/* Add Subject */}
              <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm mb-6">
                <h3 className="text-sm font-bold text-red-800 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <FaChalkboardTeacher /> Add New Subject
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select 
                    className="flex-1 p-3 rounded-lg border border-red-200 bg-white"
                    value={selectedSubjectToAdd}
                    onChange={(e) => setSelectedSubjectToAdd(e.target.value)}
                  >
                    <option value="">Select a Subject...</option>
                    {availableSubjects.map(sub => (
                      <option key={sub._id} value={sub._id}>{sub.name}</option>
                    ))}
                  </select>
                  <button onClick={handleAddSubject} className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700">Add</button>
                </div>
              </div>

              {/* Subject List */}
              <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wide border-b pb-2">
                  Subject Wise Teachers ({classSubjects.length})
              </h3>
              
              <div className="space-y-3">
                {classSubjects.length === 0 && (
                  <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">No subjects assigned.</div>
                )}
                
                {classSubjects.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl gap-3">
                    <div className="w-full sm:w-1/3">
                      <span className="font-bold text-slate-700 text-lg">{item.subject?.name || "Unknown"}</span>
                    </div>
                    
                    <div className="w-full sm:w-2/3 flex gap-3 items-center">
                      <select 
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        value={item.teacher ? (item.teacher._id || item.teacher) : ""}
                        onChange={(e) => handleAssignSubjectTeacher(item.subject._id, e.target.value)}
                      >
                        <option value="">-- Subject Teacher --</option>
                        {teachers.map(t => (
                          <option key={t._id} value={t._id}>{t.fullName}</option>
                        ))}
                      </select>
                      <button onClick={() => handleRemoveSubject(item.subject._id)} className="text-slate-400 hover:text-red-600 p-2.5 hover:bg-red-50 rounded-lg" title="Remove Subject">
                        <FaTrash size={16}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-slate-50 shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-xl">Cancel</button>
          <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg">Save All Changes</button>
        </div>
      </div>
    </div>
  );
};

export default ClassDetailsModal;