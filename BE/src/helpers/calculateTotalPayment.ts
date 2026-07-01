export const calculateTotalPayment = (
  transactions: Array<{ amount: number }>,
): number => {
  // Validate input
  if (!Array.isArray(transactions)) {
    return 0;
  }
  // Ensure all transaction amounts are valid numbers
  return transactions.reduce((total, transaction) => {
    if (typeof transaction.amount !== 'number') {
      return total + 0;
    }
    return total + transaction.amount;
  }, 0);
};
