/** Basic check for a valid-looking URL (requires protocol like http/https) */
export function isValidUrl(urlString: string): boolean {
  if (!urlString) return false;
  try {
    // Ensure it includes a protocol, otherwise URL constructor might accept relative paths
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/** Basic check for a valid-looking email */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  // Simple regex, consider a more robust library for production
  // Allows common formats but not overly strict
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}
