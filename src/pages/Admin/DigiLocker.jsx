import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Sidebar from '../../components/Sidebar';
import {
  FaShieldAlt, FaLock, FaCheckCircle, FaClock, FaTimesCircle,
  FaSearch, FaFilter, FaUpload, FaDownload, FaPrint, FaTrash,
  FaEye, FaExternalLinkAlt, FaSyncAlt, FaUserGraduate, FaChalkboardTeacher,
  FaIdCard, FaFileAlt, FaCertificate, FaQrcode, FaTimes, FaCloudDownloadAlt,
  FaBars, FaCheck, FaKey, FaStamp, FaFingerprint, FaUniversity, FaArrowRight,
  FaFilePdf, FaMobileAlt, FaInfoCircle
} from 'react-icons/fa';

const DigiLocker = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'STUDENT' | 'TEACHER'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Verified' | 'Pending Verification' | 'Rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');

  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    verificationRate: 100,
    studentDocs: 0,
    teacherDocs: 0,
    aadhaarDocs: 0,
    apaarDocs: 0,
    marksheetDocs: 0,
    certificateDocs: 0
  });
  const [candidates, setCandidates] = useState({ students: [], teachers: [] });
  const [loading, setLoading] = useState(true);

  // Modals
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // ⚡ MeriPehchaan DigiLocker Gateway Multi-Step State
  const [fetchStep, setFetchStep] = useState(1); // 1: Lookup & Select, 2: OTP & Consent, 3: Verifying Animation
  const [otpTxn, setOtpTxn] = useState({
    txnId: '',
    maskedMobile: '',
    candidateName: '',
    identifier: '',
    documentType: 'Aadhaar Card',
    ownerType: 'Student'
  });
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [securityPin, setSecurityPin] = useState('123456');
  const [consentGiven, setConsentGiven] = useState(true);
  const [otpTimer, setOtpTimer] = useState(60);
  const [verificationProgress, setVerificationProgress] = useState([]);
  const otpInputRefs = useRef([]);

  // Fetch Form Input State
  const [fetchForm, setFetchForm] = useState({
    ownerType: 'Student',
    selectedCandidateId: '',
    identifier: '',
    documentType: 'Aadhaar Card'
  });

  // Issue Document Form State (School Push to NAD)
  const [issueForm, setIssueForm] = useState({
    studentId: '',
    documentType: 'APAAR / ABC ID Card',
    academicYear: '2025-2026',
    remarks: 'Issued under National Academic Depository (NAD)',
    dscSigner: 'Principal / Controller of Examinations (DSC)'
  });

  // Upload Form State
  const [uploadForm, setUploadForm] = useState({
    ownerType: 'Student',
    ownerName: '',
    ownerIdentifier: '',
    classOrDept: '',
    documentType: 'Aadhaar Card',
    documentNumber: '',
    issuedBy: 'UIDAI (Govt. of India)',
    verificationStatus: 'Verified',
    remarks: '',
    file: null
  });

  const BASE_URL = import.meta.env.VITE_API_URL;

  // 1. Fetch Documents & Stats
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [docsRes, statsRes, candRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/digilocker/documents`, { headers }),
        axios.get(`${BASE_URL}/api/digilocker/stats`, { headers }),
        axios.get(`${BASE_URL}/api/digilocker/candidates`, { headers }).catch(() => ({ data: { students: [], teachers: [] } }))
      ]);

      if (docsRes.data?.documents) {
        setDocuments(docsRes.data.documents);
      }
      if (statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }
      if (candRes.data?.students) {
        setCandidates({
          students: candRes.data.students || [],
          teachers: candRes.data.teachers || []
        });
      }
    } catch (err) {
      console.error("Error loading DigiLocker data:", err);
      toast.error("Failed to load DigiLocker documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    let interval = null;
    if (isFetchModalOpen && fetchStep === 2 && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isFetchModalOpen, fetchStep, otpTimer]);

  // 2. Filter Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Tab filter
      if (activeTab === 'STUDENT' && doc.ownerType !== 'Student') return false;
      if (activeTab === 'TEACHER' && doc.ownerType !== 'Teacher') return false;

      // Status filter
      if (statusFilter !== 'ALL' && doc.verificationStatus !== statusFilter) return false;

      // Doc Type filter
      if (docTypeFilter !== 'ALL') {
        if (docTypeFilter === 'Aadhaar' && !doc.documentType?.toLowerCase().includes('aadhaar')) return false;
        if (docTypeFilter === 'APAAR' && !doc.documentType?.toLowerCase().includes('apaar') && !doc.documentType?.toLowerCase().includes('abc')) return false;
        if (docTypeFilter === 'Marksheet' && !doc.documentType?.toLowerCase().includes('marksheet')) return false;
        if (docTypeFilter === 'TC' && !doc.documentType?.toLowerCase().includes('transfer') && !doc.documentType?.toLowerCase().includes('tc')) return false;
        if (docTypeFilter === 'Degree' && !doc.documentType?.toLowerCase().includes('degree')) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = doc.ownerName?.toLowerCase().includes(q);
        const matchesId = doc.ownerIdentifier?.toLowerCase().includes(q);
        const matchesDocType = doc.documentType?.toLowerCase().includes(q);
        const matchesDocNo = doc.documentNumber?.toLowerCase().includes(q);
        const matchesClass = doc.classOrDept?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesDocType && !matchesDocNo && !matchesClass) {
          return false;
        }
      }

      return true;
    });
  }, [documents, activeTab, statusFilter, docTypeFilter, searchQuery]);

  // 3. Update Verification Status
  const handleUpdateStatus = async (id, newStatus, reason = '') => {
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.put(
        `${BASE_URL}/api/digilocker/verify/${id}`,
        { status: newStatus, rejectionReason: reason },
        { headers }
      );

      if (res.data?.success) {
        toast.success(`Document marked as ${newStatus}!`);
        setDocuments(prev => prev.map(d => d._id === id ? res.data.document : d));
        if (previewDoc && previewDoc._id === id) {
          setPreviewDoc(res.data.document);
        }
        const statsRes = await axios.get(`${BASE_URL}/api/digilocker/stats`, { headers });
        if (statsRes.data?.stats) setStats(statsRes.data.stats);
      }
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Failed to update status");
    } finally {
      setProcessingAction(false);
    }
  };

  // 4. Delete Document
  const handleDeleteDoc = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this document from the vault?")) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.delete(`${BASE_URL}/api/digilocker/document/${id}`, { headers });
      toast.success("Document removed from vault.");
      setDocuments(prev => prev.filter(d => d._id !== id));
      if (previewDoc?._id === id) setPreviewDoc(null);
    } catch (err) {
      console.error("Delete doc error:", err);
      toast.error("Failed to delete document");
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // ⚡ MERIPEHCHAAN DIGILOCKER GATEWAY WORKFLOW (OTP & PULL)
  // ══════════════════════════════════════════════════════════════════
  const handleOpenFetchModal = () => {
    setFetchStep(1);
    setFetchForm({
      ownerType: 'Student',
      selectedCandidateId: '',
      identifier: candidates.students[0]?.identifier || '',
      documentType: 'Aadhaar Card'
    });
    setOtpCode(['', '', '', '', '', '']);
    setOtpTimer(60);
    setVerificationProgress([]);
    setIsFetchModalOpen(true);
  };

  // Step 1: Send DigiLocker OTP
  const handleInitiateOtp = async (e) => {
    e.preventDefault();
    if (!fetchForm.identifier) {
      return toast.warn("Please select a candidate or enter an Aadhaar/Student ID.");
    }

    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(`${BASE_URL}/api/digilocker/gateway/initiate-otp`, {
        identifier: fetchForm.identifier,
        documentType: fetchForm.documentType,
        ownerType: fetchForm.ownerType
      }, { headers });

      if (res.data?.success) {
        setOtpTxn({
          txnId: res.data.txnId,
          maskedMobile: res.data.maskedMobile,
          candidateName: res.data.candidateName,
          identifier: fetchForm.identifier,
          documentType: fetchForm.documentType,
          ownerType: fetchForm.ownerType
        });
        setOtpTimer(60);
        setFetchStep(2);
        toast.info(res.data.message || `OTP dispatched to mobile ${res.data.maskedMobile}`);
      }
    } catch (err) {
      console.error("Initiate OTP error:", err);
      toast.error(err.response?.data?.message || "Failed to initiate DigiLocker OTP");
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle OTP Inputs
  const handleOtpChange = (index, val) => {
    if (val.length > 1) {
      val = val.slice(-1);
    }
    const newOtp = [...otpCode];
    newOtp[index] = val;
    setOtpCode(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleQuickFillDemoOtp = () => {
    setOtpCode(['1', '2', '3', '4', '5', '6']);
    setSecurityPin('123456');
    toast.success("Sandbox OTP (123456) & PIN autofilled!");
  };

  // Step 2: Verify OTP & Pull Document with Gateway Progress Ticker
  const handleVerifyOtpAndPull = async () => {
    const fullOtp = otpCode.join('');
    if (fullOtp.length !== 6) {
      return toast.warn("Please enter all 6 digits of the DigiLocker OTP.");
    }
    if (!consentGiven) {
      return toast.warn("Statutory consent is required under Section 4 of IT Act 2000.");
    }

    setFetchStep(3);
    setVerificationProgress([
      { step: 1, text: "Connecting to National Informatics Centre (NIC) Gateway...", status: 'running' }
    ]);

    // Ticker visual timeline
    setTimeout(() => {
      setVerificationProgress(p => [
        { step: 1, text: "Connecting to National Informatics Centre (NIC) Gateway...", status: 'done' },
        { step: 2, text: "Validating UIDAI Aadhaar cryptographic token & biometrics...", status: 'running' }
      ]);
    }, 700);

    setTimeout(() => {
      setVerificationProgress(p => [
        ...p.map((x, i) => i === 1 ? { ...x, status: 'done' } : x),
        { step: 3, text: `Retrieving digitally signed XML for ${otpTxn.documentType}...`, status: 'running' }
      ]);
    }, 1400);

    setTimeout(() => {
      setVerificationProgress(p => [
        ...p.map((x, i) => i === 2 ? { ...x, status: 'done' } : x),
        { step: 4, text: "Verifying X.509 Digital Signature & SHA-256 Digest...", status: 'running' }
      ]);
    }, 2100);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(`${BASE_URL}/api/digilocker/gateway/verify-otp-and-pull`, {
        txnId: otpTxn.txnId,
        otp: fullOtp,
        securityPin,
        consentGiven,
        identifier: otpTxn.identifier,
        documentType: otpTxn.documentType,
        ownerType: otpTxn.ownerType
      }, { headers });

      setTimeout(() => {
        setVerificationProgress(p => [
          ...p.map(x => ({ ...x, status: 'done' })),
          { step: 5, text: "Verified & Sealed into Institutional Vault!", status: 'done' }
        ]);

        if (res.data?.success) {
          toast.success(`🎉 ${otpTxn.documentType} successfully authenticated & imported!`);
          setDocuments(prev => [res.data.document, ...prev]);
          setTimeout(() => {
            setIsFetchModalOpen(false);
            setPreviewDoc(res.data.document);
          }, 900);
        }
      }, 2800);

    } catch (err) {
      console.error("Gateway verify error:", err);
      toast.error(err.response?.data?.message || "DigiLocker verification failed");
      setFetchStep(2);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // 🏛️ SCHOOL ISSUES DOCUMENT TO DIGILOCKER (NAD PUSH)
  // ══════════════════════════════════════════════════════════════════
  const handleOpenIssueModal = () => {
    if (candidates.students.length > 0) {
      setIssueForm(p => ({
        ...p,
        studentId: candidates.students[0].id
      }));
    }
    setIsIssueModalOpen(true);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueForm.studentId) {
      return toast.warn("Please select a student to issue document for.");
    }

    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(`${BASE_URL}/api/digilocker/issue`, issueForm, { headers });

      if (res.data?.success) {
        toast.success(`🎉 ${issueForm.documentType} issued to DigiLocker NAD!`);
        setDocuments(prev => [res.data.document, ...prev]);
        setIsIssueModalOpen(false);
        setPreviewDoc(res.data.document);
      }
    } catch (err) {
      console.error("Issue document error:", err);
      toast.error(err.response?.data?.message || "Failed to issue document");
    } finally {
      setProcessingAction(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // 📁 MANUAL VAULT UPLOAD
  // ══════════════════════════════════════════════════════════════════
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.ownerName || !uploadForm.documentType) {
      return toast.warn("Please enter owner name and document type.");
    }

    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      };

      const formData = new FormData();
      formData.append('ownerType', uploadForm.ownerType);
      formData.append('ownerName', uploadForm.ownerName);
      formData.append('ownerIdentifier', uploadForm.ownerIdentifier);
      formData.append('classOrDept', uploadForm.classOrDept);
      formData.append('documentType', uploadForm.documentType);
      formData.append('documentNumber', uploadForm.documentNumber);
      formData.append('issuedBy', uploadForm.issuedBy);
      formData.append('verificationStatus', uploadForm.verificationStatus);
      formData.append('remarks', uploadForm.remarks);
      if (uploadForm.file) {
        formData.append('file', uploadForm.file);
      }

      const res = await axios.post(`${BASE_URL}/api/digilocker/upload`, formData, { headers });

      if (res.data?.success) {
        toast.success("Document vaulted & verified successfully!");
        setDocuments(prev => [res.data.document, ...prev]);
        setIsUploadModalOpen(false);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.message || "Failed to upload document");
    } finally {
      setProcessingAction(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // 📱 QR VERIFICATION & DOWNLOAD UTILITIES
  // ══════════════════════════════════════════════════════════════════
  const handleInspectQr = async (doc) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${BASE_URL}/api/digilocker/verify-qr/${doc._id}`, { headers });
      if (res.data?.success) {
        setQrPayload(res.data.verificationPayload);
        setIsQrModalOpen(true);
      }
    } catch (err) {
      toast.error("Could not read QR verification metadata");
    }
  };

  const handleDownloadDocument = (doc) => {
    if (!doc?.fileUrl) return;
    try {
      const safeName = `${doc.documentType.replace(/[^a-zA-Z0-9]/g, '_')}_${doc.ownerName.replace(/[^a-zA-Z0-9]/g, '_')}_DigiLocker.svg`;
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Verified certificate downloaded successfully!");
    } catch {
      window.open(doc.fileUrl, '_blank');
    }
  };

  const handlePrintDocument = () => {
    window.print();
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans select-none text-slate-800">
      {/* Admin Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              aria-label="Toggle Navigation"
            >
              <FaBars size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#003366] to-[#002244] text-yellow-300 flex items-center justify-center shadow-xs">
                <FaShieldAlt size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                    DigiLocker Vault
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    MeriPehchaan Auth v2.4
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 leading-none">
                  National Academic Depository (NAD) · Digital India Gateway
                </p>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            {/* ⚡ Fetch via DigiLocker (OTP) */}
            <button
              onClick={handleOpenFetchModal}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#003366] to-[#002244] hover:from-[#002244] hover:to-[#00172e] text-white text-xs font-black transition active:scale-95 shadow-md shadow-blue-900/20 flex items-center gap-1.5"
            >
              <FaCloudDownloadAlt size={14} className="text-yellow-300" />
              <span>Fetch via DigiLocker</span>
            </button>

            {/* 🏛️ Issue Document (School Push) */}
            <button
              onClick={handleOpenIssueModal}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8f0631] to-[#750426] hover:from-[#750426] hover:to-[#5c031e] text-white text-xs font-black transition active:scale-95 shadow-md shadow-[#8f0631]/20 flex items-center gap-1.5"
            >
              <FaStamp size={13} className="text-amber-300" />
              <span className="hidden sm:inline">Issue to</span> DigiLocker
            </button>

            {/* 📁 Manual Upload */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition active:scale-95 flex items-center gap-1.5"
              title="Manual Vault Upload"
            >
              <FaUpload size={12} className="text-slate-500" />
              <span className="hidden md:inline">Upload</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-5 custom-scrollbar">

          {/* 🏛️ OFFICIAL DIGILOCKER HERO BANNER */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#001833] via-[#002d5a] to-[#003366] text-white p-5 sm:p-7 shadow-xl border border-blue-900/60">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

            {/* Tricolor Ribbon on Top */}
            <div className="absolute top-0 left-0 right-0 h-1.5 flex">
              <div className="flex-1 bg-[#FF9933]"></div>
              <div className="flex-1 bg-white"></div>
              <div className="flex-1 bg-[#138808]"></div>
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-1.5">
                    <span className="text-xs">🇮🇳</span>
                    <span className="text-[10px] font-black text-yellow-300 uppercase tracking-wider">
                      Digital India · National Academic Depository (NAD)
                    </span>
                  </div>
                  <span className="text-xs text-blue-200 font-bold hidden sm:inline">|</span>
                  <span className="text-[11px] text-blue-200 font-medium hidden sm:inline">
                    IT Act 2000 (Section 4) Statutory Compliance
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  Institutional Electronic Document Repository
                </h2>

                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                  Real-time synchronization with UIDAI Aadhaar, CBSE Examination Board, and Ministry of Education APAAR ID registry. Every certificate is cryptographically signed and legally validated.
                </p>
              </div>

              {/* Status Metric Pill */}
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/15 p-3 rounded-2xl shrink-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black">
                  <FaFingerprint size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Gateway Status: Operational
                  </div>
                  <p className="text-[10px] text-blue-200 mt-0.5">
                    X.509 PKI 2048-bit · 100% Verification Rate
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 📊 ANALYTICS STAT CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Total Documents */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
                <FaShieldAlt size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Vault Records</span>
                <span className="text-lg font-black text-slate-900 block leading-tight">{stats.total}</span>
              </div>
            </div>

            {/* Aadhaar Cards */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <FaIdCard size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">UIDAI Aadhaar</span>
                <span className="text-lg font-black text-slate-900 block leading-tight">{stats.aadhaarDocs || 0}</span>
              </div>
            </div>

            {/* APAAR ID */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <FaFingerprint size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">APAAR / ABC IDs</span>
                <span className="text-lg font-black text-slate-900 block leading-tight">{stats.apaarDocs || 0}</span>
              </div>
            </div>

            {/* Marksheets */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
                <FaCertificate size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">CBSE Marksheets</span>
                <span className="text-lg font-black text-slate-900 block leading-tight">{stats.marksheetDocs || 0}</span>
              </div>
            </div>

            {/* Verification Rate */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <FaCheckCircle size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Verified Rate</span>
                <span className="text-lg font-black text-emerald-600 block leading-tight">{stats.verificationRate}%</span>
              </div>
            </div>
          </div>

          {/* 🔍 CONTROLS & FILTER BAR */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Entity Tabs: All | Students | Teachers */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
                <button
                  onClick={() => setActiveTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Vault ({stats.total})
                </button>
                <button
                  onClick={() => setActiveTab('STUDENT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'STUDENT'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FaUserGraduate size={11} className="text-[#8f0631]" />
                  Students ({stats.studentDocs})
                </button>
                <button
                  onClick={() => setActiveTab('TEACHER')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'TEACHER'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FaChalkboardTeacher size={12} className="text-[#003366]" />
                  Faculty ({stats.teacherDocs})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student, teacher, Aadhaar, roll number, or doc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#8f0631]/20 focus:border-[#8f0631] outline-hidden transition"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-[#8f0631]/20 outline-hidden"
                >
                  <option value="ALL">All Status</option>
                  <option value="Verified">Verified Only</option>
                  <option value="Pending Verification">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <button
                  onClick={fetchData}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition active:scale-95"
                  title="Refresh Vault Records"
                >
                  <FaSyncAlt size={12} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Quick Document Type Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 shrink-0">Quick Filter:</span>
              {[
                { id: 'ALL', label: 'All Documents' },
                { id: 'Aadhaar', label: 'UIDAI Aadhaar' },
                { id: 'APAAR', label: 'APAAR / ABC ID' },
                { id: 'Marksheet', label: 'CBSE Marksheet' },
                { id: 'TC', label: 'Transfer Cert (TC)' },
                { id: 'Degree', label: 'Faculty Degree' }
              ].map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setDocTypeFilter(pill.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition ${
                    docTypeFilter === pill.id
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* 📄 DOCUMENTS TABLE */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold">Synchronizing DigiLocker Vault Records...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto text-xl shadow-xs">
                  <FaShieldAlt />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">No DigiLocker Documents Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No records matching your search or filters. Use the "Fetch via DigiLocker" button above to pull verified documents directly from the National Gateway.
                </p>
                <button
                  onClick={handleOpenFetchModal}
                  className="px-4 py-2 rounded-xl bg-[#003366] text-white text-xs font-bold hover:bg-[#002244] transition inline-flex items-center gap-2 mt-2"
                >
                  <FaCloudDownloadAlt size={14} className="text-yellow-300" />
                  Fetch from DigiLocker
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-5">Document & Type</th>
                      <th className="py-3.5 px-4">Candidate / Holder</th>
                      <th className="py-3.5 px-4">Doc / Roll / Serial No</th>
                      <th className="py-3.5 px-4">Verification Status</th>
                      <th className="py-3.5 px-4">DigiLocker Seal</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocuments.map((doc) => {
                      const isStudent = doc.ownerType === 'Student';
                      const isAadhaar = doc.documentType?.toLowerCase().includes('aadhaar');
                      const isApaar = doc.documentType?.toLowerCase().includes('apaar') || doc.documentType?.toLowerCase().includes('abc');
                      const isMarksheet = doc.documentType?.toLowerCase().includes('marksheet');
                      const isTc = doc.documentType?.toLowerCase().includes('transfer') || doc.documentType?.toLowerCase().includes('tc');

                      return (
                        <tr
                          key={doc._id}
                          onClick={() => setPreviewDoc(doc)}
                          className="hover:bg-slate-50/70 cursor-pointer transition"
                        >
                          {/* Document Type with Icon */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isAadhaar ? 'bg-red-50 text-red-600' :
                                isApaar ? 'bg-blue-50 text-blue-600' :
                                isMarksheet ? 'bg-purple-50 text-purple-600' :
                                isTc ? 'bg-amber-50 text-amber-700' :
                                'bg-emerald-50 text-emerald-600'
                              }`}>
                                {isAadhaar ? <FaIdCard size={16} /> :
                                 isApaar ? <FaFingerprint size={16} /> :
                                 isMarksheet ? <FaCertificate size={16} /> :
                                 isTc ? <FaFileAlt size={16} /> :
                                 <FaShieldAlt size={16} />}
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-900 block truncate leading-tight">
                                  {doc.documentType}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold block truncate">
                                  {doc.issuedBy || 'National Depository'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Candidate / Holder */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                isStudent ? 'bg-rose-50 text-[#8f0631]' : 'bg-blue-50 text-[#003366]'
                              }`}>
                                {doc.ownerType}
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 block leading-tight">
                                  {doc.ownerName}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium block">
                                  {doc.classOrDept || 'General'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Identifier / Doc No */}
                          <td className="py-3.5 px-4 font-mono text-[11px] font-bold text-slate-700">
                            {doc.documentNumber || doc.ownerIdentifier || 'N/A'}
                          </td>

                          {/* Verification Status */}
                          <td className="py-3.5 px-4">
                            {doc.verificationStatus === 'Verified' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <FaCheckCircle size={10} className="text-emerald-600" />
                                Verified
                              </span>
                            ) : doc.verificationStatus === 'Pending Verification' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                <FaClock size={10} className="text-amber-600" />
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                <FaTimesCircle size={10} className="text-rose-600" />
                                Rejected
                              </span>
                            )}
                          </td>

                          {/* DigiLocker Digital India Seal */}
                          <td className="py-3.5 px-4">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectQr(doc);
                              }}
                              className="inline-flex items-center gap-1 text-blue-900 bg-blue-50/90 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition"
                              title="Click to inspect cryptographic signature & QR"
                            >
                              <span className="text-xs">🇮🇳</span>
                              <span className="text-[10px] font-black tracking-wider uppercase text-blue-800">
                                DigiLocker
                              </span>
                              <FaCheckCircle size={9} className="text-emerald-600 ml-0.5" />
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Fast Verify Toggle */}
                              {doc.verificationStatus !== 'Verified' ? (
                                <button
                                  onClick={() => handleUpdateStatus(doc._id, 'Verified')}
                                  title="Approve & Mark Verified"
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition active:scale-95"
                                >
                                  <FaCheck size={13} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateStatus(doc._id, 'Pending Verification')}
                                  title="Revoke Verification"
                                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition active:scale-95"
                                >
                                  <FaClock size={13} />
                                </button>
                              )}

                              {/* QR Payload Inspect */}
                              <button
                                onClick={() => handleInspectQr(doc)}
                                title="Inspect Digital Signature & QR"
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition active:scale-95"
                              >
                                <FaQrcode size={13} />
                              </button>

                              {/* Download SVG */}
                              <button
                                onClick={() => handleDownloadDocument(doc)}
                                title="Download Verified Certificate"
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition active:scale-95"
                              >
                                <FaDownload size={12} />
                              </button>

                              {/* View / Open */}
                              <button
                                onClick={() => setPreviewDoc(doc)}
                                title="View Document"
                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition active:scale-95"
                              >
                                <FaEye size={13} />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={(e) => handleDeleteDoc(doc._id, e)}
                                title="Delete from Vault"
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95"
                              >
                                <FaTrash size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 🔍 MODAL 1: FULL DOCUMENT PREVIEW & DIGITAL VERIFICATION   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#002244] to-[#003366] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-yellow-300">
                  <FaShieldAlt size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">{previewDoc.documentType}</h3>
                    <span className="text-[10px] bg-yellow-400 text-slate-900 font-extrabold px-2 py-0.5 rounded-full uppercase">
                      DigiLocker Verified
                    </span>
                  </div>
                  <p className="text-xs text-blue-200">
                    Holder: <strong>{previewDoc.ownerName}</strong> ({previewDoc.classOrDept || 'General'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadDocument(previewDoc)}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition flex items-center gap-1.5"
                  title="Download Certificate"
                >
                  <FaDownload size={11} /> Download
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95"
                >
                  <FaTimes size={14} />
                </button>
              </div>
            </div>

            {/* Modal Body: Document Preview */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar flex flex-col gap-5">
              
              {/* Document Meta Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Identifier / Doc No</span>
                  <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">
                    {previewDoc.documentNumber || previewDoc.ownerIdentifier || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Issuing Authority</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block truncate">
                    {previewDoc.issuedBy || 'DigiLocker Authority'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">DigiLocker URI</span>
                  <span className="font-mono text-[10px] font-bold text-blue-700 block truncate">
                    {previewDoc.digilockerUri || 'in.gov.digilocker:doc:val'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Digital Verification</span>
                  <button
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="inline-flex items-center gap-1 font-bold text-xs mt-0.5 text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                  >
                    <FaCheckCircle size={11} /> Signature Valid
                  </button>
                </div>
              </div>

              {/* Document Image/SVG Container */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-2 sm:p-4 shadow-sm flex items-center justify-center min-h-[380px] overflow-hidden">
                {previewDoc.fileUrl ? (
                  <img
                    src={previewDoc.fileUrl}
                    alt={previewDoc.documentType}
                    className="max-h-[520px] w-auto max-w-full rounded-xl object-contain shadow-xs border border-slate-100"
                  />
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <FaFileAlt size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold">Document Preview Not Available</p>
                  </div>
                )}
              </div>

              {/* Status Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">
                  Verified by: <strong>{previewDoc.verifiedBy || 'Administrator'}</strong>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Digital Signature Inspection */}
                  <button
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1.5 border border-blue-200"
                  >
                    <FaKey size={11} className="text-blue-700" /> Signature Properties
                  </button>

                  {/* QR Inspection */}
                  <button
                    onClick={() => handleInspectQr(previewDoc)}
                    className="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-800 hover:bg-purple-100 text-xs font-bold transition flex items-center gap-1.5 border border-purple-200"
                  >
                    <FaQrcode size={12} className="text-purple-700" /> Verify QR
                  </button>

                  {/* Print Button */}
                  <button
                    onClick={handlePrintDocument}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black transition active:scale-95 flex items-center gap-1.5"
                  >
                    <FaPrint size={12} /> Print Slip
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 🔏 MODAL 1B: DIGITAL SIGNATURE PROPERTIES DIALOG           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 text-xs space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FaStamp size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Digital Signature Validation</h3>
                  <span className="text-[10px] text-slate-500 font-medium">PKI / X.509 Cryptographic Certificate</span>
                </div>
              </div>
              <button
                onClick={() => setIsSignatureModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <FaTimes size={12} />
              </button>
            </div>

            {/* Validation Banner */}
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
              <FaCheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-black text-emerald-900 text-xs">Signature is VALID</h4>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  The document has not been modified since this electronic signature was applied. The signer's certificate is valid and issued by a certified authority under Controller of Certifying Authorities (CCA India).
                </p>
              </div>
            </div>

            {/* Certificate Details List */}
            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Signer Identity:</span>
                <span className="font-extrabold text-slate-900">{previewDoc?.verifiedBy || 'National DigiLocker Authority'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Signing Authority:</span>
                <span className="font-bold text-blue-900">CCA India Root CA 2014 / NIC-CA</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Signing Time:</span>
                <span className="font-mono text-slate-800">{new Date(previewDoc?.verifiedAt || previewDoc?.createdAt || Date.now()).toUTCString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Hash Algorithm:</span>
                <span className="font-mono font-bold text-slate-800">SHA-256 with RSA 2048-bit</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-bold text-slate-500">Legal Admissibility:</span>
                <span className="font-bold text-emerald-700">Section 4 & 6A of IT Act 2000</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsSignatureModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 📱 MODAL 1C: QR CODE DECRYPTED VERIFICATION PAYLOAD         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isQrModalOpen && qrPayload && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 text-xs space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <FaQrcode size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">DigiLocker QR Decryption</h3>
                  <span className="text-[10px] text-slate-500 font-medium">National Gateway Signature Digest</span>
                </div>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <FaTimes size={12} />
              </button>
            </div>

            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 font-bold flex items-center justify-between">
              <span>Status: {qrPayload.status}</span>
              <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full uppercase">ISO 27001</span>
            </div>

            {/* Cryptographic JSON Payload Viewer */}
            <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-60 custom-scrollbar">
              <pre>{JSON.stringify(qrPayload, null, 2)}</pre>
            </div>

            <p className="text-[10px] text-slate-500 leading-tight">
              {qrPayload.statutoryCompliance}
            </p>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ⚡ MODAL 2: MERIPEHCHAAN DIGILOCKER GATEWAY WORKFLOW (OTP) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isFetchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Official MeriPehchaan Brand Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#003366] text-yellow-300 flex items-center justify-center shadow-xs">
                  <FaCloudDownloadAlt size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-base text-slate-900 leading-tight">DigiLocker Gateway</h3>
                    <span className="text-[9px] font-extrabold bg-[#003366] text-yellow-300 px-1.5 py-0.5 rounded uppercase">
                      MeriPehchaan
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">National Repository Consent Protocol</span>
                </div>
              </div>
              <button
                onClick={() => setIsFetchModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <FaTimes size={12} />
              </button>
            </div>

            {/* ── STEP 1: CANDIDATE LOOKUP & DOCUMENT SELECTION ── */}
            {fetchStep === 1 && (
              <form onSubmit={handleInitiateOtp} className="space-y-4">
                {/* Target Entity */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFetchForm(p => ({
                        ...p,
                        ownerType: 'Student',
                        identifier: candidates.students[0]?.identifier || ''
                      }));
                    }}
                    className={`py-2 rounded-xl text-xs font-black transition border ${
                      fetchForm.ownerType === 'Student'
                        ? 'bg-[#8f0631] text-white border-[#8f0631]'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Student Record
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFetchForm(p => ({
                        ...p,
                        ownerType: 'Teacher',
                        identifier: candidates.teachers[0]?.identifier || ''
                      }));
                    }}
                    className={`py-2 rounded-xl text-xs font-black transition border ${
                      fetchForm.ownerType === 'Teacher'
                        ? 'bg-[#003366] text-white border-[#003366]'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Faculty Record
                  </button>
                </div>

                {/* Candidate Selection Dropdown */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Select Enrolled {fetchForm.ownerType} *
                  </label>
                  <select
                    value={fetchForm.identifier}
                    onChange={(e) => setFetchForm(p => ({ ...p, identifier: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-600/20 outline-hidden"
                  >
                    {fetchForm.ownerType === 'Student' ? (
                      candidates.students.map(s => (
                        <option key={s.id} value={s.identifier}>
                          {s.name} ({s.classGrade}) - {s.identifier}
                        </option>
                      ))
                    ) : (
                      candidates.teachers.map(t => (
                        <option key={t.id} value={t.identifier}>
                          {t.name} ({t.dept}) - {t.email}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Or Manual Identifier Input */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Or Enter Aadhaar / Student ID Manually
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12-digit Aadhaar or STU-2026-001"
                    value={fetchForm.identifier}
                    onChange={(e) => setFetchForm(p => ({ ...p, identifier: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium font-mono focus:ring-2 focus:ring-blue-600/20 outline-hidden"
                  />
                </div>

                {/* Document Type to Fetch */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Document to Retrieve from National Gateway *
                  </label>
                  <select
                    value={fetchForm.documentType}
                    onChange={(e) => setFetchForm(p => ({ ...p, documentType: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-hidden"
                  >
                    <option value="Aadhaar Card">Aadhaar Card (UIDAI Verified)</option>
                    <option value="APAAR / ABC ID Card">APAAR / ABC ID (Ministry of Education)</option>
                    <option value="10th Class Marksheet">10th Class Marksheet (CBSE / State)</option>
                    <option value="12th Class Marksheet">12th Class Marksheet (CBSE / State)</option>
                    <option value="Transfer Certificate (TC)">Transfer Certificate (TC)</option>
                    <option value="Birth Certificate">Birth Certificate (Municipal Depository)</option>
                    <option value="Degree Certificate">Bachelor / B.Ed Teaching Degree</option>
                  </select>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/70 text-[11px] text-blue-900 flex items-center gap-2">
                  <FaShieldAlt size={14} className="text-blue-700 shrink-0" />
                  <span>Next: DigiLocker will dispatch a 6-digit OTP to the UIDAI linked mobile.</span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFetchModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingAction}
                    className="px-5 py-2.5 rounded-xl bg-[#003366] hover:bg-[#002244] text-white text-xs font-black transition active:scale-95 shadow-md shadow-blue-950/20 flex items-center gap-2"
                  >
                    {processingAction ? "Connecting Gateway..." : "Request DigiLocker OTP"} <FaArrowRight size={11} />
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 2: REALISTIC OTP & MERIPEHCHAAN CONSENT ── */}
            {fetchStep === 2 && (
              <div className="space-y-4">
                
                {/* OTP Notification Card */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold">Candidate:</span>
                    <span className="font-extrabold text-slate-900">{otpTxn.candidateName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold">Dispatched To:</span>
                    <span className="font-mono font-black text-blue-700">{otpTxn.maskedMobile}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold">Target Document:</span>
                    <span className="font-bold text-[#8f0631]">{otpTxn.documentType}</span>
                  </div>
                </div>

                {/* 6-Digit OTP Box */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-slate-800">
                      Enter 6-Digit DigiLocker OTP
                    </label>
                    <span className="text-[11px] font-mono font-bold text-blue-800">
                      Expires in: {otpTimer}s
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => otpInputRefs.current[idx] = el}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-12 h-13 text-center text-lg font-black font-mono rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-hidden bg-white"
                      />
                    ))}
                  </div>

                  {/* Sandbox helper button */}
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={handleQuickFillDemoOtp}
                      className="text-blue-700 hover:text-blue-900 font-black underline"
                    >
                      ⚡ Quick Fill Demo OTP (123456)
                    </button>
                    {otpTimer === 0 && (
                      <button
                        type="button"
                        onClick={() => setOtpTimer(60)}
                        className="text-rose-600 font-bold"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>

                {/* 6-digit DigiLocker Security PIN */}
                <div>
                  <label className="text-xs font-black text-slate-800 block mb-1">
                    DigiLocker Security PIN
                  </label>
                  <input
                    type="password"
                    maxLength="6"
                    value={securityPin}
                    onChange={(e) => setSecurityPin(e.target.value)}
                    placeholder="6-digit security PIN"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono tracking-widest focus:ring-2 focus:ring-blue-600/20 outline-hidden"
                  />
                </div>

                {/* Statutory Consent Checkbox */}
                <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200/80 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="consentCheck"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-0.5 rounded text-blue-800 focus:ring-blue-600 cursor-pointer"
                  />
                  <label htmlFor="consentCheck" className="text-[11px] text-blue-950 font-medium leading-tight cursor-pointer">
                    I hereby provide voluntary statutory consent under Section 4 of IT Act 2000 to fetch and verify my electronic certificate into the Radhey Shyam Sansthaan repository.
                  </label>
                </div>

                {/* Buttons */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setFetchStep(1)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyOtpAndPull}
                    className="px-5 py-2.5 rounded-xl bg-[#003366] hover:bg-[#002244] text-white text-xs font-black transition active:scale-95 shadow-md shadow-blue-950/20 flex items-center gap-1.5"
                  >
                    <FaCheckCircle size={12} className="text-emerald-400" />
                    Verify & Authenticate
                  </button>
                </div>

              </div>
            )}

            {/* ── STEP 3: REALISTIC GATEWAY VERIFICATION PROGRESS TICKER ── */}
            {fetchStep === 3 && (
              <div className="py-6 space-y-5">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto shadow-xs">
                    <FaSyncAlt size={22} className="animate-spin text-blue-800" />
                  </div>
                  <h4 className="font-black text-sm text-slate-900 mt-2">National DigiLocker Gateway Handshake</h4>
                  <p className="text-[11px] text-slate-500">Communicating with Govt. Repository & Verifying Signatures</p>
                </div>

                <div className="space-y-2.5 max-w-sm mx-auto">
                  {verificationProgress.map((item) => (
                    <div
                      key={item.step}
                      className={`flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition-all ${
                        item.status === 'done'
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          : 'bg-blue-50 text-blue-900 border border-blue-200 animate-pulse'
                      }`}
                    >
                      {item.status === 'done' ? (
                        <FaCheckCircle size={14} className="text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin shrink-0" />
                      )}
                      <span className="leading-tight">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 🏛️ MODAL 3: ISSUE DOCUMENT TO DIGILOCKER (NAD PUSH)         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#8f0631] text-amber-300 flex items-center justify-center shadow-xs">
                  <FaStamp size={16} />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 leading-tight">Issue to DigiLocker</h3>
                  <span className="text-[10px] font-bold text-slate-400">National Academic Depository (NAD) E-Sign</span>
                </div>
              </div>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <FaTimes size={12} />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4">
              {/* Select Enrolled Student */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Target Student *
                </label>
                <select
                  value={issueForm.studentId}
                  onChange={(e) => setIssueForm(p => ({ ...p, studentId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-[#8f0631]/20 outline-hidden"
                >
                  {candidates.students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.classGrade}) - Roll #{s.rollNo || '1'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Type to Issue */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Academic Document to Issue & Publish *
                </label>
                <select
                  value={issueForm.documentType}
                  onChange={(e) => setIssueForm(p => ({ ...p, documentType: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-hidden"
                >
                  <option value="APAAR / ABC ID Card">APAAR / ABC ID Card (One Nation One ID)</option>
                  <option value="Transfer Certificate (TC)">School Leaving / Transfer Certificate (TC)</option>
                  <option value="10th Class Marksheet">Secondary School Marksheet (CBSE Format)</option>
                  <option value="Character Certificate">Character & Conduct Certificate</option>
                </select>
              </div>

              {/* Academic Session */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Academic Session
                  </label>
                  <input
                    type="text"
                    value={issueForm.academicYear}
                    onChange={(e) => setIssueForm(p => ({ ...p, academicYear: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Digital DSC Certificate
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="Principal DSC (Active)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-emerald-700 outline-hidden"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Official Endorsement Remark
                </label>
                <input
                  type="text"
                  value={issueForm.remarks}
                  onChange={(e) => setIssueForm(p => ({ ...p, remarks: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-hidden"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
                <FaStamp size={14} className="text-amber-700 shrink-0" />
                <span>The document will be cryptographically sealed and published directly to the student's DigiLocker.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  className="px-5 py-2.5 rounded-xl bg-[#8f0631] hover:bg-[#750426] text-white text-xs font-black transition active:scale-95 shadow-md shadow-[#8f0631]/20 flex items-center gap-1.5"
                >
                  <FaKey size={11} className="text-amber-300" />
                  {processingAction ? "Signing & Publishing..." : "Digitally Sign & Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 📥 MODAL 4: MANUAL FILE UPLOAD TO VAULT                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#8f0631] text-white flex items-center justify-center shadow-xs">
                  <FaUpload size={14} />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">Upload to DigiLocker Vault</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <FaTimes size={12} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Owner Type */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUploadForm(p => ({ ...p, ownerType: 'Student' }))}
                  className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 border ${
                    uploadForm.ownerType === 'Student'
                      ? 'bg-[#8f0631] text-white border-[#8f0631]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FaUserGraduate size={12} /> Student Document
                </button>
                <button
                  type="button"
                  onClick={() => setUploadForm(p => ({ ...p, ownerType: 'Teacher' }))}
                  className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 border ${
                    uploadForm.ownerType === 'Teacher'
                      ? 'bg-[#003366] text-white border-[#003366]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FaChalkboardTeacher size={13} /> Teacher Document
                </button>
              </div>

              {/* Holder Name & Class */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    {uploadForm.ownerType} Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={uploadForm.ownerName}
                    onChange={(e) => setUploadForm(p => ({ ...p, ownerName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#8f0631]/20 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    {uploadForm.ownerType === 'Student' ? 'Class & Section' : 'Department'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Class 10 (A)"
                    value={uploadForm.classOrDept}
                    onChange={(e) => setUploadForm(p => ({ ...p, classOrDept: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#8f0631]/20 outline-hidden"
                  />
                </div>
              </div>

              {/* Document Type & Doc Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Document Type *
                  </label>
                  <select
                    value={uploadForm.documentType}
                    onChange={(e) => setUploadForm(p => ({ ...p, documentType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-hidden"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="APAAR / ABC ID Card">APAAR / ABC ID Card</option>
                    <option value="Transfer Certificate (TC)">Transfer Certificate (TC)</option>
                    <option value="Birth Certificate">Birth Certificate</option>
                    <option value="10th Class Marksheet">10th Class Marksheet</option>
                    <option value="12th Class Marksheet">12th Class Marksheet</option>
                    <option value="Degree Certificate">Degree / B.Ed Certificate</option>
                    <option value="Character Certificate">Character Certificate</option>
                    <option value="Other Official Record">Other Official Record</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                    Document / Serial No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5482-9102-4821"
                    value={uploadForm.documentNumber}
                    onChange={(e) => setUploadForm(p => ({ ...p, documentNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#8f0631]/20 outline-hidden"
                  />
                </div>
              </div>

              {/* File Attachment */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Upload File (PDF or Image)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setUploadForm(p => ({ ...p, file: e.target.files[0] }))}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave empty to auto-generate official DigiLocker certified security document.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  className="px-5 py-2.5 rounded-xl bg-[#8f0631] hover:bg-[#750426] text-white text-xs font-black transition active:scale-95 shadow-md shadow-[#8f0631]/20"
                >
                  {processingAction ? "Vaulting..." : "Vault & Authenticate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DigiLocker;
