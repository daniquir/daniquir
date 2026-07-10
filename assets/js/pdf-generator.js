async function generatePDF() {
  const button = document.getElementById("pdfButton");
  if (!button || button.disabled) return;

  const element = document.querySelector(".wrapper");
  if (!element) {
    alert("No se encontró el contenido del CV.");
    return;
  }

  const originalLabel = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

  document.body.classList.add("pdf-export");
  window.scrollTo(0, 0);

  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );

  const nameEl = document.querySelector(".name");
  const name = nameEl ? nameEl.textContent.trim() : "CV";
  const filename = `${name.replace(/\s+/g, "_")}_Resume.pdf`;

  const opt = {
    margin: [8, 8, 8, 8],
    filename,
    image: { type: "jpeg", quality: 0.85 },
    html2canvas: {
      scale: 1.5,
      useCORS: true,
      letterRendering: true,
      logging: false,
      scrollY: -window.scrollY,
      scrollX: -window.scrollX,
      onclone: (clonedDoc) => {
        clonedDoc.body.classList.add("pdf-export");
        clonedDoc.querySelector(".pdf-button")?.remove();
        clonedDoc.querySelector("footer")?.remove();
      },
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"], avoid: [".item", ".section"] },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error("Error generating PDF:", err);
    alert("No se pudo generar el PDF. Inténtalo de nuevo.");
  } finally {
    document.body.classList.remove("pdf-export");
    button.disabled = false;
    button.innerHTML = originalLabel;
  }
}
