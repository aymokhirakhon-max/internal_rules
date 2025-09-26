// ...existing code...
import React, { useEffect, useMemo, useState } from 'react'
// Removed ReactQuill import
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import * as Diff from 'diff'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'

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
// Enhanced DiffBlock for Comparative Table
function ComparativeDiffBlock({ before, after, showFull = false }) {
  // Clean text by removing HTML tags, entities, and normalizing whitespace - IGNORE ALL SPACE DIFFERENCES
  const cleanText = (text) => {
    if (!text) return '';
    return text
      // Remove HTML tags completely
      .replace(/<[^>]*>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&hellip;/g, '...')
      .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Remove any other HTML entities
      // AGGRESSIVE SPACE NORMALIZATION - ignore all spacing differences
      .replace(/[\s\r\n\t_-]+/g, ' ') // Replace all whitespace, underscores, dashes with single space
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/\s*([.,;:!?])\s*/g, '$1') // Remove spaces around punctuation completely
      .replace(/\s/g, '') // REMOVE ALL REMAINING SPACES for comparison
      .toLowerCase() // Case insensitive comparison
      .trim();
  };

  const beforeText = cleanText(before);
  const afterText = cleanText(after);
  
  const parts = Diff.diffWords(beforeText, afterText);
  const hasChanges = parts.some(p => p.added || p.removed);
  
  // Show "No content" only if both are completely empty
  if (!beforeText && !afterText) {
    return <span style={{color: '#6c757d', fontStyle: 'italic'}}>No content</span>;
  }
  
  // If no changes detected, show current content with indicator
  if (!hasChanges) {
    const displayText = afterText || beforeText;
    const truncatedText = showFull ? displayText : (displayText.substring(0, 150) + (displayText.length > 150 ? '...' : ''));
    return (
      <div style={{lineHeight: '1.5'}}>
        <span style={{
          color: '#495057',
          backgroundColor: '#f8f9fa',
          padding: '2px 4px',
          borderRadius: '3px',
          fontSize: '11px',
          marginRight: '6px'
        }}>
          UNCHANGED
        </span>
        <span style={{color: '#495057'}}>{truncatedText}</span>
      </div>
    );
  }
  
  // Show diff with changes
  return (
    <div style={{lineHeight: '1.5'}}>
      <div style={{marginBottom: '4px'}}>
        <span style={{
          color: '#28a745',
          backgroundColor: '#d1e7dd',
          padding: '1px 4px',
          borderRadius: '3px',
          fontSize: '10px',
          marginRight: '4px'
        }}>
          CHANGES DETECTED
        </span>
      </div>
      {parts.map((p, i) => {
        if (p.added) {
          return (
            <span key={i} style={{
              backgroundColor: '#d1e7dd',
              color: '#0a3622',
              fontWeight: 'bold',
              padding: '2px 4px',
              borderRadius: '3px',
              margin: '0 1px',
              display: 'inline-block'
            }}>
              ✅ {p.value}
            </span>
          );
        } else if (p.removed) {
          return (
            <span key={i} style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              fontWeight: 'bold',
              padding: '2px 4px',
              borderRadius: '3px',
              margin: '0 1px',
              textDecoration: 'line-through',
              display: 'inline-block'
            }}>
              ❌ {p.value}
            </span>
          );
        } else {
          const displayText = showFull ? p.value : (p.value.length > 100 ? p.value.substring(0, 100) + '...' : p.value);
          return <span key={i} style={{color: '#495057', wordBreak: 'break-word'}}>{displayText}</span>;
        }
      })}
    </div>
  );
}



