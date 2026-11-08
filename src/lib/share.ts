/**
 * Sharing helpers — Kerala students live in class WhatsApp groups, so
 * every share message is written to be forwarded: what it is, which
 * subject, and the link that opens exactly that material (signing in
 * first if needed, thanks to the login `next` redirect).
 */

export function absoluteUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function materialShareMessage(title: string, subjectLabel: string | null, path: string): string {
  const subject = subjectLabel ? `\n📚 ${subjectLabel}` : '';
  return `📖 *${title}*${subject}\n\nDownload it free on Azhimathi Mayam (അഴിമതി മയം):\n${absoluteUrl(path)}`;
}

export function subjectShareMessage(subjectLabel: string, path: string): string {
  return `📚 *${subjectLabel}* — notes, question papers & important questions\n\nGet them free on Azhimathi Mayam (അഴിമതി മയം):\n${absoluteUrl(path)}`;
}
