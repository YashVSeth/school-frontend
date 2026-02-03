import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { FaSearch, FaPlusCircle } from 'react-icons/fa'; // ✅ Added Icon
import StudentFeeModal from './StudentFeeModal'; 
import FeeStructureModal from './FeeStructureModal'; // ✅ Import the Fee Modal

const Fees = () => {
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  // Search Filters
  const [searchName, setSearchName] = useState('');
  const [searchClass, setSearchClass] = useState('');

  // Modal States
  const [selectedStudent, setSelectedStudent] = useState(null); 
  const [showStructureModal, setShowStructureModal] = useState(false); // ✅ State for Fee Structure Modal
  const [classes, setClasses] = useState([]); // ✅ State to store classes list

  const [loading, setLoading] = useState(true);
  const BASE_URL = import.meta.env.VITE_API_URL;

  // 1. Fetch Students AND Classes on Load
  useEffect(() => {
    fetchStudents();
    fetchClasses(); // ✅ Load classes for the dropdown
  }, []);

  // 2. Filter Logic
  useEffect(() => {
    let result = allStudents;
    
    if (searchName) {
      result = result.filter(s => {
        const fullName = `${s.firstName || ''} ${s.lastName || ''}`;
        return fullName.toLowerCase().includes(searchName.toLowerCase());
      });
    }
    
    if (searchClass) {
      result = result.filter(s => {
        const grade = s.class?.grade ? String(s.class.grade) : '';
        return grade.toLowerCase().includes(searchClass.toLowerCase());
      });
    }

    setFilteredStudents(result);
  }, [searchName, searchClass, allStudents]);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllStudents(res.data);
      setFilteredStudents(res.data);
    } catch (err) {
      console.error("Error fetching students");
    } finally {
      setLoading(false);
    }
  };

  // ✅ New Function to Fetch Classes
  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(res.data);
    } catch (err) {
      console.error("Error fetching classes");
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in h-[calc(100vh-100px)] flex flex-col">
        
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center">
            
            {/* Title */}
            <h1 className="text-3xl font-bold text-slate-800">Fee Management</h1>
            
            {/* ✅ Fee Structure Button (Placed above filters) */}
            <button 
                onClick={() => setShowStructureModal(true)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition transform hover:-translate-y-1"
            >
                <FaPlusCircle className="text-emerald-400" /> Fee Structure
            </button>
        </div>
          
        {/* Search Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
            
            {/* Search Name */}
            <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
              <FaSearch className="text-slate-400 mr-3" />
              <input 
                type="text" 
                placeholder="Search by student name..." 
                className="bg-transparent w-full outline-none text-slate-700 font-medium"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>

            {/* Search Class */}
            <div className="w-full md:w-48 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
              <span className="text-slate-400 font-bold text-xs uppercase mr-2">Class:</span>
              <input 
                type="text" 
                placeholder="e.g. 10" 
                className="bg-transparent w-full outline-none text-slate-700 font-medium"
                value={searchClass}
                onChange={(e) => setSearchClass(e.target.value)}
              />
            </div>

        </div>

        {/* Student List Table */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
           <div className="p-4 border-b border-slate-100 font-bold text-slate-500 text-xs uppercase flex">
             <div className="flex-1">Student Details</div>
             <div className="w-32 text-center">Class</div>
             <div className="w-32 text-center">Action</div>
           </div>

           <div className="overflow-y-auto flex-1 p-2">
             {loading ? (
               <div className="text-center p-10 text-slate-400">Loading Students...</div>
             ) : filteredStudents.length === 0 ? (
               <div className="text-center p-10 text-slate-400">No students found.</div>
             ) : (
               filteredStudents.map(student => (
                 <div 
                   key={student._id}
                   onClick={() => setSelectedStudent(student)}
                   className="flex items-center p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition border-b border-slate-50 last:border-0 group"
                 >
                   <div className="flex-1 flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {student.firstName ? student.firstName.charAt(0) : "?"}
                       </div>
                       <div>
                          <div className="font-bold text-slate-700 group-hover:text-blue-600 transition">
                            {student.firstName || "Unknown"} {student.lastName || ""}
                          </div>
                          <div className="text-xs text-slate-400">{student.studentId}</div>
                       </div>
                   </div>
                   
                   <div className="w-32 text-center font-bold text-slate-500 bg-slate-100 rounded-lg py-1 text-sm">
                     {student.class?.grade ? `${student.class.grade} - ${student.class.section}` : 'N/A'}
                   </div>

                   <div className="w-32 flex justify-center">
                       <button className="text-blue-500 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-semibold transition">
                          View Fees
                       </button>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>

        {/* Modals */}
        
        {/* 1. Student Fee Payment Modal */}
        {selectedStudent && (
          <StudentFeeModal 
            isOpen={true} 
            student={selectedStudent} 
            onClose={() => setSelectedStudent(null)} 
          />
        )}

        {/* 2. ✅ Fee Structure Modal */}
        <FeeStructureModal 
            isOpen={showStructureModal}
            onClose={() => setShowStructureModal(false)}
            classes={classes}
        />

      </div>
    </Layout>
  );
};

export default Fees;