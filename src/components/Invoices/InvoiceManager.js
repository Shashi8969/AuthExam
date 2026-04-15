// src/components/Invoices/InvoiceManager.js
import React, { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, update, remove, serverTimestamp } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import './InvoiceManager.css';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#d97706', bg: '#fef3c7' },
  partial:   { label: 'Partial',   color: '#2563eb', bg: '#dbeafe' },
  paid:      { label: 'Paid',      color: '#059669', bg: '#d1fae5' },
  overdue:   { label: 'Overdue',   color: '#dc2626', bg: '#fee2e2' },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6' },
};

const ITEM_TYPES = ['Mock','Training Fee','Supervisor','Operator Single Shift',
  'Operator Double Shift','Manpower','Mock Manpower','Other'];

const emptyItem    = () => ({ description:'', type:'Other', rate:'', qty:'', amount:0 });
const emptyPayment = () => ({ amount:'', date:new Date().toISOString().slice(0,10), note:'', proofUrl:'', proofName:'' });
const emptyForm    = () => ({
  invoiceNo:'', invoiceDate:new Date().toISOString().slice(0,10),
  billedByName:'', billedByPhone:'', billedToName:'', projectName:'',
  notes:'', items:[emptyItem()], payments:[],
});

const fmt  = (n) => '₹ ' + Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2});
const fmtN = (n) => Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2});

// ALWAYS recalculate live — never trust cached field
const calcBalance = (inv) => {
  const total = (inv.items    ||[]).reduce((s,i)=>s+(Number(i.amount)||0),0);
  const paid  = (inv.payments ||[]).reduce((s,p)=>s+(Number(p.amount)||0),0);
  return { total, paid, balance: total - paid };
};

const deriveStatus = (inv) => {
  if (inv.status === 'cancelled') return 'cancelled';
  const { paid, balance } = calcBalance(inv);
  if (paid === 0)    return 'pending';
  if (balance <= 0)  return 'paid';
  return 'partial';
};

