/**
 * Returns whether the user has uploaded a signature (non-empty signatureImage).
 */
export function isSignaturePresent(signatureImage?: string | null): boolean {
  if (signatureImage == null) {
    return false;
  }
  return signatureImage.trim().length > 0;
}
