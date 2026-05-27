'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
    LayoutGrid, List, Maximize,
    Plus, Trash2, ChevronDown, ChevronUp, GripVertical,
    Eye, EyeOff, FileText, Settings, Loader2, Users
} from 'lucide-react';

interface FormField {
    id: string;
    label: string;
    fieldType: string;
}

interface PublicationConfig {
    layout_style: 'grid' | 'list' | 'detailed';
    show_photo: boolean;
    header_field_map: {
        full_name?: string[];
        department?: string;
        course?: string;
        tagline?: string;
    };
    persist_after_phase: boolean;
    enable_profile_pages: boolean;
}

interface SectionField {
    field_id: string;
    display_label: string;
    is_visible: boolean;
}

interface Section {
    id?: string;
    label: string;
    display_style: 'rows' | 'prose' | 'tags';
    is_visible: boolean;
    listing_section_fields: SectionField[];
}

interface DocumentConfig {
    field_id: string;
    display_label: string;
    is_visible: boolean;
}

interface PublicationModuleProps {
    electionId: string;
    authParams: string;
}

export const PublicationModule = forwardRef<{ save: () => Promise<boolean> }, PublicationModuleProps>(
    ({ electionId }, ref) => {
        const [isLoading, setIsLoading] = useState(true);
        const [availableFields, setAvailableFields] = useState<FormField[]>([]);

        const [config, setConfig] = useState<PublicationConfig>({
            layout_style: 'grid',
            show_photo: true,
            header_field_map: {},
            persist_after_phase: true,
            enable_profile_pages: true,
        });

        const [sections, setSections] = useState<Section[]>([]);
        const [documents, setDocuments] = useState<DocumentConfig[]>([]);
        const [draggedSectionIdx, setDraggedSectionIdx] = useState<number | null>(null);
        const [draggedFieldInfo, setDraggedFieldInfo] = useState<{ secIdx: number, fieldIdx: number } | null>(null);
        const [showNamePartDropdown, setShowNamePartDropdown] = useState(false);
        const [activeSectionFieldPickerIdx, setActiveSectionFieldPickerIdx] = useState<number | null>(null);
        const [activeMappingDropdownSlot, setActiveMappingDropdownSlot] = useState<string | null>(null);
        const [activeSectionStylePickerIdx, setActiveSectionStylePickerIdx] = useState<number | null>(null);

        useEffect(() => {
            const loadConfig = async () => {
                try {
                    const res = await fetch(`/api/get_publication_config?electionId=${electionId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setAvailableFields(data.availableFields || []);

                        if (data.config) {
                            const cfg = data.config;
                            // Ensure full_name is an array
                            if (cfg.header_field_map && typeof cfg.header_field_map.full_name === 'string') {
                                cfg.header_field_map.full_name = [cfg.header_field_map.full_name];
                            } else if (cfg.header_field_map && !cfg.header_field_map.full_name) {
                                cfg.header_field_map.full_name = [];
                            }
                            setConfig(cfg);
                        }
                        if (data.sections && data.sections.length > 0) {
                            setSections(data.sections);
                        }
                        if (data.documents && data.documents.length > 0) {
                            setDocuments(data.documents);
                        } else {
                            // initialize documents from available file fields if undefined
                            const fileFields = (data.availableFields || []).filter((f: FormField) => f.fieldType === 'file_upload');
                            setDocuments(fileFields.map((f: FormField) => ({ field_id: f.id, display_label: f.label, is_visible: false })));
                        }
                    }
                } catch (e) {
                    console.error("Failed to load publication config", e);
                } finally {
                    setIsLoading(false);
                }
            };

            loadConfig();
        }, [electionId]);

        useImperativeHandle(ref, () => ({
            save: async () => {
                try {
                    const res = await fetch(`/api/save_publication_config`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            electionId,
                            config,
                            sections,
                            documents,
                        }),
                    });
                    return res.ok;
                } catch (e) {
                    console.error('Save publication config failed:', e);
                    return false;
                }
            }
        }));

        if (isLoading) {
            return (
                <div className="flex items-center justify-center py-12 text-white/40">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Configuration...
                </div>
            );
        }

        if (availableFields.length === 0) {
            return (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-center">
                    <h3 className="text-amber-400 font-bold mb-2">Filing Fields Not Configured</h3>
                    <p className="text-white/60 text-sm">
                        You must setup and save the "Filing Phase" Candidate Application Form first before you can configure how their profiles are published.
                    </p>
                </div>
            )
        }

        const textFields = availableFields.filter(f => f.fieldType !== 'file_upload');
        const fileFields = availableFields.filter(f => f.fieldType === 'file_upload');

        // Mapped fields cannot be reused in sections
        const mappedIds = new Set<string>();
        if (config.header_field_map.full_name) {
            config.header_field_map.full_name.forEach(id => mappedIds.add(id));
        }
        if (config.header_field_map.department) mappedIds.add(config.header_field_map.department);
        if (config.header_field_map.course) mappedIds.add(config.header_field_map.course);
        if (config.header_field_map.tagline) mappedIds.add(config.header_field_map.tagline);

        sections.forEach(s => s.listing_section_fields.forEach(f => mappedIds.add(f.field_id)));

        const unassignedFields = textFields.filter(f => !mappedIds.has(f.id));

        // Helpers for section management
        const addSection = () => {
            setSections([...sections, { label: 'New Section', display_style: 'rows', is_visible: true, listing_section_fields: [] }]);
        };
        const updateSection = (idx: number, updates: Partial<Section>) => {
            const next = [...sections];
            next[idx] = { ...next[idx], ...updates };
            setSections(next);
        };
        const moveSection = (idx: number, targetIdx: number) => {
            if (targetIdx < 0 || targetIdx >= sections.length) return;
            const next = [...sections];
            const [moved] = next.splice(idx, 1);
            next.splice(targetIdx, 0, moved);
            setSections(next);
        };
        const removeSection = (idx: number) => {
            setSections(sections.filter((_, i) => i !== idx));
        };

        const addFieldToSection = (sectionIdx: number, fieldId: string) => {
            if (!fieldId) return;
            const fieldData = textFields.find(f => f.id === fieldId);
            if (!fieldData) return;

            const next = [...sections];
            next[sectionIdx].listing_section_fields.push({
                field_id: fieldId,
                display_label: fieldData.label,
                is_visible: true
            });
            setSections(next);
        };

        const removeFieldFromSection = (sectionIdx: number, fieldIdx: number) => {
            const next = [...sections];
            next[sectionIdx].listing_section_fields.splice(fieldIdx, 1);
            setSections(next);
        };

        const moveField = (secIdx: number, fieldIdx: number, targetFieldIdx: number) => {
            const next = [...sections];
            const fields = next[secIdx].listing_section_fields;
            if (targetFieldIdx < 0 || targetFieldIdx >= fields.length) return;
            const [moved] = fields.splice(fieldIdx, 1);
            fields.splice(targetFieldIdx, 0, moved);
            setSections(next);
        };

        const addNamePart = (fieldId: string) => {
            if (!fieldId) return;
            const currentParts = config.header_field_map.full_name || [];
            if (currentParts.includes(fieldId)) return;
            setConfig({
                ...config,
                header_field_map: {
                    ...config.header_field_map,
                    full_name: [...currentParts, fieldId]
                }
            });
        };

        const removeNamePart = (idx: number) => {
            const currentParts = config.header_field_map.full_name || [];
            const next = currentParts.filter((_, i) => i !== idx);
            setConfig({
                ...config,
                header_field_map: {
                    ...config.header_field_map,
                    full_name: next
                }
            });
        };

        const moveNamePart = (idx: number, dir: 'up' | 'down') => {
            const currentParts = config.header_field_map.full_name || [];
            const next = [...currentParts];
            const target = dir === 'up' ? idx - 1 : idx + 1;
            if (target < 0 || target >= next.length) return;
            [next[idx], next[target]] = [next[target], next[idx]];
            setConfig({
                ...config,
                header_field_map: {
                    ...config.header_field_map,
                    full_name: next
                }
            });
        };

        return (
            <div className="space-y-10 animate-in fade-in duration-500">

                {/* Module 1: Layout Style */}
                <div className="space-y-4">
                    <h3 className="text-[13px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-emerald-400" /> Layout Style
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'grid', icon: <LayoutGrid className="w-5 h-5" />, label: 'Grid View', desc: 'Cards in responsive grid. Best for many candidates.' },
                            { id: 'list', icon: <List className="w-5 h-5" />, label: 'List View', desc: 'Vertical list with quick info inline.' },
                            { id: 'detailed', icon: <Maximize className="w-5 h-5" />, label: 'Detailed', desc: 'Full profiles displayed without clicking.' }
                        ].map(l => (
                            <button
                                key={l.id}
                                onClick={() => setConfig({ ...config, layout_style: l.id as any })}
                                className={`p-4 rounded-2xl border text-left transition-all ${config.layout_style === l.id ? 'bg-[#5B4FD9]/20 border-[#5B4FD9] shadow-[0_0_20px_rgba(91,79,217,0.15)] ring-1 ring-[#5B4FD9]/50' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                            >
                                <div className={`mb-3 ${config.layout_style === l.id ? 'text-[#5B4FD9]' : 'text-white/40'}`}>{l.icon}</div>
                                <h4 className={`text-[13px] font-bold ${config.layout_style === l.id ? 'text-white' : 'text-white/70'}`}>{l.label}</h4>
                                <p className="text-[11px] text-white/40 mt-1">{l.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full h-px bg-white/10" />

                {/* Module 2: Profile Header */}
                <div className="space-y-4">
                    <h3 className="text-[13px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-400" /> Header Configuration
                    </h3>
                    <p className="text-[12px] text-white/50">Map your application fields to the primary candidate header.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-[12px] font-bold text-white">Show Profile Photo</p>
                                <p className="text-[10px] text-white/40">Requires an image upload field in filing</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={config.show_photo} onChange={e => setConfig({ ...config, show_photo: e.target.checked })} />
                                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5B4FD9]"></div>
                            </label>
                        </div>
                        
                        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Maximize className="w-4 h-4 text-emerald-400" />
                                <div>
                                    <p className="text-[12px] font-bold text-emerald-400/90">Electoral Position</p>
                                    <p className="text-[10px] text-white/30 italic">Automatically included from Positions phase</p>
                                </div>
                            </div>
                            <div className="text-[9px] font-bold text-emerald-400 border border-emerald-400/30 px-2 py-0.5 rounded uppercase tracking-tighter bg-emerald-400/10">System Map</div>
                        </div>

                        <div className="p-4 rounded-xl border border-[#A78BFA]/20 bg-[#A78BFA]/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Users className="w-4 h-4 text-[#A78BFA]" />
                                <div>
                                    <p className="text-[12px] font-bold text-[#A78BFA]/90">Party Affiliation</p>
                                    <p className="text-[10px] text-white/30 italic">Included if enabled in Filing phase</p>
                                </div>
                            </div>
                            <div className="text-[9px] font-bold text-[#A78BFA] border border-[#A78BFA]/30 px-2 py-0.5 rounded uppercase tracking-tighter bg-[#A78BFA]/10">System Map</div>
                        </div>

                        {[
                            { id: 'full_name', label: 'Primary Display Name (Concatenated)' },
                            { id: 'department', label: 'Department / College' },
                            { id: 'course', label: 'Course / Program' },
                            { id: 'tagline', label: 'Tagline / Subtitle' }
                        ].map(slot => {
                            if (slot.id === 'full_name') {
                                const parts = config.header_field_map.full_name || [];
                                return (
                                    <div key={slot.id} className={`md:col-span-2 p-4 rounded-xl border bg-white/5 space-y-3 transition-all ${parts.length === 0 ? 'border-amber-500/40 ring-1 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : 'border-white/10'}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[12px] font-bold text-white/80">{slot.label}</p>
                                                <p className="text-[10px] text-white/30 italic">Add multiple parts (e.g. First Name + Last Name)</p>
                                            </div>
                                            {parts.length === 0 && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse">Required</span>}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {parts.map((pId, pIdx) => {
                                                const f = textFields.find(t => t.id === pId);
                                                return (
                                                    <div key={pId} className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/10 rounded-lg group hover:border-white/20 transition-all">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="flex flex-col gap-1 pr-1 border-r border-white/5 group-hover:border-white/10">
                                                                <button onClick={() => moveNamePart(pIdx, 'up')} className="hover:text-emerald-400 disabled:opacity-30 disabled:hover:text-white/40" disabled={pIdx === 0}>
                                                                    <ChevronUp className="w-2.5 h-2.5" />
                                                                </button>
                                                                <button onClick={() => moveNamePart(pIdx, 'down')} className="hover:text-emerald-400 disabled:opacity-30 disabled:hover:text-white/40" disabled={pIdx === parts.length - 1}>
                                                                    <ChevronDown className="w-2.5 h-2.5" />
                                                                </button>
                                                            </div>
                                                            <span className="text-[12px] text-white font-medium">{f?.label || 'Unknown Field'}</span>
                                                        </div>
                                                        <button onClick={() => removeNamePart(pIdx)} className="ml-1 text-white/20 hover:text-red-400 transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                            
                                            <div className="flex-1 min-w-[200px] relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNamePartDropdown(v => !v)}
                                                    className="w-full h-full flex items-center justify-between bg-[#110D1E] border border-white/5 rounded-lg text-[12px] text-white/50 px-3 py-2.5 hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer italic"
                                                >
                                                    <span>+ Add Name Part...</span>
                                                    <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                                                </button>
                                                
                                                {showNamePartDropdown && (
                                                    <>
                                                        {/* Click-outside backdrop to close */}
                                                        <div className="fixed inset-0 z-40" onClick={() => setShowNamePartDropdown(false)} />
                                                        
                                                        <div className="absolute z-50 top-full left-0 w-full mt-1.5 py-1.5 bg-[#100821]/98 border border-white/10 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl max-h-56 overflow-y-auto decta-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
                                                            {textFields.filter(f => !parts.includes(f.id)).length === 0 ? (
                                                                <div className="px-3 py-2 text-[11px] text-white/30 italic">No fields available</div>
                                                            ) : (
                                                                textFields.filter(f => !parts.includes(f.id)).map(f => (
                                                                    <button
                                                                        key={f.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            addNamePart(f.id);
                                                                            setShowNamePartDropdown(false);
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 text-[12px] text-white/70 hover:bg-[#5B4FD9]/15 hover:text-white transition-all not-italic"
                                                                    >
                                                                        {f.label}
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {parts.length > 0 && (
                                            <div className="pt-2 border-t border-white/5">
                                                <p className="text-[10px] text-white/25 uppercase tracking-widest font-bold mb-2">Display Preview</p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {parts.map((pId, idx) => {
                                                        const f = textFields.find(t => t.id === pId);
                                                        return (
                                                            <React.Fragment key={pId}>
                                                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-medium">{f?.label || pId}</span>
                                                                {idx < parts.length - 1 && <span className="text-white/20 text-[10px]">{"<space>"}</span>}
                                                            </React.Fragment>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            }
                            const selectedFieldId = (config.header_field_map as any)[slot.id] || "";
                            const selectedFieldLabel = textFields.find(f => f.id === selectedFieldId)?.label || "-- None (Hide) --";
                            const isDropdownOpen = activeMappingDropdownSlot === slot.id;

                            return (
                                <div key={slot.id} className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2 relative">
                                    <p className="text-[12px] font-bold text-white/80">{slot.label} Mapping</p>
                                    <button
                                        type="button"
                                        onClick={() => setActiveMappingDropdownSlot(isDropdownOpen ? null : slot.id)}
                                        className="w-full flex items-center justify-between bg-[#110D1E] border border-white/10 rounded-lg text-[12px] text-white/90 p-2 hover:border-white/20 transition-all cursor-pointer"
                                    >
                                        <span className={selectedFieldId ? "text-white/90" : "text-white/40"}>{selectedFieldLabel}</span>
                                        <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                                    </button>

                                    {isDropdownOpen && (
                                        <>
                                            {/* Click-outside backdrop to close */}
                                            <div className="fixed inset-0 z-40" onClick={() => setActiveMappingDropdownSlot(null)} />
                                            
                                            <div className="absolute z-50 top-full left-4 right-4 mt-1.5 py-1.5 bg-[#100821]/98 border border-white/10 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl max-h-56 overflow-y-auto decta-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setConfig({
                                                            ...config,
                                                            header_field_map: { ...config.header_field_map, [slot.id]: undefined }
                                                        });
                                                        setActiveMappingDropdownSlot(null);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-[12px] text-white/40 hover:bg-[#5B4FD9]/15 hover:text-white transition-all font-medium"
                                                >
                                                    -- None (Hide) --
                                                </button>
                                                {textFields.map(f => (
                                                    <button
                                                        key={f.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setConfig({
                                                                ...config,
                                                                header_field_map: { ...config.header_field_map, [slot.id]: f.id }
                                                            });
                                                            setActiveMappingDropdownSlot(null);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-[12px] text-white/70 hover:bg-[#5B4FD9]/15 hover:text-white transition-all"
                                                    >
                                                        {f.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="w-full h-px bg-white/10" />

                {/* Module 3: Field Arranger */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <Settings className="w-4 h-4 text-blue-400" /> Content Sections
                        </h3>
                        <button onClick={addSection} className="text-[11px] px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium flex items-center gap-1 transition-all">
                            <Plus className="w-3 h-3" /> Add Section
                        </button>
                    </div>
                    <p className="text-[12px] text-white/50">Group available application fields into organized sections for the public profile.</p>

                    <div className="space-y-4">
                        {sections.map((sec, secIdx) => (
                            <div
                                key={secIdx}
                                draggable
                                onDragStart={(e) => {
                                    setDraggedSectionIdx(secIdx);
                                    e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedSectionIdx !== null && draggedSectionIdx !== secIdx) {
                                        moveSection(draggedSectionIdx, secIdx);
                                    }
                                    setDraggedSectionIdx(null);
                                }}
                                className={`border border-white/10 bg-white/[0.02] rounded-2xl overflow-hidden shadow-lg transition-all ring-1 ring-black/5 hover:border-white/20 ${draggedSectionIdx === secIdx ? 'opacity-40 border-[#5B4FD9]' : ''}`}
                            >
                                {/* Section Header */}
                                <div className="bg-white/[0.05] p-3 flex items-center gap-3 border-b border-white/5">
                                    <div className="flex flex-col gap-0.5 cursor-grab active:cursor-grabbing">
                                        <GripVertical className="w-4 h-4 text-white/20 hover:text-white/60" />
                                    </div>
                                    <input
                                        value={sec.label}
                                        onChange={e => updateSection(secIdx, { label: e.target.value })}
                                        className="bg-transparent border-none outline-none font-bold text-[14px] text-white flex-1 hover:bg-white/5"
                                        placeholder="Section Title..."
                                    />

                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setActiveSectionStylePickerIdx(activeSectionStylePickerIdx === secIdx ? null : secIdx)}
                                            className="flex items-center justify-between gap-1.5 bg-[#110D1E] border border-white/10 rounded-lg text-[11px] text-white/75 px-3 py-1.5 hover:border-white/20 transition-all cursor-pointer min-w-[125px]"
                                        >
                                            <span>
                                                {sec.display_style === 'rows' && 'Table Rows'}
                                                {sec.display_style === 'prose' && 'Paragraph Text'}
                                                {sec.display_style === 'tags' && 'Badge Tags'}
                                            </span>
                                            <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                                        </button>
                                        
                                        {activeSectionStylePickerIdx === secIdx && (
                                            <>
                                                {/* Click-outside backdrop to close */}
                                                <div className="fixed inset-0 z-40" onClick={() => setActiveSectionStylePickerIdx(null)} />
                                                
                                                <div className="absolute z-50 top-full right-0 mt-1.5 py-1 bg-[#100821]/98 border border-white/10 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl min-w-[140px] animate-in fade-in slide-in-from-top-1 duration-150">
                                                    {[
                                                        { value: 'rows', label: 'Table Rows' },
                                                        { value: 'prose', label: 'Paragraph Text' },
                                                        { value: 'tags', label: 'Badge Tags' }
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => {
                                                                updateSection(secIdx, { display_style: opt.value as any });
                                                                setActiveSectionStylePickerIdx(null);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-[11px] transition-all ${sec.display_style === opt.value ? 'bg-[#5B4FD9]/20 text-white font-bold' : 'text-white/70 hover:bg-[#5B4FD9]/15 hover:text-white'}`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <button onClick={() => updateSection(secIdx, { is_visible: !sec.is_visible })} className={`p-1.5 rounded-md ${sec.is_visible ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                                        {sec.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => removeSection(secIdx)} className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Section Fields */}
                                <div className="p-4 space-y-2">
                                    {sec.listing_section_fields.length === 0 ? (
                                        <div className="text-center py-4 text-white/30 text-[12px] border border-dashed border-white/10 rounded-xl">No fields added.</div>
                                    ) : (
                                        sec.listing_section_fields.map((f, fieldIdx) => {
                                            const orig = textFields.find(t => t.id === f.field_id);
                                            return (
                                                <div
                                                    key={fieldIdx}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.stopPropagation(); // prevent section drag
                                                        setDraggedFieldInfo({ secIdx, fieldIdx });
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (draggedFieldInfo && draggedFieldInfo.secIdx === secIdx && draggedFieldInfo.fieldIdx !== fieldIdx) {
                                                            moveField(secIdx, draggedFieldInfo.fieldIdx, fieldIdx);
                                                        }
                                                        setDraggedFieldInfo(null);
                                                    }}
                                                    className={`flex items-center gap-3 bg-black/20 p-2.5 rounded-xl border border-white/5 group ${draggedFieldInfo?.fieldIdx === fieldIdx && draggedFieldInfo?.secIdx === secIdx ? 'opacity-40' : ''}`}
                                                >
                                                    <div className="cursor-grab active:cursor-grabbing">
                                                        <GripVertical className="w-3.5 h-3.5 text-white/10 hover:text-white/40" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <input
                                                            value={f.display_label}
                                                            onChange={e => {
                                                                const next = [...sections];
                                                                next[secIdx].listing_section_fields[fieldIdx].display_label = e.target.value;
                                                                setSections(next);
                                                            }}
                                                            className="bg-transparent border-none outline-none font-medium text-[13px] text-white w-full h-full"
                                                            placeholder="Display Label"
                                                        />
                                                        <p className="text-[10px] text-white/30">Original Field: {orig?.label || 'Unknown'}</p>
                                                    </div>
                                                    <button onClick={() => removeFieldFromSection(secIdx, fieldIdx)} className="mr-2 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )
                                        })
                                    )}

                                    {/* Field Picker */}
                                    <div className="pt-2 relative">
                                        <button
                                            type="button"
                                            onClick={() => setActiveSectionFieldPickerIdx(activeSectionFieldPickerIdx === secIdx ? null : secIdx)}
                                            className="w-full flex items-center justify-between bg-[#110D1E] border border-white/10 rounded-xl text-[12px] text-white/60 p-2.5 hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer"
                                        >
                                            <span>+ Assign Field To Section...</span>
                                            <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                                        </button>
                                        
                                        {activeSectionFieldPickerIdx === secIdx && (
                                            <>
                                                {/* Click-outside backdrop to close */}
                                                <div className="fixed inset-0 z-40" onClick={() => setActiveSectionFieldPickerIdx(null)} />
                                                
                                                <div className="absolute z-50 top-full left-0 w-full mt-1.5 py-1.5 bg-[#100821]/98 border border-white/10 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl max-h-56 overflow-y-auto decta-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
                                                    {unassignedFields.length === 0 ? (
                                                        <div className="px-3 py-2 text-[11px] text-white/30 italic">No fields available</div>
                                                    ) : (
                                                        unassignedFields.map(f => (
                                                            <button
                                                                key={f.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    addFieldToSection(secIdx, f.id);
                                                                    setActiveSectionFieldPickerIdx(null);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-[12px] text-white/70 hover:bg-[#5B4FD9]/15 hover:text-white transition-all"
                                                            >
                                                                {f.label}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full h-px bg-white/10" />

                {/* Module 4: Documents Display */}
                <div className="space-y-4">
                    <h3 className="text-[13px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-400" /> Attached Documents
                    </h3>
                    {fileFields.length === 0 ? (
                        <p className="text-[12px] text-white/40">No file upload fields exist in the candidate application form.</p>
                    ) : (
                        <div className="space-y-3">
                            {documents.map((doc, idx) => {
                                const orig = fileFields.find(f => f.id === doc.field_id);
                                if (!orig) return null;

                                return (
                                    <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                                        <div>
                                            <p className="text-[13px] font-bold text-white">{orig.label}</p>
                                            <p className="text-[11px] text-white/40">File Upload Field</p>
                                        </div>
                                        <div className="flex rounded-lg overflow-hidden border border-white/10 w-fit">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = [...documents];
                                                    next[idx].is_visible = false;
                                                    setDocuments(next);
                                                }}
                                                className={`px-4 py-2 text-[11px] font-semibold transition-all ${!doc.is_visible ? 'bg-white/15 text-white' : 'bg-transparent text-white/40 hover:bg-white/5'}`}
                                            >Not Shown</button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = [...documents];
                                                    next[idx].is_visible = true;
                                                    setDocuments(next);
                                                }}
                                                className={`px-4 py-2 text-[11px] font-semibold transition-all ${doc.is_visible ? 'bg-orange-500/20 text-orange-400' : 'bg-transparent text-white/40 hover:bg-white/5'}`}
                                            >Download Link</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="w-full h-px bg-white/10" />

                {/* Modules 5 & 6: Phase Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-white/10 bg-[#1A1528] space-y-3 shadow-lg">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h4 className="text-[13px] font-bold text-white">Retain After Publication Phase</h4>
                                <p className="text-[11px] text-white/50 mt-1 leading-relaxed">Keep the candidate list publicly visible during the Voting and Results phases so voters can review them while casting ballots.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                                <input type="checkbox" className="sr-only peer" checked={config.persist_after_phase} onChange={e => setConfig({ ...config, persist_after_phase: e.target.checked })} />
                                <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                            </label>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-white/10 bg-[#1A1528] space-y-3 shadow-lg">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h4 className="text-[13px] font-bold text-white">Full Individual Profile Pages</h4>
                                <p className="text-[11px] text-white/50 mt-1 leading-relaxed">Generate a dedicated, shareable URL route for each candidate profile. If disabled, profiles just expand inline in the listing.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                                <input type="checkbox" className="sr-only peer" checked={config.enable_profile_pages} onChange={e => setConfig({ ...config, enable_profile_pages: e.target.checked })} />
                                <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-[#5B4FD9] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                            </label>
                        </div>
                    </div>
                </div>

            </div>
        );
    }
);

PublicationModule.displayName = 'PublicationModule';
