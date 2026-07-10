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

function createPdfBlock(className) {
  const block = document.createElement("div");
  block.className = `pdf-block${className ? ` ${className}` : ""}`;
  return block;
}

function reorganizeIntoBlocks(target) {
  const flow = document.createElement("div");
  flow.className = "pdf-blocks-flow";

  const sidebar = target.querySelector(".sidebar-wrapper");
  const main = target.querySelector(".main-wrapper");

  sidebar
    ?.querySelectorAll(
      ":scope > .profile-container, :scope > .contact-container, :scope > .container-block"
    )
    .forEach((element) => {
      if (element.classList.contains("education-container")) {
        const title = element.querySelector(".container-block-title");
        const items = element.querySelectorAll(".item");

        items.forEach((item, index) => {
          const block = createPdfBlock("pdf-block--sidebar");
          if (index === 0 && title) block.appendChild(title);
          block.appendChild(item);
          flow.appendChild(block);
        });
        return;
      }

      const block = createPdfBlock("pdf-block--sidebar");
      block.appendChild(element);
      flow.appendChild(block);
    });

  main?.querySelectorAll(":scope > .section").forEach((section) => {
    const title = section.querySelector(":scope > .section-title");
    const summary = section.querySelector(":scope > .summary");
    const skillset = section.querySelector(":scope > .skillset");
    const items = section.querySelectorAll(":scope > .item");

    if (summary) {
      const block = createPdfBlock("pdf-block--main");
      if (title) block.appendChild(title);
      block.appendChild(summary);
      flow.appendChild(block);
      return;
    }

    if (skillset) {
      const block = createPdfBlock("pdf-block--main");
      if (title) block.appendChild(title);
      block.appendChild(skillset);
      flow.appendChild(block);
      return;
    }

    if (items.length) {
      items.forEach((item, index) => {
        const block = createPdfBlock("pdf-block--main");
        if (index === 0 && title) block.appendChild(title);
        block.appendChild(item);
        flow.appendChild(block);
      });
      return;
    }

    if (title) {
      const block = createPdfBlock("pdf-block--main");
      block.appendChild(section);
      flow.appendChild(block);
    }
  });

  target.innerHTML = "";
  target.appendChild(flow);

  return flow.querySelectorAll(".pdf-block");
}

async function captureBlock(element, options) {
  const worker = html2pdf().set({ html2canvas: options }).from(element).toCanvas();
  return worker.get("canvas");
}

function addBlockToPdf(pdf, canvas, state, contentWidth, pageHeight, margin) {
  const scale = contentWidth / canvas.width;
  const blockHeight = canvas.height * scale;
  const maxPageHeight = pageHeight - margin * 2;

  if (state.y + blockHeight > pageHeight - margin) {
    pdf.addPage();
    state.y = margin;
  }

  if (blockHeight <= maxPageHeight) {
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.85),
      "JPEG",
      margin,
      state.y,
      contentWidth,
      blockHeight
    );
    state.y += blockHeight + 4;
    return;
  }

  let sourceY = 0;
  while (sourceY < canvas.height) {
    if (state.y > margin) {
      pdf.addPage();
      state.y = margin;
    }

    const availableMm = pageHeight - state.y - margin;
    const sliceHeightPx = Math.min(
      canvas.height - sourceY,
      Math.max(1, Math.floor(availableMm / scale))
    );
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    sliceCanvas
      .getContext("2d")
      .drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx
      );

    const sliceHeight = sliceHeightPx * scale;
    pdf.addImage(
      sliceCanvas.toDataURL("image/jpeg", 0.85),
      "JPEG",
      margin,
      state.y,
      contentWidth,
      sliceHeight
    );

    sourceY += sliceHeightPx;
    state.y += sliceHeight;
  }

  state.y += 4;
}

async function renderBlocksToPdf(blocks, filename) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error("jsPDF no está disponible");
  }
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 8;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const state = { y: margin };

  const canvasOptions = {
    scale: 1.5,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollY: 0,
    scrollX: 0,
  };

  for (const block of blocks) {
    const canvas = await captureBlock(block, canvasOptions);
    if (!canvas || canvas.height === 0 || canvas.width === 0) {
      continue;
    }

    addBlockToPdf(pdf, canvas, state, contentWidth, pageHeight, margin);
  }

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

    const target = exportRoot.querySelector(".wrapper");
    if (!target) {
      throw new Error("No se encontró el contenido del CV");
    }

    await waitForImages(exportRoot);
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));

    const blocks = reorganizeIntoBlocks(target);
    if (!blocks.length) {
      throw new Error("No se encontraron bloques para exportar");
    }

    const name =
      exportRoot.querySelector(".name")?.textContent.trim() ||
      document.querySelector(".name")?.textContent.trim() ||
      "CV";
    const filename = `${name.replace(/\s+/g, "_")}_Resume.pdf`;

    await renderBlocksToPdf(blocks, filename);
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
