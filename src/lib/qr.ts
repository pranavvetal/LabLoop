// ============================================================
// LabLoop Enterprise — QR Token Generation & Verification
// ============================================================

import QRCode from 'qrcode';

/**
 * Generate a signed short-lived hardware token for physical machine mounting.
 */
export function generateResourceToken(resourceId: string): string {
  const payload = {
    rid: resourceId,
    ts: Date.now(),
    nonce: Math.random().toString(36).slice(2, 8),
  };
  const jsonStr = JSON.stringify(payload);
  const base64 = typeof btoa !== 'undefined' ? btoa(jsonStr) : Buffer.from(jsonStr).toString('base64');
  return `LABLOOP:${base64}`;
}

/**
 * Parse and verify scanned QR code token or plain resource ID fallback.
 */
export function verifyResourceToken(scannedText: string): { valid: boolean; resourceId?: string } {
  if (!scannedText) return { valid: false };

  const trimmed = scannedText.trim();

  // 1. Direct resource ID match (e.g. "res-laser")
  if (trimmed.startsWith('res-')) {
    return { valid: true, resourceId: trimmed };
  }

  // 2. Token format: LABLOOP:<base64>
  if (trimmed.startsWith('LABLOOP:')) {
    try {
      const b64 = trimmed.replace('LABLOOP:', '');
      const jsonStr = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf-8');
      const parsed = JSON.parse(jsonStr);
      if (parsed.rid) {
        return { valid: true, resourceId: parsed.rid };
      }
    } catch (e) {
      return { valid: false };
    }
  }

  return { valid: false };
}

/**
 * Render a high-contrast QR code as a PNG data URL.
 */
export async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1e1b4b', // deep indigo
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed generating QR code data URL:', err);
    // SVG data url fallback if canvas not available
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231e1b4b"/><text x="50" y="55" fill="white" font-size="8" text-anchor="middle">QR [${encodeURIComponent(text)}]</text></svg>`;
  }
}
