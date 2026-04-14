// src/components/Approvals/PendingApprovals.js
import React, { useState, useEffect } from 'react';
import { ref, onValue, update, remove, serverTimestamp, get } from 'firebase/database';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import './PendingApprovals.css';

const FIELDS = [
  { key: 'name',          label: 'Name' },
  { key: 'phoneNo',       label: 'Phone' },
  { key: 'addharNo',      label: 'Aadhar' },
  { key: 'address',       label: 'Address' },
  { key: 'referenceName', label: 'Reference' },
];

const PendingApprovals = () => {
  const { isAdmin } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [processing, setProcessing] = useState(null); // id being processed
  const [expanded, setExpanded]   = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    const appRef = ref(db, 'PendingApprovals');
    const unsub = onValue(appRef, (snap) => {
      const data = snap.val();
      const list = [];
      if (data) {
        Object.keys(data).forEach((key) => {
          list.push({ id: key, ...data[key] });
        });
        list.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
      }
      setApprovals(list);
      setLoading(false);
    });
    return () => unsub();
  }, [isAdmin]);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleApprove = async (approval) => {
    setProcessing(approval.id);
    try {
      // Apply newData to the Employee record
      await update(ref(db, `Employees/${approval.employeeId}`), {
        ...approval.newData,
        updatedAt: serverTimestamp(),
        lastApprovedBy: approval.requestedBy,
      });
      // Remove from PendingApprovals
      await remove(ref(db, `PendingApprovals/${approval.id}`));
      flash('Update approved and applied.');
    } catch (err) {
      console.error('Approve error:', err);
      alert('Failed to approve. Please try again.');
    }
    setProcessing(null);
  };

  const handleReject = async (approval) => {
    setProcessing(approval.id);
    try {
      // Mark as rejected (keep for audit) or simply remove — we remove for simplicity
      await remove(ref(db, `PendingApprovals/${approval.id}`));
      flash('Update rejected and removed.');
    } catch (err) {
      console.error('Reject error:', err);
      alert('Failed to reject. Please try again.');
    }
    setProcessing(null);
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (!isAdmin) return null;

  return (
    <div className="approvals-container">
      <div className="approvals-header">
        <h2>🔔 Pending Approvals</h2>
        <p className="approvals-sub">Review supervisor-requested employee updates</p>
      </div>

      {successMsg && <div className="approvals-success">✅ {successMsg}</div>}

      {loading ? (
        <div className="approvals-loading">Loading...</div>
      ) : approvals.length === 0 ? (
        <div className="approvals-empty">
          <span>✅</span>
          <p>No pending approvals. You are all caught up!</p>
        </div>
      ) : (
        <div className="approvals-list">
          {approvals.map((appr) => (
            <div key={appr.id} className="approval-card">
              <div className="approval-card-header" onClick={() => setExpanded(expanded === appr.id ? null : appr.id)}>
                <div className="approval-card-title">
                  <span className="approval-emp-name">{appr.newData?.name || appr.oldData?.name || 'Unknown'}</span>
                  <span className="approval-badge">Update request</span>
                </div>
                <div className="approval-card-meta">
                  <span>By: {appr.supervisorName || appr.requestedBy?.slice(0, 8)}</span>
                  <span>{formatDate(appr.requestedAt)}</span>
                  <span className="approval-expand-icon">{expanded === appr.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === appr.id && (
                <div className="approval-diff">
                  <table className="diff-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Current value</th>
                        <th>Requested change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FIELDS.map(({ key, label }) => {
                        const oldVal = appr.oldData?.[key] || '—';
                        const newVal = appr.newData?.[key] || '—';
                        const changed = oldVal !== newVal;
                        return (
                          <tr key={key} className={changed ? 'diff-row-changed' : ''}>
                            <td className="diff-field">{label}</td>
                            <td className={changed ? 'diff-old' : ''}>{oldVal}</td>
                            <td className={changed ? 'diff-new' : ''}>{newVal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="approval-actions">
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(appr)}
                      disabled={processing === appr.id}
                    >
                      {processing === appr.id ? 'Processing…' : '✅ Approve'}
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleReject(appr)}
                      disabled={processing === appr.id}
                    >
                      {processing === appr.id ? 'Processing…' : '❌ Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;
