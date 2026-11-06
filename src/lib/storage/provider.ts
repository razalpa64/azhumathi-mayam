import type { ResourceFileType } from '@/types/database';

export type DriveReachability = 'public' | 'restricted' | 'not_found' | 'unverified';

export interface StorageLinkValidationResult {
  valid: boolean;
  provider: 'google_drive_link';
  fileId?: string;
  normalizedShareUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
  openInDriveUrl?: string;
  detectedTitle?: string | null;
  inferredFileType?: ResourceFileType | null;
  reachability?: DriveReachability;
  statusMessage?: string;
  error?: string;
}

export interface StorageResourceUrls {
  previewUrl: string;
  downloadUrl: string;
  openUrl: string;
  supportsInlinePdfPreview: boolean;
}

/**
 * Modular StorageProvider contract.
 * Currently implemented by GoogleDriveLinkProvider; designed so future providers
 * (GoogleDriveApiProvider, SupabaseStorageProvider, CloudflareR2Provider) can be
 * swapped in without modifying UI or database relationships.
 */
export interface StorageProvider {
  readonly id: string;
  parseAndValidateUrl(rawUrl: string): {
    valid: boolean;
    fileId?: string;
    normalizedShareUrl?: string;
    error?: string;
  };
  validateAndInspectLink(rawUrl: string): Promise<StorageLinkValidationResult>;
  getResourceUrls(fileId: string, fileType: ResourceFileType): StorageResourceUrls;
}
