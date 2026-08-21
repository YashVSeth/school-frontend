import React, { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import {
  FaFileExcel, FaUpload, FaCheckCircle, FaExclamationTriangle,
  FaTimes, FaDownload, FaUserGraduate, FaChalkboardTeacher,
  FaMagic, FaSyncAlt, FaArrowRight, FaTable
} from 'react-icons/fa';

const ExcelDataImporter = ({ onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [detectedType, setDetectedType] = useState('students'); // 'students' | 'teachers'
  const [autoDetectedLabel, setAutoDetectedLabel] = useState('');
  const [mappedRows, setMappedRows] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);

  const BASE_URL = import.meta.env.VITE_API_URL;

  // ─────────────────────────────────────────────────────────────
  // 1. SMART AUTO-DETECTION ENGINE
  // ─────────────────────────────────────────────────────────────
  const detectDataType = (headers, firstRow = {}) => {
    const headerStr = headers.map(h => String(h).toLowerCase().trim()).join(' ');
    
    let studentScore = 0;
    let teacherScore = 0;

    // Student Keywords
    ['student', 'roll', 'father', 'mother', 'class', 'grade', 'admission', 'aadhar', 'dob', 'parent'].forEach(kw => {
      if (headerStr.includes(kw)) studentScore += 2;
    });

    // Teacher Keywords
    ['teacher', 'salary', 'qualification', 'specialization', 'subject', 'designation', 'experience', 'joining'].forEach(kw => {
      if (headerStr.includes(kw)) teacherScore += 2;
    });

    if (teacherScore > studentScore) {
      return { type: 'teachers', label: 'Teachers List (Auto-Detected ✨)' };
    } else {
      return { type: 'students', label: 'Students List (Auto-Detected ✨)' };
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. FLEXIBLE COLUMN MAPPER
  // ─────────────────────────────────────────────────────────────
  const normalizeKeys = (row) => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      normalized[cleanKey] = row[key];
    });
    return normalized;
  };

  const mapStudentRow = (row, index) => {
    const n = normalizeKeys(row);

    const fullName = n.fullname || n.name || n.studentname || n.student || `${n.firstname || ''} ${n.lastname || ''}`.trim() || `Student ${index + 1}`;
    const studentClass = n.class || n.grade || n.standard || n.classgrade || n.section || 'Class 1';
    const fatherName = n.fathername || n.father || n.parentname || n.parent || 'Parent';
    const motherName = n.mothername || n.mother || '';
    const phone = String(n.phone || n.mobile || n.contact || n.whatsapp || n.phoneno || n.mobileno || '').trim();
    const email = n.email || n.emailaddress || '';
    const gender = n.gender || n.sex || 'Male';
    const dob = n.dob || n.dateofbirth || n.birthdate || '';
    const bloodGroup = n.bloodgroup || n.blood || '';
    const aadharNo = n.aadharno || n.aadhar || n.uid || '';
    const address = n.address || n.city || n.residentialaddress || '';

    const isValid = Boolean(fullName && fullName.trim() !== '');

    return {
      fullName,
      class: studentClass,
      fatherName,
      motherName,
      phone: phone || '0000000000',
      email,
      gender,
      dob,
      bloodGroup,
      aadharNo,
      address,
      isValid,
      status: isValid ? 'Valid' : 'Missing Name'
    };
  };

  const mapTeacherRow = (row, index) => {
    const n = normalizeKeys(row);

    const fullName = n.fullname || n.name || n.teachername || n.teacher || `${n.firstname || ''} ${n.lastname || ''}`.trim() || `Teacher ${index + 1}`;
    const email = n.email || n.emailaddress || `${fullName.toLowerCase().replace(/\s+/g, '')}${index + 1}@school.com`;
    const phone = String(n.phone || n.mobile || n.contact || n.whatsapp || '').trim();
    const subject = n.subject || n.subjectspecialization || n.specialization || 'General';
    const qualification = n.qualification || n.degree || n.education || 'B.Ed';
    const salary = Number(n.salary || n.monthlysalary || n.pay || 25000);
    const gender = n.gender || n.sex || 'Male';
    const experience = n.experience || n.exp || '1 Year';
    const address = n.address || n.city || '';

    const isValid = Boolean(fullName && fullName.trim() !== '');

    return {
      fullName,
      email,
      phone: phone || '0000000000',
      subject,
      qualification,
      salary,
      gender,
      experience,
      address,
      isValid,
      status: isValid ? 'Valid' : 'Missing Name'
    };
  };

  // ─────────────────────────────────────────────────────────────
  // 3. FILE PARSING HANDLER
  // ─────────────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setIsProcessing(true);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawJson.length === 0) {
          toast.error("The selected Excel sheet appears to be empty.");
          setIsProcessing(false);
          return;
        }

        const headers = Object.keys(rawJson[0]);
        const detected = detectDataType(headers, rawJson[0]);

        setDetectedType(detected.type);
        setAutoDetectedLabel(detected.label);
        setParsedData(rawJson);

        // Apply initial row mapping
        const mapped = detected.type === 'students'
          ? rawJson.map((r, i) => mapStudentRow(r, i))
          : rawJson.map((r, i) => mapTeacherRow(r, i));

        setMappedRows(mapped);
        toast.success(`Excel Parsed: Detected ${mapped.length} ${detected.type === 'students' ? 'Students' : 'Teachers'}!`);

      } catch (err) {
        console.error("Excel Parse Error:", err);
        toast.error("Failed to parse Excel file. Please ensure it's a valid .xlsx or .csv.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(uploadedFile);
  };

  const handleTypeChange = (newType) => {
    setDetectedType(newType);
    if (parsedData.length > 0) {
      const mapped = newType === 'students'
        ? parsedData.map((r, i) => mapStudentRow(r, i))
        : parsedData.map((r, i) => mapTeacherRow(r, i));
      setMappedRows(mapped);
    }
  };

  const resetImporter = () => {
    setFile(null);
    setFileName('');
    setParsedData([]);
    setMappedRows([]);
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─────────────────────────────────────────────────────────────
  // 4. BULK IMPORT SUBMISSION
  // ─────────────────────────────────────────────────────────────
  const handleBulkImport = async () => {
    if (mappedRows.length === 0) return;

    setImportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const endpoint = detectedType === 'students'
        ? `${BASE_URL}/api/students/bulk-import`
        : `${BASE_URL}/api/teachers/bulk-import`;

      const payload = detectedType === 'students'
        ? { students: mappedRows }
        : { teachers: mappedRows };

      const response = await axios.post(endpoint, payload, { headers });

      const data = response.data;
      setImportSummary(data);

      toast.success(data.message || `Successfully imported ${data.importedCount} records!`);

      if (onImportSuccess) {
        onImportSuccess();
      }

    } catch (error) {
      console.error("Import Error:", error);
      const msg = error.response?.data?.message || "Bulk import failed. Please check server connection.";
      toast.error(msg);
    } finally {
      setImportLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. SAMPLE TEMPLATES DOWNLOAD
  // ─────────────────────────────────────────────────────────────
  const downloadSampleTemplate = (type) => {
    let sampleData = [];
    let fileName = '';

    if (type === 'students') {
      sampleData = [
        {
          "Full Name": "Aarav Sharma",
          "Class": "10 - A",
          "Father Name": "Rajesh Sharma",
          "Mother Name": "Pooja Sharma",
          "Phone": "9876543210",
          "Email": "aarav.parent@gmail.com",
          "Gender": "Male",
          "Date of Birth": "2010-05-15",
          "Blood Group": "B+",
          "Address": "Civil Lines, Prayagraj"
        },
        {
          "Full Name": "Ananya Verma",
          "Class": "10 - A",
          "Father Name": "Manoj Verma",
          "Mother Name": "Kavita Verma",
          "Phone": "9123456780",
          "Email": "ananya.parent@gmail.com",
          "Gender": "Female",
          "Date of Birth": "2010-08-22",
          "Blood Group": "O+",
          "Address": "Tagore Town, Prayagraj"
        }
      ];
      fileName = "Sample_Students_Template.xlsx";
    } else {
      sampleData = [
        {
          "Full Name": "Amit Kumar Mishra",
          "Email": "amit.mishra@school.com",
          "Phone": "9876501234",
          "Subject": "Mathematics",
          "Qualification": "M.Sc, B.Ed",
          "Salary": 32000,
          "Gender": "Male",
          "Experience": "5 Years",
          "Address": "George Town, Prayagraj"
        },
        {
          "Full Name": "Sunita Tiwari",
          "Email": "sunita.tiwari@school.com",
          "Phone": "9876505678",
          "Subject": "Science",
          "Qualification": "M.Sc Physics",
          "Salary": 30000,
          "Gender": "Female",
          "Experience": "3 Years",
          "Address": "Ashok Nagar, Prayagraj"
        }
      ];
      fileName = "Sample_Teachers_Template.xlsx";
    }

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, fileName);
    toast.info(`Downloaded ${fileName}`);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm transition-all">
      
      {/* Header & Template Links */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-sm shrink-0">
            <FaFileExcel />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Smart Excel Data Importer</h2>
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <FaMagic size={10} /> Auto-Detect
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Upload any spreadsheet (.xlsx, .xls, .csv) — the system automatically detects, maps & adds records to the database.
            </p>
          </div>
        </div>

        {/* Quick Sample Downloads */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => downloadSampleTemplate('students')}
            className="text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <FaDownload className="text-emerald-600" /> Student Template
          </button>
          <button
            type="button"
            onClick={() => downloadSampleTemplate('teachers')}
            className="text-xs font-bold text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <FaDownload className="text-blue-600" /> Teacher Template
          </button>
        </div>
      </div>

      {/* Upload & Dropzone Area */}
      {!file ? (
        <div className="mt-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center text-emerald-600 text-3xl group-hover:scale-110 transition-transform">
              <FaUpload />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition">
                Click to browse or drag & drop your Excel / CSV sheet here
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Supports Microsoft Excel (.xlsx, .xls) and CSV files. Auto-detects columns automatically.
              </p>
            </div>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100/70 px-4 py-1.5 rounded-full mt-1">
              Select Spreadsheet File
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">

          {/* File Status & Auto-Detect Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0">
                <FaFileExcel />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  {fileName}
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {mappedRows.length} Rows
                  </span>
                </p>
                {autoDetectedLabel && (
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">
                    {autoDetectedLabel}
                  </p>
                )}
              </div>
            </div>

            {/* Type Override Switcher */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start md:self-auto">
              <button
                type="button"
                onClick={() => handleTypeChange('students')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  detectedType === 'students'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FaUserGraduate /> Students ({mappedRows.length})
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('teachers')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  detectedType === 'teachers'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FaChalkboardTeacher /> Teachers ({mappedRows.length})
              </button>
              <button
                type="button"
                onClick={resetImporter}
                className="p-2 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-slate-100"
                title="Remove File & Reset"
              >
                <FaTimes size={14} />
              </button>
            </div>
          </div>

          {/* Import Summary Result Banner (if submitted) */}
          {importSummary && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 animate-fade-in flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <FaCheckCircle className="text-emerald-600 text-xl mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-black text-emerald-900 text-base">{importSummary.message}</h4>
                  <p className="text-xs font-medium text-emerald-700 mt-1">
                    Added <strong>{importSummary.importedCount}</strong> new {detectedType} to the portal.
                    {importSummary.errors?.length > 0 && ` (${importSummary.errors.length} skipped due to validation errors).`}
                  </p>
                </div>
              </div>
              <button
                onClick={resetImporter}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm shrink-0"
              >
                Import Another Sheet
              </button>
            </div>
          )}

          {/* Data Preview Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FaTable className="text-slate-400" /> Parsed Data Preview (First 50 Rows)
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {mappedRows.filter(r => r.isValid).length} Valid / {mappedRows.length} Total
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-h-72 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 text-slate-600 uppercase font-black tracking-wider sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Full Name</th>
                    {detectedType === 'students' ? (
                      <>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Father Name</th>
                        <th className="py-3 px-4">Contact Phone</th>
                        <th className="py-3 px-4">Gender</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Salary</th>
                      </>
                    )}
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                  {mappedRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{row.fullName}</td>
                      {detectedType === 'students' ? (
                        <>
                          <td className="py-2.5 px-4"><span className="bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold">{row.class}</span></td>
                          <td className="py-2.5 px-4">{row.fatherName}</td>
                          <td className="py-2.5 px-4">{row.phone}</td>
                          <td className="py-2.5 px-4">{row.gender}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 px-4 text-slate-500">{row.email}</td>
                          <td className="py-2.5 px-4">{row.phone}</td>
                          <td className="py-2.5 px-4"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">{row.subject}</span></td>
                          <td className="py-2.5 px-4 font-bold">₹{row.salary}</td>
                        </>
                      )}
                      <td className="py-2.5 px-4 text-center">
                        {row.isValid ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            ✅ Ready
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                            ⚠️ Incomplete
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 font-medium">
              Ready to import <strong className="text-slate-800">{mappedRows.length}</strong> {detectedType} records directly into your database.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={resetImporter}
                className="px-5 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleBulkImport}
                disabled={importLoading || mappedRows.length === 0}
                className={`flex-1 sm:flex-initial px-6 py-3 rounded-xl font-bold text-sm text-white transition flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  detectedType === 'students'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {importLoading ? (
                  <>
                    <FaSyncAlt className="animate-spin" /> Importing Records...
                  </>
                ) : (
                  <>
                    <FaArrowRight /> Complete Bulk Import ({mappedRows.length})
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default ExcelDataImporter;
