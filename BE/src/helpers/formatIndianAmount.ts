export const formatIndianAmount = (amount: number | string): string => {
  if (!amount) return '0';

  const [intPart, decimalPart] = amount.toString().split('.');
  const digits = intPart.replace(/\D/g, ''); // Ensure it's digits only
  let result = '';

  const len = digits.length;

  if (len > 3) {
    const lastThree = digits.slice(-3);
    const other = digits.slice(0, len - 3);

    // Insert commas every 2 digits for the part before last 3
    const reversed = other.split('').reverse();
    for (let i = 0; i < reversed.length; i++) {
      if (i % 2 === 0 && i !== 0) result = ',' + result;
      result = reversed[i] + result;
    }

    result = result + ',' + lastThree;
  } else {
    result = digits;
  }

  // Add decimals
  const decimals = decimalPart
    ? parseFloat('0.' + decimalPart)
        .toFixed(2)
        .slice(2)
    : null;

  return decimals ? `${result}` : result;
};
