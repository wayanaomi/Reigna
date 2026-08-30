import { resolveTxt } from "node:dns/promises";

/**
 * Deliverability — real DNS checks for SPF, DKIM, and DMARC.
 *
 * These are never faked or defaulted to `true`. If a lookup fails (domain
 * has no record, DNS error, etc.) the corresponding flag is `false` and
 * Reigna will not consider that sender identity healthy.
 */

export interface DeliverabilityResult {
  spfValid: boolean;
  dkimValid: boolean;
  dmarcValid: boolean;
  checkedAt: string;
}

// DKIM has no fixed, discoverable location — the selector is chosen by
// whichever service configured the DNS record. We probe the selectors most
// commonly used by mailbox/ESP providers. This is a best-effort signal, not
// a guarantee that no DKIM record exists if all of these miss.
const COMMON_DKIM_SELECTORS = ["google", "default", "selector1", "selector2", "k1", "s1", "instantly", "smtp"];

async function hasMatchingTxtRecord(hostname: string, predicate: (record: string) => boolean): Promise<boolean> {
  try {
    const records = await resolveTxt(hostname);
    return records.some((chunks) => predicate(chunks.join("")));
  } catch {
    return false;
  }
}

async function checkSpf(domain: string): Promise<boolean> {
  return hasMatchingTxtRecord(domain, (record) => record.toLowerCase().startsWith("v=spf1"));
}

async function checkDmarc(domain: string): Promise<boolean> {
  return hasMatchingTxtRecord(`_dmarc.${domain}`, (record) => record.toLowerCase().startsWith("v=dmarc1"));
}

async function checkDkim(domain: string): Promise<boolean> {
  for (const selector of COMMON_DKIM_SELECTORS) {
    const found = await hasMatchingTxtRecord(
      `${selector}._domainkey.${domain}`,
      (record) => record.toLowerCase().includes("v=dkim1") || record.toLowerCase().includes("p=")
    );
    if (found) return true;
  }
  return false;
}

export const deliverabilityService = {
  /** Runs SPF/DKIM/DMARC checks against a domain's real DNS records. */
  async checkDomain(domain: string): Promise<DeliverabilityResult> {
    const [spfValid, dkimValid, dmarcValid] = await Promise.all([
      checkSpf(domain),
      checkDkim(domain),
      checkDmarc(domain),
    ]);
    return { spfValid, dkimValid, dmarcValid, checkedAt: new Date().toISOString() };
  },
};
