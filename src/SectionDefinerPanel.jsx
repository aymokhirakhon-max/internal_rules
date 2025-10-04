import React, { useState, useEffect } from 'react';

const SectionDefinerPanel = ({ wordContent, fileName, onClose, onCreateDocument }) => {
  const [docTitle, setDocTitle] = useState(fileName.replace(/\.(docx?|doc)$/i, ''));
  const [docType, setDocType] = useState('Policy');
  const [docStatus, setDocStatus] = useState('Draft');
  const [sections, setSections] = useState([
    'Title',
    'Purpose',
    'Scope',
    'Definitions',
    'Policy Statement',
    'Procedures',
    'Responsibilities',
    'Compliance',
    'Review and Updates'
  ]);
  const [newSection, setNewSection] = useState('');

  const addSection = () => {
    if (newSection.trim() && !sections.includes(newSection.trim())) {
      setSections([...sections, newSection.trim()]);
      setNewSection('');
    }
  };

  const removeSection = (index) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index, direction) => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < sections.length) {
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      setSections(newSections);
    }
  };

  const handleCreateDocument = () => {
    if (docTitle.trim() && sections.length > 0) {
      onCreateDocument(sections, docType, docTitle.trim(), docStatus);
    }
  };

  return (
    <div className="section-definer-overlay">
      <div className="section-definer-panel">
        <div className="section-definer-header">
          <h2>📋 Define Document Sections</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="section-definer-content">
          <div className="document-info">
            <div className="form-group">
              <label>Document Title:</label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Enter document title..."
              />
            </div>

            <div className="form-group">
              <label>Document Type:</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="Policy">Policy</option>
                <option value="Procedure">Procedure</option>
                <option value="Regulation">Regulation</option>
              </select>
            </div>

            <div className="form-group">
              <label>Document Status:</label>
              <select value={docStatus} onChange={(e) => setDocStatus(e.target.value)}>
                <option value="Draft">Draft</option>
                <option value="Under Review">Under Review</option>
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
              </select>
              {(docStatus === 'Active' || docStatus === 'Archived') && (
                <div className="status-warning">
                  <span className="warning-icon">⚠️</span>
                  <span className="warning-text">
                    Documents with "{docStatus}" status will be read-only and cannot be edited after creation.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="sections-container">
            <h3>Document Sections</h3>
            <p className="sections-hint">
              Define the sections that should be extracted from your Word document. 
              The system will search for these sections and map the content accordingly.
            </p>

            <div className="add-section">
              <input
                type="text"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="Add new section..."
                onKeyPress={(e) => e.key === 'Enter' && addSection()}
              />
              <button onClick={addSection} disabled={!newSection.trim()}>
                + Add
              </button>
            </div>

            <div className="sections-list">
              {sections.map((section, index) => (
                <div key={index} className="section-item">
                  <span className="section-name">{section}</span>
                  <div className="section-controls">
                    <button
                      onClick={() => moveSection(index, 'up')}
                      disabled={index === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveSection(index, 'down')}
                      disabled={index === sections.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeSection(index)}
                      className="remove-button"
                      title="Remove section"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-definer-actions">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="create-button" 
              onClick={handleCreateDocument}
              disabled={!docTitle.trim() || sections.length === 0}
            >
              {docStatus === 'Active' || docStatus === 'Archived' 
                ? `📄 Create ${docStatus} Document (Read-Only)`
                : '📄 Create Document'
              }
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .section-definer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .section-definer-panel {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .section-definer-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-definer-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .close-button {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.3s;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .section-definer-content {
          padding: 20px;
          max-height: calc(90vh - 140px);
          overflow-y: auto;
        }

        .document-info {
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #333;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.3s;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #667eea;
        }

        .status-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding: 10px;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          font-size: 13px;
        }

        .warning-icon {
          font-size: 16px;
        }

        .warning-text {
          color: #856404;
          font-weight: 500;
        }

        .sections-container h3 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .sections-hint {
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .add-section {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .add-section input {
          flex: 1;
          padding: 10px;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 14px;
        }

        .add-section input:focus {
          outline: none;
          border-color: #667eea;
        }

        .add-section button {
          padding: 10px 15px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.3s;
        }

        .add-section button:hover:not(:disabled) {
          background: #5a67d8;
        }

        .add-section button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .sections-list {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
          margin-bottom: 25px;
        }

        .section-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          border-bottom: 1px solid #f0f0f0;
        }

        .section-item:last-child {
          border-bottom: none;
        }

        .section-name {
          flex: 1;
          font-size: 14px;
          color: #333;
        }

        .section-controls {
          display: flex;
          gap: 5px;
        }

        .section-controls button {
          padding: 5px 8px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s;
        }

        .section-controls button:hover:not(:disabled) {
          background: #f5f5f5;
          border-color: #bbb;
        }

        .section-controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .remove-button {
          color: #e53e3e !important;
        }

        .remove-button:hover:not(:disabled) {
          background: #fed7d7 !important;
          border-color: #e53e3e !important;
        }

        .section-definer-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .cancel-button {
          padding: 12px 24px;
          background: #gray;
          color: #666;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
        }

        .cancel-button:hover {
          background: #f5f5f5;
          border-color: #ccc;
        }

        .create-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
        }

        .create-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .create-button:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
};

export default SectionDefinerPanel;