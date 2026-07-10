function getBaseUrl() {
  const meta = document.querySelector('meta[name="baseurl"]');
  return meta ? meta.getAttribute("content") || "" : "";
}

async function generatePDF() {
  const button = document.getElementById("pdfButton");
  if (!button || button.disabled) return;

  const originalLabel = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

  const baseurl = getBaseUrl();
  const printURL = `${window.location.origin}${baseurl}/print`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:210mm;height:100vh;border:none;";
  iframe.src = printURL;

  try {
    await new Promise((resolve, reject) => {
      iframe.onload = resolve;
      iframe.onerror = reject;
      document.body.appendChild(iframe);
    });

    const iframeDoc =
      iframe.contentDocument || iframe.contentWindow.document;

    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      await iframeDoc.fonts.ready;
    }

    const images = iframeDoc.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map(
        (img) =>
          img.complete ||
          new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 300));

    const body = iframeDoc.body;
    const nameEl = iframeDoc.querySelector(".name");
    const name = nameEl ? nameEl.textContent.trim() : "CV";
    const filename = `${name.replace(/\s+/g, "_")}_Resume.pdf`;

    const contentHeight = body.scrollHeight;
    const contentWidth = body.scrollWidth;

    const opt = {
      margin: [8, 8, 8, 8],
      filename,
      image: { type: "jpeg", quality: 0.85 },
      html2canvas: {
        scale: 1.2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: contentWidth,
        windowHeight: contentHeight,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: {
        mode: ["avoid-all", "css", "legacy"],
        avoid: [".skillset", ".container-block", ".item", "section"],
      },
    };

    await html2pdf().set(opt).from(body).save();
  } catch (err) {
    console.error("Error generating PDF:", err);
    alert("No se pudo generar el PDF. Inténtalo de nuevo.");
  } finally {
    iframe.remove();
    button.disabled = false;
    button.innerHTML = originalLabel;
  }
}
