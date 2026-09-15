"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerId } from "@/lib/auth/session";
import { parseCsv, normalizeCsvRows, importContacts, type CsvImportSummary } from "@/lib/services/import/csv";

export interface ImportCsvState {
  submitted: boolean;
  summary?: CsvImportSummary;
  error?: string;
}

export async function importCsv(_prevState: ImportCsvState, formData: FormData): Promise<ImportCsvState> {
  const ownerId = await requireOwnerId();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { submitted: true, error: "Choose a CSV file to upload." };
  }

  const text = await file.text();
  const records = parseCsv(text);
  const rows = normalizeCsvRows(records);

  if (rows.length === 0) {
    return { submitted: true, error: "Reigna couldn't find any valid rows. Make sure your CSV has company, name, and email columns." };
  }

  const summary = await importContacts(ownerId, rows);
  revalidatePath("/leads");
  return { submitted: true, summary };
}
