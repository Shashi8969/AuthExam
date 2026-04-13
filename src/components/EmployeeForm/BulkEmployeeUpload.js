// src/components/EmployeeForm/BulkEmployeeUpload.js
import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { ref, push, set, update, query, orderByChild, equalTo, get, serverTimestamp } from 'firebase/database';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import Employee from '../../models/Employee';
import './BulkEmployeeUpload.css';

const REQUIRED_COLUMNS = ['name', 'phoneNo', 'addharNo', 'address'];
const ALL_COLUMNS = ['name', 'phoneNo', 'addharNo', 'address', 'referenceName'];

const COLUMN_LABELS = {
  name: 'Name',
  phoneNo: 'Phone Number',
  addharNo: 'Aadhar Number',
  address: 'Address',
  referenceName: 'Reference Name',
};

const COLUMN_ALIAS_MAP = {
  'name': 'name',
  'phoneno': 'phoneNo', 'phone': 'phoneNo', 'phonenumber': 'phoneNo',
  'phone number': 'phoneNo', 'mobileno': 'phoneNo', 'mobile': 'phoneNo',
  'mobilenumber': 'phoneNo',
  'addharnno': 'addharNo', 'addharno': 'addharNo', 'aadharnno': 'addharNo',
  'aadharno': 'addharNo', 'adharnno': 'addharNo', 'adharno': 'addharNo',
  'aadharnumber': 'addharNo', 'aadhar number': 'addharNo',
  'adharnumber': 'addharNo', 'adhar number': 'addharNo',
  'addharnumber': 'addharNo', 'aadhar': 'addharNo', 'adhar': 'addharNo',
  'address': 'address', 'city': 'address', 'location': 'address',
  'referencename': 'referenceName', 'reference name': 'referenceName',
  'reference': 'referenceName', 'refname': 'referenceName', 'ref': 'referenceName',
};

const validateRow = (row) => {
  const errors = [];
  if (!row.name || !row.name.trim()) errors.push('Name missing');
  if (!/^\d{10}$/.test(row.phoneNo || '')) errors.push('Phone must be 10 digits');
  if (!/^\d{12}$/.test(row.addharNo || '')) errors.push('Aadhar must be 12 digits');
  if (!row.address || !row.address.trim()) errors.push('Address missing');
  return errors;
};

