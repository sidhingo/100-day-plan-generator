import { jsPDF } from 'jspdf';

const DISCLAIMER =
  "AI-generated from publicly available sources. May include inaccuracies; treat as a starting " +
  "point, not a company-verified fact. Not affiliated with, sponsored by, or endorsed by the company.";

const LIST_INDENT = 18;

export function exportPlanToPdf(plan, company) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 54;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const footerReserve = 50;
  const contentBottom = pageHeight - footerReserve;
  let y = margin;
  let pageNum = 1;

  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const drawFooter = () => {
    const footerTop = pageHeight - footerReserve;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, footerTop, pageWidth - margin, footerTop);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    const wrappedDisclaimer = doc.splitTextToSize(DISCLAIMER, contentWidth * 0.6);
    doc.text(wrappedDisclaimer, margin, footerTop + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('100-DAY PLAN GENERATOR // BUILT BY SIDHINGO', pageWidth - margin, footerTop + 14, {
      align: 'right',
    });
    doc.text(`PAGE ${pageNum}`, pageWidth - margin, footerTop + 25, { align: 'right' });

    doc.setTextColor(0, 0, 0);
  };

  const newPageIfNeeded = (neededSpace = 14) => {
    if (y + neededSpace > contentBottom) {
      drawFooter();
      doc.addPage();
      pageNum += 1;
      y = margin;
    }
  };

  const addWrapped = (text, fontSize, spacing, font = 'normal') => {
    doc.setFont('helvetica', font);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line) => {
      newPageIfNeeded(spacing);
      doc.setFont('helvetica', font);
      doc.setFontSize(fontSize);
      doc.text(line, margin, y);
      y += spacing;
    });
  };

  const addListItem = (marker, text, fontSize, spacing) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth - LIST_INDENT);
    lines.forEach((line, idx) => {
      newPageIfNeeded(spacing);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      if (idx === 0) doc.text(marker, margin, y);
      doc.text(line, margin + LIST_INDENT, y);
      y += spacing;
    });
  };

  const sectionHeading = (title, isFirst = false) => {
    newPageIfNeeded(40);
    y += 10;
    if (!isFirst) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
    }
    y += 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), margin, y);
    doc.setTextColor(0, 0, 0);
    y += 18;
  };

  const headerHeight = 64;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('100-DAY PLAN', margin, 26);
  doc.setFontSize(17);
  doc.text(company, margin, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Generated ${generatedAt}`, pageWidth - margin, 46, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y = headerHeight + 30;

  if (plan.summary) {
    addWrapped(plan.summary, 11, 15.5, 'italic');
  }

  const bulletSection = (title, items, isFirst = false) => {
    if (!items || items.length === 0) return;
    sectionHeading(title, isFirst);
    items.forEach((item, i) => addListItem(`${i + 1}.`, item, 10.5, 14.5));
  };

  bulletSection('Quick Wins (First 30 Days)', plan.quickWins, true);
  bulletSection('Structural Issues', plan.structuralIssues);
  bulletSection('KPI Tree', plan.kpiTree);

  if (plan.phases && plan.phases.length > 0) {
    sectionHeading('Phased Roadmap');
    plan.phases.forEach((phase, i) => {
      if (i > 0) y += 22;
      newPageIfNeeded(30);
      addWrapped(`${phase.name} (${phase.days})`, 11, 14.5, 'bold');
      if (phase.focus) addWrapped(phase.focus, 10.5, 14.5, 'italic');
      y += 4;
      (phase.actions || []).forEach((a) => addListItem('\u2022', a, 10, 13.5));
    });
  }

  drawFooter();
  doc.save(`${company.replace(/\s+/g, '-')}-100-day-plan.pdf`);
}