import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaTimes, FaRedo, FaCheck, FaSyncAlt, FaVideo, FaExclamationTriangle } from 'react-icons/fa';

const CameraCaptureModal = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isMirror, setIsMirror] = useState(false);
  const [countdown, setCountdown] = useState(null);

  // 1. Enumerate available video devices
  useEffect(() => {
    if (!isOpen) return;

    const getDevices = async () => {
      try {
        setCameraError(null);
        // Request initial permission to get device labels
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        initialStream.getTracks().forEach(t => t.stop());

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);

        if (videoDevices.length > 0) {
          // If a USB or external camera is found, prefer it or default to first
          const usbCam = videoDevices.find(d => 
            d.label.toLowerCase().includes('usb') || 
            d.label.toLowerCase().includes('droidcam') || 
            d.label.toLowerCase().includes('iriun') ||
            d.label.toLowerCase().includes('camo')
          );
          setSelectedDeviceId(usbCam ? usbCam.deviceId : videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Device enumeration error:", err);
        setCameraError(err.message || "Unable to access camera devices. Please check permissions.");
      }
    };

    getDevices();
  }, [isOpen]);

  // 2. Start Camera Stream when device changes
  useEffect(() => {
    if (!isOpen || capturedImage) return;

    let activeStream = null;

    const startCamera = async () => {
      try {
        setCameraError(null);
        stopCurrentStream();

        const constraints = {
          video: selectedDeviceId 
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(e => console.log("Play interrupted:", e));
        }
      } catch (err) {
        console.error("Camera start error:", err);
        setCameraError("Could not start camera stream. Please allow browser camera access or reconnect USB cable.");
      }
    };

    startCamera();

    return () => {
      stopCurrentStream();
    };
  }, [isOpen, selectedDeviceId, capturedImage]);

  const stopCurrentStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleClose = () => {
    stopCurrentStream();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  };

  // 3. Capture Snapshot
  const snapPhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    // Crop square / passport dimension
    const size = Math.min(videoWidth, videoHeight);
    const startX = (videoWidth - size) / 2;
    const startY = (videoHeight - size) / 2;

    canvas.width = 600;
    canvas.height = 600;

    const ctx = canvas.getContext('2d');
    if (isMirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, size, size, 0, 0, 600, 600);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopCurrentStream();
  };

  const startCountdownAndSnap = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(timer);
          snapPhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 4. Retake Photo
  const handleRetake = () => {
    setCapturedImage(null);
  };

  // 5. Confirm and Send File back to Parent Form
  const handleConfirm = () => {
    if (!capturedImage) return;

    // Convert dataUrl to File
    const arr = capturedImage.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    const file = new File([blob], `camera_student_${Date.now()}.jpg`, { type: 'image/jpeg' });

    onCapture(file, capturedImage);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-800 to-red-600 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold">
              <FaCamera size={15} />
            </div>
            <div>
              <h3 className="font-bold text-base">Capture Student Photo</h3>
              <p className="text-[11px] text-red-100 opacity-90">Live Webcam or USB Connected Phone Camera</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center space-y-4">

          {/* Camera Selector (if multiple cameras available) */}
          {devices.length > 1 && !capturedImage && (
            <div className="w-full flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <FaVideo className="text-red-500 shrink-0" />
              <label className="font-bold text-slate-600 shrink-0">Camera Source:</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 font-medium outline-none focus:border-red-500"
              >
                {devices.map((device, idx) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Viewfinder / Preview Box */}
          <div className="relative w-72 h-72 rounded-2xl bg-slate-950 overflow-hidden shadow-inner border-2 border-slate-200 flex items-center justify-center">
            
            {cameraError ? (
              <div className="p-6 text-center text-red-400 space-y-2">
                <FaExclamationTriangle className="mx-auto text-3xl text-amber-400" />
                <p className="text-xs font-semibold">{cameraError}</p>
                <p className="text-[10px] text-slate-400">
                  Tip: Connect your phone via USB with DroidCam/Iriun, or allow browser camera access.
                </p>
              </div>
            ) : capturedImage ? (
              /* Captured Image Preview */
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover animate-fade-in" />
            ) : (
              /* Live Video Stream */
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isMirror ? 'scale-x-[-1]' : ''}`}
                />

                {/* Passport Framing Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-56 border-2 border-dashed border-white/60 rounded-full flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full">
                      Align Face
                    </span>
                  </div>
                </div>

                {/* Countdown Overlay */}
                {countdown && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-6xl font-black animate-ping">
                    {countdown}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Flip / Mirror Button */}
          {!capturedImage && !cameraError && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMirror(!isMirror)}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
              >
                <FaSyncAlt size={10} /> Mirror: {isMirror ? "ON" : "OFF"}
              </button>
            </div>
          )}

          {/* Hidden Canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Action Buttons */}
          <div className="w-full flex items-center justify-center gap-3 pt-2">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <FaRedo /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  <FaCheck /> Use Photo
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!cameraError}
                  onClick={snapPhoto}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-red-500/20 active:scale-95"
                >
                  <FaCamera /> Click Photo Now
                </button>
                <button
                  type="button"
                  disabled={!!cameraError}
                  onClick={startCountdownAndSnap}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  title="3 Second Timer"
                >
                  ⏱️ 3s
                </button>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default CameraCaptureModal;
