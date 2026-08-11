'use client'

import { useEffect, useMemo, useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase'

const money = n => `FCFA ${Number(n || 0).toLocaleString()}`
const tabs = ['Dashboard','Members','Vows','Contributions','Expenses','AI Reminders','Stakeholder Letters','Admin Settings']
const defaultGroups = ['Molyko Group','Buea Town Group','Bolifamba Group','Muea Group']

export default function Home() {
  const [supabase, setSupabase] = useState(null)
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('Dashboard')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [groups, setGroups] = useState([])
  const [members, setMembers] = useState([])
  const [vows, setVows] = useState([])
  const [contributions, setContributions] = useState([])
  const [expenses, setExpenses] = useState([])
  const [projectSettings, setProjectSettings] = useState({id:1,car_target_amount:0})
  const [targetForm, setTargetForm] = useState('')
  const [login, setLogin] = useState({email:'',password:''})
  const [memberForm,setMemberForm]=useState({full_name:'',phone:'',group_id:'',is_stakeholder:false})
  const [vowForm,setVowForm]=useState({member_id:'',amount_pledged:'',notes:''})
  const [contribForm,setContribForm]=useState({member_id:'',vow_id:'',amount:'',payment_date:new Date().toISOString().slice(0,10),method:'Cash',notes:''})
  const [expenseForm,setExpenseForm]=useState({amount:'',expense_date:new Date().toISOString().slice(0,10),expense_type:'car_project',purpose:'',approved_by:''})
  const [aiMember,setAiMember]=useState('')
  const [aiDraft,setAiDraft]=useState('')
  const [aiBusy,setAiBusy]=useState(false)
  const [letter,setLetter]=useState({stakeholderName:'',title:'',purpose:'',details:'',signatory:'Buea Region Car Project Committee'})
  const [letterDraft,setLetterDraft]=useState('')

  useEffect(()=>{
    try {
      const client=getBrowserSupabase(); setSupabase(client)
      client.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)})
      const {data:{subscription}}=client.auth.onAuthStateChange((_e,s)=>setSession(s))
      return ()=>subscription.unsubscribe()
    } catch(e){setNotice(e.message);setLoading(false)}
  },[])

  useEffect(()=>{ if(session&&supabase) refresh() },[session,supabase])

  async function refresh(){
    setLoading(true)
    const [g,m,v,c,e,s]=await Promise.all([
      supabase.from('groups').select('*').order('name'),
      supabase.from('members').select('*, groups(name)').order('full_name'),
      supabase.from('vow_status').select('*').order('created_at',{ascending:false}),
      supabase.from('contributions').select('*, members(full_name), vows(vow_sequence)').order('payment_date',{ascending:false}),
      supabase.from('expenses').select('*').order('expense_date',{ascending:false}),
      supabase.from('project_settings').select('*').eq('id',1).maybeSingle()
    ])
    const err=g.error||m.error||v.error||c.error||e.error||s.error
    if(err) setNotice(err.message)
    const settings=s.data||{id:1,car_target_amount:0}
    setGroups(g.data||[]);setMembers(m.data||[]);setVows(v.data||[]);setContributions(c.data||[]);setExpenses(e.data||[]);setProjectSettings(settings);setTargetForm(settings.car_target_amount?String(settings.car_target_amount):'');setLoading(false)
  }

  async function signIn(e){e.preventDefault();setNotice('');const {error}=await supabase.auth.signInWithPassword(login);if(error)setNotice(error.message)}
  async function signOut(){await supabase.auth.signOut()}

  async function addMember(e){e.preventDefault();setNotice('');const {error}=await supabase.from('members').insert(memberForm);if(error)return setNotice(error.message);setMemberForm({full_name:'',phone:'',group_id:'',is_stakeholder:false});setNotice('Member added.');refresh()}
  async function addVow(e){
    e.preventDefault(); setNotice('')
    const existing=vows.filter(v=>v.member_id===vowForm.member_id).sort((a,b)=>a.vow_sequence-b.vow_sequence)
    const last=existing.at(-1)
    if(last && Number(last.balance)>0) return setNotice(`Previous vow still has ${money(last.balance)} outstanding. Fulfil it before recording another vow.`)
    const sequence=(last?.vow_sequence||0)+1
    const {error}=await supabase.from('vows').insert({...vowForm,amount_pledged:Number(vowForm.amount_pledged),vow_sequence:sequence})
    if(error)return setNotice(error.message);setVowForm({member_id:'',amount_pledged:'',notes:''});setNotice(`Vow ${sequence} recorded.`);refresh()
  }
  async function addContribution(e){e.preventDefault();setNotice('');const vow=vows.find(v=>v.id===contribForm.vow_id);const payload={...contribForm,amount:Number(contribForm.amount),member_id:vow?.member_id||contribForm.member_id};const {error}=await supabase.from('contributions').insert(payload);if(error)return setNotice(error.message);setContribForm({...contribForm,amount:'',notes:''});setNotice('Contribution recorded.');refresh()}
  async function addExpense(e){e.preventDefault();setNotice('');const {error}=await supabase.from('expenses').insert({...expenseForm,amount:Number(expenseForm.amount)});if(error)return setNotice(error.message);setExpenseForm({...expenseForm,amount:'',purpose:'',approved_by:''});setNotice('Expense recorded.');refresh()}
  async function saveTarget(e){
    e.preventDefault();setNotice('')
    const amount=Number(targetForm)
    if(!Number.isFinite(amount)||amount<=0)return setNotice('Enter a valid car target amount greater than zero.')
    const payload={id:1,car_target_amount:amount,updated_by:session.user.id,updated_at:new Date().toISOString()}
    const {data,error}=await supabase.from('project_settings').upsert(payload,{onConflict:'id'}).select().single()
    if(error)return setNotice(error.message)
    setProjectSettings(data);setTargetForm(String(data.car_target_amount));setNotice('Car target amount saved successfully.')
  }

  const stats=useMemo(()=>{
    const received=contributions.reduce((s,x)=>s+Number(x.amount),0)
    const pledged=vows.reduce((s,x)=>s+Number(x.amount_pledged),0)
    const outstanding=vows.reduce((s,x)=>s+Number(x.balance),0)
    const carSpent=expenses.filter(x=>x.expense_type==='car_project').reduce((s,x)=>s+Number(x.amount),0)
    const otherSpent=expenses.filter(x=>x.expense_type==='other_purpose').reduce((s,x)=>s+Number(x.amount),0)
    return {received,pledged,outstanding,carSpent,otherSpent,balance:received-carSpent-otherSpent}
  },[vows,contributions,expenses])

  const groupStats=useMemo(()=>groups.map(g=>{
    const ids=members.filter(m=>m.group_id===g.id).map(m=>m.id)
    const received=contributions.filter(c=>ids.includes(c.member_id)).reduce((s,x)=>s+Number(x.amount),0)
    const pledged=vows.filter(v=>ids.includes(v.member_id)).reduce((s,x)=>s+Number(x.amount_pledged),0)
    return {name:g.name,received,pledged,count:ids.length}
  }),[groups,members,vows,contributions])

  async function authFetch(url,body){const token=session?.access_token;const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Request failed');return data}
  async function generateReminder(){
    const m=members.find(x=>x.id===aiMember);if(!m)return setNotice('Select a member.')
    const memberVows=vows.filter(v=>v.member_id===m.id).sort((a,b)=>b.vow_sequence-a.vow_sequence);const v=memberVows[0]
    if(!v)return setNotice('This member has no recorded vow.')
    setAiBusy(true);setNotice('')
    try{const data=await authFetch('/api/ai/reminder',{name:m.full_name,group:m.groups?.name,phone:m.phone,vowSequence:v.vow_sequence,pledged:v.amount_pledged,paid:v.amount_paid,balance:v.balance});setAiDraft(data.draft)}catch(e){setNotice(e.message)}finally{setAiBusy(false)}
  }
  async function sendWhatsApp(){const m=members.find(x=>x.id===aiMember);if(!m?.phone||!aiDraft)return setNotice('Select a member with a phone number and generate a message first.');setAiBusy(true);try{await authFetch('/api/whatsapp/send',{phone:m.phone,message:aiDraft});await supabase.from('ai_messages').insert({member_id:m.id,kind:'reminder',draft:aiDraft,status:'sent',sent_at:new Date().toISOString()});setNotice('WhatsApp request sent successfully.')}catch(e){setNotice(e.message)}finally{setAiBusy(false)}}
  async function generateLetter(){setAiBusy(true);setNotice('');try{const data=await authFetch('/api/ai/letter',letter);setLetterDraft(data.draft);await supabase.from('stakeholder_letters').insert({stakeholder_name:letter.stakeholderName,title:letter.title,purpose:letter.purpose,details:letter.details,signatory:letter.signatory,draft:data.draft})}catch(e){setNotice(e.message)}finally{setAiBusy(false)}}

  if(loading&&!session) return <div className="login-page"><div className="login-card"><p>Loading…</p></div></div>
  if(!session) return <div className="login-page"><form className="login-card" onSubmit={signIn}><img src="/deeper-life-logo.png" alt="Logo"/><h1>Buea Regional Car Project</h1><p>Secure administration portal</p>{notice&&<div className="notice error">{notice}</div>}<div className="stack"><div><label>Admin email</label><input type="email" required value={login.email} onChange={e=>setLogin({...login,email:e.target.value})}/></div><div><label>Password</label><input type="password" required value={login.password} onChange={e=>setLogin({...login,password:e.target.value})}/></div><button className="btn btn-primary">Sign in</button></div><p style={{marginTop:18}}>Designed by <strong>JODEL TECHNOLOGIES</strong></p></form></div>

  return <div className="shell">
    <header className="topbar"><div className="brand"><img src="/deeper-life-logo.png" alt="Regional logo"/><div><h1>Deeper Life Buea Region — Car Project</h1><p>Contribution, vow & accountability management</p></div></div><div className="top-actions"><span className="user-chip">Admin: {session.user.email}</span><button className="btn btn-outline" onClick={signOut}>Sign out</button></div></header>
    <div className="layout"><aside className="sidebar">{tabs.map(t=><button key={t} className={`nav-btn ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t}</button>)}<div className="footer-brand">Groups: Molyko • Buea Town • Bolifamba • Muea<br/><br/>Designed by <strong>JODEL TECHNOLOGIES</strong></div></aside>
      <main className="main"><div className="hero"><div><h2>{tab}</h2><p>Transparent stewardship for the Buea regional vehicle project.</p></div><button className="btn btn-soft" onClick={refresh}>Refresh data</button></div>{notice&&<div className={`notice ${notice.includes('success')||notice.includes('recorded')||notice.includes('added')||notice.includes('saved')?'success':''}`}>{notice}</div>}
        {tab==='Dashboard'&&<Dashboard stats={stats} groupStats={groupStats} vows={vows} carTarget={Number(projectSettings.car_target_amount||0)}/>} 
        {tab==='Members'&&<Members members={members} groups={groups} form={memberForm} setForm={setMemberForm} submit={addMember}/>} 
        {tab==='Vows'&&<Vows vows={vows} members={members} form={vowForm} setForm={setVowForm} submit={addVow}/>} 
        {tab==='Contributions'&&<Contributions data={contributions} vows={vows} members={members} form={contribForm} setForm={setContribForm} submit={addContribution}/>} 
        {tab==='Expenses'&&<Expenses data={expenses} form={expenseForm} setForm={setExpenseForm} submit={addExpense}/>} 
        {tab==='AI Reminders'&&<AIReminders members={members} vows={vows} selected={aiMember} setSelected={setAiMember} draft={aiDraft} setDraft={setAiDraft} generate={generateReminder} send={sendWhatsApp} busy={aiBusy}/>} 
        {tab==='Stakeholder Letters'&&<Letters letter={letter} setLetter={setLetter} draft={letterDraft} setDraft={setLetterDraft} generate={generateLetter} busy={aiBusy}/>} 
        {tab==='Admin Settings'&&<AdminSettings carTarget={Number(projectSettings.car_target_amount||0)} targetForm={targetForm} setTargetForm={setTargetForm} submit={saveTarget}/>} 
      </main></div>
  </div>
}

function Dashboard({stats,groupStats,vows,carTarget}){const second=vows.filter(v=>v.vow_sequence===2);const targetProgress=carTarget>0?Math.min(100,stats.received/carTarget*100):0;const targetLeft=carTarget>0?Math.max(carTarget-stats.received,0):0;return <><section className="target-panel"><div><div className="target-kicker">REGIONAL CAR FUNDRAISING TARGET</div><div className="target-amount">{carTarget>0?money(carTarget):'Not set yet'}</div><p>{carTarget>0?`${money(targetLeft)} still needed based on contributions received.`:'Go to Admin Settings to enter the approved target amount for the car project.'}</p></div><div className="target-progress"><div className="target-progress-head"><strong>{carTarget>0?`${Math.round(targetProgress)}% raised`:'Target pending'}</strong><span>{money(stats.received)} received</span></div><div className="target-bar"><span style={{width:`${targetProgress}%`}}/></div></div></section><div className="cards"><Metric label="Total vowed" value={money(stats.pledged)}/><Metric label="Money received" value={money(stats.received)} cls="green"/><Metric label="Outstanding vows" value={money(stats.outstanding)}/><Metric label="Car-project spending" value={money(stats.carSpent)}/><Metric label="Other-purpose use" value={money(stats.otherSpent)} cls="red"/><Metric label="Cash balance" value={money(stats.balance)} cls={stats.balance>=0?'green':'red'}/></div><div className="grid2"><section className="panel"><h3>Group performance</h3>{groupStats.map(g=><div className="group-row" key={g.name}><div><strong>{g.name}</strong><br/><small>{g.count} people</small></div><div><div className="bar"><span style={{width:`${Math.min(100,g.pledged?g.received/g.pledged*100:0)}%`}}/></div><small>{money(g.received)} of {money(g.pledged)}</small></div><strong>{g.pledged?Math.round(g.received/g.pledged*100):0}%</strong></div>)}</section><section className="panel"><h3>Second vow list</h3>{second.length===0?<p>No second vows recorded yet.</p>:<div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Group</th><th>Vow</th><th>Given</th><th>Balance</th></tr></thead><tbody>{second.map(v=><tr key={v.id}><td>{v.member_name}</td><td>{v.group_name}</td><td>{money(v.amount_pledged)}</td><td>{money(v.amount_paid)}</td><td>{money(v.balance)}</td></tr>)}</tbody></table></div>}</section></div></>}
function Metric({label,value,cls=''}){return <div className="card"><div className="metric-label">{label}</div><div className={`metric-value ${cls}`}>{value}</div></div>}
function Members({members,groups,form,setForm,submit}){
  const sortedGroups=[...groups].sort((a,b)=>a.name.localeCompare(b.name))
  return <>
    <section className="panel">
      <h3>Add a name</h3>
      <form className="form-grid" onSubmit={submit}>
        <div><label>Full name</label><input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></div>
        <div><label>WhatsApp phone</label><input placeholder="2376…" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
        <div><label>Church group</label><select required value={form.group_id} onChange={e=>setForm({...form,group_id:e.target.value})}><option value="">Select group</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
        <div><label>Stakeholder?</label><select value={String(form.is_stakeholder)} onChange={e=>setForm({...form,is_stakeholder:e.target.value==='true'})}><option value="false">No</option><option value="true">Yes</option></select></div>
        <div><button className="btn btn-primary">Add member</button></div>
      </form>
    </section>

    <section className="panel">
      <h3>Members by church group</h3>
      <div className="group-directory">
        {sortedGroups.map(g=>{
          const groupMembers=members.filter(m=>m.group_id===g.id).sort((a,b)=>a.full_name.localeCompare(b.full_name))
          return <div className="group-card" key={g.id}>
            <div className="group-card-head"><strong>{g.name}</strong><span className="badge">{groupMembers.length} member{groupMembers.length===1?'':'s'}</span></div>
            {groupMembers.length===0?<p className="empty-copy">No names entered yet.</p>:<ol className="member-list">{groupMembers.map(m=><li key={m.id}><span>{m.full_name}</span>{m.phone&&<small>{m.phone}</small>}</li>)}</ol>}
          </div>
        })}
      </div>
    </section>

    <section className="panel">
      <h3>Full member register</h3>
      <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Group</th><th>Phone</th><th>Stakeholder</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td>{m.full_name}</td><td>{m.groups?.name}</td><td>{m.phone||'—'}</td><td>{m.is_stakeholder?'Yes':'No'}</td></tr>)}</tbody></table></div>
    </section>
  </>
}
function Vows({vows,members,form,setForm,submit}){return <><section className="panel"><h3>Record a vow</h3><div className="notice">A second vow is allowed only after the previous vow balance is zero.</div><form className="form-grid" onSubmit={submit}><div><label>Member</label><select required value={form.member_id} onChange={e=>setForm({...form,member_id:e.target.value})}><option value="">Select member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} — {m.groups?.name}</option>)}</select></div><div><label>Vow amount (FCFA)</label><input required min="1" type="number" value={form.amount_pledged} onChange={e=>setForm({...form,amount_pledged:e.target.value})}/></div><div className="wide"><label>Notes</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div><div><button className="btn btn-primary">Record vow</button></div></form></section><section className="panel"><h3>Vow register</h3><div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Group</th><th>Vow #</th><th>Vowed</th><th>Given</th><th>Balance</th><th>Status</th></tr></thead><tbody>{vows.map(v=><tr key={v.id}><td>{v.member_name}</td><td>{v.group_name}</td><td><span className="badge">{v.vow_sequence}</span></td><td>{money(v.amount_pledged)}</td><td>{money(v.amount_paid)}</td><td>{money(v.balance)}</td><td><span className={`badge ${Number(v.balance)<=0?'green':'red'}`}>{Number(v.balance)<=0?'Fulfilled':'Outstanding'}</span></td></tr>)}</tbody></table></div></section></>}
function Contributions({data,vows,members,form,setForm,submit}){const memberVows=vows.filter(v=>!form.member_id||v.member_id===form.member_id);return <><section className="panel"><h3>Record contribution received</h3><form className="form-grid" onSubmit={submit}><div><label>Member</label><select required value={form.member_id} onChange={e=>setForm({...form,member_id:e.target.value,vow_id:''})}><option value="">Select member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div><div><label>Vow</label><select required value={form.vow_id} onChange={e=>setForm({...form,vow_id:e.target.value})}><option value="">Select vow</option>{memberVows.map(v=><option key={v.id} value={v.id}>Vow {v.vow_sequence} — balance {money(v.balance)}</option>)}</select></div><div><label>Amount received</label><input type="number" min="1" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div><div><label>Date</label><input type="date" required value={form.payment_date} onChange={e=>setForm({...form,payment_date:e.target.value})}/></div><div><label>Method</label><select value={form.method} onChange={e=>setForm({...form,method:e.target.value})}><option>Cash</option><option>Mobile Money</option><option>Bank</option><option>Other</option></select></div><div className="wide"><label>Notes / receipt reference</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div><div><button className="btn btn-primary">Save contribution</button></div></form></section><section className="panel"><h3>Contribution history</h3><div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Name</th><th>Vow #</th><th>Amount</th><th>Method</th><th>Notes</th></tr></thead><tbody>{data.map(c=><tr key={c.id}><td>{c.payment_date}</td><td>{c.members?.full_name}</td><td>{c.vows?.vow_sequence}</td><td>{money(c.amount)}</td><td>{c.method}</td><td>{c.notes||'—'}</td></tr>)}</tbody></table></div></section></>}
function Expenses({data,form,setForm,submit}){return <><section className="panel"><h3>Record money used</h3><div className="notice">Use “Other purpose” for every amount taken from the fund for something not directly connected to buying/preparing the regional vehicle. This keeps stewardship transparent.</div><form className="form-grid" onSubmit={submit}><div><label>Amount</label><input type="number" min="1" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div><div><label>Date</label><input type="date" required value={form.expense_date} onChange={e=>setForm({...form,expense_date:e.target.value})}/></div><div><label>Use category</label><select value={form.expense_type} onChange={e=>setForm({...form,expense_type:e.target.value})}><option value="car_project">Car project</option><option value="other_purpose">Other purpose</option></select></div><div><label>Approved by</label><input required value={form.approved_by} onChange={e=>setForm({...form,approved_by:e.target.value})}/></div><div className="full"><label>Purpose / explanation</label><input required value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})}/></div><div><button className="btn btn-red">Record use of funds</button></div></form></section><section className="panel"><h3>Expense / fund-use register</h3><div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Category</th><th>Purpose</th><th>Amount</th><th>Approved by</th></tr></thead><tbody>{data.map(x=><tr key={x.id}><td>{x.expense_date}</td><td><span className={`badge ${x.expense_type==='other_purpose'?'red':''}`}>{x.expense_type==='car_project'?'Car project':'Other purpose'}</span></td><td>{x.purpose}</td><td>{money(x.amount)}</td><td>{x.approved_by}</td></tr>)}</tbody></table></div></section></>}
function AdminSettings({carTarget,targetForm,setTargetForm,submit}){return <><section className="panel settings-panel"><div className="settings-heading"><div><span className="badge">Administrator only</span><h3>Regional car target amount</h3><p>Enter the approved amount the Buea Region intends to raise for the car project. This figure is used for the fundraising progress shown on the dashboard.</p></div><div className="settings-current"><small>Current target</small><strong>{carTarget>0?money(carTarget):'Not set'}</strong></div></div><form className="target-form" onSubmit={submit}><div><label>Target amount (FCFA)</label><input type="number" min="1" step="1" required placeholder="e.g. 15000000" value={targetForm} onChange={e=>setTargetForm(e.target.value)}/><small className="field-help">You can change this later if the approved vehicle budget changes.</small></div><button className="btn btn-primary">Save target amount</button></form></section><section className="panel"><h3>How the target is calculated</h3><p className="settings-copy"><strong>Fundraising progress</strong> compares actual contributions received with the target amount. Vows that have not yet been paid are not counted as money raised. Expenses and money used for other purposes continue to appear separately on the dashboard for accountability.</p></section></>}
function AIReminders({members,vows,selected,setSelected,draft,setDraft,generate,send,busy}){const m=members.find(x=>x.id===selected);const latest=vows.filter(v=>v.member_id===selected).sort((a,b)=>b.vow_sequence-a.vow_sequence)[0];return <section className="panel"><h3>AI WhatsApp reminder</h3><div className="notice">AI drafts the wording; an administrator should review it before sending. Keep phone numbers in international format, e.g. Cameroon +237.</div><div className="form-grid"><div className="wide"><label>Member</label><select value={selected} onChange={e=>{setSelected(e.target.value);setDraft('')}}><option value="">Select member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} — {m.groups?.name}</option>)}</select></div><div><label>Current vow</label><input readOnly value={latest?`Vow ${latest.vow_sequence}: ${money(latest.balance)} left`:'No vow selected'}/></div><div><label>Phone</label><input readOnly value={m?.phone||''}/></div><div><button className="btn btn-soft" disabled={busy} onClick={generate}>{busy?'Generating…':'Generate reminder'}</button></div><div><button className="btn btn-primary" disabled={busy||!draft} onClick={send}>Send via WhatsApp</button></div><div className="full"><label>Review / edit before sending</label><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Generated reminder appears here…"/></div></div></section>}
function Letters({letter,setLetter,draft,setDraft,generate,busy}){return <section className="panel"><h3>AI-crafted stakeholder letter</h3><div className="form-grid"><div><label>Stakeholder name</label><input value={letter.stakeholderName} onChange={e=>setLetter({...letter,stakeholderName:e.target.value})}/></div><div><label>Title / role</label><input value={letter.title} onChange={e=>setLetter({...letter,title:e.target.value})}/></div><div className="wide"><label>Purpose of letter</label><input value={letter.purpose} onChange={e=>setLetter({...letter,purpose:e.target.value})} placeholder="e.g. appreciation, project update, support request"/></div><div className="full"><label>Facts/details AI must include</label><textarea value={letter.details} onChange={e=>setLetter({...letter,details:e.target.value})}/></div><div className="wide"><label>Signatory</label><input value={letter.signatory} onChange={e=>setLetter({...letter,signatory:e.target.value})}/></div><div><button className="btn btn-soft" disabled={busy} onClick={generate}>{busy?'Writing…':'Draft letter with AI'}</button></div><div className="full"><label>Review / edit final letter</label><textarea style={{minHeight:260}} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="AI-generated stakeholder letter appears here…"/></div></div></section>}
