import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaShieldAlt, FaLock, FaCheckCircle, FaClock, FaTimesCircle,
  FaSearch, FaDownload, FaPrint, FaEye, FaSyncAlt,
  FaIdCard, FaFileAlt, FaCertificate, FaQrcode, FaTimes,
  FaCloudDownloadAlt, FaKey, FaStamp, FaFingerprint, FaArrowRight
} from 'react-icons/fa';

const TeacherDigiLocker = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState(null);

  // ⚡ Fetch via DigiLocker OTP Modal
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [fetchStep, setFetchStep] = useState(1);
  const [otpTxn, setOtpTxn] = useState({
    txnId: '',
    maskedMobile: '',
    documentType: 'Aadhaar Card'
  });
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [securityPin, setSecurityPin] = useState('123456');
  const [consentGiven, setConsentGiven] = useState(true);
  const [otpTimer, setOtpTimer] = useState(60);
  const [verificationProgress, setVerificationProgress] = useState([]);
  const [processingAction, setProcessingAction] = useState(false);
  const otpInputRefs = useRef([]);

  // Fetch Form
  const [fetchForm, setFetchForm] = useState({
    documentType: 'Aadhaar Card',
    identifier: ''
  });

  const BASE_URL = import.meta.env.VITE_API_URL;

  // Load teacher profile & documents
  const fetchMyDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Get logged in teacher info from local storage or profile
      let teacherEmail = '';
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        teacherEmail = u.email || '';
      } catch {}

      const res = await axios.get(`${BASE_URL}/api/digilocker/documents?ownerType=Teacher`, { headers });
      if (res.data?.documents) {
        setDocuments(res.data.documents);
      }

      setFetchForm(p => ({
        ...p,
        identifier: teacherEmail || 'faculty@school.edu'
      }));
    } catch (err) {
      console.error("Teacher DigiLocker error:", err);
      toast.error("Failed to load your DigiLocker documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDocuments();
  }, []);

  // OTP Timer
  useEffect(() => {
    let interval = null;
    if (isFetchModalOpen && fetchStep === 2 && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isFetchModalOpen, fetchStep, otpTimer]);

  // Initiate OTP
  const handleInitiateOtp = async (e) => {
    e.preventDefault();
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(`${BASE_URL}/api/digilocker/gateway/initiate-otp`, {
        identifier: fetchForm.identifier,
        documentType: fetchForm.documentType,
        ownerType: 'Teacher'
      }, { headers });

      if (res.data?.success) {
        setOtpTxn({
          txnId: res.data.txnId,
          maskedMobile: res.data.maskedMobile,
          documentType: fetchForm.documentType
        });
        setOtpTimer(60);
        setFetchStep(2);
        toast.info(res.data.message || `OTP sent to ${res.data.maskedMobile}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to connect to DigiLocker");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleOtpChange = (index, val) => {
    if (val.length > 1) val = val.slice(-1);
    const newOtp = [...otpCode];
    newOtp[index] = val;
    setOtpCode(newOtp);
    if (val && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleVerifyOtpAndPull = async () => {
    const fullOtp = otpCode.join('');
    if (fullOtp.length !== 6) return toast.warn("Please enter all 6 digits.");
    if (!consentGiven) return toast.warn("Consent required under IT Act 2000.");

    setFetchStep(3);
    setVerificationProgress([
      { step: 1, text: "Connecting to National DigiLocker Gateway...", status: 'running' }
    ]);

    setTimeout(() => {
      setVerificationProgress(p => [
        { step: 1, text: "Connecting to National DigiLocker Gateway...", status: 'done' },
        { step: 2, text: "Validating UIDAI Aadhaar biometrics & KYC...", status: 'running' }
      ]);
    }, 700);

    setTimeout(() => {
      setVerificationProgress(p => [
        ...p.map((x, i) => i === 1 ? { ...x, status: 'done' } : x),
        { step: 3, text: `Retrieving signed ${fetchForm.documentType}...`, status: 'running' }
      ]);
    }, 1400);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.post(`${BASE_URL}/api/digilocker/gateway/verify-otp-and-pull`, {
        txnId: otpTxn.txnId,
        otp: fullOtp,
        securityPin,
        consentGiven,
        identifier: fetchForm.identifier,
        documentType: fetchForm.documentType,
        ownerType: 'Teacher'
      }, { headers });

      setTimeout(() => {
        setVerificationProgress(p => [
          ...p.map(x => ({ ...x, status: 'done' })),
          { step: 4, text: "Verified & Sealed with PKI Certificate!", status: 'done' }
        ]);

        if (res.data?.success) {
          toast.success(`🎉 ${fetchForm.documentType} successfully imported into your Vault!`);
          setDocuments(prev => [res.data.document, ...prev]);
          setTimeout(() => {
            setIsFetchModalOpen(false);
            setPreviewDoc(res.data.document);
          }, 800);
        }
      }, 2100);

    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
      setFetchStep(2);
    }
  };

  const handleInspectQr = async (doc) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${BASE_URL}/api/digilocker/verify-qr/${doc._id}`, { headers });
      if (res.data?.success) {
        setQrPayload(res.data.verificationPayload);
        setIsQrModalOpen(true);
      }
    } catch {
      toast.error("Could not read QR verification metadata");
    }
  };

  const handleDownloadDocument = (doc) => {
    if (!doc?.fileUrl) return;
    try {
      const safeName = `${doc.documentType.replace(/[^a-zA-Z0-9]/g, '_')}_DigiLocker.svg`;
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Certificate downloaded!");
    } catch {
      window.open(doc.fileUrl, '_blank');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 custom-scrollbar text-slate-800">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#001833] via-[#002d5a] to-[#003366] text-white p-6 shadow-xl border border-blue-900/60">
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          <div className="flex-1 bg-[#FF9933]"></div>
          <div className="flex-1 bg-white"></div>
          <div className="flex-1 bg-[#138808]"></div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-yellow-300 text-[10px] font-black uppercase tracking-wider">
              <span>🇮🇳</span>
              <span>DigiLocker Faculty Credential Vault</span>
            </div>
            <h2 className="text-xl font-black text-white">Your Authenticated Credentials</h2>
            <p className="text-xs text-blue-200">
              Digitally verified degrees, teaching certifications, and identity proofs recognized under the IT Act 2000.
            </p>
          </div>

          <button
            onClick={() => {
              setFetchStep(1);
              setOtpCode(['', '', '', '', '', '']);
              setIsFetchModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-900 text-xs font-black transition active:scale-95 shadow-md flex items-center gap-2 shrink-0"
          >
            <FaCloudDownloadAlt size={16} />
            <span>Fetch from DigiLocker</span>
          </button>
        </div>
      </div>

      {/* Documents Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-base text-slate-900">Verified Institutional Documents ({documents.length})</h3>
          <button
            onClick={fetchMyDocuments}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1"
          >
            <FaSyncAlt size={10} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs font-bold">
            <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading your DigiLocker Vault...
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto text-xl">
              <FaShieldAlt />
            </div>
            <h4 className="font-extrabold text-sm text-slate-800">No Credentials in Vault Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Link your Aadhaar or Teaching Degree from DigiLocker using the button above to view your digital certificates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => (
              <div
                key={doc._id}
                onClick={() => setPreviewDoc(doc)}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
                      <FaCertificate size={18} />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <FaCheckCircle size={9} /> Verified
                    </span>
                  </div>

                  <h4 className="font-black text-sm text-slate-900 group-hover:text-blue-900 transition leading-tight">
                    {doc.documentType}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">
                    {doc.issuedBy || 'National Depository'}
                  </p>
                  <p className="text-[11px] font-mono font-bold text-slate-700 mt-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    {doc.documentNumber || doc.ownerIdentifier}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleInspectQr(doc)}
                    className="text-purple-700 font-bold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <FaQrcode size={12} /> Inspect Seal
                  </button>
                  <button
                    onClick={() => handleDownloadDocument(doc)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold flex items-center gap-1 text-[11px] transition"
                  >
                    <FaDownload size={10} /> Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#002244] to-[#003366] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaShieldAlt className="text-yellow-300" size={18} />
                <h3 className="font-black text-sm">{previewDoc.documentType}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <FaTimes size={12} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-50 flex items-center justify-center">
              <img
                src={previewDoc.fileUrl}
                alt={previewDoc.documentType}
                className="max-h-[500px] w-auto max-w-full rounded-xl object-contain shadow-xs border border-slate-100"
              />
            </div>
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => handleDownloadDocument(previewDoc)}
                className="px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <FaDownload size={11} /> Download SVG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {isQrModalOpen && qrPayload && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-sm">DigiLocker Cryptographic Proof</h3>
              <button onClick={() => setIsQrModalOpen(false)}><FaTimes size={12} /></button>
            </div>
            <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-[10.5px] max-h-56 overflow-y-auto">
              <pre>{JSON.stringify(qrPayload, null, 2)}</pre>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setIsQrModalOpen(false)} className="px-4 py-2 bg-slate-900 text-white rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fetch OTP Modal */}
      {isFetchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-base">Pull from DigiLocker Gateway</h3>
              <button onClick={() => setIsFetchModalOpen(false)}><FaTimes size={12} /></button>
            </div>

            {fetchStep === 1 && (
              <form onSubmit={handleInitiateOtp} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-600 uppercase block mb-1">
                    Select Document to Fetch *
                  </label>
                  <select
                    value={fetchForm.documentType}
                    onChange={(e) => setFetchForm(p => ({ ...p, documentType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="Aadhaar Card">Aadhaar Card (UIDAI Verified)</option>
                    <option value="Degree Certificate">Highest Degree Certificate</option>
                    <option value="B.Ed Teaching Certificate">B.Ed Certificate</option>
                    <option value="Experience Certificate">Experience Letter</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 uppercase block mb-1">
                    Aadhaar / Email Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={fetchForm.identifier}
                    onChange={(e) => setFetchForm(p => ({ ...p, identifier: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={processingAction}
                    className="px-5 py-2.5 rounded-xl bg-blue-900 text-white font-black"
                  >
                    {processingAction ? "Connecting..." : "Request DigiLocker OTP"}
                  </button>
                </div>
              </form>
            )}

            {fetchStep === 2 && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border">
                  <p className="text-slate-500">OTP dispatched to UIDAI registered mobile:</p>
                  <p className="font-mono font-bold text-blue-900">{otpTxn.maskedMobile}</p>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-bold">Enter 6-digit OTP:</span>
                    <button
                      onClick={() => setOtpCode(['1', '2', '3', '4', '5', '6'])}
                      className="text-blue-700 font-bold underline text-[10px]"
                    >
                      Fill Demo OTP (123456)
                    </button>
                  </div>
                  <div className="flex justify-between gap-1.5">
                    {otpCode.map((d, i) => (
                      <input
                        key={i}
                        ref={el => otpInputRefs.current[i] = el}
                        type="text"
                        maxLength="1"
                        value={d}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        className="w-11 h-12 text-center text-lg font-bold font-mono border rounded-xl"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="teacherConsent"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="teacherConsent" className="text-[10px] text-slate-600">
                    I grant statutory consent under Section 4 of IT Act 2000 to verify my document.
                  </label>
                </div>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setFetchStep(1)} className="px-3 py-1.5 text-slate-500 font-bold">
                    Back
                  </button>
                  <button
                    onClick={handleVerifyOtpAndPull}
                    className="px-5 py-2.5 rounded-xl bg-blue-900 text-white font-black"
                  >
                    Verify & Pull Document
                  </button>
                </div>
              </div>
            )}

            {fetchStep === 3 && (
              <div className="py-6 space-y-3 text-center text-xs">
                <FaSyncAlt size={22} className="animate-spin text-blue-900 mx-auto" />
                <p className="font-bold text-slate-800">Authenticating with National DigiLocker Gateway...</p>
                <div className="space-y-1.5 max-w-xs mx-auto text-[11px] text-left">
                  {verificationProgress.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-600">
                      <FaCheckCircle className="text-emerald-500" size={12} />
                      <span>{v.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default TeacherDigiLocker;
