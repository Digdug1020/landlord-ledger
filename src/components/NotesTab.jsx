import { useState } from 'react';
import { useApp } from '../AppContext';
import { supabase } from '../supabaseClient';

export default function NotesTab() {
  const { business, properties, generalNote, setGeneralNote, propertyNotes, setPropertyNotes } = useApp();
  const [generalNoteSaving, setGeneralNoteSaving] = useState(false);
  const [propertyNotesSaving, setPropertyNotesSaving] = useState({});

  async function saveGeneralNote() {
    setGeneralNoteSaving(true);
    if (generalNote.id) {
      const { error } = await supabase.from('notes').update({ content: generalNote.content }).eq('id', generalNote.id);
      if (!error) setGeneralNote(v => ({ ...v, content: generalNote.content }));
    } else {
      const { data } = await supabase.from('notes').insert([{ business_id: business.id, content: generalNote.content }]).select().single();
      if (data) setGeneralNote({ id: data.id, content: data.content });
    }
    setGeneralNoteSaving(false);
  }

  async function savePropertyNote(p) {
    const note = propertyNotes[p.id] || { id: null, content: '' };
    setPropertyNotesSaving(prev => ({ ...prev, [p.id]: true }));
    if (note.id) {
      const { error } = await supabase.from('notes').update({ content: note.content }).eq('id', note.id);
      if (!error) setPropertyNotes(prev => ({ ...prev, [p.id]: { ...prev[p.id], content: note.content } }));
    } else {
      const { data } = await supabase.from('notes').insert([{ business_id: business.id, property_id: p.id, content: note.content }]).select().single();
      if (data) setPropertyNotes(prev => ({ ...prev, [p.id]: { id: data.id, content: data.content } }));
    }
    setPropertyNotesSaving(prev => ({ ...prev, [p.id]: false }));
  }

  return (
    <>
      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 12 }}>GENERAL NOTES</div>
      <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 14, padding: 16, marginBottom: 24 }}>
        <textarea
          value={generalNote.content}
          onChange={e => setGeneralNote(v => ({ ...v, content: e.target.value }))}
          placeholder="Shared business notes..."
          rows={6}
          style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 15, resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8, borderTop: '1px solid #1e2235', paddingTop: 10 }}>
          <button disabled={generalNoteSaving} onClick={saveGeneralNote}
            style={{ background: '#1d4ed8', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#fff', cursor: generalNoteSaving ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: generalNoteSaving ? 0.6 : 1 }}>
            {generalNoteSaving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setGeneralNote(v => ({ ...v, content: '' }))}
            style={{ background: '#1e2235', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Clear</button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 12 }}>NOTES BY PROPERTY</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {properties.map(p => {
          const note = propertyNotes[p.id] || { id: null, content: '' };
          return (
            <div key={p.id} style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>{p.address}</div>
              <textarea
                value={note.content}
                onChange={e => setPropertyNotes(prev => ({ ...prev, [p.id]: { ...note, content: e.target.value } }))}
                placeholder="Add notes, tenant info, schedule..."
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', background: '#1e2235', border: '1px solid #2d3555', borderRadius: 8, color: '#e2e8f0', fontSize: 14, resize: 'vertical', outline: 'none', padding: '10px 12px', lineHeight: 1.5 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <a href="https://calendar.google.com" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none' }}>📅 Google Calendar</a>
                <button disabled={!!propertyNotesSaving[p.id]} onClick={() => savePropertyNote(p)}
                  style={{ background: '#1d4ed8', border: 'none', borderRadius: 8, padding: '6px 16px', color: '#fff', cursor: propertyNotesSaving[p.id] ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: propertyNotesSaving[p.id] ? 0.6 : 1 }}>
                  {propertyNotesSaving[p.id] ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
