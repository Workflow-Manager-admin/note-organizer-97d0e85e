import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Utilities for localStorage key namespaces (for future server: swap here)
const NOTES_KEY = 'notes-app-notes-v1';
const CATEGORIES_KEY = 'notes-app-categories-v1';
const THEME_KEY = 'notes-app-theme-v1';

// Default categories – can be changed or expanded
const DEFAULT_CATEGORIES = [
  'Work',
  'Personal',
  'Ideas',
  'Todos',
  'Archive'
];

const PALETTE = {
  primary: '#2563eb',
  secondary: '#64748b',
  accent: '#f59e42',
};

// PUBLIC_INTERFACE
function App() {
  // State for notes and categories/tags organization
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editNote, setEditNote] = useState(null); // null for new, otherwise note object
  const [theme, setTheme] = useState('light');

  // Autosave logic: keep track of last edited note (id) and debounce
  const [autosaveStatus, setAutosaveStatus] = useState('');
  const autosaveTimer = useRef(null);

  // ---- CRUD helpers ----

  // PUBLIC_INTERFACE
  function loadNotes() {
    try {
      const stored = localStorage.getItem(NOTES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  }

  // PUBLIC_INTERFACE
  function saveNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  // PUBLIC_INTERFACE
  function loadCategories() {
    try {
      const stored = localStorage.getItem(CATEGORIES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [...DEFAULT_CATEGORIES];
  }

  // PUBLIC_INTERFACE
  function saveCategories(categories) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }

  // Initial load
  useEffect(() => {
    setCategories(loadCategories());
    setNotes(loadNotes());
    const storedTheme = localStorage.getItem(THEME_KEY) || 'light';
    setTheme(storedTheme);
    document.documentElement.setAttribute('data-theme', storedTheme);
  }, []);

  // Handle theme switching (persist to localStorage, apply to root)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }

  // Filter notes: by search text + active category/tag
  useEffect(() => {
    let result = notes;
    if (activeCategory) {
      result = result.filter(n => n.categories && n.categories.includes(activeCategory));
    }
    if (searchText.trim().length > 0) {
      result = result.filter(
        n =>
          n.title.toLowerCase().includes(searchText.trim().toLowerCase()) ||
          n.content.toLowerCase().includes(searchText.trim().toLowerCase())
      );
    }
    setFilteredNotes(result);
  }, [notes, activeCategory, searchText]);

  // ---- CRUD: Modal open for new/edit ----

  function openNewNoteModal() {
    setEditNote({
      id: null,
      title: '',
      content: '',
      categories: activeCategory ? [activeCategory] : [],
      lastModified: Date.now(),
    });
    setModalOpen(true);
  }

  function openEditNoteModal(note) {
    setEditNote({ ...note });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditNote(null);
    setAutosaveStatus('');
    clearTimeout(autosaveTimer.current);
  }

  // ---- Autosave NOTE changes ----
  function handleEditNoteChange(field, value) {
    setEditNote(prev => {
      const updated = { ...prev, [field]: value, lastModified: Date.now() };
      // Start autosave debounce
      setAutosaveStatus('Saving...');
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        autoSaveNote(updated);
      }, 800);
      return updated;
    });
  }

  function autoSaveNote(draft) {
    if (!draft) return;
    let updNotes = [...notes];
    if (draft.id == null) return; // Only after first save
    const idx = updNotes.findIndex(n => n.id === draft.id);
    if (idx >= 0) {
      updNotes[idx] = draft;
      setNotes(updNotes);
      saveNotes(updNotes);
      setAutosaveStatus('Saved');
      setTimeout(() => setAutosaveStatus(''), 600);
    }
  }

  // ---- Modal Save (create or update) ----
  function handleModalSave() {
    // Save new or update existing note
    if (!editNote.title.trim() && !editNote.content.trim()) {
      setAutosaveStatus('Title or content required');
      return;
    }
    let updNotes = [...notes];
    if (editNote.id == null) {
      // Add new
      const fresh = {
        ...editNote,
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 8),
        created: Date.now(),
        lastModified: Date.now(),
      };
      updNotes = [fresh, ...updNotes];
      setNotes(updNotes);
      saveNotes(updNotes);
    } else {
      // update existing
      const idx = updNotes.findIndex(n => n.id === editNote.id);
      if (idx >= 0) {
        updNotes[idx] = { ...editNote, lastModified: Date.now() };
        setNotes(updNotes);
        saveNotes(updNotes);
      }
    }
    setAutosaveStatus('Saved');
    setTimeout(() => setAutosaveStatus(''), 600);
    closeModal();
  }

  function handleModalDelete() {
    if (editNote && editNote.id != null) {
      const filtered = notes.filter(n => n.id !== editNote.id);
      setNotes(filtered);
      saveNotes(filtered);
    }
    closeModal();
  }

  // ---- Category/Tag mgmt ----

  function addCategory(newCat) {
    if (!newCat || categories.includes(newCat)) return;
    const updCategories = [newCat, ...categories];
    setCategories(updCategories);
    saveCategories(updCategories);
  }

  function handleCategoryClick(cat) {
    setActiveCategory(cat === activeCategory ? '' : cat);
  }

  // ---- UI Layouts ----

  return (
    <div className="notes-root" style={{ minHeight: '100vh', background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <HeaderBar theme={theme} onThemeToggle={toggleTheme} />
      <div className="notes-layout">
        <Sidebar
          categories={categories}
          active={activeCategory}
          onCategoryClick={handleCategoryClick}
          addCategory={addCategory}
        />
        <main className="main-content">
          <div className="top-bar">
            <h2>Notes</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Search notes..."
                aria-label="Search notes"
                value={searchText}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  fontSize: 15,
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  minWidth: 120
                }}
                onChange={e => setSearchText(e.target.value)}
              />
              <button className="btn-primary" onClick={openNewNoteModal}>+ New</button>
            </div>
          </div>
          <NotesList
            notes={filteredNotes}
            onNoteClick={openEditNoteModal}
          />
        </main>
      </div>
      {modalOpen && <NoteModal
        note={editNote}
        onChange={handleEditNoteChange}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        onClose={closeModal}
        categories={categories}
        addCategory={addCategory}
        autosaveStatus={autosaveStatus}
      />}
    </div>
  );
}

