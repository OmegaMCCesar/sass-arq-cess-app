// src/utils/excelUtils.js
import * as XLSX from 'xlsx';

export const exportToExcel = (data, fileName) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte de Baches');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};