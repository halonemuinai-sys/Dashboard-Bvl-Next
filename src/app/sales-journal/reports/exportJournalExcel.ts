import { JournalReportPayload } from './types';
import { downloadBlob } from './styles';
import { buildSheetDailyJournal } from './sheetDailyJournal';
import { buildSheetAttribution } from './sheetAttribution';
import { buildSheetStoreMatrix } from './sheetStoreMatrix';
import { buildSheetExecutiveSynthesis } from './sheetExecutiveSynthesis';

export async function exportJournalExcel(payload: JournalReportPayload) {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();

  wb.creator = 'Bvlgari Retail Intelligence';
  wb.created = new Date();
  wb.properties.date1904 = false;

  // Build the 4 Modular Sheets
  buildSheetDailyJournal(wb, payload);
  buildSheetAttribution(wb, payload);
  buildSheetStoreMatrix(wb, payload);
  buildSheetExecutiveSynthesis(wb, payload);

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `BVLGARI_Sales_Journal_${payload.monthName}_${payload.year}.xlsx`;
  downloadBlob(buffer, filename);
}
