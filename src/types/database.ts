export type UserRole = 'student' | 'admin';

export type PublicationStatus = 'draft' | 'published';

export type ResourceFileType =
  | 'PDF'
  | 'DOC'
  | 'DOCX'
  | 'PPT'
  | 'PPTX'
  | 'XLS'
  | 'XLSX'
  | 'ZIP'
  | 'OTHER';

export type NoticeType =
  | 'general'
  | 'exam'
  | 'assignment'
  | 'academic_update'
  | 'material_update'
  | 'college';

export type NoticePriority = 'normal' | 'important' | 'urgent';

export type AdPlacement =
  | 'homepage_banner'
  | 'between_listings'
  | 'subject_page'
  | 'below_pdf_preview'
  | 'dedicated_partner_section';

export interface University {
  id: string;
  name: string;
  short_name: string;
  location: string | null;
  website_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Programme {
  id: string;
  university_id: string | null;
  code: string;
  name: string;
  full_title: string | null;
  degree_level: 'UG' | 'PG' | 'Diploma' | 'Doctoral';
  total_semesters: number;
  has_specializations: boolean;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Specialization {
  id: string;
  programme_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AcademicRegulation {
  id: string;
  university_id: string | null;
  programme_id: string | null;
  code: string;
  name: string;
  batch_range: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Semester {
  id: string;
  programme_id: string;
  semester_number: number;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  university_id: string | null;
  programme_id: string;
  specialization_id: string | null;
  regulation_id: string | null;
  semester_id: string;
  subject_code: string;
  name: string;
  description: string | null;
  publication_status: PublicationStatus;
  created_at: string;
  updated_at: string;
  programme?: Pick<Programme, 'id' | 'code' | 'name'> | null;
  specialization?: Pick<Specialization, 'id' | 'code' | 'name'> | null;
  semester?: Pick<Semester, 'id' | 'semester_number' | 'label'> | null;
  regulation?: Pick<AcademicRegulation, 'id' | 'code' | 'name'> | null;
  university?: Pick<University, 'id' | 'short_name' | 'name'> | null;
}

export interface ResourceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string;
  is_question_paper: boolean;
  is_short_note: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  university_id: string | null;
  programme_id: string;
  specialization_id: string | null;
  regulation_id: string | null;
  semester_id: string;
  subject_id: string;
  category_id: string;
  academic_year: string | null;
  keywords: string[];
  storage_provider: string;
  google_drive_file_id: string;
  google_drive_share_url: string;
  file_name: string | null;
  file_type: ResourceFileType;
  file_size: string | null;
  download_count: number;
  publication_status: PublicationStatus;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  programme?: Pick<Programme, 'id' | 'code' | 'name'> | null;
  specialization?: Pick<Specialization, 'id' | 'code' | 'name'> | null;
  semester?: Pick<Semester, 'id' | 'semester_number' | 'label'> | null;
  subject?: Pick<Subject, 'id' | 'subject_code' | 'name'> | null;
  category?: Pick<ResourceCategory, 'id' | 'name' | 'slug' | 'is_question_paper'> | null;
  university?: Pick<University, 'id' | 'short_name' | 'name'> | null;
  regulation?: Pick<AcademicRegulation, 'id' | 'code' | 'name'> | null;
}

export interface Profile {
  id: string;
  username: string;
  auth_email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  university_id: string | null;
  programme_id: string | null;
  specialization_id: string | null;
  regulation_id: string | null;
  semester_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  university?: University | null;
  programme?: Programme | null;
  specialization?: Specialization | null;
  regulation?: AcademicRegulation | null;
  semester?: Semester | null;
}

export interface Notice {
  id: string;
  title: string;
  description: string;
  notice_type: NoticeType;
  priority: NoticePriority;
  is_pinned: boolean;
  attachment_url: string | null;
  attachment_type: 'image' | 'pdf' | 'drive' | null;
  attachment_name: string | null;
  external_link: string | null;
  external_link_label: string | null;
  target_programme_id: string | null;
  publication_status: PublicationStatus;
  start_date: string;
  expiry_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  target_programme?: Pick<Programme, 'id' | 'code' | 'name'> | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  notice_id: string | null;
  resource_id: string | null;
  title: string;
  message: string;
  notification_type: 'notice' | 'resource' | 'account' | 'system';
  link_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface Advertisement {
  id: string;
  name: string;
  placement: AdPlacement;
  provider_type: 'custom_sponsor' | 'adsense_slot';
  sponsor_name: string | null;
  headline: string | null;
  body_text: string | null;
  cta_label: string | null;
  target_url: string | null;
  image_url: string | null;
  adsense_client_id: string | null;
  adsense_slot_id: string | null;
  is_enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type ResourceRequestType =
  | 'notes'
  | 'question_paper'
  | 'short_notes'
  | 'cheat_sheet'
  | 'syllabus'
  | 'other';

export type ResourceRequestStatus = 'pending' | 'in_progress' | 'fulfilled' | 'rejected';

export interface ResourceRequest {
  id: string;
  student_id: string;
  request_type: ResourceRequestType;
  title: string;
  subject_text: string | null;
  details: string | null;
  status: ResourceRequestStatus;
  admin_note: string | null;
  fulfilled_resource_id: string | null;
  created_at: string;
  updated_at: string;
  student?: Pick<Profile, 'id' | 'full_name' | 'username'> | null;
}

export interface AdminActivityLog {
  id: string;
  admin_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
  admin?: Pick<Profile, 'username' | 'full_name'> | null;
}

export interface WebsiteSettings {
  id: number;
  platform_name: string;
  notices_enabled: boolean;
  ads_enabled: boolean;
  adsense_publisher_id: string | null;
  require_ad_consent: boolean;
  allow_cross_programme_browsing: boolean;
  storage_provider: string;
  support_email: string | null;
  updated_by: string | null;
  updated_at: string;
}
