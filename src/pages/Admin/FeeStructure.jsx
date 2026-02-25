import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import { toast } from 'react-toastify';
import { FaLayerGroup, FaSave, FaMagic } from 'react-icons/fa';

const FeeStructureManager = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [formData, setFormData] = useState({ monthlyTuition: 0, admissionFee: 0, examFee: 0 });

    useEffect(() => {
        // Fetch classes for the dropdown
        axios.get('/api/classes').then(res => setClasses(res.data));
    }, []);

    const handleApply = async () => {
        try {
            await axios.post(`/api/fee-structure/apply/${selectedClass}`);
            toast.success("All student balances updated for this class!");
        } catch (err) { toast.error("Deployment failed"); }
    };

    return (
        <Layout>
            <div className="p-8 max-w-4xl mx-auto">
                <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100">
                    <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                        <FaLayerGroup className="text-red-600" /> Fee Configuration
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Target Class</label>
                            <select 
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold"
                            >
                                <option value="">Select Class</option>
                                {classes.map(c => <option key={c._id} value={c._id}>{c.grade}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Monthly Tuition (₹)</label>
                            <input 
                                type="number" 
                                onChange={(e) => setFormData({...formData, monthlyTuition: e.target.value})}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" 
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={handleApply} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-700 transition-all">
                            <FaMagic /> Apply to All Students
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default FeeStructureManager;