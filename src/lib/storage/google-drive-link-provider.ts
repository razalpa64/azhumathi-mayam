import type { ResourceFileType } from '@/types/database';
import type {
  DriveReachability,
  StorageLinkValidationResult,
  StorageProvider,
  StorageResourceUrls,
} from './provider';

const APPROVED_GOOGLE_HOSTS = new Set(['drive.google.com', 'docs.google.com']);

// Google Drive file IDs consist of alphanumeric characters, hyphens, and underscores (typically 25-44 chars, min 10)
const DRIVE_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{10,120}$/;

const DANGEROUS_INPUT_PATTERNS = /[<>"'`\0\r\n\t]|javascript:|data:|vbscript:/i;

function inferFileTypeFromTitle(title: string): ResourceFileType | null {
  const lower = title.toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.docx')) return 'DOCX';
  if (lower.endsWith('.doc')) return 'DOC';
  if (lower.endsWith('.pptx')) return 'PPTX';
  if (lower.endsWith('.ppt')) return 'PPT';
  if (lower.endsWith('.xlsx')) return 'XLSX';
  if (lower.endsWith('.xls')) return 'XLS';
  if (lower.endsWith('.zip')) return 'ZIP';
  return null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export class GoogleDriveLinkProvider implements StorageProvider {
  public readonly id = 'google_drive_link';

  public parseAndValidateUrl(rawInput: string): {
    valid: boolean;
    fileId?: string;
    normalizedShareUrl?: string;
    error?: string;
  } {
    if (typeof rawInput !== 'string') {
      return { valid: false, error: 'Please enter a Google Drive sharing URL.' };
    }

    const trimmed = rawInput.trim();
    if (!trimmed) {
      return { valid: false, error: 'Google Drive sharing URL cannot be empty.' };
    }

    if (trimmed.length > 1024) {
      return { valid: false, error: 'URL exceeds maximum permitted length.' };
    }

    if (DANGEROUS_INPUT_PATTERNS.test(trimmed)) {
      return {
        valid: false,
        error: 'Invalid or unsafe URL characters detected. Paste a clean Google Drive sharing link.',
      };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return {
        valid: false,
        error: 'Malformed URL. Paste a complete https://drive.google.com/... sharing link.',
      };
    }

    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Only secure HTTPS Google Drive links (https://drive.google.com/...) are accepted.',
      };
    }

    if (parsed.username || parsed.password || parsed.port) {
      return {
        valid: false,
        error: 'URLs containing embedded credentials or custom ports are not permitted.',
      };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!APPROVED_GOOGLE_HOSTS.has(hostname)) {
      return {
        valid: false,
        error: `Unrecognized domain "${hostname}". Only links from drive.google.com or docs.google.com are permitted.`,
      };
    }

    const pathname = parsed.pathname;

    // Explicitly detect folder URLs to give clear guidance
    if (/\/drive\/(u\/\d+\/)?folders\//i.test(pathname)) {
      return {
        valid: false,
        error:
          'Google Drive folder links are not supported for individual resources. Please share a specific file ("Anyone with the link – Viewer").',
      };
    }

    let candidateId: string | null = null;

    // Pattern 1: /file/d/FILE_ID/... or /document/d/FILE_ID/... or /presentation/d/FILE_ID/... or /spreadsheets/d/FILE_ID/...
    const pathMatch = pathname.match(
      /^\/(?:u\/\d+\/)?(?:file|document|presentation|spreadsheets)\/d\/([^/]+)(?:\/.*)?$/
    );
    if (pathMatch && pathMatch[1]) {
      candidateId = pathMatch[1];
    }

    // Pattern 2: /open?id=FILE_ID or /uc?id=FILE_ID
    if (!candidateId && (pathname === '/open' || pathname === '/uc' || pathname === '/file/u/0/open')) {
      candidateId = parsed.searchParams.get('id');
    }

    if (!candidateId) {
      return {
        valid: false,
        error:
          'Could not find a valid Google Drive File ID in this URL. Supported formats: https://drive.google.com/file/d/FILE_ID/view?usp=sharing, https://drive.google.com/open?id=FILE_ID, or https://drive.google.com/uc?id=FILE_ID.',
      };
    }

    if (!DRIVE_FILE_ID_REGEX.test(candidateId)) {
      return {
        valid: false,
        error:
          'The extracted Google Drive File ID is invalid or incomplete. Please copy the full sharing link from Google Drive.',
      };
    }

    const normalizedShareUrl = `https://drive.google.com/file/d/${candidateId}/view`;

    return {
      valid: true,
      fileId: candidateId,
      normalizedShareUrl,
    };
  }

  public getResourceUrls(fileId: string, fileType: ResourceFileType): StorageResourceUrls {
    if (!DRIVE_FILE_ID_REGEX.test(fileId)) {
      throw new Error('Invalid Google Drive File ID.');
    }
    return {
      previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      openUrl: `https://drive.google.com/file/d/${fileId}/view`,
      supportsInlinePdfPreview: fileType === 'PDF',
    };
  }

  public async validateAndInspectLink(rawUrl: string): Promise<StorageLinkValidationResult> {
    const parsed = this.parseAndValidateUrl(rawUrl);
    if (!parsed.valid || !parsed.fileId || !parsed.normalizedShareUrl) {
      return {
        valid: false,
        provider: 'google_drive_link',
        error: parsed.error || 'Invalid Google Drive sharing link.',
      };
    }

    const { fileId, normalizedShareUrl } = parsed;
    const urls = this.getResourceUrls(fileId, 'PDF');

    let reachability: DriveReachability = 'unverified';
    let detectedTitle: string | null = null;
    let inferredFileType: ResourceFileType | null = null;
    let statusMessage =
      'Link syntax and File ID validated. Ensure sharing in Google Drive is set to "Anyone with the link – Viewer".';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(normalizedShareUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AzhimathiMayamLinkValidator/1.0)',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const finalUrl = response.url || '';
      if (response.status === 404) {
        reachability = 'not_found';
        statusMessage =
          'Warning: Google Drive returned 404 Not Found. This file may have been deleted or the File ID does not exist.';
      } else if (
        finalUrl.includes('accounts.google.com') ||
        finalUrl.includes('ServiceLogin') ||
        response.status === 401 ||
        response.status === 403
      ) {
        reachability = 'restricted';
        statusMessage =
          'Warning: This Google Drive file appears restricted. Change its sharing setting in Google Drive to "Anyone with the link – Viewer" so students can preview and download it.';
      } else if (response.ok) {
        const html = (await response.text()).slice(0, 32000);
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          const clean = decodeHtmlEntities(titleMatch[1])
            .replace(/\s*-\s*Google Drive\s*$/i, '')
            .trim();
          if (
            clean &&
            !/^sign in/i.test(clean) &&
            !/^google drive:\s*sign-in/i.test(clean) &&
            clean !== 'Google Drive'
          ) {
            detectedTitle = clean;
            inferredFileType = inferFileTypeFromTitle(clean);
            reachability = 'public';
            statusMessage = `Verified accessible Google Drive file${detectedTitle ? `: "${detectedTitle}"` : ''}.`;
          } else if (/sign.?in/i.test(clean)) {
            reachability = 'restricted';
            statusMessage =
              'Warning: Google Drive prompted for Sign-In. Set file permissions to "Anyone with the link – Viewer".';
          }
        } else {
          reachability = 'public';
          statusMessage = 'Google Drive link responded cleanly and File ID is valid.';
        }
      }
    } catch {
      reachability = 'unverified';
      statusMessage =
        'File ID extracted and validated. Could not complete live Google Drive reachability check right now; please verify preview below.';
    }

    return {
      valid: true,
      provider: 'google_drive_link',
      fileId,
      normalizedShareUrl,
      previewUrl: urls.previewUrl,
      downloadUrl: urls.downloadUrl,
      openInDriveUrl: urls.openUrl,
      detectedTitle,
      inferredFileType,
      reachability,
      statusMessage,
    };
  }
}

export const storageProvider: StorageProvider = new GoogleDriveLinkProvider();
