import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { findFreedomDate, fmtFull } from './mathEngine';

const AMBER  = [245, 158, 11];
const DARK   = [17, 24, 39];
const GRAY   = [107, 114, 128];
const LGRAY  = [229, 231, 235];
const WHITE  = [255, 255, 255];
const OFF    = [249, 250, 251];
const AMBERLT= [254, 243, 199];

const W = 210;
const M = 14;
const CW = W - M * 2;

export async function exportToPDF(state) {
  const { simulation, settings, accounts, properties = [], expenses = [] } = state;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const myName     = settings.myName     || 'Me';
  const spouseName = settings.spouseName || 'Spouse';
  const hasSpouse  = simulation.some(d => d.spouseNetWorth > 0);
  const freedomYear = findFreedomDate(simulation);
  const yearsTo = freedomYear ? freedomYear - settings.currentYear : null;

  // Current balance totals
  const totalInvest = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const totalProp   = properties.reduce((s, p) => s + Number(p.currentValue || 0), 0);
  const totalNW     = totalInvest + totalProp;
  const taxable     = accounts.filter(a => a.type === 'brokerage').reduce((s, a) => s + Number(a.balance || 0), 0);
  const deferred    = accounts.filter(a => a.type === 'deferred').reduce((s, a) => s + Number(a.balance || 0), 0);
  const roth        = accounts.filter(a => a.type === 'roth').reduce((s, a) => s + Number(a.balance || 0), 0);
  const postTax     = roth + taxable * 0.85 + deferred * 0.80;
  const swr4        = postTax * 0.04;
  const annualExp   = expenses.filter(e => e.type === 'recurring').reduce((s, e) => s + Number(e.amount || 0), 0)
    || Number(settings.targetRetirementIncome || 0);

  // ── PAGE 1 ──────────────────────────────────────────────────────────────

  // Header bar
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 28, 'F');

  doc.setTextColor(...AMBER);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('F**K YOU MONEY', M, 12);

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Wealth Projection Report', M, 19);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    W - M, 19, { align: 'right' }
  );
  doc.text(`${myName}${hasSpouse ? ' & ' + spouseName : ''}`, W - M, 12, { align: 'right' });

  let y = 34;

  // F.U. Date hero
  if (freedomYear) {
    doc.setFillColor(...AMBER);
    doc.roundedRect(M, y, CW, 20, 3, 3, 'F');
    doc.setTextColor(...DARK);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Your F.U. Date', M + 4, y + 6);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(String(freedomYear), M + 4, y + 16);
    const msg = yearsTo <= 0
      ? 'You already have F**K YOU Money!'
      : `${yearsTo} year${yearsTo === 1 ? '' : 's'} until you can say F**K YOU`;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(msg, M + 32, y + 16);
    const fd = simulation.find(d => d.isFreedom);
    if (fd) {
      doc.setFontSize(7);
      doc.setTextColor(80, 50, 0);
      doc.text(`Net worth at F.U.: ${fmtFull(fd.netWorth)}   4% SWR: ${fmtFull(fd.postTaxSwr4)}/yr`, M + 4, y + 22);
      y += 3;
    }
    y += 26;
  } else {
    y += 4;
  }

  // Summary metric boxes
  const metrics = [
    { label: 'Combined Net Worth',  value: fmtFull(totalNW) },
    { label: 'After-Tax Liquid',    value: fmtFull(postTax) },
    { label: '4% SWR / year',       value: fmtFull(swr4) },
    { label: 'Annual Expenses',     value: annualExp > 0 ? fmtFull(annualExp) : 'Not set' },
  ];
  const mW = (CW - 3) / 4;
  metrics.forEach((m, i) => {
    const x = M + i * (mW + 1);
    doc.setFillColor(...OFF);
    doc.setDrawColor(...LGRAY);
    doc.roundedRect(x, y, mW, 14, 2, 2, 'FD');
    doc.setTextColor(...GRAY);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(m.label, x + 3, y + 5);
    doc.setTextColor(...DARK);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, x + 3, y + 11);
  });
  y += 18;

  // Chart image
  const chartEl = document.querySelector('[data-pdf-chart]');
  if (chartEl) {
    try {
      const canvas = await html2canvas(chartEl, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const ratio   = canvas.height / canvas.width;
      const imgH    = Math.min(ratio * CW, 75);
      doc.addImage(imgData, 'PNG', M, y, CW, imgH);
      y += imgH + 4;
    } catch (_) {
      // chart capture failed — skip silently
    }
  }

  // Settings summary line
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  const settingsLine = [
    `Inflation: ${settings.inflation}%`,
    settings.globalCagrOverride != null ? `CAGR override: ${settings.globalCagrOverride}%` : null,
    settings.crashYear ? `Crash: ${settings.crashYear} (-${settings.crashPercent}%)` : null,
    settings.retirementYear ? `Retire: ${settings.retirementYear}` : null,
    `Horizon: ${settings.projectionYears}yr`,
  ].filter(Boolean).join('   ·   ');
  doc.text(settingsLine, M, y);
  y += 5;

  // ── YEAR-BY-YEAR TABLE ──────────────────────────────────────────────────

  const cols = [
    'Year',
    `${myName}`,
    hasSpouse ? `${spouseName}` : null,
    'Combined',
    'Income',
    'Expenses',
    '4% SWR',
    'Status',
  ].filter(Boolean);

  const rows = simulation.map(d => [
    String(d.year) + (d.crashApplied ? ' ⚠' : ''),
    fmtFull(d.meInvestments),
    hasSpouse ? fmtFull(d.spouseInvestments) : null,
    fmtFull(d.netWorth),
    d.yearlyIncome > 0 ? fmtFull(d.yearlyIncome) : '$0',
    d.recurringExpenses > 0 ? fmtFull(d.recurringExpenses) : '—',
    fmtFull(d.postTaxSwr4),
    d.isFreedom ? '💰 F.U.' : d.isRetirement ? '🏖 Retire' : (d.postTaxSwr4 >= d.freedomTarget && d.freedomTarget > 0) ? '✓ Free' : '',
  ].filter(v => v !== null));

  autoTable(doc, {
    startY: y,
    head: [cols],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: DARK,
      textColor: AMBER,
      fontStyle: 'bold',
      fontSize: 6.5,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [55, 65, 81],
      cellPadding: 1.8,
    },
    alternateRowStyles: { fillColor: OFF },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const row = simulation[data.row.index];
      if (row?.isFreedom) {
        data.cell.styles.fillColor = AMBERLT;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [92, 57, 0];
      } else if (row?.isRetirement) {
        data.cell.styles.fillColor = [237, 233, 254]; // purple-100
        data.cell.styles.fontStyle = 'bold';
      }
    },
    columnStyles: { 0: { fontStyle: 'bold' } },
    margin: { left: M, right: M },
  });

  // ── FOOTER on every page ─────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LGRAY);
    doc.line(M, 287, W - M, 287);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GRAY);
    doc.text('"A wise man\'s life is based around \'fuck you.\'" — The Gambler (2014)', M, 291);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, W - M, 291, { align: 'right' });
    doc.text('🔒 All data local — no server storage', W / 2, 291, { align: 'center' });
  }

  const slug = myName.toLowerCase().replace(/\s+/g, '-');
  doc.save(`fym-report-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
