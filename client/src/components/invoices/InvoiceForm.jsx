import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
const CATS = ['service','medicine','procedure','lab'];
const emptyItem = () => ({ description:'', category:'service', quantity:1, unit_price:0 });
export default function InvoiceForm() {
  const { authFetch } = useContext(AuthContext); const navigate = useNavigate();
  const { id } = useParams(); const [searchParams] = useSearchParams(); const isEdit = Boolean(id);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patient_id:searchParams.get('patient_id')||'', issue_date:new Date().toISOString().split('T')[0], due_date:'', notes:'', discount:0, tax_rate:18, payment_method:'', items:[emptyItem()] });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const subtotal = form.items.reduce((s,i)=>s+(parseFloat(i.quantity)*parseFloat(i.unit_price)||0),0);
  const discounted = Math.max(0, subtotal-(parseFloat(form.discount)||0));
  const taxAmount = parseFloat(((discounted*parseFloat(form.tax_rate))/100).toFixed(2));
  const total = parseFloat((discounted+taxAmount).toFixed(2));
  const fmt = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(n||0);
  useEffect(() => {
    authFetch('/api/patients?limit=500').then(r=>r.json()).then(d=>setPatients(d.patients||[]));
    if (isEdit) authFetch(`/api/invoices/${id}`).then(r=>r.json()).then(data => setForm({ patient_id:data.patient_id, issue_date:data.issue_date, due_date:data.due_date||'', notes:data.notes||'', discount:data.discount, tax_rate:data.tax_rate, payment_method:data.payment_method||'', items:data.items?.map(i=>({ description:i.description, category:i.category, quantity:i.quantity, unit_price:i.unit_price }))||[emptyItem()] }));
  }, []);
  const updateItem = (idx,field,value) => setForm(f=>{ const items=[...f.items]; items[idx]={...items[idx],[field]:value}; return {...f,items}; });
  const handleSubmit = async () => {
    if (!form.patient_id) return setError('Please select a patient');
    if (form.items.some(i=>!i.description)) return setError('All items need a description');
    setSaving(true); setError('');
    const res = await authFetch(isEdit?`/api/invoices/${id}`:'/api/invoices', { method:isEdit?'PUT':'POST', body:JSON.stringify({ ...form, items:form.items.map(i=>({...i,quantity:parseFloat(i.quantity),unit_price:parseFloat(i.unit_price)})) }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error||'Save failed'); setSaving(false); return; }
    navigate(isEdit?`/admin/invoices/${id}`:`/admin/invoices/${data.id||''}`);
  };
  const inpStyle = { border:'none', background:'transparent', borderBottom:'1px solid var(--border)', borderRadius:0 };
  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-secondary btn-sm" onClick={()=>navigate(-1)}>← Back</button>
          <h1>{isEdit?'Edit Invoice':'New Invoice'}</h1>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, maxWidth:1000 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div className="card">
            <div className="card-header"><h2>Patient Details</h2></div>
            <div className="card-body">
              <div className="form-group"><label>Patient *</label>
                <select value={form.patient_id} onChange={e=>setForm(f=>({...f,patient_id:e.target.value}))} disabled={isEdit}>
                  <option value="">Select patient…</option>
                  {patients.map(p=><option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Issue Date</label><input type="date" value={form.issue_date} onChange={e=>setForm(f=>({...f,issue_date:e.target.value}))} /></div>
                <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes…" /></div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h2>Line Items</h2><button className="btn btn-secondary btn-sm" onClick={()=>setForm(f=>({...f,items:[...f.items,emptyItem()]}))}>+ Add Item</button></div>
            <div style={{ padding:0 }}>
              <table style={{ margin:0 }}>
                <thead><tr><th style={{ width:'34%' }}>Description</th><th style={{ width:'16%' }}>Category</th><th style={{ width:'10%' }}>Qty</th><th style={{ width:'16%' }}>Unit Price (₹)</th><th style={{ width:'14%' }}>Amount</th><th style={{ width:'10%' }}></th></tr></thead>
                <tbody>
                  {form.items.map((item,idx) => (
                    <tr key={idx}>
                      <td><input value={item.description} onChange={e=>updateItem(idx,'description',e.target.value)} placeholder="e.g. Consultation fee" style={inpStyle} /></td>
                      <td><select value={item.category} onChange={e=>updateItem(idx,'category',e.target.value)} style={inpStyle}>{CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></td>
                      <td><input type="number" min="0.01" step="0.01" value={item.quantity} onChange={e=>updateItem(idx,'quantity',e.target.value)} style={inpStyle} /></td>
                      <td><input type="number" min="0" step="0.01" value={item.unit_price} onChange={e=>updateItem(idx,'unit_price',e.target.value)} style={inpStyle} /></td>
                      <td style={{ fontWeight:600 }}>{fmt(item.quantity*item.unit_price)}</td>
                      <td>{form.items.length>1 && <button className="btn-icon" style={{ color:'var(--danger)' }} onClick={()=>setForm(f=>({...f,items:f.items.filter((_,i)=>i!==idx)}))}>✕</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Summary</h2></div>
          <div className="card-body">
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:14 }}><span style={{ color:'var(--text-secondary)' }}>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="form-group"><label>Discount (₹)</label><input type="number" min="0" value={form.discount} onChange={e=>setForm(f=>({...f,discount:parseFloat(e.target.value)||0}))} /></div>
            <div className="form-group"><label>GST Rate (%)</label><input type="number" min="0" max="100" value={form.tax_rate} onChange={e=>setForm(f=>({...f,tax_rate:parseFloat(e.target.value)||0}))} /></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:10 }}><span style={{ color:'var(--text-secondary)' }}>Tax ({form.tax_rate}%)</span><span>{fmt(taxAmount)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:18, fontWeight:700, paddingTop:12, borderTop:'2px solid var(--border)', marginBottom:16 }}><span>Total</span><span style={{ color:'var(--primary)' }}>{fmt(total)}</span></div>
            <div className="form-group"><label>Payment Method</label>
              <select value={form.payment_method} onChange={e=>setForm(f=>({...f,payment_method:e.target.value}))}>
                <option value="">Not set</option><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="insurance">Insurance</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={handleSubmit} disabled={saving}>{saving?'Saving…':isEdit?'Update Invoice':'Create Invoice'}</button>
            <button className="btn btn-secondary" style={{ width:'100%', justifyContent:'center', marginTop:8 }} onClick={()=>navigate(-1)}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
