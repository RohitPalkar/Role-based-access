const units = [
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
const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];
export function convertNumberToWords(num) {
  if (num === '') return '';
  if (num === 0) return 'Zero Rupees Only';
  let words = '';
  // Break the number into Crore, Lakh, Thousand, Hundred, Tens, and Units
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = num % 100;
  if (crore > 0) {
    words += convertHundreds(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertHundreds(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertHundreds(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    words += convertHundreds(hundred) + ' Hundred ';
  }
  if (remainder > 0) {
    words += convertHundreds(remainder);
  }
  return words.trim() + ' Rupees Only'; // Add "Rupees Only" at the end
} // Helper function to convert numbers below 1000 to words

function convertHundreds(num) {
  let result = '';
  if (num > 99) {
    result += units[Math.floor(num / 100)] + ' Hundred ';
    num = num % 100;
  }
  if (num > 19) {
    result += tens[Math.floor(num / 10)] + ' ';
    num = num % 10;
  }
  if (num > 0) {
    result += units[num] + ' ';
  }
  return result.trim();
}
