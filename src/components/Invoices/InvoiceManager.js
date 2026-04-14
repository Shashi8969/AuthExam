// src/components/Invoices/InvoiceManager.js
import React, { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, update, remove, serverTimestamp, get } from 'firebase/database';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import './InvoiceManager.css';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#f59e0b', bg: '#fef3c7' },
  partial:     { label: 'Partial',     color: '#3b82f6', bg: '#dbeafe' },
  paid:        { label: 'Paid',        color: '#10b981', bg: '#d1fae5' },
  overdue:     { label: 'Overdue',     color: '#ef4444', bg: '#fee2e2' },
  cancelled:   { label: 'Cancelled',   color: '#6b7280', bg: '#f3f4f6' },
};

const ITEM_TYPES = ['Mock', 'Training Fee', 'Supervisor', 'Operator Single Shift', 'Operator Double Shift', 'Manpower', 'Mock Manpower', 'Other'];

const emptyItem = () => ({ description: '', type: 'Other', rate: '', qty: '', amount: 0 });
const emptyForm = () => ({
  invoiceNo: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  billedByName: '',
  billedByPhone: '',
  billedToName: '',
  projectName: '',
  notes: '',
  items: [emptyItem()],
  payments: [],
});

const fmt = (n) => '₹ ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const calcBalance = (invoice) => {
  const total = (invoice.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const paid  = (invoice.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  return { total, paid, balance: total - paid };
};

const deriveStatus = (invoice) => {
  if (invoice.status === 'cancelled') return 'cancelled';
  const { total, paid, balance } = calcBalance(invoice);
  if (paid === 0) return 'pending';
  if (balance <= 0) return 'paid';
  return 'partial';
};

export default function InvoiceManager() {
  const { user, isAdmin } = useAuth();
  const [view, setView] = useState('list'); // 'list' | 'create' | 'detail'
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', date: new Date().toISOString().slice(0,10), note: '' });
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const printRef = useRef();

  // ── Fetch invoices ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = ref(db, 'Invoices');
    const unsub = onValue(q, (snap) => {
      const data = snap.val();
      const list = [];
      if (data) {
        Object.keys(data).forEach(k => {
          const inv = { id: k, ...data[k] };
          inv._derivedStatus = deriveStatus(inv);
          list.push(inv);
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
      setInvoices(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // ── Auto next invoice number ────────────────────────────────────────────────
  useEffect(() => {
    if (view === 'create' && !editMode) {
      const max = invoices.reduce((m, inv) => {
        const n = parseInt(String(inv.invoiceNo).replace(/\D/g, '')) || 0;
        return Math.max(m, n);
      }, 0);
      setForm(f => ({ ...f, invoiceNo: String(max + 1) }));
    }
  }, [view, invoices, editMode]);

  // ── Item helpers ────────────────────────────────────────────────────────────
  const updateItem = (idx, field, val) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: val };
      if (field === 'rate' || field === 'qty') {
        const rate = parseFloat(field === 'rate' ? val : items[idx].rate) || 0;
        const qty  = parseFloat(field === 'qty'  ? val : items[idx].qty)  || 0;
        items[idx].amount = rate * qty;
      }
      return { ...f, items };
    });
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const totalAmount = form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  // ── Save invoice ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.billedByName.trim() || !form.billedToName.trim() || !form.invoiceNo.trim()) {
      alert('Please fill in: Invoice No, Billed By Name, and Billed To Name.');
      return;
    }
    if (form.items.length === 0 || form.items.every(i => !i.description.trim())) {
      alert('Add at least one line item with a description.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        totalAmount,
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        status: deriveStatus({ ...form, status: form.status }),
      };
      if (editMode && selected) {
        await update(ref(db, `Invoices/${selected.id}`), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await push(ref(db, 'Invoices'), payload);
      }
      setView('list');
      setEditMode(false);
      setSelected(null);
      setForm(emptyForm());
    } catch (err) {
      console.error(err);
      alert('Failed to save invoice.');
    }
    setSaving(false);
  };

  // ── Add payment ─────────────────────────────────────────────────────────────
  const handleAddPayment = async () => {
    const amt = parseFloat(newPayment.amount);
    if (!amt || amt <= 0) { alert('Enter a valid payment amount.'); return; }
    if (!selected) return;
    const payments = [...(selected.payments || []), {
      amount: amt,
      date: newPayment.date,
      note: newPayment.note,
      addedAt: Date.now(),
    }];
    const updatedInv = { ...selected, payments };
    const newStatus = deriveStatus(updatedInv);
    await update(ref(db, `Invoices/${selected.id}`), { payments, status: newStatus, updatedAt: serverTimestamp() });
    setSelected({ ...updatedInv, _derivedStatus: newStatus });
    setPaymentModal(false);
    setNewPayment({ amount: '', date: new Date().toISOString().slice(0,10), note: '' });
  };

  // ── Delete invoice ──────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    await remove(ref(db, `Invoices/${id}`));
    setConfirmDelete(null);
    setView('list');
    setSelected(null);
  };

  // ── Status override ─────────────────────────────────────────────────────────
  const handleStatusOverride = async (invId, status) => {
    await update(ref(db, `Invoices/${invId}`), { status, updatedAt: serverTimestamp() });
    if (selected?.id === invId) setSelected(s => ({ ...s, status, _derivedStatus: status }));
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const startEdit = (inv) => {
    setForm({
      invoiceNo: inv.invoiceNo || '',
      invoiceDate: inv.invoiceDate || '',
      billedByName: inv.billedByName || '',
      billedByPhone: inv.billedByPhone || '',
      billedToName: inv.billedToName || '',
      projectName: inv.projectName || '',
      notes: inv.notes || '',
      items: inv.items || [emptyItem()],
      payments: inv.payments || [],
      status: inv.status,
    });
    setSelected(inv);
    setEditMode(true);
    setView('create');
  };

  // ── Print ───────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── Filters ─────────────────────────────────────────────────────────────────
  const filtered = invoices.filter(inv => {
    const matchStatus = filterStatus === 'all' || inv._derivedStatus === filterStatus;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      inv.billedToName?.toLowerCase().includes(term) ||
      inv.billedByName?.toLowerCase().includes(term) ||
      inv.invoiceNo?.toLowerCase().includes(term) ||
      inv.projectName?.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  // ── Summary stats ────────────────────────────────────────────────────────────
  const stats = {
    total:    invoices.length,
    pending:  invoices.filter(i => i._derivedStatus === 'pending').length,
    partial:  invoices.filter(i => i._derivedStatus === 'partial').length,
    paid:     invoices.filter(i => i._derivedStatus === 'paid').length,
    totalAmt: invoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0),
    receivable: invoices.filter(i => ['pending','partial'].includes(i._derivedStatus))
                        .reduce((s, i) => s + calcBalance(i).balance, 0),
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: LIST VIEW
  // ────────────────────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div className="inv-page">
      <div className="inv-top-bar">
        <div>
          <h1 className="inv-page-title">Invoice Manager</h1>
          <p className="inv-page-sub">Create, track, and manage all project invoices</p>
        </div>
        <button className="inv-btn-primary" onClick={() => { setEditMode(false); setForm(emptyForm()); setView('create'); }}>
          + New Invoice
        </button>
      </div>

      {/* Stats row */}
      <div className="inv-stats-row">
        <div className="inv-stat-card">
          <span className="inv-stat-num">{stats.total}</span>
          <span className="inv-stat-label">Total Invoices</span>
        </div>
        <div className="inv-stat-card warn">
          <span className="inv-stat-num">{stats.pending + stats.partial}</span>
          <span className="inv-stat-label">Outstanding</span>
        </div>
        <div className="inv-stat-card success">
          <span className="inv-stat-num">{stats.paid}</span>
          <span className="inv-stat-label">Paid</span>
        </div>
        <div className="inv-stat-card amount">
          <span className="inv-stat-num" style={{fontSize:'1.1rem'}}>{fmt(stats.totalAmt)}</span>
          <span className="inv-stat-label">Total Billed</span>
        </div>
        <div className="inv-stat-card receivable">
          <span className="inv-stat-num" style={{fontSize:'1.1rem'}}>{fmt(stats.receivable)}</span>
          <span className="inv-stat-label">Receivable</span>
        </div>
      </div>

      {/* Filters */}
      <div className="inv-filter-bar">
        <input className="inv-search" placeholder="Search by name, invoice no, project…"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        <div className="inv-status-tabs">
          {['all', ...Object.keys(STATUS_CONFIG)].map(s => (
            <button key={s}
              className={`inv-tab ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="inv-loading">Loading invoices…</div> :
       filtered.length === 0 ? (
        <div className="inv-empty">
          <div className="inv-empty-icon">🧾</div>
          <p>No invoices found. Create your first one!</p>
        </div>
       ) : (
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Invoice #</th><th>Date</th><th>Billed To</th><th>Project</th>
                <th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const { total, paid, balance } = calcBalance(inv);
                const sc = STATUS_CONFIG[inv._derivedStatus] || STATUS_CONFIG.pending;
                return (
                  <tr key={inv.id} className="inv-table-row" onClick={() => { setSelected(inv); setView('detail'); }}>
                    <td><span className="inv-no">#{inv.invoiceNo}</span></td>
                    <td>{inv.invoiceDate}</td>
                    <td><span className="inv-to-name">{inv.billedToName}</span></td>
                    <td><span className="inv-project">{inv.projectName || '—'}</span></td>
                    <td>{fmt(total)}</td>
                    <td style={{color:'#10b981', fontWeight:600}}>{fmt(paid)}</td>
                    <td style={{color: balance > 0 ? '#ef4444' : '#10b981', fontWeight:600}}>{fmt(balance)}</td>
                    <td>
                      <span className="inv-status-pill" style={{background:sc.bg, color:sc.color}}>
                        {sc.label}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="inv-row-actions">
                        <button className="inv-act-btn" onClick={() => startEdit(inv)}>✏️</button>
                        <button className="inv-act-btn danger" onClick={() => setConfirmDelete(inv.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
       )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="inv-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="inv-modal-box" onClick={e => e.stopPropagation()}>
            <h3>Delete Invoice?</h3>
            <p>This action cannot be undone. The invoice will be permanently removed.</p>
            <div className="inv-modal-actions">
              <button className="inv-btn-danger" onClick={() => handleDelete(confirmDelete)}>Yes, Delete</button>
              <button className="inv-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: CREATE / EDIT VIEW
  // ────────────────────────────────────────────────────────────────────────────
  if (view === 'create') return (
    <div className="inv-page">
      <div className="inv-top-bar">
        <div>
          <h1 className="inv-page-title">{editMode ? 'Edit Invoice' : 'New Invoice'}</h1>
          <p className="inv-page-sub">Fill in the details below</p>
        </div>
        <button className="inv-btn-ghost" onClick={() => { setView(editMode ? 'detail' : 'list'); setEditMode(false); }}>
          ← Cancel
        </button>
      </div>

      <div className="inv-form-grid">
        {/* Billed By */}
        <div className="inv-form-section">
          <h3 className="inv-section-title">Billed By</h3>
          <div className="inv-field-row">
            <div className="inv-field">
              <label>Name *</label>
              <input value={form.billedByName} onChange={e => setForm(f=>({...f, billedByName:e.target.value}))} placeholder="Your name / company" />
            </div>
            <div className="inv-field">
              <label>Phone</label>
              <input value={form.billedByPhone} onChange={e => setForm(f=>({...f, billedByPhone:e.target.value}))} placeholder="+91-XXXXXXXXXX" />
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="inv-form-section">
          <h3 className="inv-section-title">Invoice Details</h3>
          <div className="inv-field-row">
            <div className="inv-field">
              <label>Invoice No *</label>
              <input value={form.invoiceNo} onChange={e => setForm(f=>({...f, invoiceNo:e.target.value}))} placeholder="101" />
            </div>
            <div className="inv-field">
              <label>Invoice Date *</label>
              <input type="date" value={form.invoiceDate} onChange={e => setForm(f=>({...f, invoiceDate:e.target.value}))} />
            </div>
          </div>
        </div>

        {/* Billed To */}
        <div className="inv-form-section full-width">
          <h3 className="inv-section-title">Billed To</h3>
          <div className="inv-field-row">
            <div className="inv-field">
              <label>Client Name *</label>
              <input value={form.billedToName} onChange={e => setForm(f=>({...f, billedToName:e.target.value}))} placeholder="Client / organization name" />
            </div>
            <div className="inv-field">
              <label>Project Name</label>
              <input value={form.projectName} onChange={e => setForm(f=>({...f, projectName:e.target.value}))} placeholder="BPSC Sep 2025, etc." />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="inv-form-section full-width">
          <h3 className="inv-section-title">Line Items</h3>
          <div className="inv-items-table-wrap">
            <table className="inv-items-table">
              <thead>
                <tr>
                  <th style={{width:'30%'}}>Description</th>
                  <th style={{width:'20%'}}>Type</th>
                  <th style={{width:'15%'}}>Rate (₹)</th>
                  <th style={{width:'15%'}}>Quantity</th>
                  <th style={{width:'15%'}}>Amount (₹)</th>
                  <th style={{width:'5%'}}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx} className="inv-item-row">
                    <td>
                      <input className="inv-cell-input"
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        placeholder="e.g. Mock, Operator…" />
                    </td>
                    <td>
                      <select className="inv-cell-input"
                        value={item.type}
                        onChange={e => updateItem(idx, 'type', e.target.value)}>
                        {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td>
                      <input className="inv-cell-input" type="number" min="0"
                        value={item.rate}
                        onChange={e => updateItem(idx, 'rate', e.target.value)}
                        placeholder="0" />
                    </td>
                    <td>
                      <input className="inv-cell-input" type="number" min="0"
                        value={item.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                        placeholder="0" />
                    </td>
                    <td className="inv-amount-cell">{fmt(item.amount)}</td>
                    <td>
                      {form.items.length > 1 &&
                        <button className="inv-remove-item" onClick={() => removeItem(idx)}>✕</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="inv-add-item-btn" onClick={addItem}>+ Add Line Item</button>

          <div className="inv-total-row">
            <span>Total Amount</span>
            <span className="inv-total-amount">{fmt(totalAmount)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="inv-form-section full-width">
          <h3 className="inv-section-title">Notes</h3>
          <textarea className="inv-notes-input" rows={3}
            value={form.notes}
            onChange={e => setForm(f=>({...f, notes:e.target.value}))}
            placeholder="Payment terms, bank details, special notes…" />
        </div>
      </div>

      <div className="inv-form-footer">
        <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : editMode ? '💾 Update Invoice' : '💾 Save Invoice'}
        </button>
        <button className="inv-btn-ghost" onClick={() => { setView(editMode ? 'detail' : 'list'); setEditMode(false); }}>
          Cancel
        </button>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: DETAIL VIEW (printable invoice)
  // ────────────────────────────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    const inv = invoices.find(i => i.id === selected.id) || selected;
    const { total, paid, balance } = calcBalance(inv);
    const sc = STATUS_CONFIG[inv._derivedStatus] || STATUS_CONFIG.pending;

    return (
      <div className="inv-page">
        {/* Detail toolbar — hidden on print */}
        <div className="inv-detail-toolbar no-print">
          <button className="inv-btn-ghost" onClick={() => { setSelected(null); setView('list'); }}>
            ← All Invoices
          </button>
          <div className="inv-detail-actions">
            <button className="inv-btn-secondary" onClick={() => startEdit(inv)}>✏️ Edit</button>
            <button className="inv-btn-secondary" onClick={() => setPaymentModal(true)}>💳 Add Payment</button>
            <button className="inv-btn-secondary" onClick={handlePrint}>🖨️ Print / PDF</button>
            {isAdmin && (
              <select className="inv-status-select" value={inv._derivedStatus}
                onChange={e => handleStatusOverride(inv.id, e.target.value)}>
                {Object.keys(STATUS_CONFIG).map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            )}
            <button className="inv-btn-danger-sm" onClick={() => setConfirmDelete(inv.id)}>🗑️</button>
          </div>
        </div>

        {/* ── PRINTABLE INVOICE ── */}
        <div className="inv-print-area" ref={printRef}>
          {/* Header */}
          <div className="inv-doc-header">
            <div className="inv-doc-brand">
              <div className="inv-doc-logo">AE</div>
              <div>
                <div className="inv-doc-company">AuthExam</div>
                <div className="inv-doc-tagline">Biometric Authentication Services</div>
              </div>
            </div>
            <div className="inv-doc-title-block">
              <div className="inv-doc-title">INVOICE</div>
              <div className="inv-doc-no">#{inv.invoiceNo}</div>
              <span className="inv-doc-status-pill" style={{background:sc.bg,color:sc.color}}>{sc.label}</span>
            </div>
          </div>

          {/* Billed By / To */}
          <div className="inv-doc-parties">
            <div className="inv-doc-party">
              <div className="inv-party-label">Billed By</div>
              <div className="inv-party-name">{inv.billedByName}</div>
              {inv.billedByPhone && <div className="inv-party-detail">{inv.billedByPhone}</div>}
            </div>
            <div className="inv-doc-meta-block">
              <div className="inv-meta-row"><span>Invoice Date</span><strong>{inv.invoiceDate}</strong></div>
              {inv.projectName && <div className="inv-meta-row"><span>Project</span><strong>{inv.projectName}</strong></div>}
            </div>
            <div className="inv-doc-party right">
              <div className="inv-party-label">Billed To</div>
              <div className="inv-party-name">{inv.billedToName}</div>
            </div>
          </div>

          {/* Line items table */}
          <table className="inv-doc-table">
            <thead>
              <tr>
                <th style={{width:'5%'}}>S.No.</th>
                <th style={{width:'40%'}}>Description</th>
                <th style={{width:'15%'}}>Rate (₹)</th>
                <th style={{width:'15%'}}>Quantity</th>
                <th style={{width:'25%'}}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(inv.items || []).map((item, idx) => (
                <tr key={idx}>
                  <td className="center">{idx + 1}</td>
                  <td>{item.description}</td>
                  <td className="right">{Number(item.rate).toLocaleString('en-IN')}</td>
                  <td className="right">{Number(item.qty).toLocaleString('en-IN')}</td>
                  <td className="right">{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals + payments */}
          <div className="inv-doc-footer-block">
            {/* Payment history */}
            {(inv.payments || []).length > 0 && (
              <div className="inv-payment-history">
                <div className="inv-payment-history-title">Payment History</div>
                {(inv.payments || []).map((p, i) => (
                  <div key={i} className="inv-payment-row">
                    <span>(-) Paid ({p.date}){p.note ? ` — ${p.note}` : ''}</span>
                    <span className="inv-paid-amt">{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="inv-doc-totals">
              <div className="inv-total-line">
                <span>Total Amount</span>
                <span>{fmt(total)}</span>
              </div>
              <div className="inv-total-line grand">
                <span>Grand Total</span>
                <span>{fmt(total)}</span>
              </div>
              {paid > 0 && (
                <div className="inv-total-line paid">
                  <span>Total Paid</span>
                  <span>- {fmt(paid)}</span>
                </div>
              )}
              <div className="inv-total-line balance">
                <span>Balance Due</span>
                <span style={{color: balance > 0 ? '#ef4444' : '#10b981'}}>{fmt(balance)}</span>
              </div>
              <div className="inv-payment-status-row">
                <span>Payment Status</span>
                <span className="inv-doc-status-pill" style={{background:sc.bg,color:sc.color}}>{sc.label}</span>
              </div>
            </div>
          </div>

          {inv.notes && (
            <div className="inv-doc-notes">
              <strong>Notes:</strong> {inv.notes}
            </div>
          )}
        </div>

        {/* Payment modal */}
        {paymentModal && (
          <div className="inv-modal-overlay" onClick={() => setPaymentModal(false)}>
            <div className="inv-modal-box" onClick={e => e.stopPropagation()}>
              <h3>💳 Record Payment</h3>
              <div className="inv-field" style={{marginBottom:'1rem'}}>
                <label>Amount (₹) *</label>
                <input type="number" min="0" value={newPayment.amount}
                  onChange={e => setNewPayment(p=>({...p, amount:e.target.value}))}
                  placeholder={`Max: ₹${balance.toLocaleString('en-IN')}`} />
              </div>
              <div className="inv-field" style={{marginBottom:'1rem'}}>
                <label>Payment Date</label>
                <input type="date" value={newPayment.date}
                  onChange={e => setNewPayment(p=>({...p, date:e.target.value}))} />
              </div>
              <div className="inv-field" style={{marginBottom:'1.25rem'}}>
                <label>Note (optional)</label>
                <input value={newPayment.note}
                  onChange={e => setNewPayment(p=>({...p, note:e.target.value}))}
                  placeholder="Bank transfer, cash, UPI…" />
              </div>
              <div className="inv-modal-actions">
                <button className="inv-btn-primary" onClick={handleAddPayment}>Save Payment</button>
                <button className="inv-btn-ghost" onClick={() => setPaymentModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="inv-modal-overlay" onClick={() => setConfirmDelete(null)}>
            <div className="inv-modal-box" onClick={e => e.stopPropagation()}>
              <h3>Delete Invoice?</h3>
              <p>This action cannot be undone.</p>
              <div className="inv-modal-actions">
                <button className="inv-btn-danger" onClick={() => handleDelete(confirmDelete)}>Yes, Delete</button>
                <button className="inv-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
