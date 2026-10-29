import React, { useRef } from 'react';
import {
  FaTimes, FaPrint, FaDownload, FaWhatsapp, FaFileInvoiceDollar,
  FaCheckCircle, FaCalendarAlt, FaUserTie, FaBuilding, FaQrcode
} from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to convert number to Indian currency words
function numberToWords(num) {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  num = Math.floor(num);

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
  }

  function convertThreeDigits(n) {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) str += convertTwoDigits(n);
    return str.trim();
  }

  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  let remainder = num;

  let res = '';
  if (crore > 0) res += convertThreeDigits(crore) + ' Crore ';
  if (lakh > 0) res += convertThreeDigits(lakh) + ' Lakh ';
  if (thousand > 0) res += convertThreeDigits(thousand) + ' Thousand ';
  if (remainder > 0) res += convertThreeDigits(remainder) + ' ';

  return (res.trim() + ' Rupees Only');
}

const TeacherPayslipModal = ({ isOpen, onClose, teacher, paymentRecord, proratedInfo, month }) => {
  const payslipRef = useRef(null);

  if (!isOpen || !teacher) return null;

  // Resolve values
  const slipMonth = paymentRecord?.month || month || new Date().toISOString().slice(0, 7);
  const baseSalary = teacher.baseSalary || 0;
  const amountPaid = paymentRecord?.amountPaid ?? (proratedInfo?.paidAmount || proratedInfo?.netPayable || baseSalary);
  const paymentType = paymentRecord?.paymentType || (proratedInfo ? 'Prorated Salary' : 'Full Salary');
  const paymentDate = paymentRecord?.paymentDate ? new Date(paymentRecord.paymentDate) : new Date();

  const daysInMonth = proratedInfo?.daysInMonth || 30;
  const presentDays = proratedInfo?.presentDays ?? 'N/A';
  const absentDays = proratedInfo?.absentDays ?? 0;
  const halfDays = proratedInfo?.halfDays ?? 0;
  const leaveDays = proratedInfo?.leaveDays ?? 0;
  const effectiveAbsent = proratedInfo?.effectiveAbsent ?? (paymentRecord?.effectiveAbsentDays || 0);

  const dailyRate = proratedInfo?.dailyRate || Math.round(daysInMonth > 0 ? baseSalary / daysInMonth : 0);
  const attendanceDeduction = paymentRecord?.attendanceDeduction ?? (proratedInfo?.attendanceDeduction || 0);

  const netPayable = Math.max(0, baseSalary - attendanceDeduction);
  const slipNo = `PAY-${slipMonth.replace('-', '')}-${(teacher._id || '0000').slice(-5).toUpperCase()}`;
  const amountInWords = numberToWords(amountPaid);

  // Month name formatting e.g. "October 2026"
  let formattedMonth = slipMonth;
  try {
    const [y, m] = slipMonth.split('-');
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    formattedMonth = dateObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } catch (e) {
    // fallback
  }

  // 1. Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  // 2. Download Official PDF with jsPDF
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      const primaryColor = [0, 51, 102]; // #003366 Institutional Navy
      const accentGold = [217, 119, 6]; // Amber Gold
      const darkSlate = [30, 41, 59];
      const lightBg = [248, 250, 252];

      // --- HEADER ---
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 32, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('RADHEY SHYAM SHIKSHAN SANSTHAN', 105, 12, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Recognized & Affiliated Educational Institution • Staff Payroll Division', 105, 18, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(254, 240, 138); // light gold
      doc.text(`FACULTY SALARY SLIP — ${formattedMonth.toUpperCase()}`, 105, 26, { align: 'center' });

      // --- METADATA STRIP ---
      doc.setFillColor(...lightBg);
      doc.rect(14, 36, 182, 10, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, 36, 182, 10, 'S');

      doc.setTextColor(...darkSlate);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`Slip No: ${slipNo}`, 18, 42.5);
      doc.text(`Date of Issue: ${paymentDate.toLocaleDateString('en-IN')}`, 105, 42.5, { align: 'center' });
      doc.text(`Status: DISBURSED`, 190, 42.5, { align: 'right' });

      // --- EMPLOYEE INFORMATION BOX ---
      autoTable(doc, {
        startY: 50,
        margin: { left: 14, right: 14 },
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 2.5, textColor: darkSlate },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [100, 116, 139], width: 45 },
          1: { fontStyle: 'bold', width: 46 },
          2: { fontStyle: 'bold', textColor: [100, 116, 139], width: 45 },
          3: { fontStyle: 'bold', width: 46 }
        },
        body: [
          ['Faculty Name:', teacher.fullName || 'N/A', 'Designation / Subject:', teacher.specialization || 'Teacher'],
          ['Faculty ID:', `FAC-${(teacher._id || '').slice(-6).toUpperCase()}`, 'Highest Qualification:', teacher.highestQualification || 'N/A'],
          ['Email Address:', teacher.email || 'N/A', 'Contact Phone:', teacher.phone || 'N/A'],
          ['Payment Mode:', paymentType, 'Payroll Period:', formattedMonth]
        ]
      });

      // --- ATTENDANCE SUMMARY TABLE ---
      let currentY = doc.lastAutoTable.finalY + 4;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...primaryColor);
      doc.text('MONTHLY ATTENDANCE AUDIT', 14, currentY + 3);

      autoTable(doc, {
        startY: currentY + 5,
        margin: { left: 14, right: 14 },
        headStyles: { fillColor: [241, 245, 249], textColor: darkSlate, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2, halign: 'center' },
        head: [['Total Days in Month', 'Days Present', 'Days Absent', 'Half Days', 'Approved Leaves', 'Daily Rate (INR)']],
        body: [[
          daysInMonth.toString(),
          presentDays.toString(),
          absentDays.toString(),
          halfDays.toString(),
          leaveDays.toString(),
          `Rs. ${dailyRate.toLocaleString()}`
        ]]
      });

      // --- SALARY BREAKDOWN (EARNINGS VS DEDUCTIONS) ---
      currentY = doc.lastAutoTable.finalY + 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...primaryColor);
      doc.text('SALARY BREAKDOWN (EARNINGS & DEDUCTIONS)', 14, currentY + 3);

      autoTable(doc, {
        startY: currentY + 5,
        margin: { left: 14, right: 14 },
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: {
          0: { width: 61 },
          1: { width: 30, halign: 'right', fontStyle: 'bold' },
          2: { width: 61 },
          3: { width: 30, halign: 'right', fontStyle: 'bold' }
        },
        head: [['EARNINGS COMPONENT', 'AMOUNT (Rs.)', 'DEDUCTIONS COMPONENT', 'AMOUNT (Rs.)']],
        body: [
          [
            'Basic Fixed Salary',
            baseSalary.toLocaleString(),
            effectiveAbsent > 0 ? `Absent Deductions (${effectiveAbsent} days)` : 'Attendance Deductions',
            attendanceDeduction > 0 ? `-${attendanceDeduction.toLocaleString()}` : '0'
          ],
          [
            paymentType === 'Bonus' ? 'Bonus / Allowance' : 'Allowances / Special Pay',
            paymentType === 'Bonus' ? amountPaid.toLocaleString() : '0',
            'TDS / Tax Deduction',
            '0'
          ],
          [
            'Other Earnings',
            '0',
            'Other Deductions / Advances',
            '0'
          ]
        ],
        footStyles: { fillColor: [241, 245, 249], textColor: darkSlate, fontStyle: 'bold', fontSize: 9 },
        foot: [[
          'Total Gross Earnings:',
          `Rs. ${(paymentType === 'Bonus' ? baseSalary + amountPaid : baseSalary).toLocaleString()}`,
          'Total Deductions:',
          `Rs. ${attendanceDeduction.toLocaleString()}`
        ]]
      });

      // --- NET SALARY BOX ---
      currentY = doc.lastAutoTable.finalY + 6;

      doc.setFillColor(254, 243, 199); // amber 100
      doc.rect(14, currentY, 182, 16, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.5);
      doc.rect(14, currentY, 182, 16, 'S');

      doc.setTextColor(146, 64, 14); // amber 900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('NET SALARY DISBURSED:', 20, currentY + 7);

      doc.setFontSize(13);
      doc.text(`Rs. ${amountPaid.toLocaleString()}`, 190, currentY + 7, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(120, 53, 15);
      doc.text(`In Words: ${amountInWords}`, 20, currentY + 12.5);

      // Remarks note
      if (paymentRecord?.remarks) {
        currentY += 21;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Remarks / Notes: "${paymentRecord.remarks}"`, 14, currentY);
      } else {
        currentY += 18;
      }

      // --- SIGNATURES ---
      currentY += 16;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);

      // Employee Signature
      doc.line(25, currentY, 75, currentY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...darkSlate);
      doc.text('Employee Signature', 50, currentY + 4, { align: 'center' });

      // Principal Signature
      doc.line(135, currentY, 185, currentY);
      doc.text('Principal / Authorized Signatory', 160, currentY + 4, { align: 'center' });

      // Footer disclaimer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('This is an official system-generated salary payslip issued by Radhey Shyam Shikshan Sansthan.', 105, 285, { align: 'center' });

      // Save PDF
      doc.save(`Payslip_${(teacher.fullName || 'Teacher').replace(/\s+/g, '_')}_${slipMonth}.pdf`);
      toast.success("Payslip PDF downloaded successfully!");
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      toast.error("Failed to generate PDF. You can also click Print.");
    }
  };

  // 3. Share on WhatsApp
  const handleWhatsApp = () => {
    let msg = `🧾 *Salary Payslip — ${formattedMonth}*\n\n`;
    msg += `Institution: *Radhey Shyam Shikshan Sansthan*\n`;
    msg += `Faculty: *${teacher.fullName}* (FAC-${(teacher._id || '').slice(-5).toUpperCase()})\n`;
    msg += `Designation: ${teacher.specialization || 'Faculty'}\n\n`;
    msg += `• Base Salary: ₹${baseSalary.toLocaleString()}\n`;
    if (attendanceDeduction > 0) {
      msg += `• Absent Deduction (${effectiveAbsent} days): -₹${attendanceDeduction.toLocaleString()}\n`;
    }
    msg += `• *Net Amount Disbursed: ₹${amountPaid.toLocaleString()}*\n`;
    msg += `• In Words: ${amountInWords}\n`;
    msg += `• Slip No: ${slipNo}\n`;
    msg += `• Payment Mode: ${paymentType}\n`;
    msg += `• Disbursed Date: ${paymentDate.toLocaleDateString('en-IN')}\n\n`;
    if (paymentRecord?.remarks) msg += `Note: "${paymentRecord.remarks}"\n\n`;
    msg += `_Radhey Shyam Shikshan Sansthan Payroll Division_`;

    let phoneStr = (teacher.phone || '').replace(/\D/g, '');
    if (phoneStr.length === 10) phoneStr = `91${phoneStr}`;

    window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 font-sans animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Modal Header Controls (Hidden on print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <FaFileInvoiceDollar size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">Faculty Salary Payslip</h3>
              <p className="text-xs text-slate-400">{teacher.fullName} • {formattedMonth}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              title="Print Payslip"
            >
              <FaPrint size={12} className="text-amber-400" /> Print
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-xs"
              title="Download PDF"
            >
              <FaDownload size={12} /> Download PDF
            </button>

            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              title="Send to WhatsApp"
            >
              <FaWhatsapp size={13} /> Share
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 ml-1 transition"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* ================= PRINTABLE PAYSLIP CONTAINER ================= */}
        <div
          ref={payslipRef}
          className="p-6 sm:p-8 overflow-y-auto space-y-5 bg-white text-slate-800 print:p-0 print:m-0 print:shadow-none print:w-full"
        >

          {/* 1. INSTITUTIONAL HEADER */}
          <div className="border-b-2 border-slate-900 pb-4 text-center relative">
            <div className="flex items-center justify-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-black text-lg">
                RS
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                  Radhey Shyam Shikshan Sansthan
                </h1>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  Recognized Educational Institution • Staff Payroll Division
                </p>
              </div>
            </div>

            <div className="inline-block mt-2 bg-slate-100 text-slate-800 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-slate-200">
              Salary Slip for {formattedMonth}
            </div>
          </div>

          {/* 2. SLIP METADATA STRIP */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-between text-xs font-bold text-slate-600 gap-2">
            <div>Slip No: <span className="font-mono text-slate-800 font-black">{slipNo}</span></div>
            <div>Issue Date: <span className="text-slate-800">{paymentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
            <div>Status: <span className="text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded">PAID & CREDITED</span></div>
          </div>

          {/* 3. FACULTY DETAILS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 text-xs bg-slate-50/50">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Faculty Name</span>
              <span className="font-black text-slate-800 text-sm">{teacher.fullName}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Faculty ID</span>
              <span className="font-bold text-slate-700 font-mono">FAC-{(teacher._id || '').slice(-6).toUpperCase()}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Designation / Role</span>
              <span className="font-bold text-slate-700">{teacher.specialization || 'Teacher'}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Payment Mode</span>
              <span className="font-bold text-slate-700">{paymentType}</span>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Email</span>
              <span className="font-medium text-slate-600 truncate block">{teacher.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Phone</span>
              <span className="font-medium text-slate-600">{teacher.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Qualification</span>
              <span className="font-medium text-slate-600">{teacher.highestQualification || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Payroll Period</span>
              <span className="font-bold text-slate-700">{slipMonth}</span>
            </div>
          </div>

          {/* 4. ATTENDANCE AUDIT PILLS */}
          <div className="border border-slate-200 rounded-xl p-3 bg-amber-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
                Monthly Attendance Summary ({slipMonth})
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Daily Rate: ₹{dailyRate}/day
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-amber-100">
                <span className="text-[9px] font-black text-slate-400 block uppercase">Total Days</span>
                <span className="font-black text-slate-800">{daysInMonth}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-100">
                <span className="text-[9px] font-black text-slate-400 block uppercase">Present</span>
                <span className="font-black text-emerald-600">{presentDays}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-100">
                <span className="text-[9px] font-black text-slate-400 block uppercase">Absent</span>
                <span className="font-black text-rose-600">{absentDays}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-100">
                <span className="text-[9px] font-black text-slate-400 block uppercase">Half-Day</span>
                <span className="font-black text-amber-600">{halfDays}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-amber-100">
                <span className="text-[9px] font-black text-slate-400 block uppercase">Leaves</span>
                <span className="font-black text-blue-600">{leaveDays}</span>
              </div>
            </div>
          </div>

          {/* 5. EARNINGS & DEDUCTIONS TABLE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 w-1/2">Earnings (Income)</th>
                  <th className="p-3 w-1/2 border-l border-slate-800">Deductions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3 align-top">
                    <div className="flex justify-between py-1">
                      <span className="text-slate-600">Basic Fixed Salary:</span>
                      <span className="font-bold text-slate-800">₹{baseSalary.toLocaleString()}</span>
                    </div>
                    {paymentType === 'Bonus' && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600">Special Bonus / Allowance:</span>
                        <span className="font-bold text-emerald-600">+₹{amountPaid.toLocaleString()}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3 align-top border-l border-slate-100">
                    <div className="flex justify-between py-1">
                      <span className="text-slate-600">
                        Absent Deductions ({effectiveAbsent} days):
                      </span>
                      <span className="font-bold text-rose-600">
                        {attendanceDeduction > 0 ? `-₹${attendanceDeduction.toLocaleString()}` : '₹0'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-600">TDS / Professional Tax:</span>
                      <span className="font-bold text-slate-800">₹0</span>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50 font-black text-xs border-t border-slate-200">
                <tr>
                  <td className="p-3">
                    <div className="flex justify-between">
                      <span>Total Gross Earnings:</span>
                      <span className="text-slate-900">₹{(paymentType === 'Bonus' ? baseSalary + amountPaid : baseSalary).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="p-3 border-l border-slate-200">
                    <div className="flex justify-between text-rose-600">
                      <span>Total Deductions:</span>
                      <span>-₹{attendanceDeduction.toLocaleString()}</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 6. NET SALARY DISBURSED BANNER */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div>
              <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider block">
                Net Salary Disbursed:
              </span>
              <p className="text-xs text-amber-900 font-medium italic mt-0.5">
                Amount in Words: <span className="font-bold not-italic">{amountInWords}</span>
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">
                ₹{amountPaid.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Remarks note */}
          {paymentRecord?.remarks && (
            <p className="text-xs text-slate-500 italic">
              Note: "{paymentRecord.remarks}"
            </p>
          )}

          {/* 7. SIGNATURES & VERIFICATION */}
          <div className="pt-8 grid grid-cols-2 gap-8 items-end border-t border-slate-200">
            <div className="text-center">
              <div className="w-40 mx-auto border-b border-slate-400 mb-1"></div>
              <p className="text-xs font-bold text-slate-600">Faculty Signature</p>
              <p className="text-[10px] text-slate-400">{teacher.fullName}</p>
            </div>

            <div className="text-center">
              <div className="w-40 mx-auto border-b border-slate-400 mb-1"></div>
              <p className="text-xs font-bold text-slate-600">Principal / Signatory</p>
              <p className="text-[10px] text-slate-400">Radhey Shyam Shikshan Sansthan</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-2">
            <p className="text-[10px] text-slate-400 italic">
              This is a computer-generated salary slip verified by Radhey Shyam Shikshan Sansthan ERP.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

export default TeacherPayslipModal;

