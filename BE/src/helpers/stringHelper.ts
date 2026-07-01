export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str: string, length: number): string => {
  return str.length > length ? str.substring(0, length) + '...' : str;
};

export const toTitleCase = (str: string): string => {
  const res =
    typeof str === 'string' && str.length > 0
      ? str.replace(/\w\S*/g, (txt) => {
          return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
        })
      : '';
  return res;
};

export const extractRoleName = (role: string): string => {
  const openIdx = role.indexOf('(');
  const closeIdx = role.indexOf(')');
  if (openIdx !== -1 && closeIdx !== -1 && closeIdx > openIdx) {
    return role.substring(openIdx + 1, closeIdx).trim();
  }
  return role.trim();
};

export const safeString = (v?: string, fallback = '') =>
  v && v?.trim() !== '' ? v : fallback;
