import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { Document, Packer, Paragraph } from "docx";
import JSZip from "jszip";
import type { ConversionType } from "@workspace/api-zod";

export interface ConvertedFile {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface ConversionOutcome {
  files: ConvertedFile[];
  warning: string | null;
}

function baseName(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? fileName : fileName.slice(0, idx);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.pages.map((p) => p.text).join("\n\n");
  } finally {
    await parser.destroy();
  }
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim().length === 0) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  return lines;
}

async function textToPdf(text: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const lineHeight = fontSize * 1.4;
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;

  const lines = wrapText(text || " ", font, fontSize, maxWidth);

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of lines) {
    if (y < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  }

  return Buffer.from(await doc.save());
}

async function docxToPdf(file: ConvertedFile): Promise<ConvertedFile> {
  const { value: text } = await mammoth.extractRawText({ buffer: file.buffer });
  const pdfBuffer = await textToPdf(text);
  return { fileName: `${baseName(file.fileName)}.pdf`, mimeType: "application/pdf", buffer: pdfBuffer };
}

async function pdfToDocx(file: ConvertedFile): Promise<ConvertedFile> {
  const text = await extractPdfText(file.buffer);
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => new Paragraph(block));

  const doc = new Document({
    sections: [{ children: paragraphs.length > 0 ? paragraphs : [new Paragraph("")] }],
  });
  const buffer = await Packer.toBuffer(doc);
  return {
    fileName: `${baseName(file.fileName)}.docx`,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer,
  };
}

async function pdfToTxt(file: ConvertedFile): Promise<ConvertedFile> {
  const text = await extractPdfText(file.buffer);
  return { fileName: `${baseName(file.fileName)}.txt`, mimeType: "text/plain", buffer: Buffer.from(text, "utf-8") };
}

async function pdfToMarkdown(file: ConvertedFile): Promise<ConvertedFile> {
  const text = await extractPdfText(file.buffer);
  const markdown = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .join("\n\n");
  return {
    fileName: `${baseName(file.fileName)}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from(markdown, "utf-8"),
  };
}

async function imagesToPdf(files: ConvertedFile[]): Promise<ConvertedFile> {
  const doc = await PDFDocument.create();
  for (const file of files) {
    const isPng = file.mimeType.includes("png") || file.fileName.toLowerCase().endsWith(".png");
    const image = isPng ? await doc.embedPng(file.buffer) : await doc.embedJpg(file.buffer);
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  const buffer = Buffer.from(await doc.save());
  return { fileName: "converted-images.pdf", mimeType: "application/pdf", buffer };
}

async function pdfToImages(file: ConvertedFile): Promise<ConvertedFile[]> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = await import("@napi-rs/canvas");

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(file.buffer) });
  const pdf = await loadingTask.promise;
  const outputs: ConvertedFile[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({ canvas: canvas as unknown as any, canvasContext: ctx as unknown as any, viewport }).promise;
    const buffer = canvas.toBuffer("image/png");
    outputs.push({
      fileName: `${baseName(file.fileName)}-page-${i}.png`,
      mimeType: "image/png",
      buffer,
    });
  }

  await loadingTask.destroy();
  return outputs;
}

export async function convertFiles(
  conversionType: ConversionType,
  files: ConvertedFile[],
): Promise<ConversionOutcome> {
  switch (conversionType) {
    case "docx-to-pdf": {
      const outputs = await Promise.all(files.map((f) => docxToPdf(f)));
      return { files: outputs, warning: null };
    }
    case "pdf-to-docx": {
      const outputs = await Promise.all(files.map((f) => pdfToDocx(f)));
      return { files: outputs, warning: null };
    }
    case "pdf-to-txt": {
      const outputs = await Promise.all(files.map((f) => pdfToTxt(f)));
      return { files: outputs, warning: null };
    }
    case "pdf-to-markdown": {
      const outputs = await Promise.all(files.map((f) => pdfToMarkdown(f)));
      return { files: outputs, warning: null };
    }
    case "images-to-pdf": {
      const output = await imagesToPdf(files);
      return { files: [output], warning: null };
    }
    case "pdf-to-images": {
      if (files.length > 1) {
        const allOutputs = await Promise.all(files.map((f) => pdfToImages(f)));
        const zip = new JSZip();
        for (const outputs of allOutputs) {
          for (const output of outputs) {
            zip.file(output.fileName, output.buffer);
          }
        }
        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
        return {
          files: [{ fileName: "converted-images.zip", mimeType: "application/zip", buffer: zipBuffer }],
          warning: null,
        };
      }
      const outputs = await pdfToImages(files[0]!);
      return { files: outputs, warning: null };
    }
    default:
      throw new Error(`Unsupported conversion type: ${String(conversionType)}`);
  }
}
