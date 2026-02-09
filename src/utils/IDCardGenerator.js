import jsPDF from 'jspdf';

// --- LOGO OR PLACEHOLDER IMAGE ---
// (Optional: Aap yahan apne school ke logo ka Base64 string daal sakte hain)
const SCHOOL_NAME = "RADHEY SHYAM SANSTHAAN";

export const generateIDCards = (students, className = "Class") => {
  if (!students || students.length === 0) {
    alert("No students to generate cards for!");
    return;
  }

  // 1. Setup PDF (A4 Size, Portrait)
  const doc = new jsPDF('p', 'mm', 'a4'); 
  const pageWidth = 210;
  const pageHeight = 297;
  
  // 2. Card Dimensions (Standard ID Card Size)
  const cardWidth = 85; 
  const cardHeight = 54;
  const gapX = 10; 
  const gapY = 10;
  const startX = 15;
  const startY = 15;

  let x = startX;
  let y = startY;
  let count = 0;

  students.forEach((student, index) => {
    // --- CHECK FOR NEW PAGE (8 Cards per page usually fit nicely) ---
    if (count > 0 && count % 8 === 0) {
      doc.addPage();
      x = startX;
      y = startY;
    }

    // --- DRAW CARD BORDER & BACKGROUND ---
    doc.setDrawColor(0); // Black border
    doc.setLineWidth(0.5);
    doc.rect(x, y, cardWidth, cardHeight); // Card Outline

    // --- HEADER (School Name) ---
    doc.setFillColor(41, 128, 185); // Blue Color
    doc.rect(x, y, cardWidth, 10, 'F'); // Header Box
    
    doc.setTextColor(255, 255, 255); // White Text
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(SCHOOL_NAME, x + (cardWidth / 2), y + 7, { align: "center" });

    // --- STUDENT PHOTO PLACEHOLDER (Left Side) ---
    // Note: Agar student.image URL hai, toh usse base64 mein convert karna padega.
    // Abhi ke liye hum ek Box bana rahe hain.
    doc.setDrawColor(0);
    doc.setFillColor(240, 240, 240); // Grey Background
    doc.rect(x + 5, y + 15, 25, 30, 'FD'); 
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(6);
    doc.text("PHOTO", x + 17.5, y + 30, { align: "center" });

    // --- STUDENT DETAILS (Right Side) ---
    doc.setTextColor(0, 0, 0); // Black Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${student.firstName} ${student.lastName || ''}`, x + 35, y + 20); // Name

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    // Details Line by Line
    const detailsX = x + 35;
    let detailsY = y + 26;
    const lineHeight = 5;

    doc.text(`Roll No: ${student.rollNo || 'N/A'}`, detailsX, detailsY);
    detailsY += lineHeight;
    
    doc.text(`Class: ${student.class?.grade || ''} - ${student.class?.section || ''}`, detailsX, detailsY);
    detailsY += lineHeight;

    doc.text(`Father: ${student.fatherName}`, detailsX, detailsY);
    detailsY += lineHeight;

    doc.text(`Phone: ${student.phone || 'N/A'}`, detailsX, detailsY);

    // --- FOOTER (Principal Sign) ---
    doc.setFontSize(7);
    doc.text("Principal Signature", x + cardWidth - 5, y + cardHeight - 3, { align: "right" });

    // --- MOVE POSITION FOR NEXT CARD ---
    count++;
    
    // Logic to move X and Y for 2-column layout
    if (count % 2 !== 0) {
      // Move to right column
      x += cardWidth + gapX;
    } else {
      // Move to next row (reset X, increase Y)
      x = startX;
      y += cardHeight + gapY;
    }
  });

  // 3. Save PDF
  doc.save(`ID_Cards_${className}_${new Date().toLocaleDateString()}.pdf`);
};