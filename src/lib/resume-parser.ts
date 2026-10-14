export async function parseResume(file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Please choose a resume smaller than 20 MB.');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return file.text();
  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  if (ext === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    const pdf = await task.promise;
    try {
      const pages: string[] = [];
      for (let i=1; i<=pdf.numPages; i++) {
        const page = await pdf.getPage(i); const text = await page.getTextContent();
        pages.push(text.items.map(item => 'str' in item ? item.str : '').join(' '));
      }
      return pages.join('\n');
    } finally { await task.destroy(); }
  }
  throw new Error('Please upload a PDF, DOCX or TXT file.');
}
