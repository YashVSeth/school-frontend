import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import Layout from '../../components/Layout';
import {
    FaSearch, FaTrash, FaPlus, FaDownload,
    FaEllipsisH, FaCheckCircle, FaShoppingBag,
    FaArrowUp, FaChevronDown
} from 'react-icons/fa';

const EXPENSE_CATEGORIES = [
    'Stationery',
    'Lab Supplies',
    'Utilities',
    'Sports',
    'Maintenance',
    'Events',
    'Salaries',
    'Diesel & Transport',
    'Software',
    'Other'
];

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const ExpenseCalculator = () => {
    const BASE_URL = import.meta.env.VITE_API_URL;
    const [loading, setLoading] = useState(false);

    // Selected Month (defaults to current month index 1-12)
    const currentMonthNum = new Date().getMonth() + 1;
    const [selectedMonth, setSelectedMonth] = useState(currentMonthNum.toString());
    const selectedYear = new Date().getFullYear();

    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        category: 'Stationery',
        description: '',
        quantity: '1',
        unitPrice: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Real Expenses & Server Stats State
    const [expenses, setExpenses] = useState([]);
    const [serverStats, setServerStats] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Derived Total calculation for Form
    const calculatedTotal = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.unitPrice) || 0);

    // Fetch data from backend whenever selected month changes
    useEffect(() => {
        fetchExpenses();
    }, [selectedMonth]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const headers = { Authorization: `Bearer ${token}` };
            const [historyRes, statsRes] = await Promise.all([
                axios.get(`${BASE_URL}/api/expenses?page=1&limit=200&month=${selectedMonth}`, { headers }).catch(() => null),
                axios.get(`${BASE_URL}/api/expenses/stats?month=${selectedMonth}`, { headers }).catch(() => null)
            ]);

            if (historyRes?.data?.success && Array.isArray(historyRes.data.data)) {
                setExpenses(historyRes.data.data);
            } else {
                setExpenses([]);
            }

            if (statsRes?.data?.success) {
                setServerStats(statsRes.data.data);
            }
        } catch (error) {
            console.error("Error fetching expense records from server:", error);
            toast.error("Failed to fetch expense records.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleResetForm = () => {
        setFormData({
            category: 'Stationery',
            description: '',
            quantity: '1',
            unitPrice: '',
            date: new Date().toISOString().split('T')[0]
        });
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        const qty = parseFloat(formData.quantity);
        const price = parseFloat(formData.unitPrice);

        if (!formData.description.trim()) {
            toast.error("Please enter an expense description.");
            return;
        }

        if (isNaN(qty) || qty <= 0) {
            toast.error("Quantity must be greater than zero.");
            return;
        }

        if (isNaN(price) || price < 0) {
            toast.error("Unit price cannot be negative.");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${BASE_URL}/api/expenses`, {
                category: formData.category,
                description: formData.description.trim(),
                quantity: qty,
                unitPrice: price,
                date: formData.date
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.success && res.data.data) {
                setExpenses(prev => [res.data.data, ...prev]);
                toast.success("Expense record added successfully!");
                handleResetForm();
            }
        } catch (error) {
            console.error("Add expense error:", error);
            toast.error(error.response?.data?.message || "Failed to record expense.");
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense record?")) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${BASE_URL}/api/expenses/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setExpenses(prev => prev.filter(item => item._id !== id));
            toast.success("Expense record deleted.");
        } catch (error) {
            console.error("Delete expense error:", error);
            toast.error("Failed to delete expense record.");
        }
    };

    // Filtered Expenses
    const displayedExpenses = useMemo(() => {
        return expenses.filter(item => {
            const matchesSearch =
                item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory =
                activeCategoryFilter === 'ALL' || item.category === activeCategoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [expenses, searchTerm, activeCategoryFilter]);

    // Dynamic KPI Metrics calculation from real expenses
    const metrics = useMemo(() => {
        const total = displayedExpenses.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        const count = displayedExpenses.length;
        const targetBudget = 150000;
        const budgetUtilizedPercent = targetBudget > 0 ? ((total / targetBudget) * 100).toFixed(1) : '0';

        // Find largest category
        const catMap = {};
        let highestBill = 0;
        let highestBillItem = null;

        displayedExpenses.forEach(exp => {
            const cat = exp.category || 'Other';
            catMap[cat] = (catMap[cat] || 0) + (Number(exp.total) || 0);
            if ((Number(exp.total) || 0) > highestBill) {
                highestBill = Number(exp.total) || 0;
                highestBillItem = exp;
            }
        });

        let largestCatName = 'None';
        let largestCatTotal = 0;
        Object.entries(catMap).forEach(([cat, catTotal]) => {
            if (catTotal > largestCatTotal) {
                largestCatTotal = catTotal;
                largestCatName = cat;
            }
        });

        const largestCatPercent = total > 0 ? ((largestCatTotal / total) * 100).toFixed(1) : '0';

        return {
            total,
            count,
            budgetUtilizedPercent,
            targetBudget,
            largestCategory: largestCatName,
            largestCatPercent,
            highestBill,
            highestBillCategory: highestBillItem?.category || (highestBill > 0 ? 'Recorded Item' : 'None')
        };
    }, [displayedExpenses]);

    // Export to Excel handler
    const handleExportExcel = () => {
        if (displayedExpenses.length === 0) {
            toast.info("No expense records to export.");
            return;
        }

        const exportData = displayedExpenses.map(item => ({
            Category: item.category,
            Description: item.description,
            Quantity: item.quantity,
            'Unit Price (INR)': item.unitPrice,
            'Total Amount (INR)': item.total,
            Date: formatDate(item.date)
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
        const monthName = MONTH_NAMES[parseInt(selectedMonth, 10) - 1] || 'Expenses';
        XLSX.writeFile(workbook, `Monthly_Expenses_${monthName}_${selectedYear}.xlsx`);
        toast.success(`Exported ${displayedExpenses.length} expense records to Excel!`);
    };

    // Date formatting helper DD-MM-YYYY
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // Currency formatting helper
    const formatINR = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val || 0);
    };

    // Category Badge Color Helper
    const getCategoryBadgeClass = (category) => {
        switch (category?.toLowerCase()) {
            case 'stationery':
                return 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60';
            case 'lab supplies':
                return 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]/60';
            case 'utilities':
                return 'bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]/60';
            case 'sports':
            case 'sports & athletics':
                return 'bg-[#FFF1F2] text-[#E11D48] border border-[#FFE4E6]';
            case 'salaries':
                return 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]';
            case 'maintenance':
                return 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]';
            default:
                return 'bg-slate-100 text-slate-700 border border-slate-200';
        }
    };

    // Pagination
    const totalPages = Math.ceil(displayedExpenses.length / itemsPerPage) || 1;
    const paginatedExpenses = displayedExpenses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const monthLabel = MONTH_NAMES[parseInt(selectedMonth, 10) - 1] || 'October';

    return (
        <Layout>
            <div className="p-3 sm:p-6 lg:p-8 font-sans bg-[#F8FAFC] min-h-screen text-slate-800">

                {/* 1. TOP HEADER & BREADCRUMBS */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        {/* Breadcrumbs */}
                        <div className="flex items-center text-[11px] font-bold uppercase tracking-wider mb-2 gap-2 text-slate-400">
                            <span>ADMIN</span>
                            <span>/</span>
                            <span>...</span>
                            <span>/</span>
                            <span className="text-[#881337] font-extrabold tracking-widest">EXPENSE CALCULATOR</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Monthly Expense Calculator
                        </h1>
                    </div>

                    {/* Right Header Status & Profile */}
                    <div className="flex items-center gap-3">
                        {/* Fiscal Cycle Badge */}
                        <div className="flex items-center gap-2 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-full shadow-sm text-xs font-semibold text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Fiscal Cycle: 2026–27 (Q3)</span>
                        </div>

                        {/* Admin Profile Chip */}
                        <div className="flex items-center gap-2.5 bg-white border border-slate-200/80 px-3 py-1.5 rounded-full shadow-sm">
                            <span className="text-xs font-bold text-slate-800 hidden sm:inline">Dr. Clara Vance</span>
                            <div className="relative">
                                <img
                                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop"
                                    alt="Admin Avatar"
                                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                                />
                                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full"></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. TOP THREE KPI METRIC CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                    {/* Card 1: TOTAL EXPENSE */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="w-11 h-11 rounded-2xl bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center font-bold text-xl shadow-inner">
                                &#8377;
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]/70">
                                <FaArrowUp className="text-[10px]" /> +4.2% MoM
                            </span>
                        </div>
                        <div className="mt-4">
                            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                TOTAL EXPENSE
                            </p>
                            <h2 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                                {formatINR(metrics.total)}
                            </h2>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400 font-medium mt-5 pt-3 border-t border-slate-50">
                            <span>Target budget: ₹1,50,000</span>
                            <span className="text-slate-600 font-semibold">{metrics.budgetUtilizedPercent}% utilized</span>
                        </div>
                    </div>

                    {/* Card 2: RECORDED VOUCHERS */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center text-lg shadow-inner">
                                <FaCheckCircle />
                            </div>
                            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/70">
                                {monthLabel} {selectedYear}
                            </span>
                        </div>
                        <div className="mt-4">
                            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                RECORDED VOUCHERS
                            </p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-3xl font-black text-slate-900 tracking-tight">
                                    {metrics.count}
                                </span>
                                <span className="text-slate-500 text-sm font-semibold">
                                    bills processed
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400 font-medium mt-5 pt-3 border-t border-slate-50">
                            <span>Auto-reconciliation active</span>
                            <span className="text-emerald-600 font-bold">
                                {metrics.count > 0 ? 'All verified' : 'Ready'}
                            </span>
                        </div>
                    </div>

                    {/* Card 3: LARGEST CATEGORY */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="w-11 h-11 rounded-2xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center text-lg shadow-inner">
                                <FaShoppingBag />
                            </div>
                            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]/70">
                                {metrics.largestCatPercent}% of total
                            </span>
                        </div>
                        <div className="mt-4">
                            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                LARGEST CATEGORY
                            </p>
                            <h2 className="text-2xl font-black text-slate-900 mt-1 tracking-tight truncate" title={metrics.largestCategory}>
                                {metrics.largestCategory}
                            </h2>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400 font-medium mt-5 pt-3 border-t border-slate-50">
                            <span>Highest bill: {formatINR(metrics.highestBill)}</span>
                            <span className="text-[#881337] font-bold truncate max-w-[120px]">
                                {metrics.highestBillCategory}
                            </span>
                        </div>
                    </div>

                </div>

                {/* 3. MAIN SPLIT CONTENT */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* LEFT COLUMN: Add New Expense */}
                    <div className="lg:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                        <div className="mb-6">
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">Add New Expense</h2>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">Record a new school expenditure</p>
                        </div>

                        <form onSubmit={handleAddExpense} className="flex flex-col gap-4">

                            {/* Category Select */}
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                                    CATEGORY
                                </label>
                                <div className="relative">
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none focus:border-rose-400 focus:bg-white transition-all appearance-none cursor-pointer"
                                    >
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                                </div>
                            </div>

                            {/* Description Input */}
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                                    DESCRIPTION
                                </label>
                                <input
                                    type="text"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Printer ink and A4 paper"
                                    className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 text-xs font-medium text-slate-700 outline-none focus:border-rose-400 focus:bg-white transition-all placeholder-slate-400"
                                    required
                                />
                            </div>

                            {/* Quantity and Unit Price Row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                                        QUANTITY / UNIT
                                    </label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none focus:border-rose-400 focus:bg-white transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                                        UNIT PRICE (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        name="unitPrice"
                                        value={formData.unitPrice}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none focus:border-rose-400 focus:bg-white transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Date and Total Calculated Row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                                        DATE
                                    </label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 outline-none focus:border-rose-400 focus:bg-white transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                                        TOTAL CALCULATED
                                    </label>
                                    <div className="w-full bg-[#FFF1F2] border border-[#FFE4E6] rounded-xl px-4 py-2.5 text-sm font-extrabold text-[#881337] flex items-center min-h-[42px]">
                                        ₹ {calculatedTotal.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {/* Add Expense Record Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#800020] hover:bg-[#68001a] text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md shadow-rose-950/15 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                            >
                                <FaPlus className="text-xs" /> Add Expense Record
                            </button>

                            {/* Reset Form Fields Button */}
                            <button
                                type="button"
                                onClick={handleResetForm}
                                className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 font-semibold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
                            >
                                Reset Form Fields
                            </button>

                        </form>
                    </div>

                    {/* RIGHT COLUMN: Expense History Table */}
                    <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">

                        {/* History Header & Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Expense History</h2>
                                <p className="text-xs font-medium text-slate-400 mt-0.5">
                                    Recent expenditures for {monthLabel} {selectedYear}
                                </p>
                            </div>

                            {/* Header Buttons: Month Selector, Filter, Export */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Month Dropdown */}
                                <div className="relative">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => {
                                            setSelectedMonth(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="appearance-none bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 font-semibold text-xs px-3.5 py-2 pr-7 rounded-xl shadow-sm outline-none cursor-pointer"
                                    >
                                        {MONTH_NAMES.map((m, idx) => (
                                            <option key={m} value={(idx + 1).toString()}>{m}</option>
                                        ))}
                                    </select>
                                    <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
                                </div>

                                {/* Filter Button */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                        className={`border px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${activeCategoryFilter !== 'ALL'
                                                ? 'bg-rose-50 border-rose-200 text-[#881337]'
                                                : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <FaEllipsisH className="text-slate-400" />
                                        <span>FILTER</span>
                                    </button>

                                    {/* Filter Popup Menu */}
                                    {showFilterDropdown && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 p-2 text-xs">
                                            <div className="font-bold text-slate-400 uppercase text-[10px] px-3 py-1.5">
                                                Filter by Category
                                            </div>
                                            <button
                                                onClick={() => { setActiveCategoryFilter('ALL'); setShowFilterDropdown(false); }}
                                                className={`w-full text-left px-3 py-1.5 rounded-lg font-semibold ${activeCategoryFilter === 'ALL' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                All Categories
                                            </button>
                                            {EXPENSE_CATEGORIES.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => { setActiveCategoryFilter(cat); setShowFilterDropdown(false); }}
                                                    className={`w-full text-left px-3 py-1.5 rounded-lg font-semibold truncate ${activeCategoryFilter === cat ? 'bg-rose-50 text-[#881337] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Export Button */}
                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    className="bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                >
                                    <FaDownload className="text-slate-400 text-xs" />
                                    <span>Export</span>
                                </button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-4">
                            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search expenditures by name or category..."
                                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-700 placeholder-slate-400 outline-none focus:border-slate-300 focus:bg-white transition-all"
                            />
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <th className="pb-3 px-3">CATEGORY</th>
                                        <th className="pb-3 px-3">DESCRIPTION</th>
                                        <th className="pb-3 px-3">DATE</th>
                                        <th className="pb-3 px-3 text-right">AMOUNT</th>
                                        <th className="pb-3 px-3 text-center">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading && displayedExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-12 text-center text-slate-400 font-semibold text-xs">
                                                Loading expense records...
                                            </td>
                                        </tr>
                                    ) : paginatedExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-12 text-center text-slate-400 font-semibold text-xs">
                                                No expense records found for this period.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedExpenses.map((exp) => (
                                            <tr key={exp._id} className="hover:bg-slate-50/70 transition-colors">
                                                {/* Category */}
                                                <td className="py-3.5 px-3 align-middle">
                                                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${getCategoryBadgeClass(exp.category)}`}>
                                                        {exp.category}
                                                    </span>
                                                </td>

                                                {/* Description with Qty/Rate subtitle */}
                                                <td className="py-3.5 px-3 align-middle">
                                                    <div className="font-bold text-slate-800 text-xs sm:text-sm">
                                                        {exp.description}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                                                        {exp.quantity && exp.unitPrice ? `Qty: ${exp.quantity} × ₹${Number(exp.unitPrice).toFixed(2)}` : null}
                                                    </div>
                                                </td>

                                                {/* Date */}
                                                <td className="py-3.5 px-3 text-xs font-medium text-slate-600 whitespace-nowrap align-middle">
                                                    {formatDate(exp.date)}
                                                </td>

                                                {/* Amount */}
                                                <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 text-xs sm:text-sm whitespace-nowrap align-middle">
                                                    {formatINR(exp.total)}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3.5 px-3 text-center align-middle">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteExpense(exp._id)}
                                                        className="text-slate-300 hover:text-rose-600 transition-colors p-1 rounded-lg cursor-pointer"
                                                        title="Delete Record"
                                                    >
                                                        <FaTrash className="text-xs" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Pagination Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto pt-6 border-t border-slate-100 text-xs text-slate-400">
                            <div>
                                Showing <span className="font-bold text-slate-700">{paginatedExpenses.length}</span> of <span className="font-bold text-slate-700">{displayedExpenses.length}</span> total expenditures
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    className="px-2.5 py-1 text-slate-500 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-500 font-semibold transition cursor-pointer"
                                >
                                    Previous
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                    <button
                                        key={pageNum}
                                        type="button"
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${currentPage === pageNum
                                                ? 'bg-[#800020] text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    className="px-2.5 py-1 text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-700 font-semibold transition cursor-pointer"
                                >
                                    Next
                                </button>
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </Layout>
    );
};

export default ExpenseCalculator;
