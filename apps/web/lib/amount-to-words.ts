/**
 * Converts a numeric amount to Indian English Words (Lakhs & Crores).
 * Standard for Indian Tax Invoices, Receipts, and Financial Documents.
 *
 * Example:
 * 14520.50 -> "Fourteen Thousand Five Hundred Twenty Rupees and Fifty Paise Only"
 * 100000 -> "One Lakh Rupees Only"
 */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertBelowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n]!;
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const rest = n % 10;
    return `${TENS[ten]}${rest > 0 ? ` ${ONES[rest]}` : ''}`;
  }
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return `${ONES[hundred]} Hundred${rest > 0 ? ` ${convertBelowThousand(rest)}` : ''}`;
}

export function amountInWords(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num <= 0) return 'Zero Rupees Only';

  const parts = num.toFixed(2).split('.');
  const integerPart = parseInt(parts[0]!, 10);
  const paisePart = parseInt(parts[1]!, 10);

  if (integerPart === 0 && paisePart === 0) return 'Zero Rupees Only';

  let remaining = integerPart;
  const chunks: string[] = [];

  // Crores (1,00,00,000)
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    remaining %= 10000000;
    chunks.push(`${convertBelowThousand(crores)} Crore`);
  }

  // Lakhs (1,00,000)
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    remaining %= 100000;
    chunks.push(`${convertBelowThousand(lakhs)} Lakh`);
  }

  // Thousands (1,000)
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    remaining %= 1000;
    chunks.push(`${convertBelowThousand(thousands)} Thousand`);
  }

  // Hundreds & below
  if (remaining > 0) {
    chunks.push(convertBelowThousand(remaining));
  }

  const rupeeString = chunks.join(' ').trim();
  const rupeeText = rupeeString ? `${rupeeString} Rupees` : '';

  let paiseText = '';
  if (paisePart > 0) {
    const pWord = convertBelowThousand(paisePart);
    paiseText = `${pWord} Paise`;
  }

  if (rupeeText && paiseText) {
    return `${rupeeText} and ${paiseText} Only`;
  } else if (rupeeText) {
    return `${rupeeText} Only`;
  } else if (paiseText) {
    return `${paiseText} Only`;
  }

  return 'Zero Rupees Only';
}
