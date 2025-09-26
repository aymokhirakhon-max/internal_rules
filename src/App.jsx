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
    </div>
  )
}

function Editor({ doc, onChange, onSnapshot, onClose, onCompare }){
  const [d, setD] = useState(doc)
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
        <div style={{display:'grid', gap:12, marginTop:8}}>
          {REQUIRED[d.type].map(key => {
            const sectionText = latest.sections.find(s=>s.key===key)?.text||'';
            return (
              <div key={key}>
                <div className="muted" style={{fontWeight:600, marginBottom:6}}>{key}</div>
                  <CKEditor
                    editor={ClassicEditor}
                    data={sectionText}
                    onChange={(event, editor) => {
                      const data = editor.getData();
                      updateSection(key, data);
                    }}
                    config={{
                      toolbar: [
                        'heading', '|', 'bold', 'italic', 'underline', 'strikethrough', 'link', 'bulletedList', 'numberedList', 'blockQuote',
                        '|', 'insertTable', 'imageUpload', 'undo', 'redo', 'alignment', 'fontColor', 'fontBackgroundColor', 'fontSize', 'fontFamily',
                        'outdent', 'indent', 'code', 'codeBlock', 'removeFormat'
                      ],
                      table: {
                        contentToolbar: [ 'tableColumn', 'tableRow', 'mergeTableCells' ]
                      }
                    }}
                  />
                  <div style={{fontSize:12, color:'#888', marginTop:4}}>
                    <b>Tip:</b> Use the toolbar above for Word-like formatting and table creation. Paste from Word for advanced tables.
                  </div>
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
                    <td style={{whiteSpace:'nowrap'}}>{row.section}</td>
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
      </div>
    </div>
  )
}