function ComparativeTable({ oldVersion, newVersion, comments = [], onClose }) {
  const [localComments, setLocalComments] = useState(comments)
  const [showOnlyChanges, setShowOnlyChanges] = useState(true) // Hide unchanged by default
  
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
  
  const getRowStatus = (row) => {
    // Clean and normalize text for comparison
    const cleanText = (text) => {
      if (!text) return '';
      return text
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Decode HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&hellip;/g, '...')
        // Remove all types of whitespace and formatting
        .replace(/[\s\r\n\t_]+/g, ' ')  // Replace any whitespace, underscores with single space
        .replace(/\s*([.,;:!?])\s*/g, '$1 ')  // Normalize punctuation spacing
        .replace(/\s+/g, ' ')  // Collapse multiple spaces
        .trim()
        .toLowerCase();
    };
    
    const textBefore = cleanText(row.before);
    const textAfter = cleanText(row.after);
    
    // Basic comparison logic on cleaned text
    if (!textBefore && !textAfter) return 'unchanged';
    if (!textBefore && textAfter) return 'added';
    if (textBefore && !textAfter) return 'removed';
    if (textBefore !== textAfter) return 'changed';
    
    return 'unchanged';
  }
  
  const getStatusStyle = (status) => {
    switch(status) {
      case 'added': return {color: '#28a745', fontWeight: 'bold', backgroundColor: '#d1e7dd', padding: '2px 6px', borderRadius: '8px', fontSize: '11px'};
      case 'removed': return {color: '#dc3545', fontWeight: 'bold', backgroundColor: '#f8d7da', padding: '2px 6px', borderRadius: '8px', fontSize: '11px'};
      case 'changed': return {color: '#ffc107', fontWeight: 'bold', backgroundColor: '#fff3cd', padding: '2px 6px', borderRadius: '8px', fontSize: '11px'};
      default: return {color: '#6c757d', fontWeight: 'normal', fontSize: '11px'};
    }
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
  
  const allComparisonData = compareSections(oldVersion.sections, newVersion.sections)
  
  // Filter data based on user preference - SIMPLE FILTERING
  const comparisonData = showOnlyChanges 
    ? allComparisonData.filter(row => {
        const status = getRowStatus(row);
        // Just show sections that have changes
        return status !== 'unchanged';
      })
    : allComparisonData
  
  // Calculate summary statistics from all data
  const summary = allComparisonData.reduce((acc, row) => {
    const status = getRowStatus(row);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  // Calculate how many sections actually have changes
  const actualChanges = allComparisonData.filter(row => {
    const status = getRowStatus(row);
    return status !== 'unchanged';
  }).length;

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
          📊 Enhanced Comparative Table (Old vs New Version)
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
      
      {/* Summary */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{margin: '0 0 10px 0', fontSize: '16px', color: '#333'}}>📋 Changes Summary</h3>
        <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
          {summary.added > 0 && (
            <span style={{
              backgroundColor: '#d1e7dd',
              color: '#0a3622',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              ✅ {summary.added} Added
            </span>
          )}
          {summary.changed > 0 && (
            <span style={{
              backgroundColor: '#fff3cd',
              color: '#856404',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              📝 {summary.changed} Modified
            </span>
          )}
          {summary.removed > 0 && (
            <span style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              ❌ {summary.removed} Removed
            </span>
          )}
          {summary.unchanged > 0 && (
            <span style={{
              backgroundColor: '#e9ecef',
              color: '#6c757d',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '500'
            }}>
              ⚪ {summary.unchanged} Unchanged
            </span>
          )}
        </div>
        {Object.keys(summary).length === 0 && (
          <span style={{color: '#6c757d', fontStyle: 'italic'}}>No sections to compare</span>
        )}
      </div>
      
      {/* Filter Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '12px 16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #e9ecef'
      }}>
        <div>
          <h4 style={{margin: '0 0 4px 0', fontSize: '16px', color: '#333'}}>
            📋 Document Comparison
          </h4>
          <div style={{fontSize: '12px', color: '#666'}}>
            Comparing {allComparisonData.length} sections total
            {showOnlyChanges ? (
              comparisonData.length > 0 
                ? ` → Showing ${comparisonData.length} sections with actual word differences`
                : ` → No word differences detected between versions`
            ) : ` → Showing all sections`}
          </div>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <label style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '14px',
            color: '#495057',
            cursor: 'pointer'
          }}>
            <input 
              type="checkbox" 
              checked={showOnlyChanges}
              onChange={(e) => setShowOnlyChanges(e.target.checked)}
              style={{margin: 0}}
            />
            <span>🎯 Hide unchanged sections</span>
          </label>
          
          {showOnlyChanges && comparisonData.length === 0 && (
            <div style={{
              color: '#28a745',
              fontSize: '14px',
              fontWeight: '600',
              padding: '8px 12px',
              backgroundColor: '#d1e7dd',
              borderRadius: '6px',
              border: '1px solid #c3e6cb',
              textAlign: 'center'
            }}>
              ✅ No changes found between these versions!
              <div style={{fontSize: '12px', fontWeight: 'normal', marginTop: '4px'}}>
                The documents are identical
              </div>
            </div>
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
                New Version (Enhanced)
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
              const status = getRowStatus(row);
              return (
                <tr key={row.section} style={{ 
                  backgroundColor: status === 'changed' ? '#fffbe6' : 
                                status === 'added' ? '#e8f5e8' : 
                                status === 'removed' ? '#ffe8e8' : 'white'
                }}>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '16px 12px',
                    verticalAlign: 'top',
                    fontWeight: '500',
                    color: '#212529'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{row.section}</span>
                      <span style={getStatusStyle(status)}>
                        {status.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '16px 12px',
                    verticalAlign: 'top',
                    position: 'relative',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <div style={{ 
                      fontSize: '13px',
                      lineHeight: '1.5',
                      color: '#495057'
                    }}>
                      {row.before ? (
                        <div style={{
                          opacity: 0.8,
                          border: getRowStatus(row) !== 'unchanged' ? '2px solid #f8d7da' : 'none',
                          borderRadius: getRowStatus(row) !== 'unchanged' ? '4px' : '0',
                          padding: getRowStatus(row) !== 'unchanged' ? '8px' : '0',
                          backgroundColor: getRowStatus(row) !== 'unchanged' ? '#fff5f5' : 'transparent'
                        }}>
                          <div dangerouslySetInnerHTML={{ __html: row.before }} />
                          {getRowStatus(row) !== 'unchanged' && (
                            <div style={{
                              marginTop: '8px',
                              padding: '4px 8px',
                              backgroundColor: '#f8d7da',
                              border: '1px solid #f5c6cb',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#721c24',
                              fontWeight: '500'
                            }}>
                              🔴 This section was modified
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No content</span>
                      )}
                    </div>
                    <span style={{ 
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      fontSize: '10px',
                      color: '#6c757d',
                      backgroundColor: 'white',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      border: '1px solid #dee2e6'
                    }}>🔒 READ-ONLY</span>
                  </td>
                  <td style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '16px 12px',
                    verticalAlign: 'top'
                  }}>
                    <div style={{ 
                      fontSize: '13px',
                      lineHeight: '1.5'
                    }}>
                      {row.after ? (
                        <div style={{
                          border: getRowStatus(row) !== 'unchanged' ? '2px solid #d1e7dd' : 'none',
                          borderRadius: getRowStatus(row) !== 'unchanged' ? '4px' : '0',
                          padding: getRowStatus(row) !== 'unchanged' ? '8px' : '0',
                          backgroundColor: getRowStatus(row) !== 'unchanged' ? '#f0fff4' : 'transparent'
                        }}>
                          <div dangerouslySetInnerHTML={{ __html: row.after }} />
                          {getRowStatus(row) !== 'unchanged' && (
                            <div style={{
                              marginTop: '8px',
                              padding: '4px 8px',
                              backgroundColor: '#d1e7dd',
                              border: '1px solid #c3e6cb',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#155724',
                              fontWeight: '500'
                            }}>
                              🟢 This section has changes
                            </div>
                          )}
                        </div>
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
            {/* Show message when no rows match filter */}
            {comparisonData.length === 0 && showOnlyChanges && (
              <tr>
                <td colSpan="4" style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  backgroundColor: '#e8f5e8',
                  color: '#155724',
                  border: '2px dashed #c3e6cb'
                }}>
                  <div style={{fontSize: '24px', marginBottom: '12px'}}>
                    🎉 <strong>Perfect! No Changes Detected</strong>
                  </div>
                  <div style={{fontSize: '16px', marginBottom: '16px', color: '#6c757d'}}>
                    Both versions are identical - no edits were made.
                  </div>
                  <div style={{fontSize: '14px'}}>
                    This means your document hasn't been modified between these versions.
                    <br/>
                    <button 
                      onClick={() => setShowOnlyChanges(false)}
                      style={{
                        background: '#007bff',
                        border: 'none',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginTop: '12px'
                      }}
                    >
                      Show all sections anyway
                    </button>
                  </div>
                </td>
              </tr>
            )}
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

  // Test simple download function
  function testDownload() {
    console.log('Testing simple download...');
    console.log('User activation:', navigator.userActivation?.isActive);
    
    try {
      const testContent = "This is a test file content\nLine 2\nLine 3";
      const blob = new Blob([testContent], { type: 'text/plain' });
      console.log('Blob created:', blob.size, blob.type);
      
      // Check if saveAs is available
      console.log('saveAs function available:', typeof saveAs);
      
      // Try file-saver method
      console.log('Trying file-saver...');
      saveAs(blob, 'test-download.txt');
      console.log('file-saver download initiated successfully');
      
    } catch (error) {
      console.error('file-saver failed:', error);
      
      // Try native browser download as fallback
      try {
        console.log('Trying native download...');
        const url = URL.createObjectURL(blob);
        console.log('Object URL created:', url);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'test-download-native.txt';
        a.style.display = 'none';
        console.log('Download link created:', a.href, a.download);
        
        document.body.appendChild(a);
        a.click();
        console.log('Click triggered');
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log('Cleanup completed');
        }, 100);
        
      } catch (nativeError) {
        console.error('Native download also failed:', nativeError);
      }
    }
  }

  // Export Word Document function
  async function exportToWord(doc) {
    console.log('exportToWord called with doc:', doc);
    try {
      const latestVersion = doc.versions[doc.versions.length - 1];
      const sections = latestVersion.sections || [];
      console.log('Processing sections:', sections.length);

      // Create document title
      const titleParagraph = new Paragraph({
        text: doc.title || 'Untitled Document',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      });

      // Create document info
      const infoParagraphs = [
        new Paragraph({
          children: [
            new TextRun({ text: "Document Code: ", bold: true }),
            new TextRun({ text: doc.code || 'N/A' })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Type: ", bold: true }),
            new TextRun({ text: doc.type || 'N/A' })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Department: ", bold: true }),
            new TextRun({ text: doc.department || 'N/A' })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Status: ", bold: true }),
            new TextRun({ text: doc.status || 'Draft' })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Version: ", bold: true }),
            new TextRun({ text: latestVersion.version || 'v1.0' })
          ],
          spacing: { after: 400 }
        })
      ];

      // Create section paragraphs
      const sectionParagraphs = [];
      sections.forEach((section, index) => {
        // Section heading
        sectionParagraphs.push(
          new Paragraph({
            text: section.key || `Section ${index + 1}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        );

        // Section content - convert HTML to plain text and create paragraphs
        let content = section.text || '';
        
        if (!content.trim()) {
          sectionParagraphs.push(
            new Paragraph({
              text: 'No content',
              italics: true,
              spacing: { after: 400 }
            })
          );
        } else {
          // Better HTML processing - preserve line breaks and structure
          content = content
            .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to line breaks
            .replace(/<\/p>/gi, '\n\n')     // Convert </p> to double line breaks
            .replace(/<p[^>]*>/gi, '')      // Remove <p> tags
            .replace(/<[^>]*>/g, '')        // Remove all other HTML tags
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up excessive line breaks
            .trim();

          const contentLines = content.split('\n').filter(line => line.trim());
          
          contentLines.forEach((line, lineIndex) => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              // Check if line might be a heading (starts with number or is all caps)
              const isHeading = /^(\d+\.|\d+\)|\w+\.|[A-Z\s]{3,}:)/.test(trimmedLine) || 
                               (trimmedLine.length < 50 && trimmedLine === trimmedLine.toUpperCase());
              
              sectionParagraphs.push(
                new Paragraph({
                  text: trimmedLine,
                  spacing: { after: isHeading ? 200 : 120 },
                  ...(isHeading && { heading: HeadingLevel.HEADING_2 })
                })
              );
            } else {
              // Add empty line for spacing
              sectionParagraphs.push(
                new Paragraph({
                  text: '',
                  spacing: { after: 120 }
                })
              );
            }
          });
        }
      });

      // Create the Word document
      const wordDoc = new Document({
        sections: [{
          properties: {},
          children: [
            titleParagraph,
            ...infoParagraphs,
            ...sectionParagraphs
          ]
        }]
      });

      // Generate and save the document
      const buffer = await Packer.toBuffer(wordDoc);
      
      // Create a clean filename
      const cleanTitle = (doc.title || 'Document')
        .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 50); // Limit length
      
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const filename = `${cleanTitle}_${latestVersion.version || 'v1.0'}_${timestamp}.docx`;
      
      // Create blob with proper MIME type for Word documents
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      // Try file-saver first, fallback to native download
      try {
        console.log('Attempting download with file-saver...');
        saveAs(blob, filename);
        console.log('file-saver download initiated');
      } catch (fileSaverError) {
        console.error('file-saver failed, trying native download:', fileSaverError);
        
        // Fallback to native browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Native download initiated');
      }
      
      // Add audit log
      addAudit('export_word', doc.id, { filename });

      // Success notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed; 
          top: 20px; 
          right: 20px; 
          background: #d1e7dd; 
          color: #0a3622; 
          padding: 12px 16px; 
          border-radius: 8px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          max-width: 350px;
        ">
          ✅ <strong>Export Successful!</strong><br>
          <small>Downloaded: ${filename}</small>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.remove();
      }, 5000);

    } catch (error) {
      console.error('Export failed:', error);
      console.error('Error details:', error.message, error.stack);
      
      // Error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed; 
          top: 20px; 
          right: 20px; 
          background: #f8d7da; 
          color: #721c24; 
          padding: 12px 16px; 
          border-radius: 8px; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          max-width: 350px;
        ">
          ❌ <strong>Export Failed</strong><br>
          <small>Please try again or check the console for details.</small>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.remove();
      }, 5000);
    }
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
          <button className="btn ghost" onClick={testDownload}>Test Download</button>
          <button className="btn" onClick={(e) => {
            e.preventDefault();
            console.log('Header Export Word button clicked, selected:', selected);
            if (selected) {
              setTimeout(() => exportToWord(selected), 0);
            }
          }} disabled={!selected}>Export Word</button>
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
          <button 
            className="btn primary" 
            onClick={(e) => {
              e.preventDefault();
              console.log('Main Export Word button clicked, selected:', selected);
              if (selected) {
                setTimeout(() => exportToWord(selected), 0);
              }
            }} 
            disabled={!selected}
            style={{opacity: selected ? 1 : 0.6}}
          >
            📥 Export Word Document
          </button>
          <span style={{marginLeft:8, color:'#888', fontSize:12}}>
            {selected 
              ? `Export "${selected.title}" as a Word (.docx) document with all sections and formatting.`
              : 'Select a document to export as Word (.docx) file.'}
          </span>
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
                          <button className="btn ghost" onClick={()=>{ setSelected(d); setShowCompare(true); setCompareTargetId(null) }}>Compare</button>
                          <button className="btn ghost" onClick={()=>exportToWord(d)} title="Export as Word document">📥 Export</button>
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
  
  function getChapterNumber(sectionKey) {
    // Extract chapter number from section key (e.g., "2. Chapter II" -> 2, "3. Something" -> 3)
    const match = sectionKey.match(/^(\d+)\./)
    return match ? parseInt(match[1]) : 1 // Default to 1 if no number found
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
    const chapterNum = getChapterNumber(sectionKey);
    
    // Count how many articles already exist for this specific chapter number
    let articleCount = 0;
    latest.sections.forEach(section => {
      const text = section.text || '';
      const numberMatches = text.match(new RegExp(`<strong[^>]*>${chapterNum}\\.\\d+\\.<\/strong>`, 'g')) || [];
      articleCount += numberMatches.length;
    });
    
    const nextNumber = `${chapterNum}.${articleCount + 1}.`;
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
    const currentSection = existingSections[afterIndex]
    const chapterNum = getChapterNumber(currentSection.key)
    
    // Count total articles for this specific chapter number
    let totalArticles = 0;
    existingSections.forEach(section => {
      const text = section.text || '';
      const numberMatches = text.match(new RegExp(`<strong[^>]*>${chapterNum}\\.\\d+\\.<\/strong>`, 'g')) || [];
      totalArticles += numberMatches.length;
    });
    
    const nextNumber = `${chapterNum}.${totalArticles + 1}.`;
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
                          // Calculate next article number for this chapter
                          const latest = d.versions[d.versions.length-1];
                          const chapterNum = getChapterNumber(section.key);
                          let totalArticles = 0;
                          latest.sections.forEach(s => {
                            const text = s.text || '';
                            const matches = text.match(new RegExp(`<strong[^>]*>${chapterNum}\\.\\d+\\.<\/strong>`, 'g')) || [];
                            totalArticles += matches.length;
                          });
                          return `${chapterNum}.${totalArticles + 1}.`;
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
  // Clean HTML tags from both texts for comparison
  const beforeText = (before || '').replace(/<[^>]*>?/gm, '').trim()
  const afterText = (after || '').replace(/<[^>]*>?/gm, '').trim()
  
  const parts = Diff.diffWords(beforeText, afterText)
  const hasChanges = parts.some(p => p.added || p.removed)
  
  // If no content in either version
  if (!beforeText && !afterText) {
    return (
      <div style={{lineHeight:'1.6', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px'}}>
        <span style={{color: '#6c757d', fontStyle: 'italic'}}>No content in either version</span>
      </div>
    )
  }
  
  // If identical content
  if (!hasChanges) {
    return (
      <div style={{lineHeight:'1.6', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px'}}>
        <div style={{marginBottom: '4px', fontSize: '11px', color: '#28a745', fontWeight: 'bold'}}>
          ✓ IDENTICAL CONTENT
        </div>
        <div style={{color: '#495057', fontSize: '13px'}}>
          {beforeText.length > 100 ? beforeText.substring(0, 100) + '...' : beforeText}
        </div>
      </div>
    )
  }
  
  // Show detailed diff
  return (
    <div style={{lineHeight:'1.6', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px'}}>
      <div style={{marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', color: '#495057'}}>
        🔍 CHANGES DETECTED:
      </div>
      <div style={{fontSize: '13px'}}>
        {parts.map((p,i) => {
          if (p.added) {
            return (
              <span key={i} style={{
                backgroundColor: '#d1e7dd',
                color: '#0f5132',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '4px',
                margin: '0 2px',
                display: 'inline-block',
                border: '1px solid #badbcc'
              }}>
                ✅ {p.value}
              </span>
            )
          } else if (p.removed) {
            return (
              <span key={i} style={{
                backgroundColor: '#f8d7da',
                color: '#842029',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '4px',
                margin: '0 2px',
                textDecoration: 'line-through',
                display: 'inline-block',
                border: '1px solid #f5c2c7'
              }}>
                ❌ {p.value}
              </span>
            )
          } else {
            // Show unchanged text with limited length
            const displayText = p.value.length > 50 ? p.value.substring(0, 50) + '...' : p.value
            return <span key={i} style={{color: '#495057'}}>{displayText}</span>
          }
        })}
      </div>
    </div>
  )
}

function ComparePanel({ docs, base, targetId, onSelectTarget, onClose }){
  const [mode, setMode] = useState('versions')
  const [viewMode, setViewMode] = useState('diff') // 'diff' or 'comparative'
  const [showOnlyChanges, setShowOnlyChanges] = useState(false)
  
  // Initialize with more intuitive defaults
  // For imported documents, usually want to compare original import (first) vs latest edits (last)
  const [leftId, setLeftId] = useState(base.versions[0]?.id)  // Original/older version
  const [rightId, setRightId] = useState(base.versions[base.versions.length-1]?.id)  // Latest/newer version
  const target = docs.find(d=> d.id===targetId) || base

  // Get the actual version objects
  const left = (mode==='versions' ? base : base).versions.find(v=>v.id===leftId) || base.versions[0]
  const right = (mode==='versions' ? base : target).versions.find(v=>v.id===rightId) || target.versions[target.versions.length-1]

  // Compare: left (old) -> right (new) to show what was changed
  const allTableData = compareSections(left.sections, right.sections)
  const table = showOnlyChanges 
    ? allTableData.filter(row => row.status !== 'unchanged')
    : allTableData

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

        <div style={{marginBottom:12}}>
          <div className="hstack" style={{gap:12, alignItems: 'center'}}>
            <div style={{minWidth: '200px'}}>
              <label style={{fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px'}}>
                📜 FROM (Old Version):
              </label>
              <select className="input select" value={leftId} onChange={e=>setLeftId(e.target.value)}>
                {base.versions.map((v, idx) => (
                  <option key={v.id} value={v.id}>
                    {v.version} {idx === 0 ? '(Original)' : ''} {idx === base.versions.length-1 ? '(Latest)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{fontSize: '24px', color: '#007bff', margin: '16px 8px 0 8px'}}>→</div>
            
            <div style={{minWidth: '200px'}}>
              <label style={{fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px'}}>
                📝 TO (New Version):
              </label>
              <select className="input select" value={rightId} onChange={e=>setRightId(e.target.value)}>
                {(mode==='versions' ? base.versions : target.versions).map((v, idx) => {
                  const versions = mode==='versions' ? base.versions : target.versions;
                  return (
                    <option key={v.id} value={v.id}>
                      {v.version} {idx === 0 ? '(Original)' : ''} {idx === versions.length-1 ? '(Latest)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          
          <div style={{marginTop: '8px', fontSize: '12px', color: '#666', fontStyle: 'italic'}}>
            💡 Tip: Select older version as "FROM" and newer version as "TO" to see what was added/changed
          </div>
          
          {/* Comparison Summary */}
          <div style={{
            marginTop: '12px', 
            padding: '12px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{fontSize: '13px', fontWeight: '500', marginBottom: '4px'}}>
              📊 Comparing: <strong>{left.version}</strong> → <strong>{right.version}</strong>
            </div>
            <div style={{fontSize: '12px', color: '#666'}}>
              {(() => {
                const stats = allTableData.reduce((acc, row) => {
                  acc[row.status] = (acc[row.status] || 0) + 1;
                  return acc;
                }, {});
                
                const total = allTableData.length;
                const changed = (stats.added || 0) + (stats.removed || 0) + (stats.changed || 0);
                
                if (changed === 0) {
                  return `All ${total} sections are identical`;
                }
                
                const parts = [];
                if (stats.added) parts.push(`${stats.added} added`);
                if (stats.changed) parts.push(`${stats.changed} modified`);
                if (stats.removed) parts.push(`${stats.removed} removed`);
                if (stats.unchanged) parts.push(`${stats.unchanged} unchanged`);
                
                return `${changed}/${total} sections changed: ${parts.join(', ')}`;
              })()}
            </div>
          </div>
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
              <div className="hstack" style={{justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <b>Compared table (by section)</b>
                <div className="hstack" style={{gap:8}}>
                  <label style={{fontSize:'12px', display:'flex', alignItems:'center', gap:'4px'}}>
                    <input 
                      type="checkbox" 
                      checked={showOnlyChanges}
                      onChange={e => setShowOnlyChanges(e.target.checked)}
                    />
                    Show only changes
                  </label>
                </div>
              </div>
              
              {showOnlyChanges && table.length === 0 && (
                <div style={{
                  padding: '20px', 
                  textAlign: 'center', 
                  backgroundColor: '#e8f5e8', 
                  borderRadius: '6px',
                  margin: '8px 0',
                  border: '1px solid #c3e6cb'
                }}>
                  ✅ <strong>No Changes Detected</strong><br/>
                  <small style={{color: '#666'}}>The selected versions are identical</small>
                </div>
              )}
              
              {showOnlyChanges && table.length > 0 && (
                <div style={{
                  padding: '8px 12px', 
                  backgroundColor: '#fff3cd', 
                  borderRadius: '4px',
                  margin: '8px 0',
                  fontSize: '13px',
                  border: '1px solid #ffeaa7'
                }}>
                  🔍 Showing only {table.length} changed section{table.length !== 1 ? 's' : ''} out of {allTableData.length} total
                </div>
              )}
              
              <table style={{marginTop:8, fontSize:'1.1em', width:'100%'}}>
                <thead>
                  <tr><th>Section</th><th>Status</th><th>Diff</th></tr>
                </thead>
                <tbody>
                  {table.map((row, index) => {
                    const getStatusStyle = (status) => {
                      switch(status) {
                        case 'added': return {color: '#155724', fontWeight: 'bold', backgroundColor: '#d1e7dd', padding: '6px 12px', borderRadius: '16px', border: '1px solid #c3e6cb'};
                        case 'removed': return {color: '#721c24', fontWeight: 'bold', backgroundColor: '#f8d7da', padding: '6px 12px', borderRadius: '16px', border: '1px solid #f5c6cb'};
                        case 'changed': return {color: '#856404', fontWeight: 'bold', backgroundColor: '#fff3cd', padding: '6px 12px', borderRadius: '16px', border: '1px solid #ffeaa7'};
                        default: return {color: '#6c757d', fontWeight: 'normal', backgroundColor: '#e9ecef', padding: '6px 12px', borderRadius: '16px'};
                      }
                    };
                    
                    return (
                      <tr key={row.section} style={row.status==='changed' ? {background:'#fffbe6'} : row.status==='added' ? {background: '#e8f5e8'} : row.status==='removed' ? {background: '#ffe8e8'} : {}}>
                        <td style={{whiteSpace:'nowrap', verticalAlign: 'top', padding: '12px', minWidth: '200px'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <span style={{color: '#007bff', fontWeight: '600', fontSize: '14px'}}>
                              {`${index + 1}.`}
                            </span>
                            <strong style={{fontSize: '14px'}}>{row.section}</strong>
                          </div>
                        </td>
                        <td style={{verticalAlign: 'top', padding: '12px', textAlign: 'center', minWidth: '120px'}}>
                          <span style={getStatusStyle(row.status)}>
                            {row.status === 'added' && '✅ ADDED'}
                            {row.status === 'removed' && '❌ REMOVED'}
                            {row.status === 'changed' && '🔄 CHANGED'}
                            {row.status === 'unchanged' && '✓ UNCHANGED'}
                          </span>
                        </td>
                        <td style={{verticalAlign: 'top', padding: '12px', width: '60%'}}>
                          <DiffBlock before={row.before} after={row.after} />
                        </td>
                      </tr>
                    )
                  })}
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