const BulkEmployeeUpload = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const fileInputRef = useRef();

  const [step, setStep] = useState('upload');
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [rows, setRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [editingRowIdx, setEditingRowIdx] = useState(null);
  const [editBuffer, setEditBuffer] = useState({});
  const [filterTab, setFilterTab] = useState('all');

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'Phone Number', 'Aadhar Number', 'address', 'referenceName'],
      ['Ravi Kumar', '9876543210', '123456789012', 'Patna', 'Ref Name'],
    ]);
    ws['!cols'] = ALL_COLUMNS.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'employee_bulk_template.xlsx');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParseError('');
    setFileName(file.name);
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setParseError('Invalid file type. Please upload .xlsx, .xls, or .csv');
      return;
    }
    try {
      setCheckingDuplicates(true);
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rawRows.length === 0) { setParseError('The file is empty.'); setCheckingDuplicates(false); return; }

      const normalizedRows = rawRows.map((row, idx) => {
        const normalized = { _rowIndex: idx + 2 };
        Object.keys(row).forEach((key) => {
          const lk = key.trim().toLowerCase();
          const mk = COLUMN_ALIAS_MAP[lk] || lk;
          normalized[mk] = String(row[key]).trim();
        });
        return normalized;
      });

      const firstRow = normalizedRows[0];
      const missing = REQUIRED_COLUMNS.filter((col) => !(col in firstRow));
      if (missing.length > 0) {
        setParseError('Missing required columns: ' + missing.map(c => COLUMN_LABELS[c]).join(', ') + '. Please use the template.');
        setCheckingDuplicates(false);
        return;
      }

      const aadharCount = {};
      normalizedRows.forEach((r) => {
        if (r.addharNo) aadharCount[r.addharNo] = (aadharCount[r.addharNo] || 0) + 1;
      });
      const inFileDupes = new Set(Object.keys(aadharCount).filter((k) => aadharCount[k] > 1));

      const empQuery = query(ref(db, 'Employees'), orderByChild('createdBy'), equalTo(user.uid));
      const snap = await get(empQuery);
      const dbMap = {};
      if (snap.exists()) {
        snap.forEach((child) => {
          const emp = child.val();
          if (emp.addharNo) dbMap[String(emp.addharNo).trim()] = child.key;
        });
      }

      const finalRows = normalizedRows.map((row) => {
        const errors = validateRow(row);
        let status, action, dbKey = null;
        if (errors.length > 0) { status = 'invalid'; action = 'skip'; }
        else if (inFileDupes.has(row.addharNo)) { status = 'duplicate-file'; action = 'skip'; }
        else if (dbMap[row.addharNo]) { status = 'duplicate-db'; action = 'update'; dbKey = dbMap[row.addharNo]; }
        else { status = 'valid'; action = 'add'; }
        return {
          _rowIndex: row._rowIndex,
          name: row.name || '',
          phoneNo: row.phoneNo || '',
          addharNo: row.addharNo || '',
          address: row.address || '',
          referenceName: row.referenceName || '',
          _status: status, _errors: errors, _action: action, _dbKey: dbKey,
        };
      });

      setRows(finalRows);
      setStep('preview');
      setFilterTab('all');
    } catch (err) {
      setParseError('Failed to parse file. Please check the format.');
    }
    setCheckingDuplicates(false);
  };

  const startEdit = (idx) => { setEditingRowIdx(idx); setEditBuffer({ ...rows[idx] }); };
  const cancelEdit = () => { setEditingRowIdx(null); setEditBuffer({}); };

  const saveEdit = (idx) => {
    setRows((prev) => {
      const updated = [...prev];
      const row = { ...editBuffer };
      const errors = validateRow(row);
      let status = row._status;
      let action = row._action;
      if (errors.length === 0 && row._status === 'invalid') { status = 'valid'; action = 'add'; }
      updated[idx] = { ...row, _errors: errors, _status: errors.length === 0 ? status : 'invalid', _action: errors.length === 0 ? action : 'skip' };
      return updated;
    });
    setEditingRowIdx(null);
    setEditBuffer({});
  };

  const toggleAction = (idx) => {
    setRows((prev) => {
      const updated = [...prev];
      const row = updated[idx];
      if (row._status === 'duplicate-db') {
        updated[idx] = { ...row, _action: row._action === 'update' ? 'skip' : 'update' };
      } else if (row._status === 'duplicate-file') {
        updated[idx] = { ...row, _action: row._action === 'skip' ? 'add' : 'skip' };
      } else if (row._status === 'invalid') {
        updated[idx] = { ...row, _action: row._action === 'skip' ? 'add' : 'skip' };
      }
      return updated;
    });
  };

  const handleBulkUpload = async () => {
    const toProcess = rows.filter((r) => r._action !== 'skip');
    if (toProcess.length === 0) return;
    setUploading(true);
    let addedCount = 0, updatedCount = 0, failCount = 0;
    for (const row of toProcess) {
      try {
        if (row._action === 'add') {
          const newRef = push(ref(db, 'Employees'));
          const emp = new Employee({
            name: row.name, phoneNo: row.phoneNo, addharNo: row.addharNo,
            address: row.address, referenceName: row.referenceName,
            empId: newRef.key, createdBy: user.uid,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          });
          await set(newRef, emp.toFirebase());
          addedCount++;
        } else if (row._action === 'update' && row._dbKey) {
          await update(ref(db, 'Employees/' + row._dbKey), {
            name: row.name, phoneNo: row.phoneNo,
            address: row.address, referenceName: row.referenceName,
            updatedAt: serverTimestamp(),
          });
          updatedCount++;
        }
      } catch { failCount++; }
    }
    setUploadResult({ addedCount, updatedCount, failCount });
    setStep('done');
    setUploading(false);
    if ((addedCount + updatedCount) > 0 && onSuccess) onSuccess(addedCount + updatedCount);
  };

  const reset = () => {
    setStep('upload'); setFileName(''); setParseError('');
    setRows([]); setUploadResult(null); setEditingRowIdx(null); setEditBuffer({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const counts = {
    total: rows.length,
    valid: rows.filter(r => r._status === 'valid').length,
    invalid: rows.filter(r => r._status === 'invalid').length,
    dupFile: rows.filter(r => r._status === 'duplicate-file').length,
    dupDB: rows.filter(r => r._status === 'duplicate-db').length,
    toAdd: rows.filter(r => r._action === 'add').length,
    toUpdate: rows.filter(r => r._action === 'update').length,
    toSkip: rows.filter(r => r._action === 'skip').length,
  };

  const filteredRows = filterTab === 'all' ? rows
    : rows.filter(r => r._status === filterTab);

  const getActionBadge = (row) => {
    if (row._action === 'add') return React.createElement('span', { className: 'action-badge action-add' }, '+ Add');
    if (row._action === 'update') return React.createElement('span', { className: 'action-badge action-update' }, '✏ Update');
    return React.createElement('span', { className: 'action-badge action-skip' }, '⏭ Skip');
  };

  const getStatusBadge = (row) => {
    if (row._status === 'valid') return React.createElement('span', { className: 'row-status-badge status-valid' }, '✅ Valid');
    if (row._status === 'invalid') return React.createElement('span', { className: 'row-status-badge status-invalid' }, '❌ Invalid');
    if (row._status === 'duplicate-file') return React.createElement('span', { className: 'row-status-badge status-dup' }, '⚠️ Dup (file)');
    if (row._status === 'duplicate-db') return React.createElement('span', { className: 'row-status-badge status-dup-db' }, '🔄 Exists in DB');
    return null;
  };

  const getRowIdx = (row) => rows.indexOf(row);

  return (
    <div className="bulk-upload-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bulk-upload-modal">

        <div className="bulk-modal-header">
          <div>
            <h2>📊 Bulk Employee Upload</h2>
            <p>Upload Excel/CSV · Fix invalid rows inline · Update existing records</p>
          </div>
          <button className="bulk-close-btn" onClick={onClose}>✕</button>
        </div>

        {step === 'upload' && (
          <div className="bulk-step bulk-step-upload">
            <div className="bulk-template-tip">
              <span>💡</span>
              <div>
                <strong>Use our template</strong> for the correct column format.
                <button className="btn-download-template" onClick={downloadTemplate}>⬇️ Download Template</button>
              </div>
            </div>
            <div className={`bulk-dropzone ${checkingDuplicates ? 'loading' : ''}`}
              onClick={() => !checkingDuplicates && fileInputRef.current && fileInputRef.current.click()}>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv"
                onChange={handleFileChange} style={{ display: 'none' }} />
              {checkingDuplicates ? (
                <div className="bulk-checking">
                  <div className="bulk-spinner" />
                  <p>Parsing file & checking database for duplicates…</p>
                </div>
              ) : (
                <>
                  <div className="bulk-upload-icon">📁</div>
                  <p className="bulk-upload-label">Click to select file</p>
                  <p className="bulk-upload-hint">Supports .xlsx, .xls, .csv</p>
                  {fileName && <p className="bulk-file-name">Selected: {fileName}</p>}
                </>
              )}
            </div>
            {parseError && <div className="bulk-parse-error">❌ {parseError}</div>}
            <div className="bulk-columns-info">
              <p><strong>Required:</strong> name, Phone Number, Aadhar Number, address</p>
              <p><strong>Optional:</strong> referenceName</p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="bulk-step bulk-step-preview">
            <div className="bulk-preview-summary">
              <div className="summary-card total"><span className="summary-num">{counts.total}</span><span className="summary-label">Total</span></div>
              <div className="summary-card valid"><span className="summary-num">{counts.toAdd}</span><span className="summary-label">Will Add</span></div>
              <div className="summary-card update"><span className="summary-num">{counts.toUpdate}</span><span className="summary-label">Will Update</span></div>
              <div className="summary-card skipped"><span className="summary-num">{counts.toSkip}</span><span className="summary-label">Skipped</span></div>
            </div>

            {(counts.invalid > 0 || counts.dupFile > 0 || counts.dupDB > 0) && (
              <div className="bulk-help-banner">
                <strong>💡 How to handle each issue:</strong>
                <ul>
                  {counts.invalid > 0 && <li>❌ <strong>Invalid rows</strong> — click ✏️ to fix the data inline. Once fixed, the row will be added automatically.</li>}
                  {counts.dupDB > 0 && <li>🔄 <strong>Exists in DB</strong> — set to Update by default. Click "⏭ Skip" to ignore it instead.</li>}
                  {counts.dupFile > 0 && <li>⚠️ <strong>Duplicate in file</strong> — skipped by default (same Aadhar twice). Click "▶ Include" on one row to add it.</li>}
                </ul>
              </div>
            )}

            <div className="bulk-filter-tabs">
              {[
                { key: 'all', label: 'All (' + counts.total + ')' },
                { key: 'valid', label: '✅ Valid (' + counts.valid + ')' },
                { key: 'invalid', label: '❌ Invalid (' + counts.invalid + ')' },
                { key: 'duplicate-db', label: '🔄 Exists in DB (' + counts.dupDB + ')' },
                { key: 'duplicate-file', label: '⚠️ Dup in file (' + counts.dupFile + ')' },
              ].map(tab => (
                <button key={tab.key}
                  className={`filter-tab ${filterTab === tab.key ? 'active' : ''}`}
                  onClick={() => setFilterTab(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bulk-preview-table-wrap">
              <table className="bulk-preview-table">
                <thead>
                  <tr>
                    <th>Row</th><th>Name</th><th>Phone</th><th>Aadhar</th>
                    <th>Address</th><th>Reference</th><th>Status</th><th>Action</th><th>Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 && (
                    <tr><td colSpan={9} className="table-empty">No rows in this category.</td></tr>
                  )}
                  {filteredRows.map((row) => {
                    const idx = getRowIdx(row);
                    const isEditing = editingRowIdx === idx;
                    if (isEditing) {
                      return (
                        <tr key={idx} className="preview-row editing-row">
                          <td>{row._rowIndex}</td>
                          <td><input className="cell-input" value={editBuffer.name || ''} onChange={e => setEditBuffer(b => ({ ...b, name: e.target.value }))} placeholder="Name" /></td>
                          <td><input className="cell-input" value={editBuffer.phoneNo || ''} onChange={e => setEditBuffer(b => ({ ...b, phoneNo: e.target.value }))} placeholder="10 digits" maxLength={10} /></td>
                          <td><input className="cell-input" value={editBuffer.addharNo || ''} onChange={e => setEditBuffer(b => ({ ...b, addharNo: e.target.value }))} placeholder="12 digits" maxLength={12} /></td>
                          <td><input className="cell-input" value={editBuffer.address || ''} onChange={e => setEditBuffer(b => ({ ...b, address: e.target.value }))} placeholder="Address" /></td>
                          <td><input className="cell-input" value={editBuffer.referenceName || ''} onChange={e => setEditBuffer(b => ({ ...b, referenceName: e.target.value }))} placeholder="Reference" /></td>
                          <td colSpan={2}></td>
                          <td>
                            <div className="cell-edit-actions">
                              <button className="btn-save-edit" onClick={() => saveEdit(idx)}>💾 Save</button>
                              <button className="btn-cancel-edit" onClick={cancelEdit}>✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={idx} className={'preview-row' + (row._action === 'skip' ? ' row-skipped' : '') + (row._status === 'duplicate-db' ? ' row-update' : '')}>
                        <td>{row._rowIndex}</td>
                        <td>{row.name || '—'}</td>
                        <td>{row.phoneNo || '—'}</td>
                        <td>{row.addharNo || '—'}</td>
                        <td>{row.address || '—'}</td>
                        <td>{row.referenceName || '—'}</td>
                        <td>
                          {getStatusBadge(row)}
                          {row._errors.length > 0 && (
                            <div className="row-error-list">
                              {row._errors.map((e, j) => <span key={j}>• {e}</span>)}
                            </div>
                          )}
                        </td>
                        <td>{getActionBadge(row)}</td>
                        <td>
                          <div className="cell-controls">
                            <button className="btn-row-edit" title="Edit this row" onClick={() => startEdit(idx)}>✏️ Edit</button>
                            {(row._status === 'duplicate-db' || row._status === 'duplicate-file' || row._status === 'invalid') && (
                              <button
                                className={'btn-row-toggle ' + (row._action === 'skip' ? 'toggle-include' : 'toggle-skip')}
                                onClick={() => toggleAction(idx)}>
                                {row._action === 'skip' ? '▶ Include' : '⏭ Skip'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bulk-preview-actions">
              <button className="btn-go-back" onClick={reset}>← Back</button>
              <button className="btn-confirm-upload" onClick={handleBulkUpload}
                disabled={(counts.toAdd + counts.toUpdate) === 0 || uploading}>
                {uploading ? 'Processing…'
                  : '✅ Process ' + (counts.toAdd + counts.toUpdate) + ' Row' + ((counts.toAdd + counts.toUpdate) !== 1 ? 's' : '') + ' (' + counts.toAdd + ' add, ' + counts.toUpdate + ' update)'}
              </button>
            </div>

            {uploading && (
              <div className="bulk-upload-progress">
                <div className="bulk-spinner" /> Saving to database, please wait…
              </div>
            )}
          </div>
        )}

        {step === 'done' && uploadResult && (
          <div className="bulk-step bulk-step-done">
            <div className="done-icon">{(uploadResult.addedCount + uploadResult.updatedCount) > 0 ? '🎉' : '😕'}</div>
            <h3 className="done-title">
              {(uploadResult.addedCount + uploadResult.updatedCount) > 0 ? 'Upload Complete!' : 'Nothing was processed'}
            </h3>
            <div className="done-stats">
              {uploadResult.addedCount > 0 && <div className="done-stat-item added">➕ {uploadResult.addedCount} employee{uploadResult.addedCount !== 1 ? 's' : ''} added</div>}
              {uploadResult.updatedCount > 0 && <div className="done-stat-item updated">✏️ {uploadResult.updatedCount} employee{uploadResult.updatedCount !== 1 ? 's' : ''} updated</div>}
              {uploadResult.failCount > 0 && <div className="done-stat-item failed">❌ {uploadResult.failCount} row{uploadResult.failCount !== 1 ? 's' : ''} failed</div>}
            </div>
            <div className="done-actions">
              <button className="btn-upload-another" onClick={reset}>Upload Another File</button>
              <button className="btn-done-close" onClick={onClose}>Done</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default BulkEmployeeUpload;
