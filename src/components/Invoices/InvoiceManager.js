// src/components/Invoices/InvoiceManager.js
import React, { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, update, remove, serverTimestamp } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import './InvoiceManager.css';

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label:'Pending',   color:'#d97706', bg:'#fef3c7' },
  partial:   { label:'Partial',   color:'#2563eb', bg:'#dbeafe' },
  paid:      { label:'Paid',      color:'#059669', bg:'#d1fae5' },
  overdue:   { label:'Overdue',   color:'#dc2626', bg:'#fee2e2' },
  cancelled: { label:'Cancelled', color:'#6b7280', bg:'#f3f4f6' },
};

const ITEM_TYPES = ['Mock','Training Fee','Supervisor','Operator Single Shift',
  'Operator Double Shift','Manpower','Mock Manpower','Other'];

const TEMPLATES = [
  { id:'modern',    name:'Modern Blue',    desc:'Clean gradient header, blue accents' },
  { id:'classic',   name:'Classic',        desc:'Traditional tally-style layout' },
  { id:'minimal',   name:'Minimal',        desc:'Ultra-clean, white space focused' },
  { id:'watermark', name:'Watermark',      desc:'Bold diagonal watermark stamp' },
  { id:'corporate', name:'Corporate Dark', desc:'Dark header, premium executive look' },
];

const emptyItem    = ()=>({ description:'', type:'Other', rate:'', qty:'', amount:0 });
const emptyPayment = ()=>({ amount:'', date:new Date().toISOString().slice(0,10), note:'', proofUrl:'', proofName:'' });
const emptyForm    = ()=>({
  template:'modern',
  invoiceNo:'', invoiceDate:new Date().toISOString().slice(0,10),
  dueDate:'', billedByName:'', billedByPhone:'', billedByEmail:'',
  billedByAddress:'', billedByGST:'',
  billedToName:'', billedToPhone:'', billedToEmail:'',
  billedToAddress:'', billedToGST:'',
  projectName:'', poNumber:'',
  bankName:'', accountNo:'', ifscCode:'', accountHolder:'', upiId:'',
  notes:'', remark:'',
  signatureUrl:'', signatureName:'',
  watermarkText:'',
  items:[emptyItem()], payments:[],
  discountType:'percent',  // 'percent' or 'flat'
  discountValue:'',
  taxPercent:'',           // GST/tax %
});

const fmt  = n=>'₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2});
const fmtN = n=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2});

const calcBalance = inv=>{
  const subtotal=(inv.items   ||[]).reduce((s,i)=>s+(Number(i.amount)||0),0);
  const dv=Number(inv.discountValue)||0;
  const discount=inv.discountType==='flat' ? dv : (subtotal*dv/100);
  const afterDiscount=subtotal-discount;
  const tax=afterDiscount*(Number(inv.taxPercent)||0)/100;
  const total=afterDiscount+tax;
  const paid =(inv.payments||[]).reduce((s,p)=>s+(Number(p.amount)||0),0);
  return {subtotal,discount,tax,total,paid,balance:total-paid};
};
const deriveStatus = inv=>{
  if (inv.status==='cancelled') return 'cancelled';
  const {paid,balance}=calcBalance(inv);
  if (paid===0) return 'pending';
  if (balance<=0) return 'paid';
  return 'partial';
};

// ── Template renderers ───────────────────────────────────────────────────────
function TemplateModern({inv,sc,subtotal,discount,tax,total,paid,balance,onEditPay,onDelPay,onAddPay,noprint}){
  return (
    <div className="inv-print-area tmpl-modern">
      <div className="tmpl-modern-bar"/>
      <div className="tmpl-modern-header">
        <div>
          <div className="tmpl-modern-from">{inv.billedByName}</div>
          {inv.billedByPhone&&<div className="tmpl-sub">{inv.billedByPhone}</div>}
          {inv.billedByEmail&&<div className="tmpl-sub">{inv.billedByEmail}</div>}
          {inv.billedByAddress&&<div className="tmpl-sub">{inv.billedByAddress}</div>}
          {inv.billedByGST&&<div className="tmpl-sub">GST: {inv.billedByGST}</div>}
        </div>
        <div className="tmpl-modern-no-block">
          <div className="tmpl-word">INVOICE</div>
          <div className="tmpl-big-no">#{inv.invoiceNo}</div>
          <div className="tmpl-pill-row">
            <span className="tmpl-pill">{inv.invoiceDate}</span>
            {inv.dueDate&&<span className="tmpl-pill red">Due {inv.dueDate}</span>}
            {inv.projectName&&<span className="tmpl-pill blue">{inv.projectName}</span>}
          </div>
        </div>
      </div>
      <div className="tmpl-modern-to-strip">
        <div>
          <div className="tmpl-to-label">Billed To</div>
          <div className="tmpl-to-name">{inv.billedToName}</div>
          {inv.billedToPhone&&<div className="tmpl-sub">{inv.billedToPhone}</div>}
          {inv.billedToAddress&&<div className="tmpl-sub">{inv.billedToAddress}</div>}
          {inv.billedToGST&&<div className="tmpl-sub">GST: {inv.billedToGST}</div>}
        </div>
        <span className="tmpl-status-badge" style={{background:sc.bg,color:sc.color}}>{sc.label}</span>
      </div>
      <InvTable inv={inv}/>
      <InvFooter inv={inv} sc={sc} subtotal={subtotal} discount={discount} tax={tax} total={total} paid={paid} balance={balance} onEditPay={onEditPay} onDelPay={onDelPay} onAddPay={onAddPay} noprint={noprint}/>
      {inv.watermarkText&&<div className="tmpl-watermark">{inv.watermarkText}</div>}
    </div>
  );
}

