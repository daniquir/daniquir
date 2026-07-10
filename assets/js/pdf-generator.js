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

    const target = exportRoot.querySelector(".wrapper");
    if (!target) {
      throw new Error("No se encontró el contenido del CV");
    }

    await waitForImages(exportRoot);
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));

    const name =
      target.querySelector(".name")?.textContent.trim() ||
      document.querySelector(".name")?.textContent.trim() ||
      "CV";
    const filename = `${name.replace(/\s+/g, "_")}_Resume.pdf`;

    const opt = {
      margin: [8, 8, 8, 8],
      filename,
      image: { type: "jpeg", quality: 0.85 },
      html2canvas: {
        scale: 1.2,
        useCORS: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        backgroundColor: "#ffffff",
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };

    const worker = html2pdf().set(opt).from(target).toCanvas();
    const canvas = await worker.get("canvas");

    if (!canvas || canvas.height === 0 || canvas.width === 0) {
      throw new Error("La captura del CV está vacía");
    }

    await html2pdf().set(opt).from(target).save();
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
