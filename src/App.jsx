// ...existing code...
import React, { useEffect, useMemo, useState } from 'react'
// Removed ReactQuill import
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import * as Diff from 'diff'

const TYPES = ['Policy','Procedure','Regulation']
const STATUSES = ['Draft','Under Review','Active','Archived']
const STORAGE_KEY = 'lexuz-lite-library-v1'

const REQUIRED = {
  Policy: [
    'I. ABBREVIATIONS','II. DOCUMENT IDENTIFICATION','III. DEFINITION OF BUSINESS ACTIVITY','IV. ASSOCIATED INTERNAL RULES AND EXTERNAL REGULATIONS','V. REVISION HISTORY OF DOCUMENT VERSION',
    'Table of Content',
    '1. Introduction.','2. Chapter I','3. Chapter II','4. Chapter III','5. Chapter VI','6. Chapter V','7. Chapter VI','8. Chapter VII','9. Chapter VIII','10. Chapter IX','11. Chapter X','12. Ect','13. Attachments','14. Appendix'
  ],
  Procedure: [
    'I. ABBREVIATIONS','II. DOCUMENT IDENTIFICATION','III. DEFINITION OF BUSINESS ACTIVITY','IV. ASSOCIATED INTERNAL RULES AND EXTERNAL REGULATIONS','V. REVISION HISTORY OF DOCUMENT VERSION',
    'Table of Content',
    '1. Introduction.','2. Chapter I','3. Chapter II','4. Chapter III','5. Chapter VI','6. Chapter V','7. Chapter VI','8. Chapter VII','9. Chapter VIII','10. Chapter IX','11. Chapter X','12. Ect','13. Attachments','14. Appendix'
  ],
  Regulation: [
    'I. ABBREVIATIONS','II. DOCUMENT IDENTIFICATION','III. DEFINITION OF BUSINESS ACTIVITY','IV. ASSOCIATED INTERNAL RULES AND EXTERNAL REGULATIONS','V. REVISION HISTORY OF DOCUMENT VERSION',
    'Table of Content',
    '1. Introduction.','2. Chapter I','3. Chapter II','4. Chapter III','5. Chapter VI','6. Chapter V','7. Chapter VI','8. Chapter VII','9. Chapter VIII','10. Chapter IX','11. Chapter X','12. Ect','13. Attachments','14. Appendix'
  ]
}

const uid = () => (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2)
const now = () => new Date().toISOString()

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if(!raw) return { docs: [], audit: [] }
    const { docs = [], audit = [] } = JSON.parse(raw)
    return { docs, audit }
  } catch(e){ return { docs: [], audit: [] } }
}
function save(docs, audit){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ exportedAt: now(), docs, audit }))
}

function sectionMap(sections){
  const m = new Map()
  ;(sections||[]).forEach(s=> m.set(s.key, s.text || ''))
  return m
}
function compareSections(a, b){
  const A = sectionMap(a||[])
  const B = sectionMap(b||[])
  const keys = new Set([...(a||[]).map(s=>s.key), ...(b||[]).map(s=>s.key)])
  return Array.from(keys).sort().map(key => {
    const av = (A.get(key)||'').trim()
    const bv = (B.get(key)||'').trim()
    let status = 'unchanged'
    if(!av && bv) status = 'added'
    else if(av && !bv) status = 'removed'
    else if(av !== bv) status = 'changed'
    return { section: key, status, before: av, after: bv }
  })
}

