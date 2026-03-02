import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import {
    FaWallet, FaPen, FaTrash, FaPlusCircle,
    FaFileInvoiceDollar, FaGasPump, FaTools, FaEllipsisH
} from 'react-icons/fa';

const EXPENSE_CATEGORIES = [
    'Stationery', 'Diesel', 'Maintenance', 'Utilities',
    'Events', 'Salaries', 'Software', 'Other'
];

const ExpenseCalculator = () => {
    const BASE_URL = import.meta.env.VITE_API_URL;
    const [loading, setLoading] = useState(true);

    // Stats State
    const [stats, setStats] = useState({
        totalMonthlyExpense: 0,
        categoryBreakdown: {},
        month: ''
    });

    // Month Filter State (Defaults to current month index 1-12)
    const currentMonth = new Date().getMonth() + 1;
    const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());

    // History State
    const [expenses, setExpenses] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

    // Form State
    const [formData, setFormData] = useState({
        category: 'Stationery',
        description: '',
        quantity: '',
        unitPrice: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Derived Total calculation on the fly
    const calculatedTotal = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.unitPrice) || 0);

    // Derived Top 3 Categories based on selected month
    const topCategories = Object.entries(stats.categoryBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

    useEffect(() => {
        fetchData();
    }, [pagination.page, selectedMonth]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [statsRes, historyRes] = await Promise.all([
                axios.get(`${BASE_URL}/api/expenses/stats?month=${selectedMonth}`, { headers }),
                axios.get(`${BASE_URL}/api/expenses?page=${pagination.page}&limit=5&month=${selectedMonth}`, { headers })
            ]);

            if (statsRes.data?.success) setStats(statsRes.data.data);
            if (historyRes.data?.success) {
                setExpenses(historyRes.data.data);
                setPagination({
                    page: historyRes.data.currentPage,
                    totalPages: historyRes.data.totalPages
                });
            }
        } catch (error) {
            toast.error("Failed to load expense data.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${BASE_URL}/api/expenses`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Expense recorded successfully!");
            setFormData({
                category: 'Stationery',
                description: '',
                quantity: '',
                unitPrice: '',
                date: new Date().toISOString().split('T')[0]
            });
            fetchData(); // Refresh UI
        } catch (error) {
            toast.error(error.response?.data?.message || "Error saving expense");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense record?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${BASE_URL}/api/expenses/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Expense deleted");
            fetchData();
        } catch (error) {
            toast.error("Error deleting expense");
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    return (
        <Layout>
            <div className="p-2 lg:p-6 font-sans bg-slate-50 min-h-screen">

                {/* Header Title */}
                <div className="mb-6">
                    <div className="flex items-center text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 gap-2">
                        <span>Admin</span>
                        <FaEllipsisH className="text-slate-300" />
                        <span className="text-red-700">Expense Calculator</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center justify-between">
                        Monthly Expense Calculator
                        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            <img src="https://i.pravatar.cc/150?img=32" alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    </h1>
                </div>

                {/* TOP METRIC CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Permanent Total Expense Card */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-red-100/50 text-red-600 rounded-xl flex items-center justify-center text-lg shadow-inner shrink-0 leading-none pb-0.5">
                                &#8377;
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Total Expense</p>
                            <h2 className="text-2xl font-black text-slate-800">{formatCurrency(stats.totalMonthlyExpense)}</h2>
                        </div>
                    </div>

                    {/* Dynamic Top 3 Categories */}
                    {topCategories.map(([category, amount], index) => {
                        const bgColors = ['bg-orange-100/50 text-orange-500', 'bg-blue-100/50 text-blue-500', 'bg-emerald-100/50 text-emerald-500'];
                        const iconColor = bgColors[index % bgColors.length];
                        return (
                            <div key={category} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner shrink-0 ${iconColor}`}>
                                        <FaFileInvoiceDollar />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider truncate" title={category}>{category}</p>
                                    <h2 className="text-2xl font-black text-slate-800">{formatCurrency(amount)}</h2>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* MAIN SPLIT CONTENT */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">

                    {/* LEFT: Add New Expense Form */}
                    <div className="xl:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-lg font-black text-slate-800">Add New Expense</h2>
                            <p className="text-xs font-medium text-slate-400">Record a new school expenditure</p>
                        </div>

                        <form onSubmit={handleAddExpense} className="p-6 flex flex-col gap-5">

                            {/* Category */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 mb-2 block">Category</label>
                                <select
                                    name="category" value={formData.category} onChange={handleChange} required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/50 transition-all"
                                >
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 mb-2 block">Description</label>
                                <input
                                    type="text" name="description" value={formData.description} onChange={handleChange} required
                                    placeholder="e.g. Printer ink and A4 paper"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/50 transition-all placeholder-slate-400"
                                />
                            </div>

                            {/* Quantity and Price Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-2 block">Quantity / Unit</label>
                                    <input
                                        type="number" min="0" step="0.01" name="quantity" value={formData.quantity} onChange={handleChange} required
                                        placeholder="0"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-2 block">Unit Price (₹)</label>
                                    <input
                                        type="number" min="0" step="0.01" name="unitPrice" value={formData.unitPrice} onChange={handleChange} required
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Date & Total Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-2 block">Date</label>
                                    <input
                                        type="date" name="date" value={formData.date} onChange={handleChange} required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-2 block">Total Calculated</label>
                                    <div className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm font-black text-red-700 flex items-center">
                                        ₹ {calculatedTotal.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {/* Submit btn */}
                            <button
                                type="submit" disabled={loading}
                                className="w-full bg-[#a30b20] hover:bg-[#850618] text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-red-900/20 transition-all flex justify-center items-center gap-2 mt-2"
                            >
                                <FaPlusCircle className="text-lg opacity-80" /> Add Expense
                            </button>
                        </form>
                    </div>

                    {/* RIGHT: Expense History Table */}
                    <div className="xl:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Expense History</h2>
                                <p className="text-xs font-medium text-slate-400">Recent expenditures for {stats.month || 'this month'}</p>
                            </div>
                            <div className="flex gap-3">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => { setSelectedMonth(e.target.value); setPagination({ page: 1, totalPages: 1 }); }}
                                    className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-bold shadow-sm outline-none cursor-pointer hover:bg-slate-50 transition-colors"
                                >
                                    <option value="1">January</option>
                                    <option value="2">February</option>
                                    <option value="3">March</option>
                                    <option value="4">April</option>
                                    <option value="5">May</option>
                                    <option value="6">June</option>
                                    <option value="7">July</option>
                                    <option value="8">August</option>
                                    <option value="9">September</option>
                                    <option value="10">October</option>
                                    <option value="11">November</option>
                                    <option value="12">December</option>
                                </select>
                                <button className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-black uppercase tracking-wide hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                                    <FaEllipsisH /> Filter
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-6 border-b border-slate-100">Category</th>
                                        <th className="py-4 px-6 border-b border-slate-100">Description</th>
                                        <th className="py-4 px-6 border-b border-slate-100">Date</th>
                                        <th className="py-4 px-6 border-b border-slate-100 text-right">Amount</th>
                                        <th className="py-4 px-6 border-b border-slate-100 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {loading && expenses.length === 0 ? (
                                        <tr><td colSpan="5" className="py-8 text-center text-slate-400 font-bold">Loading records...</td></tr>
                                    ) : expenses.length === 0 ? (
                                        <tr><td colSpan="5" className="py-8 text-center text-slate-400 font-bold">No expenses found.</td></tr>
                                    ) : (
                                        expenses.map(exp => {
                                            let tagStyle = "bg-slate-100 text-slate-600";
                                            if (exp.category === 'Stationery') tagStyle = "bg-amber-100 text-amber-700";
                                            if (exp.category === 'Diesel') tagStyle = "bg-slate-200 text-slate-700";
                                            if (exp.category === 'Maintenance') tagStyle = "bg-red-100 text-red-700";

                                            return (
                                                <tr key={exp._id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="py-4 px-6">
                                                        <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-wide ${tagStyle}`}>
                                                            {exp.category}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 font-bold text-slate-700 max-w-[200px] truncate" title={exp.description}>
                                                        {exp.description}
                                                    </td>
                                                    <td className="py-4 px-6 text-xs font-medium text-slate-500 whitespace-nowrap">
                                                        {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-black text-slate-800">
                                                        {formatCurrency(exp.total)}
                                                    </td>
                                                    <td className="py-4 px-6 text-center text-slate-300">
                                                        <div className="flex justify-center gap-3">
                                                            <button className="hover:text-amber-500 transition-colors"><FaPen size={12} /></button>
                                                            <button onClick={() => handleDelete(exp._id)} className="hover:text-red-500 transition-colors"><FaTrash size={12} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Banner */}
                        {pagination.totalPages > 1 && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs font-bold text-slate-500">
                                <span>Showing page {pagination.page} of {pagination.totalPages}</span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={pagination.page === 1}
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-all font-semibold"
                                    >
                                        Previous
                                    </button>
                                    {[...Array(pagination.totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                                            className={`px-3 py-1.5 rounded-md font-black transition-all ${pagination.page === i + 1
                                                ? 'bg-[#a30b20] text-white border border-[#850618] shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        disabled={pagination.page === pagination.totalPages}
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-all font-semibold"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </Layout>
    );
};

export default ExpenseCalculator;
