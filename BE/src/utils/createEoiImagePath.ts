export const createEoiImagePath = (text: string) => {
  text = text?.trim();
  if (!text) return [];
  return text.split(',').map((item) => `images/${item}`);
};
