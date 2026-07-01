export const joinImageArray = (
  value: any,
  delimiter: string = ', ',
  prefix: string = '',
) => {
  if (!Array.isArray(value)) return String(value);
  return value
    .filter((item) => item)
    .map((item) => `${prefix}${item}`)
    .join(delimiter);
};