function TemplateClassic({inv,sc,subtotal,discount,tax,total,paid,balance,onEditPay,onDelPay,onAddPay,noprint}){
  return (
    <div className="inv-print-area tmpl-classic">
      <div className="tmpl-classic-header">
        <div className="tmpl-classic-brand">
          <div className="tmpl-classic-name">{inv.billedByName}</div>
          {inv.billedByAddress&&<div className="tmpl-sub-c">{inv.billedByAddress}</div>}
          {inv.billedByPhone&&<div className="tmpl-sub-c">Ph: {inv.billedByPhone}</div>}
          {inv.billedByGST&&<div className="tmpl-sub-c">GSTIN: {inv.billedByGST}</div>}
        </div>
        <div className="tmpl-classic-docblock">
          <div className="tmpl-classic-title">TAX INVOICE</div>
          <table className="tmpl-classic-meta">
            <tbody>
              <tr><td>Invoice No.</td><td><strong>{inv.invoiceNo}</strong></td></tr>
              <tr><td>Date</td><td><strong>{inv.invoiceDate}</strong></td></tr>
              {inv.dueDate&&<tr><td>Due Date</td><td><strong>{inv.dueDate}</strong></td></tr>}
              {inv.poNumber&&<tr><td>P.O. No.</td><td><strong>{inv.poNumber}</strong></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="tmpl-classic-to-box">
        <div className="tmpl-classic-to-label">Bill To:</div>
        <div className="tmpl-classic-to-name">{inv.billedToName}</div>
        {inv.billedToAddress&&<div className="tmpl-sub-c">{inv.billedToAddress}</div>}
        {inv.billedToPhone&&<div className="tmpl-sub-c">Ph: {inv.billedToPhone}</div>}
        {inv.billedToGST&&<div className="tmpl-sub-c">GSTIN: {inv.billedToGST}</div>}
      </div>
      <InvTable inv={inv} style="classic"/>
      <InvFooter inv={inv} sc={sc} subtotal={subtotal} discount={discount} tax={tax} total={total} paid={paid} balance={balance} onEditPay={onEditPay} onDelPay={onDelPay} onAddPay={onAddPay} noprint={noprint} style="classic"/>
      {inv.watermarkText&&<div className="tmpl-watermark">{inv.watermarkText}</div>}
    </div>
  );
}

function TemplateMinimal({inv,sc,subtotal,discount,tax,total,paid,balance,onEditPay,onDelPay,onAddPay,noprint}){
  return (
    <div className="inv-print-area tmpl-minimal">
      <div className="tmpl-minimal-header">
        <div className="tmpl-minimal-left">
          <div className="tmpl-minimal-from">{inv.billedByName}</div>
          {inv.billedByPhone&&<div className="tmpl-sub">{inv.billedByPhone}</div>}
          {inv.billedByGST&&<div className="tmpl-sub">GST: {inv.billedByGST}</div>}
        </div>
        <div className="tmpl-minimal-right">
          <span className="tmpl-minimal-tag">INVOICE</span>
          <div className="tmpl-minimal-no">#{inv.invoiceNo}</div>
          <div className="tmpl-sub" style={{textAlign:'right'}}>{inv.invoiceDate}</div>
          {inv.dueDate&&<div className="tmpl-sub" style={{textAlign:'right',color:'#dc2626'}}>Due: {inv.dueDate}</div>}
        </div>
      </div>
      <div className="tmpl-minimal-divider"/>
      <div className="tmpl-minimal-to">
        <span className="tmpl-minimal-to-label">TO</span>
        <div className="tmpl-minimal-to-name">{inv.billedToName}</div>
        {inv.billedToAddress&&<div className="tmpl-sub">{inv.billedToAddress}</div>}
        {inv.billedToGST&&<div className="tmpl-sub">GST: {inv.billedToGST}</div>}
        {inv.projectName&&<div className="tmpl-minimal-project">{inv.projectName}</div>}
      </div>
      <InvTable inv={inv} style="minimal"/>
      <InvFooter inv={inv} sc={sc} subtotal={subtotal} discount={discount} tax={tax} total={total} paid={paid} balance={balance} onEditPay={onEditPay} onDelPay={onDelPay} onAddPay={onAddPay} noprint={noprint} style="minimal"/>
      {inv.watermarkText&&<div className="tmpl-watermark">{inv.watermarkText}</div>}
    </div>
  );
}

function TemplateWatermark({inv,sc,subtotal,discount,tax,total,paid,balance,onEditPay,onDelPay,onAddPay,noprint}){
  return (
    <div className="inv-print-area tmpl-watermark-wrap">
      {inv.watermarkText&&<div className="tmpl-wm-stamp">{inv.watermarkText||sc.label.toUpperCase()}</div>}
      <div className="tmpl-wm-header">
        <div>
          <div className="tmpl-wm-from">{inv.billedByName}</div>
          {inv.billedByPhone&&<div className="tmpl-sub">{inv.billedByPhone}</div>}
          {inv.billedByAddress&&<div className="tmpl-sub">{inv.billedByAddress}</div>}
          {inv.billedByGST&&<div className="tmpl-sub">GSTIN: {inv.billedByGST}</div>}
        </div>
        <div style={{textAlign:'right'}}>
          <div className="tmpl-wm-title">INVOICE</div>
          <div className="tmpl-wm-no">#{inv.invoiceNo}</div>
          <div className="tmpl-sub" style={{textAlign:'right'}}>{inv.invoiceDate}</div>
          {inv.projectName&&<div className="tmpl-pill blue" style={{marginTop:6}}>{inv.projectName}</div>}
        </div>
      </div>
      <div className="tmpl-wm-to">
        <div><div className="tmpl-to-label">Bill To</div><div className="tmpl-wm-to-name">{inv.billedToName}</div>
          {inv.billedToAddress&&<div className="tmpl-sub">{inv.billedToAddress}</div>}
          {inv.billedToGST&&<div className="tmpl-sub">GSTIN: {inv.billedToGST}</div>}
        </div>
        <span className="tmpl-status-badge" style={{background:sc.bg,color:sc.color}}>{sc.label}</span>
      </div>
      <InvTable inv={inv} style="watermark"/>
      <InvFooter inv={inv} sc={sc} subtotal={subtotal} discount={discount} tax={tax} total={total} paid={paid} balance={balance} onEditPay={onEditPay} onDelPay={onDelPay} onAddPay={onAddPay} noprint={noprint} style="watermark"/>
    </div>
  );
}

function TemplateCorporate({inv,sc,subtotal,discount,tax,total,paid,balance,onEditPay,onDelPay,onAddPay,noprint}){
  return (
    <div className="inv-print-area tmpl-corp">
      <div className="tmpl-corp-header">
        <div className="tmpl-corp-brand">
          <div className="tmpl-corp-from">{inv.billedByName}</div>
          {inv.billedByPhone&&<div className="tmpl-corp-sub">{inv.billedByPhone}</div>}
          {inv.billedByEmail&&<div className="tmpl-corp-sub">{inv.billedByEmail}</div>}
          {inv.billedByGST&&<div className="tmpl-corp-sub">GSTIN: {inv.billedByGST}</div>}
        </div>
        <div className="tmpl-corp-right">
          <div className="tmpl-corp-word">INVOICE</div>
          <div className="tmpl-corp-no">#{inv.invoiceNo}</div>
          <div className="tmpl-corp-date">{inv.invoiceDate}</div>
          {inv.dueDate&&<div className="tmpl-corp-due">Due: {inv.dueDate}</div>}
        </div>
      </div>
      <div className="tmpl-corp-body">
        <div className="tmpl-corp-to-box">
          <div className="tmpl-corp-to-label">BILL TO</div>
          <div className="tmpl-corp-to-name">{inv.billedToName}</div>
          {inv.billedToAddress&&<div className="tmpl-corp-to-sub">{inv.billedToAddress}</div>}
          {inv.billedToPhone&&<div className="tmpl-corp-to-sub">{inv.billedToPhone}</div>}
          {inv.billedToGST&&<div className="tmpl-corp-to-sub">GSTIN: {inv.billedToGST}</div>}
        </div>
        <div className="tmpl-corp-meta">
          {inv.projectName&&<div className="tmpl-corp-meta-row"><span>Project</span><span>{inv.projectName}</span></div>}
          {inv.poNumber&&<div className="tmpl-corp-meta-row"><span>P.O. No.</span><span>{inv.poNumber}</span></div>}
          <div className="tmpl-corp-meta-row"><span>Status</span><span className="tmpl-status-badge" style={{background:sc.bg,color:sc.color}}>{sc.label}</span></div>
        </div>
      </div>
      <InvTable inv={inv} style="corporate"/>
      <InvFooter inv={inv} sc={sc} subtotal={subtotal} discount={discount} tax={tax} total={total} paid={paid} balance={balance} onEditPay={onEditPay} onDelPay={onDelPay} onAddPay={onAddPay} noprint={noprint} style="corporate"/>
      {inv.watermarkText&&<div className="tmpl-watermark corp">{inv.watermarkText}</div>}
    </div>
  );
}

// ── Shared InvTable ──────────────────────────────────────────────────────────
function InvTable({inv,style}){
  return (
    <table className={`inv-doc-table ${style?'tbl-'+style:''}`}>
      <thead><tr>
        <th className="tc">#</th>
        <th>Description</th>
        <th className="tr">Rate (₹)</th>
        <th className="tr">Qty</th>
        <th className="tr">Amount (₹)</th>
      </tr></thead>
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
  );
}

// ── Shared InvFooter ─────────────────────────────────────────────────────────
function InvFooter({inv,sc,subtotal,discount,tax,total,paid,balance,onEditPay,onDelPay,onAddPay,noprint,style}){
  return (
    <>
      <div className={`inv-doc-footer-grid ${style?'fg-'+style:''}`}>
        <div className="inv-doc-payments">
          {(inv.payments||[]).length>0?(
            <>
              <div className="inv-ph-title">Payment History</div>
              {(inv.payments||[]).map((p,i)=>(
                <div key={i} className="inv-ph-row">
                  <div className="inv-ph-left">
                    <span className="inv-ph-dot"/>
                    <div>
                      <div className="inv-ph-date">Paid on {p.date}</div>
                      <div className="inv-ph-note">{p.note||'—'}</div>
                      {p.proofUrl&&<a href={p.proofUrl} target="_blank" rel="noreferrer" className="inv-ph-proof no-print">📎 {p.proofName||'View proof'}</a>}
                    </div>
                  </div>
                  <div className="inv-ph-right">
                    <span className="inv-ph-amt">{fmt(p.amount)}</span>
                    {noprint&&<div className="inv-ph-actions no-print">
                      <button className="inv-ph-edit" onClick={()=>onEditPay(i)}>✏️</button>
                      <button className="inv-ph-del"  onClick={()=>onDelPay(i)}>🗑️</button>
                    </div>}
                  </div>
                </div>
              ))}
            </>
          ):(
            noprint&&<div className="inv-no-payments no-print">
              <span>No payments yet.</span>
              <button className="inv-add-pay-inline" onClick={onAddPay}>+ Record payment</button>
            </div>
          )}

          {/* Bank details */}
          {(inv.bankName||inv.accountNo||inv.ifscCode||inv.upiId)&&(
            <div className="inv-bank-block">
              <div className="inv-bank-title">Bank Details</div>
              {inv.accountHolder&&<div className="inv-bank-row"><span>Account Name</span><span>{inv.accountHolder}</span></div>}
              {inv.bankName&&<div className="inv-bank-row"><span>Bank</span><span>{inv.bankName}</span></div>}
              {inv.accountNo&&<div className="inv-bank-row"><span>Account No.</span><span>{inv.accountNo}</span></div>}
              {inv.ifscCode&&<div className="inv-bank-row"><span>IFSC</span><span>{inv.ifscCode}</span></div>}
              {inv.upiId&&<div className="inv-bank-row"><span>UPI</span><span>{inv.upiId}</span></div>}
            </div>
          )}
        </div>

        <div className="inv-doc-totals">
          <div className="inv-tl"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          {discount>0&&<div className="inv-tl" style={{color:'#dc2626'}}><span>Discount {inv.discountType==='percent'?`(${inv.discountValue}%)`:''}</span><span>− {fmt(discount)}</span></div>}
          {tax>0&&<div className="inv-tl" style={{color:'#059669'}}><span>Tax / GST ({inv.taxPercent}%)</span><span>+ {fmt(tax)}</span></div>}
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

      {/* Notes + Remark + Signature */}
      <div className="inv-doc-bottom-row">
        <div className="inv-doc-notes-sig">
          {inv.notes&&<div className="inv-doc-notes"><strong>Notes:</strong> {inv.notes}</div>}
          {inv.remark&&<div className="inv-doc-remark"><strong>Remark:</strong> {inv.remark}</div>}
        </div>
        {inv.signatureUrl&&(
          <div className="inv-signature-block">
            <img src={inv.signatureUrl} alt="Signature" className="inv-signature-img"/>
            <div className="inv-sig-line"/>
            <div className="inv-sig-name">{inv.signatureName||inv.billedByName}</div>
            <div className="inv-sig-label">Authorised Signatory</div>
          </div>
        )}
      </div>

      <div className="inv-doc-footer-line">
        <span>Thank you for your business</span>
        <span>{inv.billedByName}</span>
      </div>
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function InvoiceManager(){
  useDocumentMeta({ title: 'Invoices', noindex: true });
  const {user,isAdmin}=useAuth();
  const [view,setView]         = useState('list');
  const [invoices,setInvoices] = useState([]);
  const [loading,setLoading]   = useState(true);
  const [selected,setSelected] = useState(null);
  const [form,setForm]         = useState(emptyForm());
  const [saving,setSaving]     = useState(false);
  const [filterStatus,setFilterStatus]=useState('all');
  const [searchTerm,setSearchTerm]    =useState('');
  const [editMode,setEditMode]        =useState(false);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [formTab,setFormTab]          =useState('basic'); // basic|to|items|bank|extra
  const [showTemplateChooser,setShowTemplateChooser]=useState(false);

  // Payment modal
  const [paymentModal,setPaymentModal]    =useState(false);
  const [editingPayIdx,setEditingPayIdx]  =useState(null);
  const [payForm,setPayForm]             =useState(emptyPayment());
  const [uploadingProof,setUploadingProof]=useState(false);
  const [confirmDelPay,setConfirmDelPay] =useState(null);
  const proofRef=useRef(); const sigRef=useRef();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if (!user) return;
    const unsub=onValue(ref(db,'Invoices'),snap=>{
      const data=snap.val(); const list=[];
      if(data) Object.keys(data).forEach(k=>{const inv={id:k,...data[k]};inv._derived=deriveStatus(inv);list.push(inv);});
      list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      setInvoices(list); setLoading(false);
    });
    return ()=>unsub();
  },[user]);

  useEffect(()=>{
    if(selected&&view==='detail'){const f=invoices.find(i=>i.id===selected.id);if(f)setSelected(f);}
  },[invoices]);

  useEffect(()=>{
    if(view==='create'&&!editMode){
      const max=invoices.reduce((m,inv)=>{const n=parseInt(String(inv.invoiceNo).replace(/\D/g,''))||0;return Math.max(m,n);},0);
      setForm(f=>({...f,invoiceNo:String(max+1)}));
    }
  },[view,invoices,editMode]);

  // ── Item helpers ──────────────────────────────────────────────────────────
  const updateItem=(idx,field,val)=>{
    setForm(f=>{
      const items=[...f.items]; items[idx]={...items[idx],[field]:val};
      if(field==='rate'||field==='qty'){
        const r=parseFloat(field==='rate'?val:items[idx].rate)||0;
        const q=parseFloat(field==='qty'?val:items[idx].qty)||0;
        items[idx].amount=r*q;
      }
      return {...f,items};
    });
  };
  const addItem=()=>setForm(f=>({...f,items:[...f.items,emptyItem()]}));
  const removeItem=idx=>setForm(f=>({...f,items:f.items.filter((_,i)=>i!==idx)}));
// Calculate live totals for the form
const { 
  subtotal: formSubtotal, 
  discount: formDiscount, 
  tax: formTax, 
  total: totalAmount 
} = calcBalance(form);
  // ── Save invoice ──────────────────────────────────────────────────────────
  const handleSave=async()=>{
    if(!form.billedByName.trim()||!form.billedToName.trim()||!form.invoiceNo.trim()){alert('Fill: Invoice No, Billed By, Billed To.');return;}
    if(!form.items.length||form.items.every(i=>!i.description.trim())){alert('Add at least one line item.');return;}
    setSaving(true);
    try{
      const payload={...form,totalAmount,createdBy:user.uid,updatedAt:serverTimestamp()};
      payload.status=deriveStatus(payload);
      if(editMode&&selected){await update(ref(db,`Invoices/${selected.id}`),payload);setView('detail');}
      else{payload.createdAt=serverTimestamp();await push(ref(db,'Invoices'),payload);setView('list');}
      setEditMode(false);setForm(emptyForm());
    }catch(err){console.error(err);alert('Failed to save.');}
    setSaving(false);
  };

  // ── Upload helpers ────────────────────────────────────────────────────────
  const uploadFile=async(file,path)=>{
    const snap=await uploadBytes(storageRef(storage,path),file);
    return getDownloadURL(snap.ref);
  };

  const handleProofUpload=async file=>{
    if(!file)return;
    if(file.size>5*1024*1024){alert('Max 5MB.');return;}
    setUploadingProof(true);
    try{const url=await uploadFile(file,`payment-proofs/${user.uid}/${Date.now()}_${file.name}`);setPayForm(p=>({...p,proofUrl:url,proofName:file.name}));}
    catch{alert('Upload failed.');}
    setUploadingProof(false);
  };

  const handleSignatureUpload=async file=>{
    if(!file)return;
    if(file.size>2*1024*1024){alert('Max 2MB for signature.');return;}
    try{const url=await uploadFile(file,`signatures/${user.uid}/${Date.now()}_${file.name}`);setForm(f=>({...f,signatureUrl:url}));}
    catch{alert('Upload failed.');}
  };

  const removeProof=async()=>{
    if(payForm.proofUrl){try{await deleteObject(storageRef(storage,payForm.proofUrl));}catch{}}
    setPayForm(p=>({...p,proofUrl:'',proofName:''}));
    if(proofRef.current)proofRef.current.value='';
  };

  // ── Payment CRUD ──────────────────────────────────────────────────────────
  const openAddPayment=()=>{setEditingPayIdx(null);setPayForm(emptyPayment());setPaymentModal(true);};
  const openEditPayment=idx=>{
    const p=(selected.payments||[])[idx];
    setEditingPayIdx(idx);
    setPayForm({amount:String(p.amount),date:p.date,note:p.note||'',proofUrl:p.proofUrl||'',proofName:p.proofName||''});
    setPaymentModal(true);
  };
  const handleSavePayment=async()=>{
    const amt=parseFloat(payForm.amount);
    if(!amt||amt<=0){alert('Enter valid amount.');return;}
    const payments=[...(selected.payments||[])];
    const entry={amount:amt,date:payForm.date,note:payForm.note,proofUrl:payForm.proofUrl,proofName:payForm.proofName,savedAt:Date.now()};
    if(editingPayIdx!==null)payments[editingPayIdx]={...payments[editingPayIdx],...entry};
    else payments.push(entry);
    const newStatus=deriveStatus({...selected,payments});
    await update(ref(db,`Invoices/${selected.id}`),{payments,status:newStatus,updatedAt:serverTimestamp()});
    setPaymentModal(false);setPayForm(emptyPayment());setEditingPayIdx(null);
  };
  const handleDeletePayment=async idx=>{
    const old=(selected.payments||[])[idx];
    if(old?.proofUrl){try{await deleteObject(storageRef(storage,old.proofUrl));}catch{}}
    const payments=(selected.payments||[]).filter((_,i)=>i!==idx);
    const newStatus=deriveStatus({...selected,payments});
    await update(ref(db,`Invoices/${selected.id}`),{payments,status:newStatus,updatedAt:serverTimestamp()});
    setConfirmDelPay(null);
  };

  const handleDelete=async id=>{await remove(ref(db,`Invoices/${id}`));setConfirmDelete(null);setView('list');setSelected(null);};
  const handleStatusOverride=async(invId,status)=>{await update(ref(db,`Invoices/${invId}`),{status,updatedAt:serverTimestamp()});};

  const startEdit=inv=>{
    setForm({...emptyForm(),...inv});setSelected(inv);setEditMode(true);setView('create');setFormTab('basic');
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats=invoices.reduce((acc,inv)=>{
    const{total,paid,balance}=calcBalance(inv);
    acc.totalAmt+=total;acc.totalPaid+=paid;
    if(['pending','partial'].includes(inv._derived))acc.receivable+=balance;
    acc[inv._derived]=(acc[inv._derived]||0)+1;
    return acc;
  },{totalAmt:0,totalPaid:0,receivable:0,pending:0,partial:0,paid:0,overdue:0,cancelled:0});

  const filtered=invoices.filter(inv=>{
    const ok=filterStatus==='all'||inv._derived===filterStatus;
    const t=searchTerm.toLowerCase();
    return ok&&(!t||[inv.billedToName,inv.billedByName,inv.invoiceNo,inv.projectName].some(v=>v?.toLowerCase().includes(t)));
  });

  // ── Field helper ──────────────────────────────────────────────────────────
  const F=({label,name,type='text',placeholder='',half=false,opts=null})=>(
    <div className={`inv-field ${half?'inv-field-half':''}`}>
      <label>{label}</label>
      {opts?<select value={form[name]||''} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))}>
        {opts.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      :<input type={type} value={form[name]||''} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))} placeholder={placeholder}/>}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: LIST
  // ══════════════════════════════════════════════════════════════════════════
  if(view==='list') return(
    <div className="inv-page">
      <div className="inv-top-bar">
        <div><h1 className="inv-page-title">Invoice Manager</h1><p className="inv-page-sub">Create, track and manage all project invoices</p></div>
        <button className="inv-btn-primary" onClick={()=>{setEditMode(false);setForm(emptyForm());setView('create');setFormTab('basic');}}>+ New Invoice</button>
      </div>
      <div className="inv-stats-row">
        <div className="inv-stat-card"><span className="inv-stat-num">{invoices.length}</span><span className="inv-stat-label">Total</span></div>
        <div className="inv-stat-card warn"><span className="inv-stat-num">{(stats.pending||0)+(stats.partial||0)}</span><span className="inv-stat-label">Outstanding</span></div>
        <div className="inv-stat-card success"><span className="inv-stat-num">{stats.paid||0}</span><span className="inv-stat-label">Paid</span></div>
        <div className="inv-stat-card amount"><span className="inv-stat-num sm">{fmt(stats.totalAmt)}</span><span className="inv-stat-label">Billed</span></div>
        <div className="inv-stat-card receivable"><span className="inv-stat-num sm">{fmt(stats.receivable)}</span><span className="inv-stat-label">Receivable</span></div>
      </div>
      <div className="inv-filter-bar">
        <input className="inv-search" placeholder="Search…" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
        <div className="inv-status-tabs">
          {['all',...Object.keys(STATUS_CONFIG)].map(s=>(
            <button key={s} className={`inv-tab ${filterStatus===s?'active':''}`} onClick={()=>setFilterStatus(s)}>
              {s==='all'?'All':STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>
      {loading?<div className="inv-loading">Loading…</div>
       :filtered.length===0?<div className="inv-empty"><div className="inv-empty-icon">🧾</div><p>No invoices yet.</p></div>
       :(
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead><tr><th>Invoice #</th><th>Date</th><th>Billed To</th><th>Project</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map(inv=>{
                const{total,paid,balance}=calcBalance(inv);
                const sc=STATUS_CONFIG[inv._derived]||STATUS_CONFIG.pending;
                return(
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
      {confirmDelete&&<Modal title="Delete Invoice?" msg="This cannot be undone." onOk={()=>handleDelete(confirmDelete)} onCancel={()=>setConfirmDelete(null)} okLabel="Yes, Delete" danger/>}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: CREATE / EDIT
  // ══════════════════════════════════════════════════════════════════════════
  if(view==='create') return(
    <div className="inv-page">
      <div className="inv-top-bar">
        <div><h1 className="inv-page-title">{editMode?'Edit Invoice':'New Invoice'}</h1><p className="inv-page-sub">Fill in the details</p></div>
        <button className="inv-btn-ghost" onClick={()=>{setView(editMode?'detail':'list');setEditMode(false);}}>← Cancel</button>
      </div>

      {/* Template chooser */}
      <div className="inv-template-bar">
        <span className="inv-template-label">Template:</span>
        {TEMPLATES.map(t=>(
          <button key={t.id} className={`inv-tmpl-btn ${form.template===t.id?'active':''}`} onClick={()=>setForm(f=>({...f,template:t.id}))}>
            {t.name}
          </button>
        ))}
      </div>

      {/* Form tabs */}
      <div className="inv-form-tabs">
        {[['basic','📋 Basic'],['to','👤 Client'],['items','📦 Items'],['bank','🏦 Banking'],['extra','⚙️ Extra']].map(([k,l])=>(
          <button key={k} className={`inv-ftab ${formTab===k?'active':''}`} onClick={()=>setFormTab(k)}>{l}</button>
        ))}
      </div>

      <div className="inv-form-panel">
        {formTab==='basic'&&(
          <>
            <div className="inv-form-section-title">Your Details (Billed By)</div>
            <div className="inv-field-grid">
              <F label="Your Name *" name="billedByName" placeholder="Rishi Raj"/>
              <F label="Phone" name="billedByPhone" placeholder="+91-XXXXXXXXXX"/>
              <F label="Email" name="billedByEmail" type="email"/>
              <F label="Address" name="billedByAddress" placeholder="City, State"/>
              <F label="GST No." name="billedByGST" placeholder="22AAAAA0000A1Z5"/>
            </div>
            <div className="inv-form-section-title" style={{marginTop:'1.5rem'}}>Invoice Info</div>
            <div className="inv-field-grid">
              <F label="Invoice No *" name="invoiceNo"/>
              <F label="Invoice Date *" name="invoiceDate" type="date"/>
              <F label="Due Date" name="dueDate" type="date"/>
              <F label="P.O. Number" name="poNumber" placeholder="Optional"/>
            </div>
          </>
        )}
        {formTab==='to'&&(
          <>
            <div className="inv-form-section-title">Client Details (Billed To)</div>
            <div className="inv-field-grid">
              <F label="Client Name *" name="billedToName" placeholder="Ambuj Singh"/>
              <F label="Phone" name="billedToPhone"/>
              <F label="Email" name="billedToEmail" type="email"/>
              <F label="Address" name="billedToAddress"/>
              <F label="GST No." name="billedToGST" placeholder="GSTIN"/>
              <F label="Project Name" name="projectName" placeholder="BPSC Sep 2025"/>
            </div>
          </>
        )}
        {formTab==='items'&&(
          <>
            <div className="inv-form-section-title">Line Items</div>
            <div className="inv-items-table-wrap">
              <table className="inv-items-table">
                <thead><tr><th style={{width:'32%'}}>Description</th><th style={{width:'18%'}}>Type</th><th style={{width:'14%'}}>Rate (₹)</th><th style={{width:'14%'}}>Qty</th><th style={{width:'17%'}}>Amount (₹)</th><th style={{width:'5%'}}></th></tr></thead>
                <tbody>
                  {form.items.map((item,idx)=>(
                    <tr key={idx} className="inv-item-row">
                      <td><input className="inv-cell-input" value={item.description} onChange={e=>updateItem(idx,'description',e.target.value)} placeholder="e.g. Mock, Operator…"/></td>
                      <td><select className="inv-cell-input" value={item.type} onChange={e=>updateItem(idx,'type',e.target.value)}>{ITEM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></td>
                      <td><input className="inv-cell-input" type="number" min="0" value={item.rate} onChange={e=>updateItem(idx,'rate',e.target.value)}/></td>
                      <td><input className="inv-cell-input" type="number" min="0" value={item.qty} onChange={e=>updateItem(idx,'qty',e.target.value)}/></td>
                      <td className="inv-amount-cell">{fmt(item.amount)}</td>
                      <td>{form.items.length>1&&<button className="inv-remove-item" onClick={()=>removeItem(idx)}>✕</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="inv-add-item-btn" onClick={addItem}>+ Add Line Item</button>
            <div className="inv-subtotal-block">
              <div className="inv-subtotal-line">
                <span>Subtotal</span><span>{fmt(formSubtotal)}</span>
              </div>
              <div className="inv-subtotal-line discount-row">
                <div className="inv-discount-inputs">
                  <span>Discount</span>
                  <input className="inv-inline-num" type="number" min="0" value={form.discountValue||''} onChange={e=>setForm(f=>({...f,discountValue:e.target.value}))} placeholder="0"/>
                  <select className="inv-inline-select" value={form.discountType} onChange={e=>setForm(f=>({...f,discountType:e.target.value}))}>
                    <option value="percent">%</option>
                    <option value="flat">₹ flat</option>
                  </select>
                </div>
                <span className="inv-discount-amt" style={{color:'#dc2626'}}>− {fmt(formDiscount)}</span>
              </div>
              <div className="inv-subtotal-line">
                <div className="inv-discount-inputs">
                  <span>Tax / GST</span>
                  <input className="inv-inline-num" type="number" min="0" value={form.taxPercent||''} onChange={e=>setForm(f=>({...f,taxPercent:e.target.value}))} placeholder="0"/>
                  <span className="inv-inline-label">%</span>
                </div>
                <span style={{color:'#059669'}}>+ {fmt(formTax)}</span>
              </div>
            </div>
            <div className="inv-total-row"><span>Grand Total</span><span className="inv-total-amount">{fmt(totalAmount)}</span></div>
          </>
        )}
        {formTab==='bank'&&(
          <>
            <div className="inv-form-section-title">Banking Details</div>
            <div className="inv-field-grid">
              <F label="Account Holder Name" name="accountHolder"/>
              <F label="Bank Name" name="bankName"/>
              <F label="Account No." name="accountNo"/>
              <F label="IFSC Code" name="ifscCode"/>
              <F label="UPI ID" name="upiId" placeholder="name@upi"/>
            </div>
          </>
        )}
        {formTab==='extra'&&(
          <>
            <div className="inv-form-section-title">Notes & Remark</div>
            <div className="inv-field-grid">
              <div className="inv-field inv-field-full">
                <label>Notes</label>
                <textarea className="inv-notes-input" rows={3} value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Payment terms, bank details…"/>
              </div>
              <div className="inv-field inv-field-full">
                <label>Remark</label>
                <textarea className="inv-notes-input" rows={2} value={form.remark||''} onChange={e=>setForm(f=>({...f,remark:e.target.value}))} placeholder="Internal or client remark…"/>
              </div>
            </div>
            <div className="inv-form-section-title" style={{marginTop:'1.5rem'}}>Watermark Text</div>
            <div className="inv-field-grid">
              <F label="Watermark (e.g. PAID, DRAFT, CONFIDENTIAL)" name="watermarkText" placeholder="Leave blank for none"/>
            </div>
            <div className="inv-form-section-title" style={{marginTop:'1.5rem'}}>Signature</div>
            <div className="inv-sig-upload-area">
              {form.signatureUrl?(
                <div className="inv-sig-preview-row">
                  <img src={form.signatureUrl} alt="Signature" className="inv-sig-preview-img"/>
                  <div>
                    <div className="inv-field"><label>Signatory Name</label><input value={form.signatureName||''} onChange={e=>setForm(f=>({...f,signatureName:e.target.value}))} placeholder="Rishi Raj"/></div>
                    <button className="inv-proof-remove" onClick={()=>setForm(f=>({...f,signatureUrl:'',signatureName:''}))}>Remove Signature</button>
                  </div>
                </div>
              ):(
                <div className="inv-proof-upload-area" onClick={()=>sigRef.current?.click()}>
                  <input type="file" ref={sigRef} accept="image/*" style={{display:'none'}} onChange={e=>handleSignatureUpload(e.target.files[0])}/>
                  <span>✍️ Click to upload signature image (PNG with transparent bg recommended)</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="inv-form-footer">
        <button className="inv-btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':editMode?'💾 Update Invoice':'💾 Save Invoice'}</button>
        <button className="inv-btn-ghost" onClick={()=>{setView(editMode?'detail':'list');setEditMode(false);}}>Cancel</button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: DETAIL
  // ══════════════════════════════════════════════════════════════════════════
  if(view==='detail'&&selected){
    const inv=invoices.find(i=>i.id===selected.id)||selected;
    const{total,paid,balance}=calcBalance(inv);
    const sc=STATUS_CONFIG[inv._derived]||STATUS_CONFIG.pending;
    const tmpl=inv.template||'modern';

    const {subtotal,discount,tax}=calcBalance(inv);
    const templateProps={inv,sc,subtotal,discount,tax,total,paid,balance,
      onEditPay:openEditPayment,onDelPay:i=>setConfirmDelPay(i),onAddPay:openAddPayment,noprint:true};

    return(
      <div className="inv-page">
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

        {tmpl==='modern'    &&<TemplateModern    {...templateProps}/>}
        {tmpl==='classic'   &&<TemplateClassic   {...templateProps}/>}
        {tmpl==='minimal'   &&<TemplateMinimal   {...templateProps}/>}
        {tmpl==='watermark' &&<TemplateWatermark {...templateProps}/>}
        {tmpl==='corporate' &&<TemplateCorporate {...templateProps}/>}

        {paymentModal&&(
          <div className="inv-modal-overlay" onClick={()=>setPaymentModal(false)}>
            <div className="inv-modal-box" onClick={e=>e.stopPropagation()}>
              <h3>{editingPayIdx!==null?'✏️ Edit Payment':'💳 Record Payment'}</h3>
              <div className="inv-field" style={{marginBottom:'1rem'}}><label>Amount (₹) *</label><input type="number" min="0" value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))}/></div>
              <div className="inv-field" style={{marginBottom:'1rem'}}><label>Date</label><input type="date" value={payForm.date} onChange={e=>setPayForm(p=>({...p,date:e.target.value}))}/></div>
              <div className="inv-field" style={{marginBottom:'1rem'}}><label>Note</label><input value={payForm.note} onChange={e=>setPayForm(p=>({...p,note:e.target.value}))} placeholder="Bank transfer, cash, UPI…"/></div>
              <div className="inv-field" style={{marginBottom:'1.25rem'}}>
                <label>Proof / Receipt</label>
                {payForm.proofUrl?(
                  <div className="inv-proof-preview"><a href={payForm.proofUrl} target="_blank" rel="noreferrer" className="inv-proof-link">📎 {payForm.proofName||'View file'}</a><button className="inv-proof-remove" onClick={removeProof}>Remove</button></div>
                ):(
                  <div className="inv-proof-upload-area" onClick={()=>proofRef.current?.click()}>
                    <input type="file" ref={proofRef} accept="image/*,.pdf" style={{display:'none'}} onChange={e=>handleProofUpload(e.target.files[0])}/>
                    {uploadingProof?<span className="inv-uploading">⏳ Uploading…</span>:<span>📷 Attach photo / PDF (max 5MB)</span>}
                  </div>
                )}
              </div>
              <div className="inv-modal-actions">
                <button className="inv-btn-primary" onClick={handleSavePayment} disabled={uploadingProof}>Save Payment</button>
                <button className="inv-btn-ghost" onClick={()=>setPaymentModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {confirmDelPay!==null&&<Modal title="Delete Payment?" msg="Payment record will be removed and balance updated." onOk={()=>handleDeletePayment(confirmDelPay)} onCancel={()=>setConfirmDelPay(null)} okLabel="Yes, Delete" danger/>}
        {confirmDelete&&<Modal title="Delete Invoice?" msg="This cannot be undone." onOk={()=>handleDelete(confirmDelete)} onCancel={()=>setConfirmDelete(null)} okLabel="Yes, Delete" danger/>}
      </div>
    );
  }
  return null;
}

function Modal({title,msg,onOk,onCancel,okLabel,danger}){
  return(
    <div className="inv-modal-overlay" onClick={onCancel}>
      <div className="inv-modal-box" onClick={e=>e.stopPropagation()}>
        <h3>{title}</h3><p>{msg}</p>
        <div className="inv-modal-actions">
          {danger?<button className="inv-btn-danger" onClick={onOk}>{okLabel}</button>:<button className="inv-btn-primary" onClick={onOk}>{okLabel}</button>}
          <button className="inv-btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
