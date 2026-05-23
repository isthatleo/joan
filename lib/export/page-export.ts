import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

const EXPORT_PADDING = 48;
const EXPORT_CARD_RADIUS = 28;

function getContentWidth(element: HTMLElement) {
  return Math.max(element.scrollWidth, element.clientWidth, 1200);
}

function getContentHeight(element: HTMLElement) {
  return Math.max(element.scrollHeight, element.clientHeight, 800);
}

function buildExportScene(element: HTMLElement) {
  const width = getContentWidth(element);
  const height = getContentHeight(element);
  const scene = document.createElement("div");
  const card = document.createElement("div");
  const clone = element.cloneNode(true) as HTMLElement;

  scene.style.position = "fixed";
  scene.style.left = "-20000px";
  scene.style.top = "0";
  scene.style.width = `${width + EXPORT_PADDING * 2}px`;
  scene.style.height = `${height + EXPORT_PADDING * 2}px`;
  scene.style.padding = `${EXPORT_PADDING}px`;
  scene.style.boxSizing = "border-box";
  scene.style.background = "linear-gradient(180deg, #fff7ed 0%, #f8fafc 45%, #eef2ff 100%)";

  card.style.width = `${width}px`;
  card.style.minHeight = `${height}px`;
  card.style.background = "#ffffff";
  card.style.border = "1px solid rgba(226, 232, 240, 0.95)";
  card.style.borderRadius = `${EXPORT_CARD_RADIUS}px`;
  card.style.boxShadow = "0 24px 60px rgba(15, 23, 42, 0.14)";
  card.style.overflow = "hidden";

  clone.style.width = `${width}px`;
  clone.style.margin = "0";
  clone.style.boxSizing = "border-box";
  clone.style.background = clone.style.background || "#ffffff";

  card.appendChild(clone);
  scene.appendChild(card);
  document.body.appendChild(scene);

  return {
    scene,
    width: width + EXPORT_PADDING * 2,
    height: height + EXPORT_PADDING * 2,
  };
}

async function renderElementToPng(element: HTMLElement) {
  const elementStyles = getComputedStyle(element);
  const bodyStyles = getComputedStyle(document.body);
  const backgroundColor = elementStyles.backgroundColor && elementStyles.backgroundColor !== "rgba(0, 0, 0, 0)"
    ? elementStyles.backgroundColor
    : bodyStyles.backgroundColor || "#ffffff";
  const exportScene = buildExportScene(element);

  try {
    return await toPng(exportScene.scene, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor,
      width: exportScene.width,
      height: exportScene.height,
      skipFonts: true,
      fontEmbedCSS: "",
      preferredFontFormat: "woff2",
    });
  } finally {
    exportScene.scene.remove();
  }
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export async function exportElementAsPng(element: HTMLElement, filename: string) {
  const dataUrl = await renderElementToPng(element);
  triggerDownload(dataUrl, filename);
}

export async function exportElementAsPdf(element: HTMLElement, filename: string) {
  const dataUrl = await renderElementToPng(element);
  const width = getContentWidth(element) + EXPORT_PADDING * 2;
  const height = getContentHeight(element) + EXPORT_PADDING * 2;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const scale = Math.min((pageWidth - margin * 2) / width, (pageHeight - margin * 2) / height);
  const renderWidth = width * scale;
  const renderHeight = height * scale;
  const x = (pageWidth - renderWidth) / 2;
  const y = margin;

  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.addImage(dataUrl, "PNG", x, y, renderWidth, renderHeight, undefined, "FAST");
  pdf.save(filename);
}
