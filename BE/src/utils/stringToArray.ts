export const stringToArray = (text: string) => {
  if (!text) return [];
  return text.split(',');
};
