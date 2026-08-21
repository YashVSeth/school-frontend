import React, { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import {
  FaFileExcel, FaUpload, FaCheckCircle,
  FaTimes, FaDownload, FaUserGraduate, FaChalkboardTeacher,
  FaMagic, FaSyncAlt, FaArrowRight, FaTable, FaChevronDown, FaChevronUp
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
  const [showPreview, setShowPreview] = useState(true);
  const fileInputRef = useRef(null);

  const BASE_URL = import.meta.env.VITE_API_URL;

  // ─────────────────────────────────────────────────────────────
  // 1. SMART AUTO-DETECTION ENGINE
  // ─────────────────────────────────────────────────────────────
  const detectDataType = (headers) => {
    const headerStr = headers.map(h => String(h).toLowerCase().trim()).join(' ');
    
    let studentScore = 0;
    let teacherScore = 0;

    ['student', 'roll', 'father', 'mother', 'class', 'grade', 'admission', 'aadhar', 'dob', 'parent'].forEach(kw => {
      if (headerStr.includes(kw)) studentScore += 2;
    });

    ['teacher', 'salary', 'qualification', 'specialization', 'subject', 'designation', 'experience', 'joining'].forEach(kw => {
      if (headerStr.includes(kw)) teacherScore += 2;
    });

    if (teacherScore > studentScore) {
      return { type: 'teachers', label: 'Teachers' };
    } else {
      return { type: 'students', label: 'Students' };
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
      isValid
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
      isValid
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
        const detected = detectDataType(headers);

        setDetectedType(detected.type);
        setAutoDetectedLabel(detected.label);
        setParsedData(rawJson);

        const mapped = detected.type === 'students'
          ? rawJson.map((r, i) => mapStudentRow(r, i))
          : rawJson.map((r, i) => mapTeacherRow(r, i));

        setMappedRows(mapped);
        setShowPreview(true);
        toast.success(`Detected ${mapped.length} ${detected.type === 'students' ? 'Students' : 'Teachers'}!`);

      } catch (err) {
        console.error("Excel Parse Error:", err);
        toast.error("Failed to parse Excel file.");
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
      toast.error(error.response?.data?.message || "Bulk import failed.");
    } finally {
      setImportLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. SAMPLE TEMPLATES DOWNLOAD
  // ─────────────────────────────────────────────────────────────
  const downloadSampleTemplate = (type) => {
    let sampleData = [];
    let name = '';

    if (type === 'students') {
      sampleData = [
        {
          "Full Name": "Aarav Sharma",
          "Class": "10 - A",
          "Father Name": "Rajesh Sharma",
          "Phone": "9876543210",
          "Email": "aarav.parent@gmail.com",
          "Gender": "Male",
          "Date of Birth": "2010-05-15",
          "Address": "Civil Lines, Prayagraj"
        },
        {
          "Full Name": "Ananya Verma",
          "Class": "10 - A",
          "Father Name": "Manoj Verma",
          "Phone": "9123456780",
          "Email": "ananya.parent@gmail.com",
          "Gender": "Female",
          "Date of Birth": "2010-08-22",
          "Address": "Tagore Town, Prayagraj"
        }
      ];
      name = "Sample_Students_Template.xlsx";
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
          "Address": "George Town, Prayagraj"
        }
      ];
      name = "Sample_Teachers_Template.xlsx";
    }

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, name);
    toast.info(`Downloaded ${name}`);
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm transition-all">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Slim Compact Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0 shadow-inner">
            <FaFileExcel />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">Quick Excel Data Import</h3>
              <span className="bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                <FaMagic size={8} /> Auto-Detect
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Upload .xlsx / .csv to auto-detect and import students or teachers.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => downloadSampleTemplate('students')}
              className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
            >
              <FaDownload size={10} className="text-emerald-600" /> Student Sample
            </button>
            <button
              type="button"
              onClick={() => downloadSampleTemplate('teachers')}
              className="text-[11px] font-bold text-slate-500 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
            >
              <FaDownload size={10} className="text-blue-600" /> Teacher Sample
            </button>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 active:scale-95 shrink-0"
          >
            <FaUpload size={11} /> {file ? "Change File" : "Upload Sheet"}
          </button>
        </div>
      </div>

      {/* Expanded Details when File is Selected */}
      {file && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-fade-in">
          
          {/* File summary line */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 truncate max-w-xs">{fileName}</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                {mappedRows.length} Rows
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Auto-Detected: <strong className="text-emerald-700">{autoDetectedLabel}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleTypeChange('students')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                    detectedType === 'students' ? 'bg-red-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Students
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('teachers')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                    detectedType === 'teachers' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Teachers
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-bold px-2 py-1 flex items-center gap-1"
              >
                {showPreview ? <><FaChevronUp size={9} /> Hide</> : <><FaChevronDown size={9} /> Preview</>}
              </button>

              <button
                type="button"
                onClick={resetImporter}
                className="text-slate-400 hover:text-red-500 p-1"
                title="Remove file"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>

          {/* Compact Preview Table */}
          {showPreview && mappedRows.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner max-h-48 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase font-black tracking-wider sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Full Name</th>
                    {detectedType === 'students' ? (
                      <>
                        <th className="py-2 px-3">Class</th>
                        <th className="py-2 px-3">Father Name</th>
                        <th className="py-2 px-3">Phone</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Subject</th>
                        <th className="py-2 px-3">Salary</th>
                      </>
                    )}
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                  {mappedRows.slice(0, 30).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-1.5 px-3 font-bold text-slate-800">{row.fullName}</td>
                      {detectedType === 'students' ? (
                        <>
                          <td className="py-1.5 px-3 text-red-600 font-bold">{row.class}</td>
                          <td className="py-1.5 px-3">{row.fatherName}</td>
                          <td className="py-1.5 px-3">{row.phone}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-1.5 px-3 text-slate-500">{row.email}</td>
                          <td className="py-1.5 px-3 text-blue-600 font-bold">{row.subject}</td>
                          <td className="py-1.5 px-3 font-bold">₹{row.salary}</td>
                        </>
                      )}
                      <td className="py-1.5 px-3 text-center">
                        {row.isValid ? (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            ✅ Ready
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                            ⚠️ Incomplete
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Import Summary Result Banner */}
          {importSummary && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-emerald-600 shrink-0" />
                <span className="font-bold">{importSummary.message}</span>
              </div>
              <button
                onClick={resetImporter}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shrink-0"
              >
                Import Another
              </button>
            </div>
          )}

          {/* Action Row */}
          {!importSummary && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Ready to add {mappedRows.length} {detectedType} to portal.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetImporter}
                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={importLoading || mappedRows.length === 0}
                  className={`px-4 py-1.5 rounded-lg font-bold text-xs text-white transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 ${
                    detectedType === 'students'
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  }`}
                >
                  {importLoading ? (
                    <>
                      <FaSyncAlt className="animate-spin" /> Importing...
                    </>
                  ) : (
                    <>
                      <FaArrowRight /> Import ({mappedRows.length}) Records
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default ExcelDataImporter;
