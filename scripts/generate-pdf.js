const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const CV_URL =
  process.env.CV_URL || "http://host.docker.internal:4000/online-cv/print/";
const OUTPUT =
  process.env.OUTPUT ||
  path.join(__dirname, "../assets/pdf/Daniel_Quirant_Rico_CV.raw.pdf");
const METRICS =
  process.env.METRICS ||
  path.join(__dirname, "../assets/pdf/.pdf-metrics.json");

const A4_HEIGHT_PX = Math.round((297 * 96) / 25.4);

(async () => {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });
    await page.goto(CV_URL, { waitUntil: "networkidle0", timeout: 90000 });
    await page.emulateMediaType("print");

    const metrics = await page.evaluate((pageHeight) => {
      const scrollHeight = document.body.scrollHeight;
      const remainder = scrollHeight % pageHeight;
      const lastPageFillRatio =
        remainder === 0 ? 0 : (pageHeight - remainder) / pageHeight;

      return {
        scrollHeight,
        a4HeightPx: pageHeight,
        lastPageFillRatio,
      };
    }, A4_HEIGHT_PX);

    fs.writeFileSync(METRICS, JSON.stringify(metrics));

    await page.pdf({
      path: OUTPUT,
      format: "A4",
      printBackground: true,
      omitBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    console.error(`PDF sin fondos: ${OUTPUT}`);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error("Error generando PDF:", err.message);
  process.exit(1);
});
