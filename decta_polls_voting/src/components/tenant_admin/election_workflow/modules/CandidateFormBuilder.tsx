'use client';

import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  Loader2, Pencil, X,
  Type, AlignLeft, Mail, Phone, Hash, Calendar, Link, Upload,
  List, Circle, CheckSquare, Minus, Eye, Users
} from 'lucide-react';
import { FieldType, ValidationRules, FIELD_TYPE_META } from '@/lib/types/form';

// ── Internal state type (adds UI-only fields) ─────────────────────────────────
interface FormFieldState {
  id?: string;
  field_name: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  rule_checkable: boolean; // Whether this field can be used in screening/rule checks
  validation_rules: ValidationRules;
  order_index: number;
  _key: string;       // stable local key before DB id exists
  _expanded: boolean; // accordion open/close
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const slugify = (t: string) =>
  t.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field';

const genKey = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

/**
 * Module-level cache for form field data.
 * Prevents redundant DB fetches when PhaseCard unmounts/remounts during step navigation.
 * Cache key: `${electionId}:${toolName}`
 */
const formDataCache = new Map<string, { fields: any[]; form: any }>();

const makeDefault = (type: FieldType, count: number): FormFieldState => ({
  field_name: `${type}_${count + 1}`,
  label: FIELD_TYPE_META.find(m => m.type === type)?.label ?? 'New Field',
  field_type: type,
  required: false,
  rule_checkable: false,
  validation_rules: {
    options: type === 'dropdown' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
  },
  order_index: count,
  _key: genKey(),
  _expanded: true,
});

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICONS: Record<FieldType, React.ElementType> = {
  short_text: Type, long_text: AlignLeft, email: Mail, phone: Phone,
  number: Hash, date: Calendar, url: Link, file_upload: Upload,
  dropdown: List, radio: Circle, checkbox: CheckSquare, section_header: Minus,
  position_selector: Users,
};

// ── Options editor (for dropdown / radio) ─────────────────────────────────────
function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={opt}
            onChange={e => { const n = [...options]; n[i] = e.target.value; onChange(n); }}
            placeholder={`Option ${i + 1}`}
            className="flex-1 bg-[#0D0A1A] border border-white/10 text-white/75 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-[#5B4FD9]/50"
          />
          <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))}
            disabled={options.length <= 1} className="text-red-400/50 hover:text-red-400 disabled:opacity-20 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...options, `Option ${options.length + 1}`])}
        className="flex items-center gap-1 text-[11px] text-[#A78BFA] hover:text-white transition-colors">
        <Plus className="w-3 h-3" /> Add Option
      </button>
    </div>
  );
}

