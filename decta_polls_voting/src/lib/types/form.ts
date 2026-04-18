// Form System — shared types matching the data entity map

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'file_upload'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'url'
  | 'section_header'
  | 'position_selector';

export interface ValidationRules {
  // Display
  placeholder?: string;
  helpText?: string;
  // Text
  minLength?: number;
  maxLength?: number;
  // Number
  min?: number;
  max?: number;
  // Choice fields
  options?: string[];
  // File upload
  allowedTypes?: string; // e.g. "pdf,doc,jpg"
  maxSizeMB?: number;
}

// Matches: Form { ID, TenantID, ElectionID, ToolName }
export interface Form {
  id?: string;
  tenant_id?: string;
  election_id: string;
  tool_name: string;
}

// Matches: FormField { ID, FormID, FieldName, Label, FieldType, Required, ValidationRules, OrderIndex }
export interface FormField {
  id?: string;
  form_id?: string;
  field_name: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  validation_rules: ValidationRules;
  order_index: number;
}

// Matches: FormResponse { ID, FormID, UserID, SubmittedAt }
export interface FormResponse {
  id?: string;
  form_id: string;
  user_id: string;
  submitted_at?: string;
}

// Matches: FormResponseValue { ID, ResponseID, FieldID, Value }
export interface FormResponseValue {
  id?: string;
  response_id: string;
  field_id: string;
  value: string;
}

export const FIELD_TYPE_META: {
  type: FieldType;
  label: string;
  group: 'Basic' | 'Choice' | 'Advanced' | 'Layout';
  description: string;
}[] = [
  { type: 'short_text',     label: 'Short Text',      group: 'Basic',    description: 'Single-line text input' },
  { type: 'long_text',      label: 'Paragraph',       group: 'Basic',    description: 'Multi-line text area' },
  { type: 'email',          label: 'Email Address',   group: 'Basic',    description: 'Validated email input' },
  { type: 'phone',          label: 'Phone Number',    group: 'Basic',    description: 'Phone number input' },
  { type: 'number',         label: 'Number',          group: 'Basic',    description: 'Numeric input with min/max' },
  { type: 'date',           label: 'Date',            group: 'Basic',    description: 'Date picker' },
  { type: 'url',            label: 'URL / Link',      group: 'Basic',    description: 'URL with validation' },
  { type: 'file_upload',    label: 'File Upload',     group: 'Advanced', description: 'Document or image upload' },
  { type: 'dropdown',       label: 'Dropdown',        group: 'Choice',   description: 'Select one from a list' },
  { type: 'radio',          label: 'Multiple Choice', group: 'Choice',   description: 'Pick one visible option' },
  { type: 'checkbox',       label: 'Checkbox',        group: 'Choice',   description: 'Single agree/disagree toggle' },
  { type: 'section_header', label: 'Section Header',  group: 'Layout',   description: 'Visual divider with heading' },
  { type: 'position_selector', label: 'Electoral Position', group: 'Advanced', description: 'Dynamic list of electoral positions' },
];
