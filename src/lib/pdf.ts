// ── Render HTML to a PDF and save it via the platform Filesystem ──────────────
import html2pdf from 'html2pdf.js';
import { saveToDevice } from '../data';
import { toast } from '../components/ui';

export async function downloadPDF(filename: string, innerHTML: string) {
  filename = filename.replace(/[/\\:*?"<>|]+/g, '-'); // keep Filesystem paths flat
  const el = document.createElement('div');
  el.innerHTML = innerHTML;
  el.style.cssText =
    'padding:28px;font-family:Inter,system-ui,sans-serif;color:#111;background:#fff;width:600px';
  document.body.appendChild(el);
  const dataUri = await html2pdf()
    .set({ margin: 8, filename, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } })
    .from(el)
    .outputPdf('datauristring');
  el.remove();
  const base64 = dataUri.split(',')[1] ?? '';
  const res = await saveToDevice(filename, base64, { base64: true, mime: 'application/pdf' });
  if (res.saved) toast(res.location === 'download' ? 'PDF downloaded' : 'Saved to Documents');
  else toast('Storage permission needed to save the PDF.');
}
