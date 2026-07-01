export const printMasterData = (data, key) => {
  // Check if data is a valid array and key is defined
  if (
    !Array.isArray(data) ||
    !data.length ||
    key === undefined ||
    key === null
  ) {
    return '';
  }

  // Filter the data based on the key
  const result = data.find((obj) => obj.value == key);
  // Return result or an empty string if no match is found
  return result?.name ?? key;
};
