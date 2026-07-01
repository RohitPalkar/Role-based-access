export const validateAlternateMobile = (v?: string): true | string => {
  if (!v) return true;

  if (/^\+\d{1,3}$/.test(v)) {
    return true;
  }

  if (v.startsWith('+91')) {
    return /^\+91[6-9]\d{9}$/.test(v) ? true : 'Please enter a valid Indian mobile number.';
  }

  return /^\+?[1-9]\d{7,14}$/.test(v)
    ? true
    : 'Please enter a valid international mobile number.';
};
