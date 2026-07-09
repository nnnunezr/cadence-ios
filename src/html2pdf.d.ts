declare module 'html2pdf.js' {
  const html2pdf: () => {
    set: (opt: unknown) => ReturnType<typeof html2pdf>;
    from: (el: HTMLElement | string) => ReturnType<typeof html2pdf>;
    save: () => Promise<void>;
    outputPdf: (type?: string) => Promise<string>;
  };
  export default html2pdf;
}