// New Comparative Table Component
function ComparativeTable({ oldVersion, newVersion, comments = [], onClose }) {
  const [localComments, setLocalComments] = useState(comments)
  
  const addComment = (sectionKey, comment) => {
    const newComment = {
      id: uid(),
      sectionKey,
      comment,
      timestamp: now()
    }
    setLocalComments(prev => [...prev, newComment])
  }
  
  const updateComment = (sectionKey, comment) => {
    // For now, just add to existing comments. You can extend this to update existing ones
    if (comment.trim()) {
      addComment(sectionKey, comment)
    }
  }
  
  const getSectionComment = (sectionKey) => {
    const comments = localComments.filter(c => c.sectionKey === sectionKey)
    return comments.length > 0 ? comments[comments.length - 1].comment : ''
  }
  
  if (!oldVersion || !newVersion) {
    return (
      <div className="panel">
        <div className="body">
          <div className="muted">Please select both old and new versions to compare</div>
        </div>
      </div>
    )
  }
  
  const comparisonData = compareSections(oldVersion.sections, newVersion.sections)
  
  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'white',
      zIndex: 1000,
      overflow: 'auto',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '20px'
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          color: '#333',
          margin: 0
        }}>
          Comparative Table (Old vs New Version)
        </h1>
        <button 
          onClick={onClose} 
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#dc3545',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            padding: '8px 16px'
          }}
        >
          Close
        </button>
      </div>
      
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          fontSize: '14px',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ 
                border: '1px solid #dee2e6', 
                padding: '16px 12px', 
                textAlign: 'left',
                width: '25%',
                fontWeight: '600',
                color: '#495057',
                fontSize: '14px'
              }}>
                Section
              </th>
              <th style={{ 
                border: '1px solid #dee2e6', 
                padding: '16px 12px', 
                textAlign: 'left',
                width: '25%',
                fontWeight: '600',
                color: '#495057',
                fontSize: '14px',
                position: 'relative'
              }}>
                Old Version 
                <span style={{ 
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: '#6c757d'
                }}>🔒</span>
              </th>
              <th style={{ 
                border: '1px solid #dee2e6', 
                padding: '16px 12px', 
                textAlign: 'left',
                width: '25%',
                fontWeight: '600',
                color: '#495057',
                fontSize: '14px'
              }}>
                New Version
              </th>
              <th style={{ 
                border: '1px solid #dee2e6', 
                padding: '16px 12px', 
                textAlign: 'left',
                width: '25%',
                fontWeight: '600',
                color: '#495057',
                fontSize: '14px'
              }}>
                Comment
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row, index) => {
              return (
                <tr key={row.section} style={{ backgroundColor: 'white' }}>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '16px 12px',
                    verticalAlign: 'top',
                    fontWeight: '500',
                    color: '#212529'
                  }}>
                    {row.section}
                  </td>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '16px 12px',
                    verticalAlign: 'top',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: '#495057'
                    }}>
                      {row.before ? (
                        <div>{row.before.replace(/<[^>]*>?/gm, '').substring(0, 100) + (row.before.length > 100 ? '...' : '')}</div>
                      ) : (
                        <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No content</span>
                      )}
                    </div>
                    {row.before && (
                      <span style={{ 
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        fontSize: '12px',
                        color: '#6c757d'
                      }}>🔒</span>
                    )}
                  </td>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '16px 12px',
                    verticalAlign: 'top'
                  }}>
                    <div style={{ 
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: '#495057'
                    }}>
                      {row.after ? (
                        <div>{row.after.replace(/<[^>]*>?/gm, '').substring(0, 100) + (row.after.length > 100 ? '...' : '')}</div>
                      ) : (
                        <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No content</span>
                      )}
                    </div>
                  </td>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '16px 12px',
                    verticalAlign: 'top'
                  }}>
                    <textarea
                      placeholder="Add comment..."
                      defaultValue={getSectionComment(row.section)}
                      onBlur={(e) => updateComment(row.section, e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        backgroundColor: '#ffffff',
                        color: '#495057'
                      }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Chapter Manager Panel
function ChapterManagerPanel({ docs, onAddChapter, onDeleteChapter, onClose, preSelectedDoc = null }) {
  const [selectedDocId, setSelectedDocId] = useState(preSelectedDoc?.id || docs[0]?.id || '')
  const [newChapterName, setNewChapterName] = useState('')
  const [selectedChapterToDelete, setSelectedChapterToDelete] = useState('')

  const selectedDoc = docs.find(d => d.id === selectedDocId)
  const latestVersion = selectedDoc?.versions[selectedDoc.versions.length - 1]
  const availableChapters = latestVersion?.sections || []

  const handleAddChapter = (e) => {
    e.preventDefault()
    if (newChapterName.trim() && selectedDocId) {
      onAddChapter(selectedDocId, newChapterName.trim())
      setNewChapterName('')
    }
  }

  const handleDeleteChapter = () => {
    if (selectedChapterToDelete && selectedDocId) {
      if (confirm(`Are you sure you want to delete the chapter "${selectedChapterToDelete}"?`)) {
        onDeleteChapter(selectedDocId, selectedChapterToDelete)
        setSelectedChapterToDelete('')
      }
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '32px',
        minWidth: '600px',
        maxWidth: '80vw',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: '1px solid #e0e0e0',
          paddingBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#333',
            margin: 0
          }}>
            Manage Chapters
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#dc3545',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              padding: '8px 16px'
            }}
          >
            Close
          </button>
        </div>

        {/* Document Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#495057'
          }}>
            Select Document
          </label>
          <select
            value={selectedDocId}
            onChange={e => setSelectedDocId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            {docs.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.title} ({doc.type})
              </option>
            ))}
          </select>
        </div>

        {/* Add Chapter Section */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '6px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '500',
            color: '#333',
            margin: '0 0 16px 0'
          }}>
            Add New Chapter
          </h3>
          <form onSubmit={handleAddChapter} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={newChapterName}
              onChange={e => setNewChapterName(e.target.value)}
              placeholder="Enter chapter name (e.g., 'Chapter XII', '15. New Section')"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <button
              type="submit"
              disabled={!newChapterName.trim()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: newChapterName.trim() ? 'pointer' : 'not-allowed',
                opacity: newChapterName.trim() ? 1 : 0.6
              }}
            >
              Add Chapter
            </button>
          </form>
        </div>

        {/* Delete Chapter Section */}
        <div style={{
          backgroundColor: '#fff5f5',
          padding: '20px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '500',
            color: '#333',
            margin: '0 0 16px 0'
          }}>
            Delete Chapter
          </h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#495057'
              }}>
                Select Chapter to Delete
              </label>
              <select
                value={selectedChapterToDelete}
                onChange={e => setSelectedChapterToDelete(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Choose a chapter...</option>
                {availableChapters.map(chapter => (
                  <option key={chapter.key} value={chapter.key}>
                    {chapter.key}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleDeleteChapter}
              disabled={!selectedChapterToDelete}
              style={{
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: selectedChapterToDelete ? 'pointer' : 'not-allowed',
                opacity: selectedChapterToDelete ? 1 : 0.6
              }}
            >
              Delete Chapter
            </button>
          </div>
        </div>

        {/* Current Chapters List */}
        <div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '500',
            color: '#333',
            margin: '0 0 12px 0'
          }}>
            Current Chapters ({availableChapters.length})
          </h3>
          <div style={{
            maxHeight: '200px',
            overflow: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            backgroundColor: '#fff'
          }}>
            {availableChapters.length > 0 ? (
              availableChapters.map((chapter, index) => (
                <div
                  key={chapter.key}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < availableChapters.length - 1 ? '1px solid #f0f0f0' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: '500', color: '#333' }}>
                    {chapter.key}
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#6c757d',
                    backgroundColor: '#f8f9fa',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {chapter.text ? `${chapter.text.length} chars` : 'Empty'}
                  </span>
                </div>
              ))
            ) : (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#6c757d',
                fontStyle: 'italic'
              }}>
                No chapters found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Comment Input Component
function CommentInput({ onAddComment }) {
  const [comment, setComment] = useState('')
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (comment.trim()) {
      onAddComment(comment.trim())
      setComment('')
    }
  }
  
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '4px' }}>
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add comment..."
        style={{
          flex: 1,
          padding: '4px 8px',
          border: '1px solid #ddd',
          borderRadius: '3px',
          fontSize: '12px'
        }}
      />
      <button 
        type="submit"
        style={{
          padding: '4px 8px',
          backgroundColor: '#1890ff',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        +
      </button>
    </form>
  )
}

