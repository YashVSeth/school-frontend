import React, { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import {
  FaFileExcel, FaUpload, FaCheckCircle,
  FaTimes, FaDownload, FaUserGraduate, FaChalkboardTeacher,
  FaMagic, FaSyncAlt, FaArrowRight, FaTable, FaChevronDown, FaChevronUp
} from 'react-icons/fa';

const ExcelDataImporter = ({ onImportSuccess, defaultType = 'students' }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [detectedType, setDetectedType] = useState(defaultType); // 'students' | 'teachers'
  const [autoDetectedLabel, setAutoDetectedLabel] = useState(defaultType === 'teachers' ? 'Teachers' : 'Students');
  const [mappedRows, setMappedRows] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('ALL');
  const [workbookSheetsData, setWorkbookSheetsData] = useState({});
  const fileInputRef = useRef(null);

  const BASE_URL = import.meta.env.VITE_API_URL;

  // ─────────────────────────────────────────────────────────────
  // 1. SMART AUTO-DETECTION ENGINE
  // ─────────────────────────────────────────────────────────────
  const detectDataType = (headers) => {
    const headerStr = headers.map(h => String(h).toLowerCase().trim()).join(' ');
    
    let studentScore = 0;
    let teacherScore = 0;

    ['student', 'roll', 'father', 'fther', 'mother', 'class', 'grade', 'admission', 'parent', 'scholar'].forEach(kw => {
      if (headerStr.includes(kw)) studentScore += 2;
    });

    ['teacher', 'faculty', 'salary', 'qualification', 'specialization', 'subject', 'designation', 'experience', 'joining', 'staff', 'department', 'university', 'lecturer', 'headmaster'].forEach(kw => {
      if (headerStr.includes(kw)) teacherScore += 2;
    });

    if (defaultType === 'teachers' && teacherScore >= studentScore) {
      return { type: 'teachers', label: 'Teachers' };
    }

    if (teacherScore > studentScore) {
      return { type: 'teachers', label: 'Teachers' };
    } else if (studentScore > teacherScore) {
      return { type: 'students', label: 'Students' };
    } else {
      return { type: defaultType, label: defaultType === 'teachers' ? 'Teachers' : 'Students' };
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. FLEXIBLE COLUMN MAPPER & PHONE EXTRACTOR
  // ─────────────────────────────────────────────────────────────
  const cleanPhoneNumber = (val) => {
    if (val === undefined || val === null) return '';
    let str = String(val).trim();
    if (!str) return '';

    // If scientific notation from Excel (e.g. 9.87654321E+09)
    if (/e[+-]?\d+/i.test(str)) {
      const num = Number(str);
      if (!isNaN(num)) {
        str = Math.round(num).toString();
      }
    }

    // Strip trailing decimal e.g. 9876543210.0
    str = str.replace(/\.0+$/, '');

    // If cell contains multiple phone numbers separated by /, comma, etc., grab the first 10-12 digit sequence
    if (str.includes('/') || str.includes(',') || str.includes(';') || str.includes(' ')) {
      const parts = str.split(/[/,;\s]+/);
      for (const p of parts) {
        const pClean = p.replace(/[^\d+]/g, '');
        const pDigits = pClean.replace(/\D/g, '');
        if (pDigits.length >= 10 && pDigits.length <= 13) {
          return pClean;
        }
      }
    }

    // Remove non-digit characters except leading +
    const cleanStr = str.replace(/[^\d+]/g, '');
    return cleanStr || str;
  };

  const extractPhone = (row, norm) => {
    // 1. Direct normalized key lookups covering all common variants
    const candidateKeys = [
      'mobileno', 'mobile', 'phone', 'contact', 'whatsapp', 'mobno', 'mob',
      'phoneno', 'mobilenumber', 'phonenumber', 'contactno', 'contactnumber',
      'phno', 'ph', 'mno', 'cell', 'cellno', 'telephone', 'tel',
      'parentmobile', 'parentsmobile', 'parentmobileno', 'parentcontact',
      'fathermobile', 'fathersmobileno', 'whatsappno', 'whatsappnumber',
      'mobile1', 'mobile2', 'phone1', 'phone2'
    ];

    for (const key of candidateKeys) {
      if (norm[key] !== undefined && norm[key] !== null && String(norm[key]).trim() !== '') {
        const cleaned = cleanPhoneNumber(norm[key]);
        if (cleaned) return cleaned;
      }
    }

    // 2. Fuzzy match: inspect any key containing mobile/phone/contact/mob/whatsapp
    for (const [k, v] of Object.entries(norm)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        if (
          k.includes('mobile') ||
          k.includes('phone') ||
          k.includes('contact') ||
          k.includes('whatsapp') ||
          k.includes('mob') ||
          k.includes('cell')
        ) {
          const cleaned = cleanPhoneNumber(v);
          if (cleaned) return cleaned;
        }
      }
    }

    // 3. Inspect raw row keys and values directly
    for (const [k, v] of Object.entries(row)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const lk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (
          lk.includes('mobile') ||
          lk.includes('phone') ||
          lk.includes('contact') ||
          lk.includes('whatsapp') ||
          lk.includes('mob')
        ) {
          const cleaned = cleanPhoneNumber(v);
          if (cleaned) return cleaned;
        }
      }
    }

    // 4. Value scan fallback: find any 10-digit number cell
    for (const [k, v] of Object.entries(row)) {
      if (v !== undefined && v !== null) {
        const cleaned = cleanPhoneNumber(v);
        const digits = cleaned.replace(/\D/g, '');
        if (digits.length === 10 || (digits.length === 12 && digits.startsWith('91')) || (digits.length === 11 && digits.startsWith('0'))) {
          const lk = k.toLowerCase();
          if (!lk.includes('aadhar') && !lk.includes('roll') && !lk.includes('dob') && !lk.includes('date') && !lk.includes('class') && !lk.includes('admission') && !lk.includes('id')) {
            return cleaned;
          }
        }
      }
    }

    return '';
  };

  const normalizeKeys = (row) => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      normalized[cleanKey] = row[key];
    });
    return normalized;
  };

  const romanMap = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
    'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
    'xi': 11, 'xii': 12
  };

  const parseClassInfo = (rawClass, rawSec = '') => {
    let str = String(rawClass || '').trim();
    let sec = String(rawSec || '').trim().toUpperCase();

    if (!str) return { grade: '', section: sec };

    const lower = str.toLowerCase().replace(/\./g, '').trim();

    // Pre-primary aliases
    if (/^nurs(ery)?$/.test(lower) || lower === 'nur') return { grade: 'Nursery', section: sec };
    if (/^lkg$|^lowerkg$|^lowerkindergarten$|^kg1$|^kg-1$/.test(lower)) return { grade: 'LKG', section: sec };
    if (/^ukg$|^upperkg$|^upperkindergarten$|^kg2$|^kg-2$/.test(lower)) return { grade: 'UKG', section: sec };
    if (/^play(group)?$/.test(lower) || /^prenur(s(ery)?)?$/.test(lower)) return { grade: 'Pre-Nursery', section: sec };

    // Strip common prefixes e.g. "class", "std", "standard", "grade"
    let cleaned = str.replace(/^(class|std|standard|grade)\s*[-:]?\s*/i, '').trim();

    // 1. Check for embedded section with explicit separator: e.g. '2-A', '2 A', 'VI-A', 'VI A', '6th A', '3 - B'
    const explicitSep = cleaned.match(/^([0-9]{1,2}(?:st|nd|rd|th)?|[ivx]+(?:st|nd|rd|th)?)\s*[-/ ]\s*([a-z])$/i);
    let gradePart = cleaned;
    if (explicitSep) {
      gradePart = explicitSep[1];
      if (!sec) sec = explicitSep[2].toUpperCase();
    } else {
      // 2. Only allow unseparated section if it's DIGITS + single letter e.g. '2A', '2B', '3A', '6A', '10B'
      // NOTE: NEVER split Roman numerals without a separator (e.g. 'II', 'III', 'VI', 'VII' are whole roman numerals!)
      const digitLetter = cleaned.match(/^([0-9]{1,2}(?:st|nd|rd|th)?)\s*([a-z])$/i);
      if (digitLetter) {
        gradePart = digitLetter[1];
        if (!sec) sec = digitLetter[2].toUpperCase();
      }
    }

    // Remove ordinal suffixes e.g. 6th -> 6, 1st -> 1, 2nd -> 2, 3rd -> 3, IInd -> II, IIIrd -> III, VIth -> VI
    const cleanGrade = gradePart.toLowerCase().replace(/(st|nd|rd|th)$/i, '').trim();

    let num = null;
    if (/^\d+$/.test(cleanGrade)) {
      num = parseInt(cleanGrade, 10);
    } else if (romanMap[cleanGrade]) {
      num = romanMap[cleanGrade];
    }

    if (num && num >= 1 && num <= 12) {
      return { grade: 'Class ' + num, section: sec };
    }

    return { grade: str, section: sec };
  };

  const extractClassAndSection = (row, n) => {
    // 1. Check known normalized keys
    let rawClass = n.class || n.grade || n.standard || n.std || n.classname || 
                   n.studentclass || n.currentclass || n.classgrade || n.classsec || 
                   n.classsection || row._sheetClass || '';
    let rawSec = n.section || n.sec || '';

    // 2. If not found, fuzzy search row keys
    if (!rawClass) {
      for (const [k, v] of Object.entries(row)) {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          const lk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (lk.includes('class') || lk.includes('grade') || lk.includes('std') || lk.includes('standard')) {
            rawClass = String(v).trim();
            break;
          }
        }
      }
    }

    if (!rawSec) {
      for (const [k, v] of Object.entries(row)) {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          const lk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (lk === 'sec' || lk === 'section') {
            rawSec = String(v).trim();
            break;
          }
        }
      }
    }

    const parsed = parseClassInfo(rawClass, rawSec);
    const displayClass = parsed.grade 
      ? (parsed.section ? `${parsed.grade} - ${parsed.section}` : parsed.grade)
      : (rawClass || 'Class 1');

    return {
      displayClass,
      grade: parsed.grade || rawClass,
      section: parsed.section || rawSec
    };
  };

  const extractStudentName = (row, n) => {
    // 1. Direct normalized key lookups
    const nameKeys = [
      'fullname', 'name', 'studentname', 'studentsname', 'namestudent',
      'nameofstudent', 'nameofthestudent', 'candidatename', 'nameofcandidate',
      'childname', 'nameofchild', 'student', 'pupilname', 'pupil',
      'applicantname', 'applicant', 'shishyaname', 'chhatraname', 'vidyarthiname'
    ];
    for (const k of nameKeys) {
      if (n[k] !== undefined && n[k] !== null && String(n[k]).trim() !== '') {
        return String(n[k]).trim();
      }
    }

    // 2. First + Last name
    const first = String(n.firstname || n.fname || '').trim();
    const last = String(n.lastname || n.lname || n.surname || '').trim();
    if (first || last) return `${first} ${last}`.trim();

    // 3. Fuzzy search: inspect any key containing 'name' or 'student'
    for (const [k, v] of Object.entries(row)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const lk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (
          (lk.includes('name') || lk.includes('student')) &&
          !lk.includes('father') && !lk.includes('mother') &&
          !lk.includes('parent') && !lk.includes('school') &&
          !lk.includes('branch')
        ) {
          return String(v).trim();
        }
      }
    }

    return '';
  };

  const mapStudentRow = (row, index) => {
    const n = normalizeKeys(row);

    const fullName = extractStudentName(row, n);
    const classInfo = extractClassAndSection(row, n);
    const fatherName = n.fathername || n.fthersname || n.fathersname || n.father || n.parentname || n.parent || 'Parent';
    const motherName = n.mothername || n.mothersname || n.mother || '';
    const phone = extractPhone(row, n);
    const email = n.email || n.emailaddress || '';
    const gender = n.gender || n.sex || 'Male';
    const dob = n.dob || n.dateofbirth || n.birthdate || '';
    const bloodGroup = n.bloodgroup || n.blood || '';
    const aadharNo = n.aadharno || n.aadhar || n.uid || '';
    const address = n.address || n.city || n.residentialaddress || '';

    const isValid = Boolean(fullName && fullName.trim() !== '');

    return {
      fullName: fullName || `Student ${index + 1}`,
      rawHasName: Boolean(fullName && fullName.trim() !== ''),
      class: classInfo.displayClass,
      grade: classInfo.grade,
      section: classInfo.section,
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
      _sourceSheet: row._sourceSheet || ''
    };
  };

  const extractTeacherName = (row, n) => {
    // 1. Direct normalized key lookups
    const nameKeys = [
      'fullname', 'teachername', 'teachersname', 'facultyname', 'staffname',
      'name', 'nameofteacher', 'nameoftheteacher', 'candidatename', 'teacher',
      'adhythapakname', 'shikshakname'
    ];
    for (const k of nameKeys) {
      if (n[k] !== undefined && n[k] !== null && String(n[k]).trim() !== '') {
        return String(n[k]).trim();
      }
    }

    // 2. First + Last name
    const first = String(n.firstname || n.fname || '').trim();
    const last = String(n.lastname || n.lname || n.surname || '').trim();
    if (first || last) return `${first} ${last}`.trim();

    // 3. Fuzzy search: inspect any key containing 'teacher', 'faculty', 'staff' or 'name'
    for (const [k, v] of Object.entries(row)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const lk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (
          (lk.includes('teacher') || lk.includes('faculty') || lk.includes('staff') || lk.includes('name')) &&
          !lk.includes('father') && !lk.includes('mother') &&
          !lk.includes('student') && !lk.includes('parent') &&
          !lk.includes('school') && !lk.includes('branch')
        ) {
          return String(v).trim();
        }
      }
    }

    return '';
  };

  const mapTeacherRow = (row, index) => {
    const n = normalizeKeys(row);

    const fullName = extractTeacherName(row, n);
    const phone = extractPhone(row, n);

    // Email extraction or generation
    let email = String(n.email || n.emailaddress || n.mailid || n.mail || '').trim().toLowerCase();
    if (!email && fullName) {
      const cleanName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
      email = `${cleanName}${index + 1}@school.com`;
    }

    // Gender standardization
    let rawGender = String(n.gender || n.sex || '').trim();
    let gender = 'Male';
    if (/^f/i.test(rawGender) || /female/i.test(rawGender) || /woman/i.test(rawGender)) {
      gender = 'Female';
    } else if (/^m/i.test(rawGender) || /male/i.test(rawGender) || /man/i.test(rawGender)) {
      gender = 'Male';
    } else if (rawGender) {
      gender = rawGender;
    }

    // Subject / Specialization
    const subject = String(
      n.subject || n.specialization || n.subjectspecialization || 
      n.teachingsubject || n.department || n.discipline || 'General'
    ).trim();

    // Highest Qualification
    const qualification = String(
      n.highestqualification || n.qualification || n.degree || 
      n.education || n.academicqualification || 'B.Ed'
    ).trim();

    // University / Institute
    const university = String(n.university || n.college || n.board || n.institute || '').trim();

    // Experience
    const experience = String(n.experience || n.exp || n.teachingexperience || n.totalexperience || '1 Year').trim();

    // Base Salary
    let rawSalary = n.basesalary !== undefined ? n.basesalary : (n.salary !== undefined ? n.salary : (n.monthlysalary || n.basicpay || n.pay || n.ctc));
    let salary = 25000;
    if (rawSalary !== undefined && rawSalary !== null && String(rawSalary).trim() !== '') {
      const parsedNum = Number(String(rawSalary).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedNum) && parsedNum > 0) salary = parsedNum;
    }

    // Date of Birth
    const dob = String(n.dob || n.dateofbirth || n.birthdate || '').trim();

    // Aadhaar Number
    const aadharNo = String(n.aadhaarnumber || n.aadharno || n.aadhar || n.uid || n.aadhaar || '').trim();

    // Blood Group
    const bloodGroup = String(n.bloodgroup || n.blood || n.bg || '').trim().toUpperCase();

    // Permanent Address
    const address = String(n.permanentaddress || n.address || n.city || n.residentialaddress || '').trim();

    // Remarks & Extra Duties
    const remarks = String(n.remarks || n.remark || n.notes || '').trim();
    const extraDuties = String(n.extraduties || n.duty || 'No').trim();

    const isValid = Boolean(fullName && fullName.trim() !== '');

    return {
      fullName: fullName || `Teacher ${index + 1}`,
      rawHasName: Boolean(fullName && fullName.trim() !== ''),
      email,
      phone: phone || '0000000000',
      gender,
      dob,
      subject,
      specialization: subject,
      qualification,
      highestQualification: qualification,
      university,
      experience,
      salary,
      baseSalary: salary,
      aadhaarNumber: aadharNo,
      aadharNo,
      bloodGroup,
      address,
      permanentAddress: address,
      remarks,
      extraDuties,
      isValid,
      _sourceSheet: row._sourceSheet || ''
    };
  };

  // Helper to ensure full range of worksheet is covered, even if metadata !ref was truncated in Excel
  const ensureFullSheetRange = (ws) => {
    let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
    for (const cellAddress of Object.keys(ws)) {
      if (cellAddress.startsWith('!')) continue;
      try {
        const cell = XLSX.utils.decode_cell(cellAddress);
        if (cell.r < minR) minR = cell.r;
        if (cell.r > maxR) maxR = cell.r;
        if (cell.c < minC) minC = cell.c;
        if (cell.c > maxC) maxC = cell.c;
      } catch { /* ignore non-cell properties */ }
    }
    if (maxR >= 0 && minR !== Infinity) {
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } });
    }
  };

  const parseSingleSheet = (ws, sheetName) => {
    ensureFullSheetRange(ws);
    let rawJson = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, blankrows: false });
    if (!rawJson || rawJson.length === 0) return [];

    // Smart check: If row 1 is a title banner (common in school templates), locate real header row
    const firstKeys = Object.keys(rawJson[0]);
    const hasStandardHeaders = firstKeys.some(k =>
      /name|student|father|class|mobile|phone|roll/i.test(k)
    );

    if (!hasStandardHeaders && rawJson.length > 1) {
      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      let headerRowIndex = -1;
      for (let r = 0; r < Math.min(rawRows.length, 6); r++) {
        const rowText = (rawRows[r] || []).join(' ').toLowerCase();
        if (rowText.includes('name') || rowText.includes('class') || rowText.includes('student') || rowText.includes('teacher') || rowText.includes('mobile') || rowText.includes('subject') || rowText.includes('salary')) {
          headerRowIndex = r;
          break;
        }
      }
      if (headerRowIndex > 0) {
        rawJson = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: '', raw: false, blankrows: false });
      }
    }

    // Filter out rows that are actually repeated header rows, title banners, or blank rows with just serial numbers
    const cleanedRows = rawJson.filter(row => {
      const n = normalizeKeys(row);
      const name = extractStudentName(row, n) || extractTeacherName(row, n);
      const phone = extractPhone(row, n);
      const father = n.fathername || n.father || n.fathersname || '';
      const cls = n.class || n.grade || n.standard || n.std || '';
      const subject = n.subject || n.specialization || n.subjectspecialization || '';
      const qualification = n.qualification || n.highestqualification || n.degree || '';

      // If a row has NO name, NO phone, NO father name, NO class, and NO subject/qualification, it is an empty/blank row
      if (!name && !phone && !father && !cls && !subject && !qualification) return false;

      // Filter out repeated table headers
      const values = Object.values(row).map(v => String(v).trim().toLowerCase()).join(' ');
      if (values.includes('student name') && values.includes('father name')) return false;
      if (values.includes('full name') && values.includes('phone')) return false;
      if (values.includes('teacher name') && (values.includes('subject') || values.includes('salary') || values.includes('email'))) return false;
      return true;
    });

    // Tag each row with source sheet name if not already having class
    return cleanedRows.map(row => {
      const hasClass = row.class || row.Class || row.grade || row.Grade || row.standard || row.Standard;
      if (!hasClass && sheetName && !sheetName.toLowerCase().startsWith('sheet')) {
        return { ...row, _sheetClass: sheetName, _sourceSheet: sheetName };
      }
      return { ...row, _sourceSheet: sheetName };
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 3. FILE PARSING HANDLER (MULTI-SHEET AGGREGATION)
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
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });

        const sheetsMap = {};
        const metaList = [];
        let allCombined = [];
        let primaryDetectedType = 'students';
        let primaryDetectedLabel = 'Students';

        // Scan every worksheet in the workbook
        for (const sName of wb.SheetNames) {
          const ws = wb.Sheets[sName];
          const rows = parseSingleSheet(ws, sName);
          if (rows.length > 0) {
            sheetsMap[sName] = rows;
            metaList.push({ name: sName, count: rows.length });
            allCombined = allCombined.concat(rows);

            if (allCombined.length === rows.length) {
              const headers = Object.keys(rows[0]);
              const det = detectDataType(headers);
              primaryDetectedType = det.type;
              primaryDetectedLabel = det.label;
            }
          }
        }

        if (allCombined.length === 0) {
          toast.error("The selected Excel file appears to be empty.");
          setIsProcessing(false);
          return;
        }

        setAvailableSheets(metaList);
        setSelectedSheet('ALL');
        setWorkbookSheetsData(sheetsMap);
        setDetectedType(primaryDetectedType);
        setAutoDetectedLabel(primaryDetectedLabel);
        setParsedData(allCombined);

        const mapped = primaryDetectedType === 'students'
          ? allCombined.map((r, i) => mapStudentRow(r, i))
          : allCombined.map((r, i) => mapTeacherRow(r, i));

        setMappedRows(mapped);
        setShowPreview(true);

        if (metaList.length > 1) {
          toast.success(`Detected ${mapped.length} ${primaryDetectedType === 'students' ? 'Students' : 'Teachers'} across ${metaList.length} sheets!`);
        } else {
          toast.success(`Detected ${mapped.length} ${primaryDetectedType === 'students' ? 'Students' : 'Teachers'}!`);
        }

      } catch (err) {
        console.error("Excel Parse Error:", err);
        toast.error("Failed to parse Excel file.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleSheetSelect = (sheetName) => {
    setSelectedSheet(sheetName);
    let targetRows = [];
    if (sheetName === 'ALL') {
      Object.values(workbookSheetsData).forEach(rows => {
        targetRows = targetRows.concat(rows);
      });
    } else {
      targetRows = workbookSheetsData[sheetName] || [];
    }
    setParsedData(targetRows);
    const mapped = detectedType === 'students'
      ? targetRows.map((r, i) => mapStudentRow(r, i))
      : targetRows.map((r, i) => mapTeacherRow(r, i));
    setMappedRows(mapped);
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
    setAvailableSheets([]);
    setSelectedSheet('ALL');
    setWorkbookSheetsData({});
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

      const validRows = detectedType === 'students'
        ? mappedRows.filter(r => r.isValid && r.rawHasName !== false)
        : mappedRows.filter(r => r.isValid);

      const payload = detectedType === 'students'
        ? { students: validRows }
        : { teachers: validRows };

      const response = await axios.post(endpoint, payload, { headers });
      const data = response.data;
      setImportSummary(data);

      // Tag each row with its final import status (Imported or Rejected)
      const rejectedMap = new Map();
      (data.rejected || []).forEach(rej => {
        rejectedMap.set(rej.row, rej.reason);
      });

      const updatedRows = mappedRows.map((r, i) => {
        const rowNum = i + 1;
        if (rejectedMap.has(rowNum)) {
          return {
            ...r,
            importStatus: 'rejected',
            rejectReason: rejectedMap.get(rowNum)
          };
        } else {
          return {
            ...r,
            importStatus: 'imported'
          };
        }
      });
      setMappedRows(updatedRows);
      setShowPreview(true);

      if (data.rejectedCount > 0 && data.importedCount === 0) {
        toast.warn(`All ${data.rejectedCount} records were rejected as duplicates.`);
      } else if (data.rejectedCount > 0) {
        toast.info(`Imported ${data.importedCount} records. ${data.rejectedCount} duplicate records were rejected.`);
      } else {
        toast.success(data.message || `Successfully imported ${data.importedCount} records!`);
      }

      if (onImportSuccess && data.importedCount > 0) {
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
          "Blood Group": "B+",
          "Aadhaar Number": "548912345678",
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
          "Blood Group": "O+",
          "Aadhaar Number": "658998765432",
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
          "Gender": "Male",
          "Date of Birth": "1988-04-12",
          "Subject": "Mathematics",
          "Highest Qualification": "M.Sc, B.Ed",
          "University": "Allahabad University",
          "Experience": "5 Years",
          "Monthly Salary": 35000,
          "Aadhaar Number": "123456789012",
          "Blood Group": "B+",
          "Permanent Address": "12/4 George Town, Prayagraj",
          "Remarks": "Senior Mathematics Faculty"
        },
        {
          "Full Name": "Pooja Sharma",
          "Email": "pooja.sharma@school.com",
          "Phone": "9876505678",
          "Gender": "Female",
          "Date of Birth": "1992-09-20",
          "Subject": "English Literature",
          "Highest Qualification": "M.A, B.Ed",
          "University": "BHU Varanasi",
          "Experience": "3 Years",
          "Monthly Salary": 30000,
          "Aadhaar Number": "987654321098",
          "Blood Group": "O+",
          "Permanent Address": "45 Civil Lines, Prayagraj",
          "Remarks": "Class 10 Faculty"
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

          {/* Multi-Sheet Selector Bar if file has multiple sheets */}
          {availableSheets.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 text-xs">
              <span className="text-[11px] font-black uppercase text-emerald-900 tracking-wider flex items-center gap-1">
                📑 Worksheets ({availableSheets.length}):
              </span>
              <button
                type="button"
                onClick={() => handleSheetSelect('ALL')}
                className={`px-3 py-1 rounded-lg text-[11px] font-black transition ${
                  selectedSheet === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                All Sheets ({Object.values(workbookSheetsData).reduce((acc, r) => acc + r.length, 0)})
              </button>
              {availableSheets.map(s => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => handleSheetSelect(s.name)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                    selectedSheet === s.name
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.name} ({s.count})
                </button>
              ))}
            </div>
          )}

          {/* Compact Preview Table */}
          {showPreview && mappedRows.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner max-h-48 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase font-black tracking-wider sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    {availableSheets.length > 1 && <th className="py-2 px-3">Sheet</th>}
                    <th className="py-2 px-3">Full Name</th>
                    {detectedType === 'students' ? (
                      <>
                        <th className="py-2 px-3">Class</th>
                        <th className="py-2 px-3">Father Name</th>
                        <th className="py-2 px-3">Phone</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Subject / Specialization</th>
                        <th className="py-2 px-3">Qualification</th>
                        <th className="py-2 px-3">Base Salary</th>
                      </>
                    )}
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
                  {mappedRows.slice(0, 30).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 text-slate-400">{idx + 1}</td>
                      {availableSheets.length > 1 && (
                        <td className="py-1.5 px-3">
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                            {row._sourceSheet || 'Sheet'}
                          </span>
                        </td>
                      )}
                      <td className="py-1.5 px-3 font-bold text-slate-800">
                        <div>{row.fullName}</div>
                        {detectedType === 'teachers' && row.email && (
                          <div className="text-[10px] text-slate-400 font-normal">{row.email}</div>
                        )}
                      </td>
                      {detectedType === 'students' ? (
                        <>
                          <td className="py-1.5 px-3 text-red-600 font-bold">{row.class}</td>
                          <td className="py-1.5 px-3">{row.fatherName}</td>
                          <td className="py-1.5 px-3">{row.phone}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-1.5 px-3 text-slate-700">{row.phone}</td>
                          <td className="py-1.5 px-3 text-blue-600 font-bold">{row.specialization || row.subject}</td>
                          <td className="py-1.5 px-3 text-slate-600">
                            <span>{row.highestQualification || row.qualification}</span>
                            {row.experience && (
                              <span className="text-[10px] text-slate-400 ml-1">({row.experience})</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-emerald-700">
                            ₹{(row.baseSalary || row.salary || 0).toLocaleString()}
                          </td>
                        </>
                      )}
                      <td className="py-1.5 px-3 text-center">
                        {row.importStatus === 'rejected' ? (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded cursor-help shadow-sm"
                            title={row.rejectReason}
                          >
                            ❌ Rejected
                          </span>
                        ) : row.importStatus === 'imported' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-sm">
                            ✅ Imported
                          </span>
                        ) : row.isValid ? (
                          <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            Ready
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
            <div className="space-y-3">
              <div
                className={`border rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                  importSummary.rejectedCount > 0
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 text-xl">
                    {importSummary.rejectedCount > 0 ? '⚠️' : '✅'}
                  </div>
                  <div>
                    <p className="font-black text-sm">{importSummary.message}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ✅ Imported: <strong>{importSummary.importedCount || 0}</strong> &nbsp;|&nbsp;
                      ❌ Rejected (Duplicates): <strong className="text-red-600">{importSummary.rejectedCount || 0}</strong> &nbsp;|&nbsp;
                      Total Rows: {importSummary.totalRows || 0}
                    </p>
                  </div>
                </div>

                <button
                  onClick={resetImporter}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shrink-0"
                >
                  Upload Another File
                </button>
              </div>

              {/* Rejected Records Detailed List */}
              {importSummary.rejected && importSummary.rejected.length > 0 && (
                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 text-xs animate-fade-in">
                  <p className="font-black text-rose-800 mb-2 flex items-center justify-between">
                    <span>❌ Rejected Records ({importSummary.rejected.length} Duplicates Detected):</span>
                    <span className="text-[10px] text-rose-500 font-normal">Skipped from import to prevent duplicates</span>
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                    {importSummary.rejected.map((rej, rIdx) => (
                      <div key={rIdx} className="flex items-start justify-between bg-white p-2 rounded-lg border border-rose-100 text-[11px]">
                        <div>
                          <span className="font-bold text-slate-800">Row {rej.row}: {rej.name}</span>
                          {rej.fatherName && <span className="text-slate-400"> (Father: {rej.fatherName})</span>}
                          {!rej.fatherName && rej.email && <span className="text-slate-400"> ({rej.email})</span>}
                          {!rej.fatherName && !rej.email && rej.phone && <span className="text-slate-400"> ({rej.phone})</span>}
                        </div>
                        <span className="text-rose-600 font-semibold text-[10px] pl-2 text-right">{rej.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped / Empty Records Detailed List */}
              {importSummary.errors && importSummary.errors.length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs animate-fade-in">
                  <p className="font-black text-amber-900 mb-2 flex items-center justify-between">
                    <span>⚠️ Skipped Rows ({importSummary.errors.length} Empty or Invalid Rows):</span>
                    <span className="text-[10px] text-amber-700 font-normal">Rows without valid names were skipped</span>
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                    {importSummary.errors.map((err, eIdx) => (
                      <div key={eIdx} className="flex items-start justify-between bg-white p-2 rounded-lg border border-amber-100 text-[11px]">
                        <div>
                          <span className="font-bold text-slate-800">Row {err.row}: {err.name || 'Blank Template Row'}</span>
                        </div>
                        <span className="text-amber-700 font-semibold text-[10px] pl-2 text-right">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