// ── Type picker panel ─────────────────────────────────────────────────────────
function TypePickerPanel({ onSelect, onClose }: { onSelect: (t: FieldType) => void; onClose: () => void }) {
  const groups = ['Basic', 'Choice', 'Advanced', 'Layout'] as const;
  return (
    <div className="absolute z-30 bottom-full left-0 mb-2 w-72 rounded-2xl border border-white/10 bg-[#140B2D]/95 shadow-2xl p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Choose Field Type</span>
        <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors"><X className="w-3.5 h-3.5" /></button>
      </div>
      {groups.map(g => {
        const items = FIELD_TYPE_META.filter(m => m.group === g);
        if (!items.length) return null;
        return (
          <div key={g} className="mb-3 last:mb-0">
            <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5">{g}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map(m => {
                const Icon = ICONS[m.type];
                return (
                  <button key={m.type} onClick={() => { onSelect(m.type); onClose(); }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/3 border border-white/5 hover:bg-[#5B4FD9]/15 hover:border-[#5B4FD9]/30 transition-all text-left">
                    <Icon className="w-3.5 h-3.5 text-[#A78BFA] flex-shrink-0" />
                    <span className="text-[11px] text-white/65">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Field card (build mode) ──────────────────────────────────────────────────
function FieldCardBuild({ field, index, dragIndex, onUpdate, onDelete, onDragStart, onDragOver, onDrop, features, disableDelete }: {
  field: FormFieldState; index: number; dragIndex: number | null;
  onUpdate: (key: string, u: Partial<FormFieldState>) => void;
  onDelete: (key: string) => void;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (i: number) => void;
  features: { showRuleCheckable: boolean };
  disableDelete?: boolean;
}) {
  const Icon = ICONS[field.field_type];
  const vr = field.validation_rules;
  const upVR = (p: Partial<ValidationRules>) => onUpdate(field._key, { validation_rules: { ...vr, ...p } });
  const isChoice = field.field_type === 'dropdown' || field.field_type === 'radio';
  const isSection = field.field_type === 'section_header';
  const isText = field.field_type === 'short_text' || field.field_type === 'long_text';
  const isNumber = field.field_type === 'number';
  const isFile = field.field_type === 'file_upload';
  const base = 'w-full bg-[#0D0A1A] border border-white/8 text-white/65 rounded-xl px-3 py-2 text-[12px] focus:outline-none focus:border-[#5B4FD9]/50';

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(index)}
      className={`rounded-xl border transition-all ${dragIndex === index ? 'border-[#5B4FD9]/60 opacity-50' : 'border-white/8 hover:border-white/14'} bg-[#1A1330]/60`}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="w-4 h-4 text-white/18 cursor-grab flex-shrink-0" />
        <div className="w-6 h-6 rounded-md bg-[#5B4FD9]/18 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-[#A78BFA]" />
        </div>
        <span className="flex-1 text-[13px] text-white/70 font-medium truncate">
          {field.label || <span className="text-white/25 italic">Untitled</span>}
        </span>
        {field.required && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-red-400/70 border border-red-400/20 px-1.5 py-0.5 rounded-full flex-shrink-0">Required</span>
        )}
        <button type="button" onClick={() => onUpdate(field._key, { _expanded: !field._expanded })}
          className="text-white/25 hover:text-white/60 transition-colors">
          {field._expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {field.field_type !== 'position_selector' && !disableDelete && (
          <button type="button" onClick={() => onDelete(field._key)}
            className="text-white/18 hover:text-red-400/80 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Expanded config ── */}
      {field._expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3.5">
          <div>
            <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Label</label>
            <input value={field.label}
              onChange={e => onUpdate(field._key, { label: e.target.value, field_name: slugify(e.target.value) || field.field_name })}
              placeholder="Field label shown to candidates" className={base} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Field Name</label>
              <input value={field.field_name}
                onChange={e => onUpdate(field._key, { field_name: slugify(e.target.value) || field.field_name })}
                className={`${base} font-mono`} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Type</label>
              <select value={field.field_type}
                onChange={e => onUpdate(field._key, { field_type: e.target.value as FieldType })}
                className={`${base} appearance-none`}>
                {FIELD_TYPE_META.map(m => <option key={m.type} value={m.type}>{m.label}</option>)}
              </select>
            </div>
          </div>
          {!isSection && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Placeholder</label>
                <input value={vr.placeholder ?? ''} onChange={e => upVR({ placeholder: e.target.value || undefined })}
                  placeholder="e.g. Enter your full name" className={base} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Help Text</label>
                <input value={vr.helpText ?? ''} onChange={e => upVR({ helpText: e.target.value || undefined })}
                  placeholder="Shown below the field" className={base} />
              </div>
            </div>
          )}
          {isSection && (
            <div>
              <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Section Description</label>
              <input value={vr.helpText ?? ''} onChange={e => upVR({ helpText: e.target.value || undefined })}
                placeholder="Optional description under the heading" className={base} />
            </div>
          )}
          {isText && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Min Length</label>
                <input type="number" min={0} value={vr.minLength ?? ''} onChange={e => upVR({ minLength: e.target.value ? +e.target.value : undefined })} className={base} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Max Length</label>
                <input type="number" min={0} value={vr.maxLength ?? ''} onChange={e => upVR({ maxLength: e.target.value ? +e.target.value : undefined })} className={base} />
              </div>
            </div>
          )}
          {isNumber && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Min Value</label>
                <input type="number" value={vr.min ?? ''} onChange={e => upVR({ min: e.target.value ? +e.target.value : undefined })} className={base} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Max Value</label>
                <input type="number" value={vr.max ?? ''} onChange={e => upVR({ max: e.target.value ? +e.target.value : undefined })} className={base} />
              </div>
            </div>
          )}
          {isFile && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Allowed Types</label>
                <input value={vr.allowedTypes ?? ''} onChange={e => upVR({ allowedTypes: e.target.value || undefined })}
                  placeholder="pdf, doc, jpg" className={base} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-1.5">Max Size (MB)</label>
                <input type="number" min={1} value={vr.maxSizeMB ?? ''} onChange={e => upVR({ maxSizeMB: e.target.value ? +e.target.value : undefined })}
                  placeholder="10" className={base} />
              </div>
            </div>
          )}
          {isChoice && (
            <div>
              <label className="text-[10px] font-semibold text-white/30 uppercase tracking-widest block mb-2">Options</label>
              <OptionsEditor options={vr.options ?? ['Option 1']} onChange={opts => upVR({ options: opts })} />
            </div>
          )}
          {!isSection && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/45 font-medium">Required field</span>
                <button
                  type="button"
                  disabled={field.field_type === 'position_selector'}
                  onClick={() => onUpdate(field._key, { required: !field.required })}
                  className={`relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${field.field_type === 'position_selector' ? 'cursor-not-allowed opacity-50' : ''}`}
                  style={{ background: field.required ? '#5B4FD9' : 'rgba(255,255,255,0.1)' }}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${field.required ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              {features.showRuleCheckable && (
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[12px] text-white/45 font-medium">Rule checkable</span>
                    <p className="text-[10px] text-white/25 leading-tight">Expose this field for screening rule evaluation</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdate(field._key, { rule_checkable: !field.rule_checkable })}
                    className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0"
                    style={{ background: field.rule_checkable ? '#10B981' : 'rgba(255,255,255,0.1)' }}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${field.rule_checkable ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              )}
              {field.field_type === 'position_selector' && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 mt-1">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <div>
                    <span className="text-[11px] text-emerald-400/80 font-bold uppercase tracking-wider">System Managed Field</span>
                    <p className="text-[10px] text-white/30">Positions are synchronized with the Positions phase.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Field preview (preview mode) ──────────────────────────────────────────────
function FieldPreview({ field, positions = [] }: { field: FormFieldState, positions?: { title: string }[] }) {
  const vr = field.validation_rules;
  const inputCls = 'w-full bg-[#0D0A1A]/50 border border-white/10 text-white/35 rounded-xl px-4 py-3 text-[13px] cursor-not-allowed';

  if (field.field_type === 'section_header') {
    return (
      <div className="pt-2">
        <h3 className="text-[15px] font-semibold text-white/80">{field.label}</h3>
        {vr.helpText && <p className="text-[12px] text-white/38 mt-1">{vr.helpText}</p>}
        <div className="mt-3 h-px bg-white/8" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5 animate-in fade-in duration-500">
      <label className="flex items-center gap-1 text-[13px] font-medium text-white/65">
        {field.label}
        {field.required && <span className="text-red-400 text-[11px] ml-0.5">*</span>}
      </label>
      {vr.helpText && <p className="text-[11px] text-white/32">{vr.helpText}</p>}

      {field.field_type === 'position_selector' ? (
        <select disabled className={`${inputCls} appearance-none`}>
          <option>{vr.placeholder || 'Select a position...'}</option>
          {positions.map((p, i) => <option key={i}>{p.title}</option>)}
        </select>
      ) : (
        <>
          {['short_text', 'email', 'phone', 'url'].includes(field.field_type) && <input disabled placeholder={vr.placeholder || ''} className={inputCls} />}
          {field.field_type === 'long_text' && <textarea disabled rows={3} placeholder={vr.placeholder || ''} className={`${inputCls} resize-none`} />}
          {field.field_type === 'number' && <input type="number" disabled placeholder={vr.placeholder || ''} className={inputCls} />}
          {field.field_type === 'date' && <input type="date" disabled className={`${inputCls} [color-scheme:dark]`} />}
          {field.field_type === 'file_upload' && (
            <div className="border-2 border-dashed border-white/10 rounded-xl p-5 text-center text-white/28 text-[12px]">
              📎 Click or drag file to upload
              {(vr.allowedTypes || vr.maxSizeMB) && (
                <p className="text-[11px] text-white/18 mt-1">
                  {[vr.allowedTypes && `Types: ${vr.allowedTypes}`, vr.maxSizeMB && `Max: ${vr.maxSizeMB}MB`].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          )}
          {field.field_type === 'dropdown' && (
            <select disabled className={`${inputCls} appearance-none`}>
              <option>{vr.placeholder || 'Select an option...'}</option>
              {(vr.options ?? []).map((o, i) => <option key={i}>{o}</option>)}
            </select>
          )}
          {field.field_type === 'radio' && (
            <div className="space-y-2 mt-1">
              {(vr.options ?? []).map((o, i) => (
                <label key={i} className="flex items-center gap-2.5 text-[12.5px] text-white/45 cursor-not-allowed">
                  <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" />
                  {o}
                </label>
              ))}
            </div>
          )}
          {field.field_type === 'checkbox' && (
            <label className="flex items-center gap-2.5 text-[12.5px] text-white/45 cursor-not-allowed mt-1">
              <div className="w-4 h-4 rounded border border-white/20 flex-shrink-0" />
            </label>
          )}
        </>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export const DynamicFormBuilder = forwardRef(({
  electionId,
  toolName = 'candidate_application',
  title = 'Candidate Application Form',
  features = { showRuleCheckable: true },
  initialPositions,
  disableDelete = false,
  disableAdd = false,
}: {
  electionId: string,
  toolName?: string,
  title?: string,
  features?: { showRuleCheckable: boolean },
  initialPositions?: { title?: string | null }[],
  /** When true, hides Delete buttons (phase has responses — FK protection). */
  disableDelete?: boolean,
  /** When true, hides the Add Field button (phase is completed). */
  disableAdd?: boolean,
}, ref) => {
  const [fields, setFields] = useState<FormFieldState[]>([]);
  const [customLogicMeta, setCustomLogicMeta] = useState<{ hasParty?: boolean, hasPositionField?: boolean }>({});
  const [positions, setPositions] = useState<{ title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'build' | 'preview'>('build');
  const [showPicker, setShowPicker] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Expose save method
  useImperativeHandle(ref, () => ({
    save: async () => {
      try {
        const payload = fields.map((f, i) => ({
          id: f.id,
          fieldName: f.field_name,
          label: f.label,
          fieldType: f.field_type,
          required: f.required,
          ruleCheckable: f.rule_checkable,
          placeholder: f.validation_rules.placeholder,
          validationRules: f.validation_rules,
          orderIndex: i,
        }));

        const res = await fetch('/api/save_form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            electionId,
            toolName,
            fields: payload,
            customLogicMeta
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to save form');
        }
        return true;
      } catch (err) {
        console.error("Form save error:", err);
        return false;
      }
    }
  }));

  useEffect(() => {
    const cacheKey = `${electionId}:${toolName}`;
    const cached = formDataCache.get(cacheKey);

    if (cached) {
      // Restore instantly from cache — no DB round-trip
      processFormData(cached.fields, cached.form);
      if (initialPositions) {
        setPositions(initialPositions.filter(p => p.title?.trim()) as { title: string }[]);
      }
      setIsLoading(false);
      return;
    }

    const loadForm = async () => {
      try {
        const r = await fetch(`/api/get_form?electionId=${electionId}&toolName=${toolName}`);
        const { fields: fetched, form } = await r.json();

        // Populate cache for future remounts
        formDataCache.set(cacheKey, { fields: fetched || [], form });
        processFormData(fetched, form);

        // Only fetch positions if not provided by parent
        if (toolName === 'candidate_application') {
          if (initialPositions) {
            setPositions(initialPositions.filter(p => p.title?.trim()) as { title: string }[]);
          } else {
            const posRes = await fetch(`/api/get_positions?electionId=${electionId}`);
            if (posRes.ok) {
              const { positions: posData } = await posRes.json();
              setPositions(posData || []);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadForm();
  }, [electionId, toolName, initialPositions]);

  /**
   * Shared helper: maps raw API fields into FormFieldState and injects system fields.
   * Called both from cache-hit and fresh-fetch paths.
   */
  function processFormData(fetched: any[], form: any) {
    if (form?.custom_logic_meta) {
      setCustomLogicMeta(form.custom_logic_meta);
    }

    let mapped = (fetched || []).map((f: any) => ({
      id: f.id,
      field_name: f.fieldName,
      label: f.label,
      field_type: f.fieldType,
      required: f.required,
      rule_checkable: f.rule_checkable ?? false,
      validation_rules: {
        ...(f.validationRules || {}),
        placeholder: f.placeholder || f.validationRules?.placeholder || ''
      },
      order_index: f.orderIndex,
      _key: genKey(),
      _expanded: false
    }));

    // Auto-inject Position Selector for Filing phase if missing
    if (toolName === 'candidate_application') {
      if (!mapped.some((m: any) => m.field_type === 'position_selector')) {
        mapped.push({
          id: undefined,
          field_name: 'electoral_position',
          label: 'Electoral Position',
          field_type: 'position_selector',
          required: true,
          rule_checkable: false,
          validation_rules: { placeholder: 'Select a position...' },
          order_index: mapped.length,
          _key: genKey(),
          _expanded: false
        });
      }
    }
    setFields(mapped);
  }

  const addField = useCallback((type: FieldType) => {
    setFields(prev => [...prev, makeDefault(type, prev.length)]);
  }, []);

  const updateField = useCallback((key: string, updates: Partial<FormFieldState>) => {
    setFields(prev => prev.map(f => f._key === key ? { ...f, ...updates } : f));
  }, []);

  const deleteField = useCallback((key: string) => {
    setFields(prev => prev.filter(f => f._key !== key));
  }, []);

  const moveField = useCallback((from: number, to: number) => {
    if (from === to) return;
    setFields(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  }, []);

  return (
    <div className="mt-5 pt-5 border-t border-white/5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#5B4FD9]/20 border border-[#5B4FD9]/30 flex items-center justify-center flex-shrink-0">
            <Pencil className="w-3.5 h-3.5 text-[#A78BFA]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white/85">{title}</p>
            <p className="text-[11px] text-white/32">
              {fields.length} field{fields.length !== 1 ? 's' : ''} · drag to reorder
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {toolName === 'candidate_application' && (
            <div className="flex items-center gap-4 px-4 py-1.5 rounded-xl bg-white/3 border border-white/5 mr-2">
              {/* Party Toggle (Kept as toggable as requested) */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Party Affiliation</span>
                <button
                  onClick={() => setCustomLogicMeta(prev => ({ ...prev, hasParty: !prev.hasParty }))}
                  className={`w-8 h-4 rounded-full relative transition-all ${customLogicMeta.hasParty ? 'bg-[#A78BFA]' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${customLogicMeta.hasParty ? 'left-4.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          )}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {(['build', 'preview'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-[11px] font-semibold capitalize flex items-center gap-1 transition-all ${activeTab === tab ? 'bg-[#5B4FD9]/30 text-white' : 'text-white/30 hover:text-white/55'}`}>
                {tab === 'preview' && <Eye className="w-3 h-3" />}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && <div className="flex items-center justify-center h-20 text-white/28 text-[12px]"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading form...</div>}

      {!isLoading && activeTab === 'build' && (
        <div className="space-y-2">
          {/* Injected System Fields */}
          {toolName === 'candidate_application' && (
            <div className="space-y-2 mb-4">
              {customLogicMeta.hasParty && (
                <div className="p-4 rounded-xl border border-dashed border-white/10 bg-white/2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#A78BFA]/20 border border-[#A78BFA]/30 flex items-center justify-center">
                      <Users className="w-4 h-4 text-[#A78BFA]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white/80">Electoral Party Name (System)</p>
                      <p className="text-[11px] text-white/30">Includes pick-list from existing responses.</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-[#A78BFA] bg-[#A78BFA]/10 px-2 py-1 rounded-full uppercase">Smart Input</div>
                </div>
              )}
            </div>
          )}
          {(disableDelete || disableAdd) && (
            <div className="flex items-center gap-2.5 px-4 py-3 mb-2 rounded-xl bg-amber-500/8 border border-amber-500/15">
              <span className="text-amber-400/80 text-[10px]">⚠</span>
              <p className="text-[11px] text-amber-400/70 font-medium">
                {disableDelete && disableAdd
                  ? <>This phase is <span className="font-bold">completed</span>. Fields cannot be added or removed to protect existing responses.</>
                  : disableDelete
                    ? <>This phase is <span className="font-bold">active</span>. Existing fields cannot be deleted while responses may exist, but you can still add new fields.</>
                    : <>This phase is <span className="font-bold">completed</span>. New fields cannot be added.</>}
              </p>
            </div>
          )}
          {fields.map((field, index) => (
            <FieldCardBuild
              key={field._key} field={field} index={index} dragIndex={dragIndex}
              onUpdate={updateField} onDelete={deleteField} onDragStart={i => setDragIndex(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={i => { if (dragIndex !== null) moveField(dragIndex, i); setDragIndex(null); }}
              features={features}
              disableDelete={disableDelete}
            />
          ))}
          {!disableAdd && (
            <div className="relative">
              <button onClick={() => setShowPicker(v => !v)}
                className="flex items-center gap-2 w-full justify-center py-3 rounded-xl border border-dashed border-white/12 text-[12px] text-white/35 hover:text-white/65 hover:border-[#5B4FD9]/35 hover:bg-[#5B4FD9]/5 transition-all">
                <Plus className="w-4 h-4" /> Add Field
              </button>
              {showPicker && <TypePickerPanel onSelect={addField} onClose={() => setShowPicker(false)} />}
            </div>
          )}
        </div>
      )}

      {!isLoading && activeTab === 'preview' && (
        <div className="rounded-xl border border-white/8 bg-[#0D0A1A]/40 p-6">
          <div className="max-w-lg space-y-5">
            {/* Injected Preview Fields (Party only, positions now in regular loop) */}
            {customLogicMeta.hasParty && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white/65">Electoral Party Affiliation</label>
                <input disabled placeholder="Type your party name..." className="w-full bg-[#0D0A1A]/50 border border-white/10 text-white/35 rounded-xl px-4 py-3 text-[13px] cursor-not-allowed" />
                <p className="text-[10px] text-white/20 whitespace-normal">Existing parties: Independent, Democratic Alliance, Unity Party ... (Fetched dynamically)</p>
              </div>
            )}

            {fields.length === 0 && !customLogicMeta.hasParty ? (
              <p className="text-center text-[12px] text-white/28">Add fields in Build mode.</p>
            ) : (
              fields.map(f => <FieldPreview key={f._key} field={f} positions={positions} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
});

DynamicFormBuilder.displayName = 'DynamicFormBuilder';