export default function InvoiceManager() {
  const { user, isAdmin } = useAuth();
  const [view,setView]         = useState('list');
  const [invoices,setInvoices] = useState([]);
  const [loading,setLoading]   = useState(true);
  const [selected,setSelected] = useState(null);
  const [form,setForm]         = useState(emptyForm());
  const [saving,setSaving]     = useState(false);
  const [filterStatus,setFilterStatus] = useState('all');
  const [searchTerm,setSearchTerm]     = useState('');
  const [editMode,setEditMode]         = useState(false);
  const [confirmDelete,setConfirmDelete]   = useState(null);

  // Payment modal
  const [paymentModal,setPaymentModal]           = useState(false);
  const [editingPayIdx,setEditingPayIdx]          = useState(null);
  const [payForm,setPayForm]                     = useState(emptyPayment());
  const [uploadingProof,setUploadingProof]       = useState(false);
  const [confirmDelPayment,setConfirmDelPayment] = useState(null);
  const proofRef = useRef();

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if (!user) return;
    const unsub = onValue(ref(db,'Invoices'),(snap)=>{
      const data = snap.val();
      const list = [];
      if (data) Object.keys(data).forEach(k=>{
        const inv = {id:k,...data[k]};
        inv._derived = deriveStatus(inv);
        list.push(inv);
      });
      list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      setInvoices(list);
      setLoading(false);
    });
    return ()=>unsub();
  },[user]);

  // Keep detail view in sync with live Firebase data
  useEffect(()=>{
    if (selected && view==='detail'){
      const fresh = invoices.find(i=>i.id===selected.id);
      if (fresh) setSelected(fresh);
    }
  },[invoices]);

  // ── Auto invoice number ─────────────────────────────────────────────────────
  useEffect(()=>{
    if (view==='create' && !editMode){
      const max = invoices.reduce((m,inv)=>{
        const n=parseInt(String(inv.invoiceNo).replace(/\D/g,''))||0;
        return Math.max(m,n);
      },0);
      setForm(f=>({...f,invoiceNo:String(max+1)}));
    }
  },[view,invoices,editMode]);

  // ── Item helpers ────────────────────────────────────────────────────────────
  const updateItem=(idx,field,val)=>{
    setForm(f=>{
      const items=[...f.items];
      items[idx]={...items[idx],[field]:val};
      if (field==='rate'||field==='qty'){
        const r=parseFloat(field==='rate'?val:items[idx].rate)||0;
        const q=parseFloat(field==='qty' ?val:items[idx].qty )||0;
        items[idx].amount=r*q;
      }
      return {...f,items};
    });
  };
  const addItem    = ()=>setForm(f=>({...f,items:[...f.items,emptyItem()]}));
  const removeItem = (idx)=>setForm(f=>({...f,items:f.items.filter((_,i)=>i!==idx)}));
  const totalAmount = form.items.reduce((s,i)=>s+(Number(i.amount)||0),0);

  // ── Save invoice ────────────────────────────────────────────────────────────
  const handleSave = async ()=>{
    if (!form.billedByName.trim()||!form.billedToName.trim()||!form.invoiceNo.trim()){
      alert('Please fill: Invoice No, Billed By Name, Billed To Name.'); return;
    }
    if (!form.items.length||form.items.every(i=>!i.description.trim())){
      alert('Add at least one line item.'); return;
    }
    setSaving(true);
    try {
      const payload={...form,totalAmount,createdBy:user.uid,updatedAt:serverTimestamp()};
      payload.status=deriveStatus(payload);
      if (editMode && selected){
        await update(ref(db,`Invoices/${selected.id}`),payload);
        setView('detail');
      } else {
        payload.createdAt=serverTimestamp();
        await push(ref(db,'Invoices'),payload);
        setView('list');
      }
      setEditMode(false); setForm(emptyForm());
    } catch(err){ console.error(err); alert('Failed to save invoice.'); }
    setSaving(false);
  };

  // ── Proof upload ────────────────────────────────────────────────────────────
  const handleProofUpload = async (file)=>{
    if (!file) return;
    const allowed=['image/jpeg','image/png','image/webp','image/gif','application/pdf'];
    if (!allowed.includes(file.type)){ alert('Only images or PDF allowed.'); return; }
    if (file.size>5*1024*1024){ alert('Max 5MB.'); return; }
    setUploadingProof(true);
    try {
      const path=`payment-proofs/${user.uid}/${Date.now()}_${file.name}`;
      const snap=await uploadBytes(storageRef(storage,path),file);
      const url=await getDownloadURL(snap.ref);
      setPayForm(p=>({...p,proofUrl:url,proofName:file.name}));
    } catch(err){ console.error(err); alert('Upload failed.'); }
    setUploadingProof(false);
  };

  const removeProof = async ()=>{
    if (payForm.proofUrl){
      try { await deleteObject(storageRef(storage,payForm.proofUrl)); } catch{}
    }
    setPayForm(p=>({...p,proofUrl:'',proofName:''}));
    if (proofRef.current) proofRef.current.value='';
  };

  // ── Open payment modal ──────────────────────────────────────────────────────
  const openAddPayment = ()=>{ setEditingPayIdx(null); setPayForm(emptyPayment()); setPaymentModal(true); };
  const openEditPayment = (idx)=>{
    const p=(selected.payments||[])[idx];
    setEditingPayIdx(idx);
    setPayForm({amount:String(p.amount),date:p.date,note:p.note||'',proofUrl:p.proofUrl||'',proofName:p.proofName||''});
    setPaymentModal(true);
  };

  // ── Save payment ────────────────────────────────────────────────────────────
  const handleSavePayment = async ()=>{
    const amt=parseFloat(payForm.amount);
    if (!amt||amt<=0){ alert('Enter a valid amount.'); return; }
    const payments=[...(selected.payments||[])];
    const entry={amount:amt,date:payForm.date,note:payForm.note,proofUrl:payForm.proofUrl,proofName:payForm.proofName,savedAt:Date.now()};
    if (editingPayIdx!==null) payments[editingPayIdx]={...payments[editingPayIdx],...entry};
    else payments.push(entry);
    const newStatus=deriveStatus({...selected,payments});
    await update(ref(db,`Invoices/${selected.id}`),{payments,status:newStatus,updatedAt:serverTimestamp()});
    setPaymentModal(false); setPayForm(emptyPayment()); setEditingPayIdx(null);
  };

  // ── Delete payment ──────────────────────────────────────────────────────────
  const handleDeletePayment = async (idx)=>{
    const old=(selected.payments||[])[idx];
    if (old?.proofUrl){ try{ await deleteObject(storageRef(storage,old.proofUrl)); }catch{} }
    const payments=(selected.payments||[]).filter((_,i)=>i!==idx);
    const newStatus=deriveStatus({...selected,payments});
    await update(ref(db,`Invoices/${selected.id}`),{payments,status:newStatus,updatedAt:serverTimestamp()});
    setConfirmDelPayment(null);
  };

  // ── Delete invoice ──────────────────────────────────────────────────────────
  const handleDelete = async (id)=>{
    await remove(ref(db,`Invoices/${id}`));
    setConfirmDelete(null); setView('list'); setSelected(null);
  };

  // ── Status override ─────────────────────────────────────────────────────────
  const handleStatusOverride = async (invId,status)=>{
    await update(ref(db,`Invoices/${invId}`),{status,updatedAt:serverTimestamp()});
  };

  // ── Edit invoice ────────────────────────────────────────────────────────────
  const startEdit=(inv)=>{
    setForm({invoiceNo:inv.invoiceNo||'',invoiceDate:inv.invoiceDate||'',
      billedByName:inv.billedByName||'',billedByPhone:inv.billedByPhone||'',
      billedToName:inv.billedToName||'',projectName:inv.projectName||'',
      notes:inv.notes||'',items:inv.items||[emptyItem()],payments:inv.payments||[],status:inv.status});
    setSelected(inv); setEditMode(true); setView('create');
  };

  // ── Live stats (always from arrays, never from cache) ───────────────────────
  const stats = invoices.reduce((acc,inv)=>{
    const {total,paid,balance}=calcBalance(inv);
    acc.totalAmt   += total;
    acc.totalPaid  += paid;
    if (['pending','partial'].includes(inv._derived)) acc.receivable+=balance;
    acc[inv._derived]=(acc[inv._derived]||0)+1;
    return acc;
  },{totalAmt:0,totalPaid:0,receivable:0,pending:0,partial:0,paid:0,overdue:0,cancelled:0});

  const filtered = invoices.filter(inv=>{
    const ok=filterStatus==='all'||inv._derived===filterStatus;
    const t=searchTerm.toLowerCase();
    return ok&&(!t||[inv.billedToName,inv.billedByName,inv.invoiceNo,inv.projectName].some(v=>v?.toLowerCase().includes(t)));
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view==='list') return (
    <div className="inv-page">
      <div className="inv-top-bar">
        <div>
          <h1 className="inv-page-title">Invoice Manager</h1>
          <p className="inv-page-sub">Create, track and manage all project invoices</p>
        </div>
        <button className="inv-btn-primary" onClick={()=>{setEditMode(false);setForm(emptyForm());setView('create');}}>
          + New Invoice
        </button>
      </div>

      <div className="inv-stats-row">
        <div className="inv-stat-card"><span className="inv-stat-num">{invoices.length}</span><span className="inv-stat-label">Total Invoices</span></div>
        <div className="inv-stat-card warn"><span className="inv-stat-num">{(stats.pending||0)+(stats.partial||0)}</span><span className="inv-stat-label">Outstanding</span></div>
        <div className="inv-stat-card success"><span className="inv-stat-num">{stats.paid||0}</span><span className="inv-stat-label">Paid</span></div>
        <div className="inv-stat-card amount"><span className="inv-stat-num fmtamt">{fmt(stats.totalAmt)}</span><span className="inv-stat-label">Total Billed</span></div>
        <div className="inv-stat-card receivable"><span className="inv-stat-num fmtamt">{fmt(stats.receivable)}</span><span className="inv-stat-label">Receivable</span></div>
      </div>

      <div className="inv-filter-bar">
        <input className="inv-search" placeholder="Search by name, invoice no, project…" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
        <div className="inv-status-tabs">
          {['all',...Object.keys(STATUS_CONFIG)].map(s=>(
            <button key={s} className={`inv-tab ${filterStatus===s?'active':''}`} onClick={()=>setFilterStatus(s)}>
              {s==='all'?'All':STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {loading?<div className="inv-loading">Loading…</div>
       :filtered.length===0?<div className="inv-empty"><div className="inv-empty-icon">🧾</div><p>No invoices found.</p></div>
       :(
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead><tr><th>Invoice #</th><th>Date</th><th>Billed To</th><th>Project</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map(inv=>{
                const {total,paid,balance}=calcBalance(inv);
                const sc=STATUS_CONFIG[inv._derived]||STATUS_CONFIG.pending;
                return (
                  <tr key={inv.id} className="inv-table-row" onClick={()=>{setSelected(inv);setView('detail');}}>
                    <td><span className="inv-no">#{inv.invoiceNo}</span></td>
                    <td>{inv.invoiceDate}</td>
                    <td><span className="inv-to-name">{inv.billedToName}</span></td>
                    <td><span className="inv-project">{inv.projectName||'—'}</span></td>
                    <td>{fmt(total)}</td>
                    <td style={{color:'#059669',fontWeight:600}}>{fmt(paid)}</td>
                    <td style={{color:balance>0?'#dc2626':'#059669',fontWeight:600}}>{fmt(balance)}</td>
                    <td><span className="inv-status-pill" style={{background:sc.bg,color:sc.color}}>{sc.label}</span></td>
                    <td onClick={e=>e.stopPropagation()}>
                      <div className="inv-row-actions">
                        <button className="inv-act-btn" onClick={()=>startEdit(inv)}>✏️</button>
                        <button className="inv-act-btn danger" onClick={()=>setConfirmDelete(inv.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
       )}

      {confirmDelete&&(
        <div className="inv-modal-overlay" onClick={()=>setConfirmDelete(null)}>
          <div className="inv-modal-box" onClick={e=>e.stopPropagation()}>
            <h3>Delete Invoice?</h3><p>This action cannot be undone.</p>
            <div className="inv-modal-actions">
              <button className="inv-btn-danger" onClick={()=>handleDelete(confirmDelete)}>Yes, Delete</button>
              <button className="inv-btn-ghost" onClick={()=>setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE / EDIT VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view==='create') return (
    <div className="inv-page">
      <div className="inv-top-bar">
        <div><h1 className="inv-page-title">{editMode?'Edit Invoice':'New Invoice'}</h1><p className="inv-page-sub">Fill in the details below</p></div>
        <button className="inv-btn-ghost" onClick={()=>{setView(editMode?'detail':'list');setEditMode(false);}}>← Cancel</button>
      </div>
      <div className="inv-form-grid">
        <div className="inv-form-section">
          <h3 className="inv-section-title">Billed By</h3>
          <div className="inv-field-row">
            <div className="inv-field"><label>Name *</label><input value={form.billedByName} onChange={e=>setForm(f=>({...f,billedByName:e.target.value}))} placeholder="Your name / company"/></div>
            <div className="inv-field"><label>Phone</label><input value={form.billedByPhone} onChange={e=>setForm(f=>({...f,billedByPhone:e.target.value}))} placeholder="+91-XXXXXXXXXX"/></div>
          </div>
        </div>
        <div className="inv-form-section">
          <h3 className="inv-section-title">Invoice Details</h3>
          <div className="inv-field-row">
            <div className="inv-field"><label>Invoice No *</label><input value={form.invoiceNo} onChange={e=>setForm(f=>({...f,invoiceNo:e.target.value}))}/></div>
            <div className="inv-field"><label>Invoice Date *</label><input type="date" value={form.invoiceDate} onChange={e=>setForm(f=>({...f,invoiceDate:e.target.value}))}/></div>
          </div>
        </div>
        <div className="inv-form-section full-width">
          <h3 className="inv-section-title">Billed To</h3>
          <div className="inv-field-row">
            <div className="inv-field"><label>Client Name *</label><input value={form.billedToName} onChange={e=>setForm(f=>({...f,billedToName:e.target.value}))} placeholder="Client / organization name"/></div>
            <div className="inv-field"><label>Project Name</label><input value={form.projectName} onChange={e=>setForm(f=>({...f,projectName:e.target.value}))} placeholder="BPSC Sep 2025…"/></div>
          </div>
        </div>
        <div className="inv-form-section full-width">
          <h3 className="inv-section-title">Line Items</h3>
          <div className="inv-items-table-wrap">
            <table className="inv-items-table">
              <thead><tr><th style={{width:'30%'}}>Description</th><th style={{width:'20%'}}>Type</th><th style={{width:'15%'}}>Rate (₹)</th><th style={{width:'15%'}}>Qty</th><th style={{width:'15%'}}>Amount (₹)</th><th style={{width:'5%'}}></th></tr></thead>
              <tbody>
                {form.items.map((item,idx)=>(
                  <tr key={idx} className="inv-item-row">
                    <td><input className="inv-cell-input" value={item.description} onChange={e=>updateItem(idx,'description',e.target.value)} placeholder="e.g. Mock, Operator…"/></td>
                    <td><select className="inv-cell-input" value={item.type} onChange={e=>updateItem(idx,'type',e.target.value)}>{ITEM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></td>
                    <td><input className="inv-cell-input" type="number" min="0" value={item.rate} onChange={e=>updateItem(idx,'rate',e.target.value)} placeholder="0"/></td>
                    <td><input className="inv-cell-input" type="number" min="0" value={item.qty} onChange={e=>updateItem(idx,'qty',e.target.value)} placeholder="0"/></td>
                    <td className="inv-amount-cell">{fmt(item.amount)}</td>
                    <td>{form.items.length>1&&<button className="inv-remove-item" onClick={()=>removeItem(idx)}>✕</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="inv-add-item-btn" onClick={addItem}>+ Add Line Item</button>
          <div className="inv-total-row"><span>Total Amount</span><span className="inv-total-amount">{fmt(totalAmount)}</span></div>
        </div>
        <div className="inv-form-section full-width">
          <h3 className="inv-section-title">Notes</h3>
          <textarea className="inv-notes-input" rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Payment terms, bank details, special notes…"/>
        </div>
      </div>
      <div className="inv-form-footer">
        <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':editMode?'💾 Update Invoice':'💾 Save Invoice'}</button>
        <button className="inv-btn-ghost" onClick={()=>{setView(editMode?'detail':'list');setEditMode(false);}}>Cancel</button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view==='detail' && selected){
    const inv = invoices.find(i=>i.id===selected.id)||selected;
    const {total,paid,balance}=calcBalance(inv);
    const sc=STATUS_CONFIG[inv._derived]||STATUS_CONFIG.pending;

    return (
      <div className="inv-page">
        {/* Toolbar */}
        <div className="inv-detail-toolbar no-print">
          <button className="inv-btn-ghost" onClick={()=>{setSelected(null);setView('list');}}>← All Invoices</button>
          <div className="inv-detail-actions">
            <button className="inv-btn-secondary" onClick={()=>startEdit(inv)}>✏️ Edit</button>
            <button className="inv-btn-secondary" onClick={openAddPayment}>💳 Add Payment</button>
            <button className="inv-btn-secondary" onClick={()=>window.print()}>🖨️ Print / PDF</button>
            {isAdmin&&(
              <select className="inv-status-select" value={inv._derived} onChange={e=>handleStatusOverride(inv.id,e.target.value)}>
                {Object.keys(STATUS_CONFIG).map(s=><option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            )}
            <button className="inv-btn-danger-sm" onClick={()=>setConfirmDelete(inv.id)}>🗑️</button>
          </div>
        </div>

        {/* ── MODERN PRINTABLE INVOICE ── */}
        <div className="inv-print-area">

          {/* Accent bar */}
          <div className="inv-doc-accent-bar"></div>

          {/* Header */}
          <div className="inv-doc-header">
            <div className="inv-doc-from">
              <div className="inv-doc-from-name">{inv.billedByName}</div>
              {inv.billedByPhone&&<div className="inv-doc-from-detail">{inv.billedByPhone}</div>}
            </div>
            <div className="inv-doc-title-col">
              <div className="inv-doc-word">INVOICE</div>
              <div className="inv-doc-number">#{inv.invoiceNo}</div>
              <div className="inv-doc-meta-pills">
                <span className="inv-meta-pill">{inv.invoiceDate}</span>
                {inv.projectName&&<span className="inv-meta-pill accent">{inv.projectName}</span>}
              </div>
            </div>
          </div>

          {/* To / Status strip */}
          <div className="inv-doc-to-strip">
            <div>
              <div className="inv-strip-label">Billed To</div>
              <div className="inv-strip-name">{inv.billedToName}</div>
            </div>
            <span className="inv-doc-big-status" style={{background:sc.bg,color:sc.color}}>{sc.label}</span>
          </div>

          {/* Line items */}
          <table className="inv-doc-table">
            <thead>
              <tr>
                <th className="tc">#</th>
                <th>Description</th>
                <th className="tr">Rate (₹)</th>
                <th className="tr">Qty</th>
                <th className="tr">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(inv.items||[]).map((item,idx)=>(
                <tr key={idx} className={idx%2===1?'inv-row-alt':''}>
                  <td className="tc inv-sno">{idx+1}</td>
                  <td className="inv-desc">{item.description}</td>
                  <td className="tr">{fmtN(item.rate)}</td>
                  <td className="tr">{fmtN(item.qty)}</td>
                  <td className="tr inv-item-amt">{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer: payments left, totals right */}
          <div className="inv-doc-footer-grid">

            {/* Payment history with edit/delete (screen only) */}
            <div className="inv-doc-payments">
              {(inv.payments||[]).length>0?(
                <>
                  <div className="inv-ph-title">Payment History</div>
                  {(inv.payments||[]).map((p,i)=>(
                    <div key={i} className="inv-ph-row">
                      <div className="inv-ph-left">
                        <span className="inv-ph-dot"></span>
                        <div>
                          <div className="inv-ph-date">Paid on {p.date}</div>
                          <div className="inv-ph-note">{p.note||'—'}</div>
                          {p.proofUrl&&(
                            <a href={p.proofUrl} target="_blank" rel="noreferrer" className="inv-ph-proof no-print">
                              📎 {p.proofName||'View proof'}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="inv-ph-right">
                        <span className="inv-ph-amt">{fmt(p.amount)}</span>
                        <div className="inv-ph-actions no-print">
                          <button className="inv-ph-edit" onClick={()=>openEditPayment(i)} title="Edit payment">✏️</button>
                          <button className="inv-ph-del" onClick={()=>setConfirmDelPayment(i)} title="Delete payment">🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ):(
                <div className="inv-no-payments no-print">
                  <span>No payments recorded yet.</span>
                  <button className="inv-add-pay-inline" onClick={openAddPayment}>+ Record payment</button>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="inv-doc-totals">
              <div className="inv-tl"><span>Subtotal</span><span>{fmt(total)}</span></div>
              <div className="inv-tl grand"><span>Grand Total</span><span>{fmt(total)}</span></div>
              {paid>0&&<div className="inv-tl paid"><span>Total Paid</span><span>− {fmt(paid)}</span></div>}
              <div className="inv-tl balance" style={{color:balance>0?'#dc2626':'#059669'}}>
                <span>Balance Due</span><span>{fmt(balance)}</span>
              </div>
              <div className="inv-tl status-row">
                <span>Payment Status</span>
                <span className="inv-totals-status" style={{background:sc.bg,color:sc.color}}>{sc.label}</span>
              </div>
            </div>
          </div>

          {inv.notes&&<div className="inv-doc-notes"><strong>Note:</strong> {inv.notes}</div>}

          <div className="inv-doc-footer-line">
            <span>Thank you for your business</span>
            <span>{inv.billedByName}</span>
          </div>
        </div>

        {/* Payment modal */}
        {paymentModal&&(
          <div className="inv-modal-overlay" onClick={()=>setPaymentModal(false)}>
            <div className="inv-modal-box" onClick={e=>e.stopPropagation()}>
              <h3>{editingPayIdx!==null?'✏️ Edit Payment':'💳 Record Payment'}</h3>
              <div className="inv-field" style={{marginBottom:'1rem'}}>
                <label>Amount (₹) *</label>
                <input type="number" min="0" value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))} placeholder="Enter amount"/>
              </div>
              <div className="inv-field" style={{marginBottom:'1rem'}}>
                <label>Payment Date</label>
                <input type="date" value={payForm.date} onChange={e=>setPayForm(p=>({...p,date:e.target.value}))}/>
              </div>
              <div className="inv-field" style={{marginBottom:'1rem'}}>
                <label>Note</label>
                <input value={payForm.note} onChange={e=>setPayForm(p=>({...p,note:e.target.value}))} placeholder="Bank transfer, cash, UPI…"/>
              </div>
              <div className="inv-field" style={{marginBottom:'1.25rem'}}>
                <label>Proof / Receipt (optional)</label>
                {payForm.proofUrl?(
                  <div className="inv-proof-preview">
                    <a href={payForm.proofUrl} target="_blank" rel="noreferrer" className="inv-proof-link">
                      📎 {payForm.proofName||'View uploaded file'}
                    </a>
                    <button className="inv-proof-remove" onClick={removeProof}>Remove</button>
                  </div>
                ):(
                  <div className="inv-proof-upload-area" onClick={()=>proofRef.current?.click()}>
                    <input type="file" ref={proofRef} accept="image/*,.pdf" style={{display:'none'}} onChange={e=>handleProofUpload(e.target.files[0])}/>
                    {uploadingProof?(
                      <span className="inv-uploading">⏳ Uploading…</span>
                    ):(
                      <span>📷 Click to attach photo / PDF (max 5MB)</span>
                    )}
                  </div>
                )}
              </div>
              <div className="inv-modal-actions">
                <button className="inv-btn-primary" onClick={handleSavePayment} disabled={uploadingProof}>
                  {uploadingProof?'Uploading…':'Save Payment'}
                </button>
                <button className="inv-btn-ghost" onClick={()=>setPaymentModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm delete payment */}
        {confirmDelPayment!==null&&(
          <div className="inv-modal-overlay" onClick={()=>setConfirmDelPayment(null)}>
            <div className="inv-modal-box" onClick={e=>e.stopPropagation()}>
              <h3>Delete Payment?</h3>
              <p>This payment record will be permanently removed and the balance will be updated.</p>
              <div className="inv-modal-actions">
                <button className="inv-btn-danger" onClick={()=>handleDeletePayment(confirmDelPayment)}>Yes, Delete</button>
                <button className="inv-btn-ghost" onClick={()=>setConfirmDelPayment(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm delete invoice */}
        {confirmDelete&&(
          <div className="inv-modal-overlay" onClick={()=>setConfirmDelete(null)}>
            <div className="inv-modal-box" onClick={e=>e.stopPropagation()}>
              <h3>Delete Invoice?</h3><p>This action cannot be undone.</p>
              <div className="inv-modal-actions">
                <button className="inv-btn-danger" onClick={()=>handleDelete(confirmDelete)}>Yes, Delete</button>
                <button className="inv-btn-ghost" onClick={()=>setConfirmDelete(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
}