// -- Components --

// HeaderBar: App Title + Theme Toggle
function HeaderBar({ theme, onThemeToggle }) {
  return (
    <header className="kavia-header">
      <span className="app-title">📝 Notes App</span>
      <button className="theme-toggle-btn"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        onClick={onThemeToggle}>
        {theme === 'light' ? <span>🌙</span> : <span>☀️</span>}
      </button>
    </header>
  );
}

// Sidebar: Categories/tags
function Sidebar({ categories, active, onCategoryClick, addCategory }) {
  const [newCategory, setNewCategory] = useState('');
  return (
    <aside className="sidebar">
      <div className="cat-sidebar-header">
        <span className="sidebar-title">Categories</span>
      </div>
      <div className="sidebar-list">
        {categories.map(cat =>
          <div
            key={cat}
            className={`sidebar-item${active === cat ? ' active' : ''}`}
            onClick={() => onCategoryClick(cat)}
            tabIndex={0}
            role="button"
            aria-pressed={active === cat}
          >
            {cat}
          </div>
        )}
      </div>
      <form className="sidebar-form" onSubmit={e => {
        e.preventDefault();
        if (newCategory.trim()) {
          addCategory(newCategory.trim());
          setNewCategory('');
        }
      }}>
        <input
          className="sidebar-input"
          type="text"
          maxLength={18}
          placeholder="+ New Category"
          value={newCategory}
          aria-label="Add category"
          onChange={e => setNewCategory(e.target.value)}
        />
      </form>
    </aside>
  );
}

// NotesList: Main list of notes
function NotesList({ notes, onNoteClick }) {
  if (!notes.length) {
    return <div style={{ padding: 32, color: "var(--text-secondary)" }}>No notes found.</div>
  }
  return (
    <div className="notes-list">
      {notes.map(note => (
        <NoteCard key={note.id} note={note} onClick={() => onNoteClick(note)} />
      ))}
    </div>
  );
}

// NoteCard: An individual note snippet
function NoteCard({ note, onClick }) {
  return (
    <div className="note-card" tabIndex={0} onClick={onClick}>
      <div className="note-title">{note.title || <em>(untitled)</em>}</div>
      <div className="note-content-preview">{note.content.slice(0, 72)}{note.content.length > 70 ? '…' : ''}</div>
      <div className="note-meta">
        {note.categories && note.categories.length
          ? note.categories.map(cat => (
            <span key={cat} className="note-category">{cat}</span>
          )) : <span className="note-category inactive">Uncategorized</span>}
        <span className="note-date">
          {toRelativeTime(note.lastModified || note.created)}
        </span>
      </div>
    </div>
  );
}

// NoteModal: Editor for create/edit note
function NoteModal({
  note, onChange, onSave, onDelete, onClose,
  categories, addCategory, autosaveStatus
}) {
  const [catInput, setCatInput] = useState('');
  return (
    <div className="modal-backdrop" onMouseDown={e => {
      if (e.target.classList.contains('modal-backdrop')) onClose();
    }}>
      <div className="modal-dialog" role="dialog" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{note.id ? 'Edit Note' : 'New Note'}</h2>
          <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <input
            className="modal-title"
            type="text"
            placeholder="Title"
            value={note.title}
            onChange={e => onChange('title', e.target.value)}
            autoFocus
            maxLength={60}
          />
          <textarea
            className="modal-content"
            placeholder="Start writing your note..."
            value={note.content}
            rows={7}
            onChange={e => onChange('content', e.target.value)}
            style={{ resize: "vertical" }}
          />
          <div className="cat-chips-list">
            {categories.map(cat =>
              <span
                key={cat}
                className={'cat-chip' + (note.categories && note.categories.includes(cat) ? ' chip-active' : '')}
                onClick={() => {
                  const cur = note.categories || [];
                  if (cur.includes(cat)) {
                    onChange('categories', cur.filter(c => c !== cat));
                  } else {
                    onChange('categories', [...cur, cat]);
                  }
                }}
              >{cat}</span>
            )}
            {/* Add category inline */}
            <form
              className="cat-form"
              onSubmit={e => {
                e.preventDefault();
                if (catInput.trim()) {
                  addCategory(catInput.trim());
                  onChange('categories', [...(note.categories || []), catInput.trim()]);
                  setCatInput('');
                }
              }}
            >
              <input
                className="cat-input"
                type="text"
                placeholder="Add category"
                value={catInput}
                maxLength={14}
                onChange={e => setCatInput(e.target.value)}
              />
            </form>
          </div>
          <div className="autosave-status" aria-live="polite">{autosaveStatus}</div>
        </div>
        <div className="modal-footer">
          {note.id &&
            <button className="btn-delete" onClick={onDelete}>Delete</button>
          }
          <span style={{ flex: 1 }} />
          <button className="btn-primary" onClick={onSave}>Save & Close</button>
        </div>
      </div>
    </div>
  );
}

// Utility: relative timestamp
function toRelativeTime(ts) {
  if (!ts) return '';
  const now = Date.now();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  const dt = new Date(ts);
  return dt.toLocaleDateString();
}

export default App;
