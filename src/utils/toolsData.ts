import { ToolMetadata } from '../types';

export const TOOLS_LIST: ToolMetadata[] = [
  {
    id: 'pdf-compress',
    name: 'PDF Compressor',
    description: 'Compress PDF files client-side. Adjust size and quality levels easily.',
    icon: 'FileDown',
    category: 'pdf',
  },
  {
    id: 'jpeg-compress',
    name: 'JPEG Compressor',
    description: 'Optimize JPEG/JPG images with dynamic pixel percentage sliders.',
    icon: 'ImageDown',
    category: 'image',
  },
  {
    id: 'image-resize',
    name: 'Image Resizer',
    description: 'Adjust image height, width, aspect ratios, or percentages.',
    icon: 'Maximize2',
    category: 'image',
  },
  {
    id: 'image-enhance',
    name: 'Image Enhancer',
    description: 'Boost brightness, contrast, saturation, or precision sharpness details.',
    icon: 'Sliders',
    category: 'image',
  },
  {
    id: 'jpeg-to-pdf',
    name: 'JPEG to PDF',
    description: 'Convert JPG photos into high-fidelity custom-sized PDF pages.',
    icon: 'FileImage',
    category: 'convert',
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    description: 'Convert Microsoft Word .docx to clean printable PDF documents.',
    icon: 'FileText',
    category: 'convert',
  },
  {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    description: 'Convert Excel .xlsx spreadsheets to formatted horizontal PDF tables.',
    icon: 'TrendingUp', // will replace with styled representation or Sheet/Grid icon
    category: 'convert',
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to Image',
    description: 'Convert PDF document pages to PNG or JPEG zip image packages.',
    icon: 'FolderImage',
    category: 'pdf',
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Extract raw text layouts and bundle into authentic editable .docx files.',
    icon: 'FileCode',
    category: 'convert',
  },
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into one master document easily.',
    icon: 'Files',
    category: 'pdf',
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    description: 'Split PDF files by specific pages, range inputs, or intervals.',
    icon: 'Scissors',
    category: 'pdf',
  },
];
