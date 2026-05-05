import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Captura un nodo del DOM y lo exporta como archivo PDF.
 * @param {string}  elementId  - ID del contenedor HTML a capturar
 * @param {string}  projectName - Nombre que aparece en el PDF y en el nombre del archivo
 * @param {Function} onProgress - Callback opcional para reportar progreso (0-100)
 */
export async function exportGanttToPDF(
  elementId = 'gantt-container',
  projectName = 'Proyecto',
  onProgress = null
) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`No se encontró el elemento con id="${elementId}"`);

  onProgress?.(10);

  // Captura el DOM en alta resolución (scale:2 = doble densidad de píxeles)
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  onProgress?.(60);

  const imgData = canvas.toDataURL('image/png');
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Orientación automática: apaisado si el gráfico es más ancho que alto
  const orientation = canvasWidth > canvasHeight ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 30;
  const usableWidth = pageWidth - margin * 2;

  // Calcula alto proporcional al ancho usable
  const imgHeight = (canvasHeight / canvasWidth) * usableWidth;

  // Encabezado del PDF
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text(projectName, margin, margin + 14);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(120, 120, 120);
  pdf.text(`Exportado el ${new Date().toLocaleDateString('es-CL', { dateStyle: 'long' })}`, margin, margin + 28);

  onProgress?.(80);

  // Si el gráfico cabe en una página lo agrega directamente
  const imgY = margin + 45;
  if (imgY + imgHeight <= pageHeight - margin) {
    pdf.addImage(imgData, 'PNG', margin, imgY, usableWidth, imgHeight);
  } else {
    // Divide en múltiples páginas si el Gantt es muy alto
    let remainingHeight = imgHeight;
    let srcY = 0;
    let firstPage = true;

    while (remainingHeight > 0) {
      if (!firstPage) pdf.addPage();
      const startY = firstPage ? imgY : margin;
      const availableHeight = pageHeight - startY - margin;
      const sliceHeight = Math.min(remainingHeight, availableHeight);
      const srcHeight = (sliceHeight / imgHeight) * canvasHeight;

      // Crea un canvas parcial para cada página
      const slice = document.createElement('canvas');
      slice.width = canvasWidth;
      slice.height = srcHeight;
      const ctx = slice.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, canvasWidth, srcHeight, 0, 0, canvasWidth, srcHeight);
      pdf.addImage(slice.toDataURL('image/png'), 'PNG', margin, startY, usableWidth, sliceHeight);

      srcY += srcHeight;
      remainingHeight -= sliceHeight;
      firstPage = false;
    }
  }

  onProgress?.(95);

  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = projectName.replace(/\s+/g, '-').toLowerCase();
  pdf.save(`gantt-${safeName}-${dateStr}.pdf`);

  onProgress?.(100);
}
