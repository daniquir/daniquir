function getBaseUrl() {
  const meta = document.querySelector('meta[name="baseurl"]');
  return meta ? meta.getAttribute("content") || "" : "";
}

function waitForImages(root) {
  const images = root.querySelectorAll("img");
  return Promise.all(
    Array.from(images).map(
      (img) =>
        img.complete ||
        new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        })
    )
  );
}

function openPrintFallback() {
  const baseurl = getBaseUrl();
  const printURL = `${window.location.origin}${baseurl}/print`;
  const printWindow = window.open(printURL, "_blank");

  if (!printWindow) {
    alert("Permite las ventanas emergentes o usa Ctrl+P para guardar el CV en PDF.");
    return;
  }

  printWindow.addEventListener("load", () => {
    printWindow.focus();
    printWindow.print();
  });
}

async function captureWrapper(wrapper) {
  const canvasOptions = {
    scale: 1.5,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollY: 0,
    scrollX: 0,
  };

  const worker = html2pdf().set({ html2canvas: canvasOptions }).from(wrapper).toCanvas();
  return worker.get("canvas");
}

async function saveContinuousPdf(canvas, filename) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error("jsPDF no está disponible");
  }

  const pageWidth = 210;
  const pageHeight = (canvas.height * pageWidth) / canvas.width;

  const pdf = new jsPDF({
    unit: "mm",
    format: [pageWidth, pageHeight],
    orientation: "portrait",
  });

  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.92),
    "JPEG",
    0,
    0,
    pageWidth,
    pageHeight,
    undefined,
    "FAST"
  );

  pdf.save(filename);
}

async function generatePDF() {
  const button = document.getElementById("pdfButton");
  if (!button || button.disabled) return;

  const originalLabel = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

  let exportRoot;
  let overlay;

  try {
    const baseurl = getBaseUrl();
    const printURL = `${window.location.origin}${baseurl}/print`;
    const response = await fetch(printURL);

    if (!response.ok) {
      throw new Error(`No se pudo cargar la vista de impresión (${response.status})`);
    }

    const html = await response.text();

    overlay = document.createElement("div");
    overlay.className = "pdf-export-overlay";
    overlay.innerHTML = "<p>Generando PDF...</p>";
    document.body.appendChild(overlay);

    exportRoot = document.createElement("div");
    exportRoot.className = "pdf-export-container";
    exportRoot.innerHTML = html;
    document.body.appendChild(exportRoot);

    const wrapper = exportRoot.querySelector(".wrapper");
    if (!wrapper) {
      throw new Error("No se encontró el contenido del CV");
    }

    await waitForImages(exportRoot);
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = await captureWrapper(wrapper);
    if (!canvas || canvas.height === 0 || canvas.width === 0) {
      throw new Error("La captura del CV está vacía");
    }

    const name =
      exportRoot.querySelector(".name")?.textContent.trim() ||
      document.querySelector(".name")?.textContent.trim() ||
      "CV";
    const filename = `${name.replace(/\s+/g, "_")}_Resume.pdf`;

    await saveContinuousPdf(canvas, filename);
  } catch (err) {
    console.error("Error generating PDF:", err);
    openPrintFallback();
  } finally {
    exportRoot?.remove();
    overlay?.remove();
    button.disabled = false;
    button.innerHTML = originalLabel;
  }
}
