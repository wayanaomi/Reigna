import { contactsService } from "@/lib/services/contacts";
import { suppressionService } from "@/lib/services/suppression";
import { verificationService } from "@/lib/services/verification";

/**
 * CSV import — operator-uploaded contact lists. Imported contacts are
 * never automatically added to a campaign or sent to; they land in the
 * pipeline exactly like any other contact, subject to the same
 * verification and suppression checks.
 */

export interface CsvImportRow {
  company: string;
  domain?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  email: string;
}

export interface CsvImportSummary {
  total: number;
  imported: number;
  skippedDuplicate: number;
  skippedSuppressed: number;
  skippedInvalid: number;
}

/** Parses CSV text (handles quoted fields containing commas/newlines). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    header.forEach((key, i) => {
      record[key] = (cells[i] ?? "").trim();
    });
    return record;
  });
}

/** Maps raw CSV records (with flexible column naming) into normalized rows. */
export function normalizeCsvRows(records: Record<string, string>[]): CsvImportRow[] {
  return records
    .map((record): CsvImportRow | null => {
      const email = record.email ?? record["email address"] ?? "";
      if (!email || !email.includes("@")) return null;

      const firstName = record.first_name ?? record.firstname ?? "";
      const lastName = record.last_name ?? record.lastname ?? "";
      const name = record.name ?? [firstName, lastName].filter(Boolean).join(" ");
      if (!name) return null;

      const company = record.company ?? record.company_name ?? "";
      if (!company) return null;

      return {
        company,
        domain: record.domain || record.website || undefined,
        name,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        title: record.title || undefined,
        email: email.toLowerCase(),
      };
    })
    .filter((row): row is CsvImportRow => row !== null);
}

/** Imports normalized rows: dedupes against existing contacts, checks suppression, verifies, saves. */
export async function importContacts(ownerId: string, rows: CsvImportRow[]): Promise<CsvImportSummary> {
  const summary: CsvImportSummary = {
    total: rows.length,
    imported: 0,
    skippedDuplicate: 0,
    skippedSuppressed: 0,
    skippedInvalid: 0,
  };

  for (const row of rows) {
    const existing = await contactsService.findByEmail(ownerId, row.email);
    if (existing) {
      summary.skippedDuplicate += 1;
      continue;
    }

    const suppressed = await suppressionService.isSuppressed(ownerId, row.email);
    if (suppressed) {
      summary.skippedSuppressed += 1;
      continue;
    }

    const verification = await verificationService.verifyEmail(row.email);
    if (verification.status === "INVALID") {
      summary.skippedInvalid += 1;
      continue;
    }

    const contact = await contactsService.create(ownerId, {
      company: row.company,
      companyDomain: row.domain,
      name: row.name,
      title: row.title,
      email: row.email,
      source: "IMPORT",
      emailConfidence: verification.confidence,
    });

    if (verification.status) {
      await contactsService.updateVerification(ownerId, contact.id, verification.status, verification.confidence);
    }

    summary.imported += 1;
  }

  return summary;
}