// Standalone Comparative Table Panel
function ComparativeTablePanel({ docs, onClose }) {
  const [selectedDoc1, setSelectedDoc1] = useState(docs[0]?.id || '')
  const [selectedDoc2, setSelectedDoc2] = useState(docs[1]?.id || docs[0]?.id || '')
  const [selectedVersion1, setSelectedVersion1] = useState('')
  const [selectedVersion2, setSelectedVersion2] = useState('')
  
  const doc1 = docs.find(d => d.id === selectedDoc1)
  const doc2 = docs.find(d => d.id === selectedDoc2)
  
  const version1 = doc1?.versions.find(v => v.id === selectedVersion1) || doc1?.versions[0]
  const version2 = doc2?.versions.find(v => v.id === selectedVersion2) || doc2?.versions[doc2?.versions.length - 1]
  
  useEffect(() => {
    if (doc1 && !selectedVersion1) {
      setSelectedVersion1(doc1.versions[0]?.id || '')
    }
  }, [doc1, selectedVersion1])
  
  useEffect(() => {
    if (doc2 && !selectedVersion2) {
      setSelectedVersion2(doc2.versions[doc2.versions.length - 1]?.id || '')
    }
  }, [doc2, selectedVersion2])
  
  if (version1 && version2) {
    return (
      <ComparativeTableWithSelection 
        oldVersion={version1}
        newVersion={version2}
        docs={docs}
        selectedDoc1={selectedDoc1}
        selectedDoc2={selectedDoc2}
        selectedVersion1={selectedVersion1}
        selectedVersion2={selectedVersion2}
        onDocChange={(docNum, docId) => docNum === 1 ? setSelectedDoc1(docId) : setSelectedDoc2(docId)}
        onVersionChange={(docNum, versionId) => docNum === 1 ? setSelectedVersion1(versionId) : setSelectedVersion2(versionId)}
        onClose={onClose}
        comments={[]}
      />
    )
  }
  
  return (
    <div className="panel" style={{
      position: 'fixed', 
      left: 8, 
      right: 8, 
      top: 8, 
      bottom: 8, 
      overflow: 'auto', 
      zIndex: 1000,
      maxWidth: '100vw'
    }}>
      <div className="body">
        <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <b>Comparative Analysis Table</b>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
        
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label className="muted" style={{ marginBottom: 8, display: 'block' }}>Select First Document</label>
            <select 
              className="input select" 
              value={selectedDoc1} 
              onChange={e => setSelectedDoc1(e.target.value)}
            >
              {docs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.title}</option>
              ))}
            </select>
            {doc1 && (
              <select 
                className="input select" 
                style={{ marginTop: 8 }}
                value={selectedVersion1} 
                onChange={e => setSelectedVersion1(e.target.value)}
              >
                {doc1.versions.map(version => (
                  <option key={version.id} value={version.id}>{version.version}</option>
                ))}
              </select>
            )}
          </div>
          
          <div>
            <label className="muted" style={{ marginBottom: 8, display: 'block' }}>Select Second Document</label>
            <select 
              className="input select" 
              value={selectedDoc2} 
              onChange={e => setSelectedDoc2(e.target.value)}
            >
              {docs.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.title}</option>
              ))}
            </select>
            {doc2 && (
              <select 
                className="input select" 
                style={{ marginTop: 8 }}
                value={selectedVersion2} 
                onChange={e => setSelectedVersion2(e.target.value)}
              >
                {doc2.versions.map(version => (
                  <option key={version.id} value={version.id}>{version.version}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        
        <div className="panel">
          <div className="body">
            <div className="muted">Please select documents and versions to compare</div>
          </div>
        </div>
      </div>
    </div>
  )
}



// Enhanced Comparative Table with Selection Controls
function ComparativeTableWithSelection({ 
  oldVersion, 
  newVersion, 
  docs, 
  selectedDoc1, 
  selectedDoc2, 
  selectedVersion1, 
  selectedVersion2,
  onDocChange,
  onVersionChange,
  onClose,
  comments = [] 
}) {
  const [localComments, setLocalComments] = useState(comments)
  
  const addComment = (sectionKey, comment) => {
    const newComment = {
      id: uid(),
      sectionKey,
      comment,
      timestamp: now()
    }
    setLocalComments(prev => [...prev, newComment])
  }
  
  const updateComment = (sectionKey, comment) => {
    if (comment.trim()) {
      addComment(sectionKey, comment)
    }
  }
  
  const getSectionComment = (sectionKey) => {
    const comments = localComments.filter(c => c.sectionKey === sectionKey)
    return comments.length > 0 ? comments[comments.length - 1].comment : ''
  }
  
  const comparisonData = compareSections(oldVersion.sections, newVersion.sections)
  const doc1 = docs.find(d => d.id === selectedDoc1)
  const doc2 = docs.find(d => d.id === selectedDoc2)
  
  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'white',
      zIndex: 1000,
      overflow: 'auto',
      padding: '20px'
    }}>
      {/* Header with Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '20px'
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          color: '#333',
          margin: 0
        }}>
          Comparative Table (Old vs New Version)
        </h1>
        <button 
          onClick={onClose} 
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#dc3545',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            padding: '8px 16px'
          }}
        >
          Close
        </button>
      </div>
      
      {/* Selection Controls */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px', 
        marginBottom: '30px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#495057'
          }}>
            Old Version Document
          </label>
          <select 
            value={selectedDoc1} 
            onChange={e => onDocChange(1, e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              marginBottom: '8px'
            }}
          >
            {docs.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.title}</option>
            ))}
          </select>
          {doc1 && (
            <select 
              value={selectedVersion1} 
              onChange={e => onVersionChange(1, e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px'
              }}
            >
              {doc1.versions.map(version => (
                <option key={version.id} value={version.id}>{version.version}</option>
              ))}
            </select>
          )}
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#495057'
          }}>
            New Version Document
          </label>
          <select 
            value={selectedDoc2} 
            onChange={e => onDocChange(2, e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              marginBottom: '8px'
            }}
          >
            {docs.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.title}</option>
            ))}
          </select>
          {doc2 && (
            <select 
              value={selectedVersion2} 
              onChange={e => onVersionChange(2, e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px'
              }}
            >
              {doc2.versions.map(version => (
                <option key={version.id} value={version.id}>{version.version}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          fontSize: '14px',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ 
                border: '1px solid #dee2e6', 
                padding: '16px 12px', 
                textAlign: 'left',
                width: '25%',
                fontWeight: '600',
                color: '#495057',
                fontSize: '14px'
              }}>
                Section
              </th>
              <th style={{ 
                border: '1px solid #dee2e6', 
                padding: '16px 12px', 
                textAlign: 'left',
                width: '25%',
                fontWeight: '600',
                color: '#495057',
                fontSize: '14px',
                position: 'relative'
              }}>
                Old Version 
                <span style={{ 
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: '#6c757d'
                }}>🔒</span>
              </th>
              <th style={{ 
                border: '1px solid #dee2e6', 
                padding: '16px 12px', 
                textAlign: 'left',
                width: '25%',
                fontWeight: '600',
                color: '#495057',
                fontSize: '14px'
              }}>
                New Version
              </th>
              <th style={{ 
                border: '1px solid #dee2e6', 
                padding: '16px 12px', 
                textAlign: 'left',
                width: '25%',
                fontWeight: '600',
                color: '#495057',
                fontSize: '14px'
              }}>
                Comment
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row, index) => {
              return (
                <tr key={row.section} style={{ backgroundColor: 'white' }}>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '16px 12px',
                    verticalAlign: 'top',
                    fontWeight: '500',
                    color: '#212529'
                  }}>
                    {row.section}
                  </td>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '16px 12px',
                    verticalAlign: 'top',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: '#495057'
                    }}>
                      {row.before ? (
                        <div>{row.before.replace(/<[^>]*>?/gm, '').substring(0, 100) + (row.before.length > 100 ? '...' : '')}</div>
                      ) : (
                        <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No content</span>
                      )}
                    </div>
                    {row.before && (
                      <span style={{ 
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        fontSize: '12px',
                        color: '#6c757d'
                      }}>🔒</span>
                    )}
                  </td>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '16px 12px',
                    verticalAlign: 'top'
                  }}>
                    <div style={{ 
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: '#495057'
                    }}>
                      {row.after ? (
                        <div>{row.after.replace(/<[^>]*>?/gm, '').substring(0, 100) + (row.after.length > 100 ? '...' : '')}</div>
                      ) : (
                        <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No content</span>
                      )}
                    </div>
                  </td>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '16px 12px',
                    verticalAlign: 'top'
                  }}>
                    <textarea
                      placeholder="Add comment..."
                      defaultValue={getSectionComment(row.section)}
                      onBlur={(e) => updateComment(row.section, e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        backgroundColor: '#ffffff',
                        color: '#495057'
                      }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
function download(filename, text){
  const a = document.createElement('a')
  const file = new Blob([text], { type: 'application/json' })
  a.href = URL.createObjectURL(file)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function App(){
  const [uploadError, setUploadError] = useState('');
  // General Word document upload handler for top of table
  async function handleGeneralWordUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const mammoth = await import('mammoth');
    const reader = new FileReader();
    reader.onload = async function(evt) {
      const arrayBuffer = evt.target.result;
      const result = await mammoth.convertToHtml({arrayBuffer});
      // Create a new document with all content in one section
      const newDoc = {
        id: uid(), code: '', title: 'Imported Word Document',
        type: 'Policy', department: '', tags: [], status: 'Draft',
        effectiveDate: '', createdAt: now(), updatedAt: now(),
        versions: [{
          id: uid(), version: 'v1.0', createdAt: now(),
          sections: [{ key: 'Imported Content', text: result.value }]
        }],
        comments: []
      };
      setDocs(ds => [newDoc, ...ds]);
      setSelected(newDoc);
      addAudit('import_word', newDoc.id, { filename: file.name });
    };
    reader.readAsArrayBuffer(file);
  }
  // General Word document upload handler
  async function handleGeneralWordUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const mammoth = await import('mammoth');
    const reader = new FileReader();
    reader.onload = async function(evt) {
      const arrayBuffer = evt.target.result;
      const result = await mammoth.convertToHtml({arrayBuffer});
      // Create a new document with all content in one section
      const newDoc = {
        id: uid(), code: '', title: 'Imported Word Document',
        type: 'Policy', department: '', tags: [], status: 'Draft',
        effectiveDate: '', createdAt: now(), updatedAt: now(),
        versions: [{
          id: uid(), version: 'v1.0', createdAt: now(),
          sections: [{ key: 'Imported Content', text: result.value }]
        }],
        comments: []
      };
      setDocs(ds => [newDoc, ...ds]);
      setSelected(newDoc);
      addAudit('import_word', newDoc.id, { filename: file.name });
    };
    reader.readAsArrayBuffer(file);
  }
  const [docs, setDocs] = useState([])
  const [audit, setAudit] = useState([])
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [deptFilter, setDeptFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [showCompare, setShowCompare] = useState(false)
  const [compareTargetId, setCompareTargetId] = useState(null)
  const [showComparativeTable, setShowComparativeTable] = useState(false)
  const [showChapterManager, setShowChapterManager] = useState(false)
  const [selectedDocForChapter, setSelectedDocForChapter] = useState(null)

  useEffect(()=>{
    const { docs, audit } = load()
    setDocs(docs); setAudit(audit)
  },[])
  useEffect(()=> save(docs, audit), [docs, audit])

  const filtered = useMemo(()=>{
    const text = q.toLowerCase()
    return docs.filter(d => {
      const matchesText = !text || d.title.toLowerCase().includes(text)
        || (d.code||'').toLowerCase().includes(text)
        || (d.department||'').toLowerCase().includes(text)
        || (d.tags||[]).some(t=> t.toLowerCase().includes(text))
      const matchesType = typeFilter==='All' || d.type===typeFilter
      const matchesStatus = statusFilter==='All' || d.status===statusFilter
      const matchesDept = !deptFilter || (d.department||'').toLowerCase().includes(deptFilter.toLowerCase())
      return matchesText && matchesType && matchesStatus && matchesDept
    })
  }, [docs, q, typeFilter, statusFilter, deptFilter])

  function addAudit(action, docId, meta){
    setAudit(a => [{ id: uid(), ts: now(), action, docId, meta }, ...a].slice(0,400))
  }

  function addChapterToDocument(docId, chapterName) {
    if (!chapterName.trim()) return
    
    const doc = docs.find(d => d.id === docId)
    if (!doc) return

    const latestVersion = doc.versions[doc.versions.length - 1]
    const newSection = { key: chapterName.trim(), text: '' }
    const updatedSections = [...latestVersion.sections, newSection]
    
    const updatedVersions = doc.versions.slice(0, -1).concat({
      ...latestVersion,
      sections: updatedSections
    })
    
    const updatedDoc = {
      ...doc,
      versions: updatedVersions,
      updatedAt: now()
    }
    
    setDocs(docs.map(d => d.id === docId ? updatedDoc : d))
    addAudit('add_chapter', docId, { chapterName })
  }

  function deleteChapterFromDocument(docId, chapterKey) {
    const doc = docs.find(d => d.id === docId)
    if (!doc) return

    const latestVersion = doc.versions[doc.versions.length - 1]
    const updatedSections = latestVersion.sections.filter(s => s.key !== chapterKey)
    
    const updatedVersions = doc.versions.slice(0, -1).concat({
      ...latestVersion,
      sections: updatedSections
    })
    
    const updatedDoc = {
      ...doc,
      versions: updatedVersions,
      updatedAt: now()
    }
    
    setDocs(docs.map(d => d.id === docId ? updatedDoc : d))
    addAudit('delete_chapter', docId, { chapterKey })
  }

  function newDoc(presetType='Policy'){
    const baseSections = REQUIRED[presetType].map(k => ({ key: k, text: '' }))
    const v = { id: uid(), version: 'v1.0', createdAt: now(), sections: baseSections }
    const d = {
      id: uid(), code: '', title: presetType + ' — Untitled',
      type: presetType, department: '', tags: [], status: 'Draft',
      effectiveDate: '', createdAt: now(), updatedAt: now(),
      versions: [v], comments: []
    }
    setDocs(ds => [d, ...ds]); addAudit('create_doc', d.id, { type: presetType })
    setSelected(d)
  }

  function saveDoc(updated){
    updated.updatedAt = now()
    setDocs(ds => ds.map(d => d.id===updated.id ? updated : d))
    addAudit('save_doc', updated.id)
  }

  function deleteDoc(id){
    setDocs(ds => ds.filter(d => d.id!==id)); addAudit('delete_doc', id)
    if(selected?.id===id) setSelected(null)
  }

  function snapshot(doc, note){
    const current = doc.versions[doc.versions.length-1]
    const [maj, min] = (current.version.replace(/^v/, '')||'1.0').split('.').map(n => parseInt(n||'0',10))
    const nextV = 'v' + maj + '.' + ((min||0)+1)
    const clone = { id: uid(), version: nextV, note, createdAt: now(), sections: current.sections.map(s=>({...s})) }
    const updated = { ...doc, versions: [...doc.versions, clone], updatedAt: now() }
    saveDoc(updated); addAudit('snapshot_version', doc.id, { version: nextV })
    setSelected(updated)
  }

  function exportJSON(){
    download('lexuz-lite-export-' + new Date().toISOString().slice(0,19).replace(/[:T]/g,'-') + '.json',
      JSON.stringify({ exportedAt: now(), docs, audit }, null, 2))
  }
  function onImport(e){
    const file = e.target.files?.[0]
    if(!file) return
    const r = new FileReader()
    r.onload = () => {
      try{
        const data = JSON.parse(String(r.result))
        setDocs(data.docs||[]); setAudit(data.audit||[])
        addAudit('import', undefined, { count: (data.docs||[]).length })
      } catch(err){
        alert('Invalid JSON file')
      }
    }
    r.readAsText(file)
  }

  const targetDoc = useMemo(()=> docs.find(d=> d.id===compareTargetId) || null, [docs, compareTargetId])

  return (
    <div>
      <header>
        <div className="container hstack" style={{padding:'12px 0'}}>
          <h1 style={{fontSize:18, fontWeight:700}}>Internal Rules Library</h1>
          <span className="badge">Free • Local-first</span>
          <div className="spacer" />
          <label className="btn ghost" style={{cursor:'pointer'}}>
            Import JSON
            <input type="file" accept="application/json" onChange={onImport} style={{display:'none'}} />
          </label>
          <button className="btn" onClick={exportJSON}>Export JSON</button>
          <button className="btn ghost" onClick={()=>setShowComparativeTable(true)}>Comparative Table</button>
          <button className="btn ghost" onClick={()=>setShowChapterManager(true)}>Manage Chapters</button>
          <button className="btn primary" onClick={()=>newDoc('Policy')}>New</button>
        </div>
      </header>

      <main className="container" style={{padding:'16px 0 24px'}}>
        <div style={{marginBottom:16}}>
          <label className="btn primary" style={{cursor:'pointer'}}>
            Import Word Document
            <input type="file" accept=".docx" style={{display:'none'}} onChange={handleGeneralWordUpload} />
          </label>
          <span style={{marginLeft:8, color:'#888', fontSize:12}}>Upload a ready Word (.docx) file to create a new document.</span>
        </div>
        <div style={{marginBottom:16}}>
          <label className="btn primary" style={{cursor:'pointer'}}>
            Upload Word Document
            <input type="file" accept=".docx" style={{display:'none'}} onChange={async (e) => {
              setUploadError('');
              try {
                const file = e.target.files[0];
                if (!file) return;
                const mammoth = await import('mammoth');
                const reader = new FileReader();
                reader.onload = async function(evt) {
                  try {
                    const arrayBuffer = evt.target.result;
                    const result = await mammoth.convertToHtml({arrayBuffer});
                    // Create a new document with only one section
                    const newDoc = {
                      id: uid(), code: '', title: 'Imported Word Document',
                      type: 'Policy', department: '', tags: [], status: 'Draft',
                      effectiveDate: '', createdAt: now(), updatedAt: now(),
                      versions: [{
                        id: uid(), version: 'v1.0', createdAt: now(),
                        sections: [{ key: 'Imported Content', text: result.value }]
                      }],
                      comments: []
                    };
                    setDocs(ds => [newDoc, ...ds]);
                    setSelected(newDoc);
                    addAudit('import_word', newDoc.id, { filename: file.name });
                  } catch (err) {
                    setUploadError('Failed to process Word file. Please try a different file or format.');
                  }
                };
                reader.onerror = function() {
                  setUploadError('Failed to read the file.');
                };
                reader.readAsArrayBuffer(file);
              } catch (err) {
                setUploadError('Upload failed. Please check your file and try again.');
              }
            }} />
          </label>
          <span style={{marginLeft:8, color:'#888', fontSize:12}}>Upload a ready Word (.docx) file to create a new document. All content will be in one section and you do not need to fill all sections.</span>
          {uploadError && (
            <div style={{color:'red', marginTop:8}}>{uploadError}</div>
          )}
        </div>
        <div className="grid grid-4">
          {/* Filters */}
          <div className="panel">
            <div className="body">
              <div className="muted" style={{marginBottom:6}}>Search</div>
              <input className="input" placeholder="Search title, code, tag, department…" value={q} onChange={e=>setQ(e.target.value)} />
              <div className="muted" style={{marginTop:16, marginBottom:6}}>Type</div>
              <select className="input select" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
                <option>All</option>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <div className="muted" style={{marginTop:16, marginBottom:6}}>Status</div>
              <select className="input select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                <option>All</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <div className="muted" style={{marginTop:16, marginBottom:6}}>Department contains</div>
              <input className="input" placeholder="e.g., IT, Compliance" value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} />
              <div className="muted" style={{marginTop:16}}>Tips: Use Export JSON for backups. Click a row to open editor. Use Compare for section-by-section changes.</div>
            </div>
          </div>

          {/* Table */}
          <div className="panel" style={{gridColumn:'span 3'}}>
            <div className="body" style={{padding:0}}>
              <table>
                <thead>
                  <tr>
                    <th style={{width:'40%'}}>Title</th>
                    <th>Type</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th style={{width:120, textAlign:'right'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} style={{cursor:'pointer'}}>
                      <td onClick={()=>setSelected(d)}>
                        <div style={{fontWeight:600}}>{d.title}</div>
                        <div className="muted">{d.code || '—'} • Created {new Date(d.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td>{d.type}</td>
                      <td>{d.department || '—'}</td>
                      <td><span className={'status ' + (d.status==='Active'?'active':'')}>{d.status}</span></td>
                      <td className="muted">{new Date(d.updatedAt).toLocaleDateString()}</td>
                      <td style={{textAlign:'right'}}>
                        <div className="toolbar">
                          <button className="btn ghost" onClick={()=>{setSelected(d)}}>Open</button>
                          <button className="btn ghost" onClick={()=>{setSelected(d)}}>Edit</button>
                          <button className="btn ghost" onClick={()=> { setSelectedDocForChapter(d); setShowChapterManager(true) }}>Add Chapter</button>
                          <button className="btn ghost" onClick={()=>{ setSelected(d); setShowCompare(true); setCompareTargetId(null) }}>Compare</button>
                          <button className="btn danger" onClick={()=>deleteDoc(d.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length===0 && (
                    <tr><td colSpan="6"><div className="empty">No documents yet. Click <b>New</b> to create your first item.</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity */}
        <div style={{marginTop:24}}>
          <div className="panel">
            <div className="body">
              <div className="hstack" style={{marginBottom:8}}><b>Recent activity</b></div>
              <div style={{display:'grid', gap:6}}>
                {audit.slice(0,12).map(e => (
                  <div key={e.id} className="hstack" style={{justifyContent:'space-between'}}>
                    <span>{e.action}</span>
                    <span className="muted">{new Date(e.ts).toLocaleString()}</span>
                  </div>
                ))}
                {audit.length===0 && <div className="muted">No activity yet</div>}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Editor */}
      {selected && (
        <Editor
          key={selected.id}
          doc={selected}
          onChange={(d)=>{ saveDoc(d); setSelected(d) }}
          onSnapshot={(note)=>snapshot(selected, note)}
          onClose={()=>setSelected(null)}
          onCompare={()=>{ setShowCompare(true) }}
        />
      )}

      {/* Compare */}
      {(selected && showCompare) && (
        <ComparePanel
          docs={docs}
          base={selected}
          targetId={compareTargetId}
          onClose={()=>setShowCompare(false)}
          onSelectTarget={setCompareTargetId}
        />
      )}

      {/* Standalone Comparative Table */}
      {showComparativeTable && (
        <ComparativeTablePanel
          docs={docs}
          onClose={()=>setShowComparativeTable(false)}
        />
      )}

      {/* Chapter Manager */}
      {showChapterManager && (
        <ChapterManagerPanel
          docs={docs}
          onAddChapter={addChapterToDocument}
          onDeleteChapter={deleteChapterFromDocument}
          onClose={()=>setShowChapterManager(false)}
        />
      )}

      {/* Chapter Manager */}
      {showChapterManager && (
        <ChapterManagerPanel
          docs={docs}
          onAddChapter={addChapterToDocument}
          onDeleteChapter={deleteChapterFromDocument}
          onClose={()=>{setShowChapterManager(false); setSelectedDocForChapter(null)}}
          preSelectedDoc={selectedDocForChapter}
        />
      )}
    </div>
  )
}

function Editor({ doc, onChange, onSnapshot, onClose, onCompare }){
  const [d, setD] = useState(doc)
  const [editingTitle, setEditingTitle] = useState(null)
  const [tempTitle, setTempTitle] = useState('')
  
  useEffect(()=> setD(doc), [doc.id])

  function update(key, value){
    const next = { ...d, [key]: value }
    setD(next)
  }
  function updateSection(key, text){
    const latest = d.versions[d.versions.length-1]
    const sections = latest.sections.map(s => s.key===key ? { ...s, text } : s)
    const versions = d.versions.slice(0,-1).concat({ ...latest, sections })
    update('versions', versions)
  }
  function updateSectionTitle(oldKey, newKey){
    if (!newKey.trim() || oldKey === newKey.trim()) return
    
    const latest = d.versions[d.versions.length-1]
    const sections = latest.sections.map(s => s.key===oldKey ? { ...s, key: newKey.trim() } : s)
    const versions = d.versions.slice(0,-1).concat({ ...latest, sections })
    update('versions', versions)
  }
  function deleteSection(key){
    if (!confirm(`Are you sure you want to delete the section "${key}"?`)) return
    
    const latest = d.versions[d.versions.length-1]
    const sections = latest.sections.filter(s => s.key !== key)
    const versions = d.versions.slice(0,-1).concat({ ...latest, sections })
    update('versions', versions)
  }
  function startEditingTitle(sectionKey){
    setEditingTitle(sectionKey)
    setTempTitle(sectionKey)
  }
  function saveTitle(oldKey){
    if (tempTitle.trim() && tempTitle.trim() !== oldKey) {
      updateSectionTitle(oldKey, tempTitle.trim())
    }
    setEditingTitle(null)
    setTempTitle('')
  }
  function cancelEditingTitle(){
    setEditingTitle(null)
    setTempTitle('')
  }
  function generateSectionNumber(index) {
    const major = 1; // Can be made dynamic if you want multiple chapters
    const minor = index + 1;
    return `${major}.${minor}.`;
  }
  
  function shouldExcludeSection(sectionKey) {
    const excludedSections = [
      'I. ABBREVIATIONS',
      'ABBREVIATIONS',
      'II. DOCUMENT IDENTIFICATION',
      'DOCUMENT IDENTIFICATION',
      'III. DEFINITION OF BUSINESS ACTIVITY',
      'DEFINITION OF BUSINESS ACTIVITY',
      'IV. ASSOCIATED INTERNAL RULES AND EXTERNAL REGULATIONS',
      'ASSOCIATED INTERNAL RULES AND EXTERNAL REGULATIONS',
      'V. REVISION HISTORY OF DOCUMENT VERSION',
      'REVISION HISTORY OF DOCUMENT VERSION',
      'Table of Content',
      'TABLE OF CONTENT',
      'Table of Contents',
      'TABLE OF CONTENTS'
    ];
    
    const key = sectionKey.toUpperCase();
    return excludedSections.some(excluded => 
      key.includes(excluded.toUpperCase()) || 
      key.startsWith('I.') || 
      key.startsWith('II.') ||
      key.startsWith('III.') ||
      key.startsWith('IV.') ||
      key.startsWith('V.') ||
      key.includes('ABBREVIATION') ||
      key.includes('TABLE OF CONTENT') ||
      key.includes('DOCUMENT IDENTIFICATION') ||
      key.includes('DEFINITION OF BUSINESS ACTIVITY') ||
      key.includes('ASSOCIATED INTERNAL RULES') ||
      key.includes('REVISION HISTORY')
    );
  }
  
  function insertNumberingIntoSection(sectionKey, index) {
    const latest = d.versions[d.versions.length-1];
    
    // Count how many articles already exist across ALL sections
    let articleCount = 0;
    latest.sections.forEach(section => {
      const text = section.text || '';
      const numberMatches = text.match(/<strong[^>]*>1\.\d+\.<\/strong>/g) || [];
      articleCount += numberMatches.length;
    });
    
    const nextNumber = `1.${articleCount + 1}.`;
    const numberingHtml = `<p><strong style="color: #007bff;">${nextNumber}</strong> </p>`;
    
    const sections = latest.sections.map(s => {
      if (s.key === sectionKey) {
        // Always append the new numbering to the existing content
        const currentText = s.text || '';
        const newText = currentText + numberingHtml;
        return { ...s, text: newText };
      }
      return s;
    });
    const versions = d.versions.slice(0,-1).concat({ ...latest, sections });
    update('versions', versions);
  }
  
  function addArticle(afterIndex){
    const latest = d.versions[d.versions.length-1]
    const existingSections = latest.sections || []
    
    // Count total articles across all sections
    let totalArticles = 0;
    existingSections.forEach(section => {
      const text = section.text || '';
      const numberMatches = text.match(/<strong[^>]*>1\.\d+\.<\/strong>/g) || [];
      totalArticles += numberMatches.length;
    });
    
    const nextNumber = `1.${totalArticles + 1}.`;
    const newSection = { key: 'Article', text: `<p><strong style="color: #007bff;">${nextNumber}</strong> </p>` }
    const sections = [...existingSections]
    sections.splice(afterIndex + 1, 0, newSection)
    const versions = d.versions.slice(0,-1).concat({ ...latest, sections })
    update('versions', versions)
  }
  function requiredMissing(){
    const latest = d.versions[d.versions.length-1]
    const req = new Set(REQUIRED[d.type])
    const present = new Set(latest.sections.map(s=>s.key))
    return Array.from(req).filter(k=>!present.has(k))
  }
  function addMissing(){
    const latest = d.versions[d.versions.length-1]
    const req = REQUIRED[d.type]
    const present = new Set(latest.sections.map(s=>s.key))
    const toAdd = req.filter(k=>!present.has(k)).map(k=>({ key:k, text:'' }))
    const sections = [...latest.sections, ...toAdd]
    const versions = d.versions.slice(0,-1).concat({ ...latest, sections })
    update('versions', versions)
  }
  function save(){
    const miss = requiredMissing()
    if(miss.length>0){
      if(!confirm('Missing required sections:\n- ' + miss.join('\n- ') + '\n\nAdd them now?')) return
      addMissing()
    }
    // Automatically create a new version (snapshot) on every save
    const current = d.versions[d.versions.length-1]
    const [maj, min] = (current.version.replace(/^v/, '')||'1.0').split('.').map(n => parseInt(n||'0',10))
    const nextV = 'v' + maj + '.' + ((min||0)+1)
    const clone = { id: uid(), version: nextV, note: '', createdAt: now(), sections: current.sections.map(s=>({...s})) }
    const updated = { ...d, versions: [...d.versions, clone], updatedAt: now() }
    onChange(updated)
  }
  const latest = d.versions[d.versions.length-1]

  return (
    <div className="panel" style={{position:'fixed', right:8, bottom:8, top:8, width:1100, maxWidth:'99vw', overflow:'auto', zIndex:1000}}>
      <div className="body">
        <div className="hstack" style={{justifyContent:'space-between', marginBottom:8}}>
          <b>Edit: {d.title}</b>
          <div className="hstack" style={{gap:8}}>
            <button className="btn" onClick={()=>onSnapshot(prompt('Version note (optional)')||undefined)}>Snapshot</button>
            <button className="btn" onClick={save}>Save</button>
            <button className="btn ghost" onClick={onCompare}>Compare</button>
            <button className="btn ghost" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
          <input className="input" placeholder="Title" value={d.title} onChange={e=>update('title', e.target.value)} />
          <input className="input" placeholder="Code (e.g., ACT-PROC-06)" value={d.code||''} onChange={e=>update('code', e.target.value)} />
          <select className="input select" value={d.type} onChange={e=>update('type', e.target.value)}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <input className="input" placeholder="Department (e.g., IT Security)" value={d.department||''} onChange={e=>update('department', e.target.value)} />
          <select className="input select" value={d.status} onChange={e=>update('status', e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <input className="input" type="date" value={d.effectiveDate||''} onChange={e=>update('effectiveDate', e.target.value)} />
        </div>

        <div style={{marginTop:12}}>
          <div className="muted" style={{marginBottom:6}}>Tags</div>
          <TagEditor value={d.tags||[]} onChange={(tags)=>update('tags', tags)} />
        </div>

        <div style={{marginTop:12}} className="muted">Complete the required sections. Use <b>Snapshot</b> before big edits.</div>
        
        {/* Add New Chapter Button */}
        <div style={{marginTop:16, padding:12, backgroundColor:'#f8f9fa', borderRadius:6}}>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <input
              type="text"
              placeholder="Enter new chapter name (e.g., 'Chapter XV', '15. New Section')"
              style={{
                flex:1,
                padding:'8px 12px',
                border:'1px solid #ced4da',
                borderRadius:'4px',
                fontSize:'14px'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const latest = d.versions[d.versions.length-1]
                  const newSection = { key: e.target.value.trim(), text: '' }
                  const sections = [...latest.sections, newSection]
                  const versions = d.versions.slice(0,-1).concat({ ...latest, sections })
                  update('versions', versions)
                  e.target.value = ''
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.parentElement.querySelector('input')
                if (input.value.trim()) {
                  const latest = d.versions[d.versions.length-1]
                  const newSection = { key: input.value.trim(), text: '' }
                  const sections = [...latest.sections, newSection]
                  const versions = d.versions.slice(0,-1).concat({ ...latest, sections })
                  update('versions', versions)
                  input.value = ''
                }
              }}
              style={{
                padding:'8px 16px',
                backgroundColor:'#28a745',
                color:'white',
                border:'none',
                borderRadius:'4px',
                fontSize:'14px',
                fontWeight:'500',
                cursor:'pointer'
              }}
            >
              Add Chapter
            </button>
          </div>
        </div>
        
        <div style={{display:'grid', gap:12, marginTop:8}}>
          {latest.sections.map((section, index) => {
            const isRequired = REQUIRED[d.type].includes(section.key);
            return (
              <div key={`${section.key}-${index}`}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                  <div style={{display:'flex', alignItems:'center', flex:1}}>
                    {editingTitle === section.key ? (
                      <div style={{display:'flex', alignItems:'center', gap:8, flex:1}}>
                        <input
                          type="text"
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') saveTitle(section.key)
                            if (e.key === 'Escape') cancelEditingTitle()
                          }}
                          onBlur={() => saveTitle(section.key)}
                          autoFocus
                          style={{
                            fontFamily: 'Arial, sans-serif',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#495057',
                            border: '1px solid #007bff',
                            borderRadius: '3px',
                            padding: '4px 8px',
                            flex: 1,
                            minWidth: '200px'
                          }}
                        />
                        <button
                          onClick={() => saveTitle(section.key)}
                          style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditingTitle}
                          style={{
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div 
                        style={{
                          fontFamily: 'Arial, sans-serif',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#495057',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          border: '1px solid transparent',
                          transition: 'all 0.2s ease',
                          flex: 1
                        }}
                        onClick={() => startEditingTitle(section.key)}
                        title="Click to edit section title"
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#f8f9fa'
                          e.target.style.border = '1px solid #dee2e6'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent'
                          e.target.style.border = '1px solid transparent'
                        }}
                      >
                        {section.key}
                        {isRequired && <span style={{color:'#dc3545', marginLeft:4}}>*</span>}
                        <span style={{
                          marginLeft: '8px', 
                          fontSize: '11px', 
                          color: '#6c757d',
                          fontWeight: 'normal'
                        }}>
                          ✏️
                        </span>
                      </div>
                    )}
                  </div>
                  {editingTitle !== section.key && (
                    <button
                      onClick={() => {
                        if (isRequired) {
                          if (!confirm(`"${section.key}" is a required section. Deleting it may affect document compliance. Are you sure you want to delete it?`)) {
                            return;
                          }
                        }
                        deleteSection(section.key);
                      }}
                      title={`Delete section: ${section.key}${isRequired ? ' (Required)' : ''}`}
                      style={{
                        backgroundColor: 'transparent',
                        border: `1px solid ${isRequired ? '#ffc107' : '#dc3545'}`,
                        color: isRequired ? '#856404' : '#dc3545',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        opacity: isRequired ? 0.8 : 1,
                        marginLeft: '8px'
                      }}
                    >
                      {isRequired ? 'Delete*' : 'Delete'}
                    </button>
                  )}
                </div>
                  <CKEditor
                    editor={ClassicEditor}
                    data={section.text || ''}
                    onChange={(event, editor) => {
                      const data = editor.getData();
                      updateSection(section.key, data);
                    }}
                    config={{
                      toolbar: [
                        'heading', '|', 'bold', 'italic', 'underline', 'strikethrough', 'link', 'bulletedList', 'numberedList', 'blockQuote',
                        '|', 'insertTable', 'imageUpload', 'undo', 'redo', 'alignment', 'fontColor', 'fontBackgroundColor', 'fontSize', 'fontFamily',
                        'outdent', 'indent', 'code', 'codeBlock', 'removeFormat'
                      ],
                      heading: {
                        options: [
                          { model: 'paragraph', title: 'Section', class: 'ck-heading_paragraph' },
                          { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                          { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                          { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
                          { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' }
                        ]
                      },
                      table: {
                        contentToolbar: [ 'tableColumn', 'tableRow', 'mergeTableCells' ]
                      }
                    }}
                  />
                  <div style={{fontSize:12, color:'#888', marginTop:4, display:'flex', justifyContent:'space-between'}}>
                    <span><b>Tip:</b> Use the toolbar above for Word-like formatting and table creation. Paste from Word for advanced tables.</span>
                    <span>{(section.text||'').replace(/<[^>]*>?/gm, '').length} characters</span>
                  </div>
                  
                  {/* Add numbering and article buttons after each chapter, excluding ABBREVIATIONS to Table of Content */}
                  {!shouldExcludeSection(section.key) && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e9ecef', textAlign: 'center' }}>
                      <button 
                        onClick={() => insertNumberingIntoSection(section.key, index)}
                        style={{
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          marginRight: '8px'
                        }}
                      >
                        📝 Add {(() => {
                          // Calculate next article number across all sections
                          const latest = d.versions[d.versions.length-1];
                          let totalArticles = 0;
                          latest.sections.forEach(s => {
                            const text = s.text || '';
                            const matches = text.match(/<strong[^>]*>1\.\d+\.<\/strong>/g) || [];
                            totalArticles += matches.length;
                          });
                          return `1.${totalArticles + 1}.`;
                        })()}
                      </button>
                      <button 
                        onClick={() => addArticle(index)}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        ➕ Add Article
                      </button>
                      <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '4px' }}>
                        New article will be numbered automatically (1.1, 1.2, 1.3, etc.)
                      </div>
                    </div>
                  )}
              </div>
            );
// ...existing code...
          })}
        </div>
      </div>
      <div className="sticky-footer">
        <button className="btn" onClick={()=>onSnapshot(prompt('Version note (optional)')||undefined)}>Snapshot</button>
        <button className="btn" onClick={save}>Save</button>
        <button className="btn ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function TagEditor({ value, onChange }){
  const [val, setVal] = useState('')
  const tags = value || []
  function add(){
    const t = val.trim(); if(!t) return
    const set = new Set([...(tags||[]), t])
    onChange(Array.from(set)); setVal('')
  }
  function remove(t){
    onChange((tags||[]).filter(x => x!==t))
  }
  return (
    <div className="hstack" style={{flexWrap:'wrap', gap:8}}>
      {(tags||[]).map(t => <span key={t} className="pill" onClick={()=>remove(t)} style={{cursor:'pointer'}}>{t} ✕</span>)}
      <input className="input" style={{width:200}} placeholder="Add tag" value={val} onChange={e=>setVal(e.target.value)} />
      <button className="btn" onClick={add}>Add</button>
    </div>
  )
}

function DiffBlock({ before, after }){
  const parts = Diff.diffWords(before||'', after||'')
  return (
    <div style={{lineHeight:'1.6'}}>
      {parts.map((p,i) => (
        <span key={i} className={p.added?'diff-add': p.removed?'diff-remove':''} style={p.added ? {fontWeight:'bold'} : {}}>{p.value}</span>
      ))}
    </div>
  )
}

function ComparePanel({ docs, base, targetId, onSelectTarget, onClose }){
  const [mode, setMode] = useState('versions')
  const [viewMode, setViewMode] = useState('diff') // 'diff' or 'comparative'
  const [leftId, setLeftId] = useState(base.versions[0].id)
  const [rightId, setRightId] = useState(base.versions[base.versions.length-1].id)
  const target = docs.find(d=> d.id===targetId) || base

  const left = (mode==='versions' ? base : base).versions.find(v=>v.id===leftId) || base.versions[0]
  const right = (mode==='versions' ? base : target).versions.find(v=>v.id===rightId) || target.versions[target.versions.length-1]

  const table = compareSections(left.sections, right.sections)

  return (
    <div className="panel" style={{position:'fixed', left:8, bottom:8, top:8, width:1100, maxWidth:'99vw', overflow:'auto', zIndex:1000}}>
      <div className="body">
        <div className="hstack" style={{justifyContent:'space-between', marginBottom:8}}>
          <b>Compare</b>
          <div className="hstack" style={{gap:8}}>
            <button className="btn ghost" onClick={()=>setMode('versions')}>Within one doc</button>
            <button className="btn ghost" onClick={()=>setMode('documents')}>Across documents</button>
            <button 
              className={`btn ${viewMode === 'diff' ? '' : 'ghost'}`} 
              onClick={()=>setViewMode('diff')}
            >
              Diff View
            </button>
            <button 
              className={`btn ${viewMode === 'comparative' ? '' : 'ghost'}`} 
              onClick={()=>setViewMode('comparative')}
            >
              Comparative Table
            </button>
            <button className="btn ghost" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="hstack" style={{gap:8, marginBottom:12}}>
          <select className="input select" value={leftId} onChange={e=>setLeftId(e.target.value)}>
            {base.versions.map(v => <option key={v.id} value={v.id}>Base {v.version}</option>)}
          </select>
          <span>⇄</span>
          <select className="input select" value={rightId} onChange={e=>setRightId(e.target.value)}>
            {(mode==='versions' ? base.versions : target.versions).map(v => <option key={v.id} value={v.id}>Target {v.version}</option>)}
          </select>
        </div>

        {mode==='documents' && (
          <div className="hstack" style={{gap:8, marginBottom:12}}>
            <span className="badge">Base: {base.title}</span>
            <select className="input select" value={targetId||base.id} onChange={e=>onSelectTarget(e.target.value)}>
              {[base, ...docs.filter(d=>d.id!==base.id)].map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
        )}

        {viewMode === 'diff' && (
          <div className="panel" style={{marginTop:8}}>
            <div className="body">
              <b>Compared table (by section)</b>
              <table style={{marginTop:8, fontSize:'1.1em', width:'100%'}}>
                <thead>
                  <tr><th>Section</th><th>Status</th><th>Diff</th></tr>
                </thead>
                <tbody>
                  {table.map(row => (
                    <tr key={row.section} style={row.status==='changed' ? {background:'#fffbe6'} : {}}>
                      <td style={{whiteSpace:'nowrap'}}>
                        <span style={{color: '#007bff', fontWeight: '600', marginRight: '8px'}}>
                          {`1.${index + 1}.`}
                        </span>
                        {row.section}
                      </td>
                      <td>
                        <span className="status" style={row.status==='changed' ? {color:'#d48806', fontWeight:'bold'} : {}}>
                          {row.status}
                        </span>
                      </td>
                      <td><DiffBlock before={row.before} after={row.after} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'comparative' && (
          <ComparativeTable 
            oldVersion={left} 
            newVersion={right}
            comments={[]} // You can extend this to persist comments
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}
