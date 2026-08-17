'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase'

const money = n => `FCFA ${Number(n || 0).toLocaleString()}`
const digitsOnly = value => String(value ?? '').replace(/\D/g, '')
const whatsAppRecipient = value => {
  let phone = digitsOnly(value)
  if (phone.startsWith('00')) phone = phone.slice(2)
  if (phone.length === 9 && /^[26]/.test(phone)) phone = `237${phone}`
  return phone
}
const PREFERRED_WHATSAPP_SENDER = '00237678662454'
const tabs = ['Dashboard','Members','Vows','Contributions','Expenses','AI Reminders','Bulk SMS','Stakeholder Letters','Admin Settings']
const defaultGroups = ['Molyko Group','Buea Town Group','Bolifamba Group','Muea Group']
const DEFAULT_CARRYOVER_LABEL = 'Congregation contribution / First vow total'

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
  const [projectSettings, setProjectSettings] = useState({id:1,car_target_amount:0,carryover_amount:0,carryover_label:DEFAULT_CARRYOVER_LABEL,last_keep_alive_at:null,last_keep_alive_status:'pending',last_keep_alive_note:''})
  const [targetForm, setTargetForm] = useState('')
  const [carryoverForm, setCarryoverForm] = useState({amount:'',label:DEFAULT_CARRYOVER_LABEL})
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
    const settings=s.data||{id:1,car_target_amount:0,carryover_amount:0,carryover_label:DEFAULT_CARRYOVER_LABEL,last_keep_alive_at:null,last_keep_alive_status:'pending',last_keep_alive_note:''}
    setGroups(g.data||[]);setMembers(m.data||[]);setVows(v.data||[]);setContributions(c.data||[]);setExpenses(e.data||[]);setProjectSettings(settings);setTargetForm(settings.car_target_amount?String(settings.car_target_amount):'');setCarryoverForm({amount:settings.carryover_amount?String(settings.carryover_amount):'',label:settings.carryover_label||DEFAULT_CARRYOVER_LABEL});setLoading(false)
  }

  async function signIn(e){e.preventDefault();setNotice('');const {error}=await supabase.auth.signInWithPassword(login);if(error)setNotice(error.message)}
  async function signOut(){await supabase.auth.signOut()}

  async function addMember(e){e.preventDefault();setNotice('');const cleanPhone=digitsOnly(memberForm.phone);const {error}=await supabase.from('members').insert({...memberForm,phone:cleanPhone||null});if(error)return setNotice(error.message);setMemberForm({full_name:'',phone:'',group_id:'',is_stakeholder:false});setNotice('Member added.');refresh()}
  async function addVow(e){
    e.preventDefault(); setNotice('')
    const existing=vows.filter(v=>v.member_id===vowForm.member_id).sort((a,b)=>a.vow_sequence-b.vow_sequence)
    const last=existing.at(-1)
    if(last && Number(last.balance)>0) return setNotice(`Previous vow still has ${money(last.balance)} outstanding. Fulfil it before recording another vow.`)
    const sequence=(last?.vow_sequence||0)+1
    const {error}=await supabase.from('vows').insert({...vowForm,amount_pledged:Number(vowForm.amount_pledged),vow_sequence:sequence})
    if(error)return setNotice(error.message);setVowForm({member_id:'',amount_pledged:'',notes:''});setNotice(`Vow ${sequence} recorded.`);refresh()
  }
  async function updateVow(vowId,changes){
    setNotice('')
    const current=vows.find(v=>v.id===vowId)
    if(!current){setNotice('That vow could not be found. Refresh and try again.');return false}
    const amount=Number(changes.amount_pledged)
    const paid=Number(current.amount_paid||0)
    if(!Number.isFinite(amount)||amount<=0){setNotice('Enter a valid vow amount greater than zero.');return false}
    if(amount<paid){setNotice(`The vow cannot be reduced below ${money(paid)} because that amount has already been paid.`);return false}

    const laterVow=vows.some(v=>v.member_id===current.member_id&&v.vow_sequence>current.vow_sequence)
    if(laterVow&&amount>paid){
      setNotice(`This earlier vow already has a later vow after it. Its corrected amount cannot exceed the ${money(paid)} already paid, otherwise the later vow would no longer be valid.`)
      return false
    }

    let memberId=changes.member_id||current.member_id
    let sequence=current.vow_sequence
    if(memberId!==current.member_id){
      if(paid>0){setNotice('The member cannot be changed after a payment has been recorded against this vow. Correct the amount or notes only.');return false}
      const destination=vows.filter(v=>v.member_id===memberId&&v.id!==vowId).sort((a,b)=>a.vow_sequence-b.vow_sequence)
      const last=destination.at(-1)
      if(last&&Number(last.balance)>0){setNotice(`The selected member still has ${money(last.balance)} outstanding on Vow ${last.vow_sequence}. Finish that vow before moving this vow to the member.`);return false}
      sequence=(last?.vow_sequence||0)+1
    }

    const {error}=await supabase.from('vows').update({member_id:memberId,vow_sequence:sequence,amount_pledged:amount,notes:changes.notes?.trim()||null}).eq('id',vowId)
    if(error){setNotice(error.message);return false}
    const member=members.find(m=>m.id===memberId)
    setNotice(`Vow ${sequence} for ${member?.full_name||current.member_name} updated successfully.`)
    await refresh()
    return true
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
  async function saveCarryover(e){
    e.preventDefault();setNotice('')
    const amount=Number(carryoverForm.amount||0)
    const label=carryoverForm.label.trim()||DEFAULT_CARRYOVER_LABEL
    if(!Number.isFinite(amount)||amount<0)return setNotice('Enter a valid carryover amount of zero or more.')
    const payload={id:1,carryover_amount:amount,carryover_label:label,updated_by:session.user.id,updated_at:new Date().toISOString()}
    const {data,error}=await supabase.from('project_settings').upsert(payload,{onConflict:'id'}).select().single()
    if(error)return setNotice(error.message)
    setProjectSettings(data);setCarryoverForm({amount:data.carryover_amount?String(data.carryover_amount):'',label:data.carryover_label||DEFAULT_CARRYOVER_LABEL});setNotice('Carryover / congregation contribution saved successfully.')
  }

  const stats=useMemo(()=>{
    const carryover=Number(projectSettings.carryover_amount||0)
    const received=contributions.reduce((s,x)=>s+Number(x.amount),0)
    const pledged=vows.reduce((s,x)=>s+Number(x.amount_pledged),0)
    const outstanding=vows.reduce((s,x)=>s+Number(x.balance),0)
    const carSpent=expenses.filter(x=>x.expense_type==='car_project').reduce((s,x)=>s+Number(x.amount),0)
    const otherSpent=expenses.filter(x=>x.expense_type==='other_purpose').reduce((s,x)=>s+Number(x.amount),0)
    const paidOrCarryover=carryover+received
    const committed=carryover+pledged
    return {carryover,received,paidOrCarryover,pledged,committed,outstanding,carSpent,otherSpent,balance:paidOrCarryover-carSpent-otherSpent}
  },[vows,contributions,expenses,projectSettings.carryover_amount])

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
  function sendWhatsApp(){
    const m=members.find(x=>x.id===aiMember)
    if(!m?.phone||!aiDraft)return setNotice('Select a member with a phone number and generate a message first.')
    const recipient=whatsAppRecipient(m.phone)
    if(recipient.length<7)return setNotice('This member does not have a valid international WhatsApp number yet.')
    const url=`https://wa.me/${recipient}?text=${encodeURIComponent(aiDraft)}`
    window.open(url,'_blank','noopener,noreferrer')
    setNotice(`WhatsApp opened for ${m.full_name}. Send from the WhatsApp account logged in as ${PREFERRED_WHATSAPP_SENDER}.`)
  }
  function openSMS(){
    const m=members.find(x=>x.id===aiMember)
    if(!m?.phone||!aiDraft)return setNotice('Select a member with a phone number and generate a message first.')
    const phone=digitsOnly(m.phone)
    window.location.href=`sms:${phone}?body=${encodeURIComponent(aiDraft)}`
  }
  async function generateLetter(){setAiBusy(true);setNotice('');try{const data=await authFetch('/api/ai/letter',letter);setLetterDraft(data.draft);await supabase.from('stakeholder_letters').insert({stakeholder_name:letter.stakeholderName,title:letter.title,purpose:letter.purpose,details:letter.details,signatory:letter.signatory,draft:data.draft})}catch(e){setNotice(e.message)}finally{setAiBusy(false)}}

  if(loading&&!session) return <div className="login-page"><div className="login-card"><p>Loading…</p></div></div>
  if(!session) return <div className="login-page"><form className="login-card" onSubmit={signIn}><img src="/deeper-life-logo.png" alt="Logo"/><h1>Buea Regional Car Project</h1><p>Secure administration portal</p>{notice&&<div className="notice error">{notice}</div>}<div className="stack"><div><label>Admin email</label><input type="email" required value={login.email} onChange={e=>setLogin({...login,email:e.target.value})}/></div><div><label>Password</label><input type="password" required value={login.password} onChange={e=>setLogin({...login,password:e.target.value})}/></div><button className="btn btn-primary">Sign in</button></div><p style={{marginTop:18}}>Designed by <strong>JODEL TECHNOLOGIES</strong></p></form></div>

  return <div className="shell">
    <header className="topbar"><div className="brand"><img src="/deeper-life-logo.png" alt="Regional logo"/><div><h1>Deeper Life Buea Region — Car Project</h1><p>Contribution, vow & accountability management</p></div></div><div className="top-actions"><span className="user-chip">Admin: {session.user.email}</span><button className="btn btn-outline" onClick={signOut}>Sign out</button></div></header>
    <div className="layout"><aside className="sidebar">{tabs.map(t=><button key={t} className={`nav-btn ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t}</button>)}<div className="footer-brand">Groups: Molyko • Buea Town • Bolifamba • Muea<br/><br/>Designed by <strong>JODEL TECHNOLOGIES</strong></div></aside>
      <main className="main"><div className="hero"><div><h2>{tab}</h2><p>Transparent stewardship for the Buea regional vehicle project.</p></div><button className="btn btn-soft" onClick={refresh}>Refresh data</button></div>{notice&&<div className={`notice ${notice.includes('success')||notice.includes('recorded')||notice.includes('added')||notice.includes('saved')?'success':''}`}>{notice}</div>}
        {tab==='Dashboard'&&<Dashboard stats={stats} groupStats={groupStats} vows={vows} carTarget={Number(projectSettings.car_target_amount||0)} carryoverLabel={projectSettings.carryover_label||DEFAULT_CARRYOVER_LABEL}/>} 
        {tab==='Members'&&<Members members={members} groups={groups} form={memberForm} setForm={setMemberForm} submit={addMember}/>} 
        {tab==='Vows'&&<Vows vows={vows} members={members} form={vowForm} setForm={setVowForm} submit={addVow} updateVow={updateVow} stats={stats} carTarget={Number(projectSettings.car_target_amount||0)} carryoverLabel={projectSettings.carryover_label||DEFAULT_CARRYOVER_LABEL}/>} 
        {tab==='Contributions'&&<Contributions data={contributions} vows={vows} members={members} form={contribForm} setForm={setContribForm} submit={addContribution}/>} 
        {tab==='Expenses'&&<Expenses data={expenses} form={expenseForm} setForm={setExpenseForm} submit={addExpense}/>} 
        {tab==='AI Reminders'&&<AIReminders members={members} vows={vows} selected={aiMember} setSelected={setAiMember} draft={aiDraft} setDraft={setAiDraft} generate={generateReminder} send={sendWhatsApp} openSMS={openSMS} busy={aiBusy}/>} 
        {tab==='Bulk SMS'&&<BulkSMS members={members} vows={vows} groups={groups}/>} 
        {tab==='Stakeholder Letters'&&<Letters letter={letter} setLetter={setLetter} draft={letterDraft} setDraft={setLetterDraft} generate={generateLetter} busy={aiBusy}/>} 
        {tab==='Admin Settings'&&<AdminSettings settings={projectSettings} carTarget={Number(projectSettings.car_target_amount||0)} targetForm={targetForm} setTargetForm={setTargetForm} submit={saveTarget} carryoverForm={carryoverForm} setCarryoverForm={setCarryoverForm} saveCarryover={saveCarryover}/>} 
      </main></div>
  </div>
}

function Dashboard({stats,groupStats,vows,carTarget,carryoverLabel}){
  const second=vows.filter(v=>v.vow_sequence===2).sort((a,b)=>a.member_name.localeCompare(b.member_name)||a.vow_sequence-b.vow_sequence)
  const committedProgress=carTarget>0?Math.min(100,stats.committed/carTarget*100):0
  const paidProgress=carTarget>0?Math.min(100,stats.paidOrCarryover/carTarget*100):0
  const commitmentLeft=carTarget>0?Math.max(carTarget-stats.committed,0):0
  const cashLeft=carTarget>0?Math.max(carTarget-stats.paidOrCarryover,0):0
  return <>
    <section className="target-panel">
      <div>
        <div className="target-kicker">REGIONAL CAR FUNDRAISING TARGET</div>
        <div className="target-amount">{carTarget>0?money(carTarget):'Not set yet'}</div>
        <p>{carTarget>0?`${money(commitmentLeft)} still needs new vows/commitments. ${money(cashLeft)} still needs to be received as cash.`:'Go to Admin Settings to enter the approved target amount for the car project.'}</p>
      </div>
      <div className="target-progress-stack">
        <div className="target-progress"><div className="target-progress-head"><strong>{carTarget>0?`${Math.round(committedProgress)}% committed`:'Target pending'}</strong><span>{money(stats.committed)} carryover + vows</span></div><div className="target-bar"><span style={{width:`${committedProgress}%`}}/></div></div>
        <div className="target-progress"><div className="target-progress-head"><strong>{carTarget>0?`${Math.round(paidProgress)}% paid / carried over`:'Target pending'}</strong><span>{money(stats.paidOrCarryover)} received</span></div><div className="target-bar paid"><span style={{width:`${paidProgress}%`}}/></div></div>
      </div>
    </section>
    <div className="cards">
      <Metric label={carryoverLabel||DEFAULT_CARRYOVER_LABEL} value={money(stats.carryover)} cls="green"/>
      <Metric label="New vows recorded" value={money(stats.pledged)}/>
      <Metric label="Paid on recorded vows" value={money(stats.received)} cls="green"/>
      <Metric label="Paid + carryover" value={money(stats.paidOrCarryover)} cls="green"/>
      <Metric label="Outstanding vows" value={money(stats.outstanding)}/>
      <Metric label="Car-project spending" value={money(stats.carSpent)}/>
      <Metric label="Other-purpose use" value={money(stats.otherSpent)} cls="red"/>
      <Metric label="Cash balance" value={money(stats.balance)} cls={stats.balance>=0?'green':'red'}/>
    </div>
    <div className="grid2">
      <section className="panel"><h3>Group performance</h3>{groupStats.map(g=><div className="group-row" key={g.name}><div><strong>{g.name}</strong><br/><small>{g.count} people</small></div><div><div className="bar"><span style={{width:`${Math.min(100,g.pledged?g.received/g.pledged*100:0)}%`}}/></div><small>{money(g.received)} of {money(g.pledged)}</small></div><strong>{g.pledged?Math.round(g.received/g.pledged*100):0}%</strong></div>)}</section>
      <section className="panel"><h3>Second vow list</h3>{second.length===0?<p>No second vows recorded yet.</p>:<div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Group</th><th>Vow</th><th>Given</th><th>Balance</th></tr></thead><tbody>{second.map(v=><tr key={v.id}><td>{v.member_name}</td><td>{v.group_name}</td><td>{money(v.amount_pledged)}</td><td>{money(v.amount_paid)}</td><td>{money(v.balance)}</td></tr>)}</tbody></table></div>}</section>
    </div>
  </>
}
function Metric({label,value,cls=''}){return <div className="card"><div className="metric-label">{label}</div><div className={`metric-value ${cls}`}>{value}</div></div>}
function Members({members,groups,form,setForm,submit}){
  const sortedGroups=[...groups].sort((a,b)=>a.name.localeCompare(b.name))
  return <>
    <section className="panel">
      <h3>Add a name</h3>
      <form className="form-grid" onSubmit={submit}>
        <div><label>Full name</label><input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></div>
        <div><label>WhatsApp / SMS phone</label><input inputMode="numeric" pattern="[0-9]*" placeholder="002376… or 2376…" value={form.phone} onChange={e=>setForm({...form,phone:digitsOnly(e.target.value)})}/><small className="field-help">Digits only. Spaces, +, dashes, brackets and hyphens are removed automatically. For Cameroon, you may enter 237…, 00237…, or a 9-digit local number.</small></div>
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
function Vows({vows,members,form,setForm,submit,updateVow,stats,carTarget,carryoverLabel}){
  const [copyState,setCopyState]=useState('')
  const [editingId,setEditingId]=useState('')
  const [editForm,setEditForm]=useState({member_id:'',amount_pledged:'',notes:''})
  const [savingEdit,setSavingEdit]=useState(false)
  const sortedVows=[...vows].sort((a,b)=>a.member_name.localeCompare(b.member_name)||a.vow_sequence-b.vow_sequence)
  const commitmentLeft=carTarget>0?Math.max(carTarget-stats.committed,0):0
  const cashLeft=carTarget>0?Math.max(carTarget-stats.paidOrCarryover,0):0
  const vowLines=sortedVows.map((v,i)=>{
    const paid=Number(v.amount_paid||0), balance=Number(v.balance||0)
    const status=balance<=0?'PAID':paid>0?'PART-PAID':'VOWED'
    return `${i+1}. ${v.member_name} — ${v.group_name}
   Vow ${v.vow_sequence}: ${money(v.amount_pledged)} | Paid: ${money(paid)} | Balance: ${money(balance)} | ${status}`
  })
  const whatsAppText=[
    '*BUEA REGIONAL CAR PROJECT — VOW UPDATE*',
    carTarget>0?`Target: ${money(carTarget)}`:'Target: Not set',
    `${carryoverLabel||DEFAULT_CARRYOVER_LABEL}: ${money(stats.carryover)} | PAID / CARRYOVER`,
    `New vows recorded: ${money(stats.pledged)}`,
    `Total committed (carryover + vows): ${money(stats.committed)}`,
    `Paid on recorded vows: ${money(stats.received)}`,
    `Total paid / carried over: ${money(stats.paidOrCarryover)}`,
    carTarget>0?`Balance still to be vowed/committed: ${money(commitmentLeft)}`:'',
    carTarget>0?`Balance still to be received in cash: ${money(cashLeft)}`:'',
    '',
    '*VOW LIST — A TO Z*',
    ...(vowLines.length?vowLines:['No vows recorded yet.'])
  ].filter(Boolean).join('\n')
  const copyForWhatsApp=async()=>{
    try{await navigator.clipboard.writeText(whatsAppText);setCopyState('Copied — ready to paste in WhatsApp.')}catch{setCopyState('Copy failed. Select the text below and copy it manually.')}
  }
  const startEdit=v=>{
    setEditingId(v.id)
    setEditForm({member_id:v.member_id,amount_pledged:String(v.amount_pledged),notes:v.notes||''})
  }
  const cancelEdit=()=>{
    setEditingId('')
    setEditForm({member_id:'',amount_pledged:'',notes:''})
  }
  const saveEdit=async e=>{
    e.preventDefault()
    setSavingEdit(true)
    const saved=await updateVow(editingId,editForm)
    setSavingEdit(false)
    if(saved)cancelEdit()
  }
  return <>
    <section className="panel"><h3>Record a vow</h3><div className="notice">A second vow is allowed only after the previous vow balance is zero. New vows reduce the target's <strong>commitment balance</strong>; only actual payments and carryover reduce the <strong>cash still needed</strong>.</div><form className="form-grid" onSubmit={submit}><div><label>Member</label><select required value={form.member_id} onChange={e=>setForm({...form,member_id:e.target.value})}><option value="">Select member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} — {m.groups?.name}</option>)}</select></div><div><label>Vow amount (FCFA)</label><input required min="1" type="number" value={form.amount_pledged} onChange={e=>setForm({...form,amount_pledged:e.target.value})}/></div><div className="wide"><label>Notes</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div><div><button className="btn btn-primary">Record vow</button></div></form></section>
    <section className="panel whatsapp-post-panel"><div className="section-action-head"><div><h3>WhatsApp vow posting list</h3><p>Automatically sorted alphabetically by member name. The carryover/opening contribution is shown as paid/carryover, followed by vow, paid and balance figures.</p></div><button className="btn btn-primary" type="button" onClick={copyForWhatsApp}>Copy for WhatsApp</button></div>{copyState&&<div className={`notice ${copyState.startsWith('Copied')?'success':'error'}`}>{copyState}</div>}<textarea className="whatsapp-copy-box" readOnly value={whatsAppText}/></section>
    <section className="panel">
      <div className="section-action-head"><div><h3>Vow register — alphabetical</h3><p>Use <strong>Edit</strong> to correct a wrongly entered vow. Amount and notes can be corrected; the member can be changed only before any payment is attached.</p></div></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Group</th><th>Vow #</th><th>Vowed</th><th>Given</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead><tbody>{sortedVows.map(v=><Fragment key={v.id}><tr><td>{v.member_name}</td><td>{v.group_name}</td><td><span className="badge">{v.vow_sequence}</span></td><td>{money(v.amount_pledged)}</td><td>{money(v.amount_paid)}</td><td>{money(v.balance)}</td><td><span className={`badge ${Number(v.balance)<=0?'green':'red'}`}>{Number(v.balance)<=0?'Paid':'Outstanding'}</span></td><td><button className="btn btn-soft btn-small" type="button" onClick={()=>editingId===v.id?cancelEdit():startEdit(v)}>{editingId===v.id?'Cancel':'Edit'}</button></td></tr>{editingId===v.id&&<tr className="vow-edit-row"><td colSpan="8"><form className="vow-edit-form" onSubmit={saveEdit}><div><label>Member</label><select required value={editForm.member_id} disabled={Number(v.amount_paid||0)>0} onChange={e=>setEditForm({...editForm,member_id:e.target.value})}>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} — {m.groups?.name}</option>)}</select>{Number(v.amount_paid||0)>0&&<small className="field-help">Locked because a payment is already attached to this vow.</small>}</div><div><label>Correct vow amount (FCFA)</label><input required min={Math.max(1,Number(v.amount_paid||0))} type="number" value={editForm.amount_pledged} onChange={e=>setEditForm({...editForm,amount_pledged:e.target.value})}/><small className="field-help">Cannot be lower than the amount already paid.</small></div><div className="vow-edit-notes"><label>Notes</label><input value={editForm.notes} onChange={e=>setEditForm({...editForm,notes:e.target.value})}/></div><div className="vow-edit-actions"><button className="btn btn-primary" disabled={savingEdit}>{savingEdit?'Saving…':'Save correction'}</button><button className="btn btn-outline" type="button" disabled={savingEdit} onClick={cancelEdit}>Cancel</button></div></form></td></tr>}</Fragment>)}</tbody></table></div>
    </section>
  </>
}
function Contributions({data,vows,members,form,setForm,submit}){const memberVows=vows.filter(v=>!form.member_id||v.member_id===form.member_id);return <><section className="panel"><h3>Record contribution received</h3><form className="form-grid" onSubmit={submit}><div><label>Member</label><select required value={form.member_id} onChange={e=>setForm({...form,member_id:e.target.value,vow_id:''})}><option value="">Select member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div><div><label>Vow</label><select required value={form.vow_id} onChange={e=>setForm({...form,vow_id:e.target.value})}><option value="">Select vow</option>{memberVows.map(v=><option key={v.id} value={v.id}>Vow {v.vow_sequence} — balance {money(v.balance)}</option>)}</select></div><div><label>Amount received</label><input type="number" min="1" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div><div><label>Date</label><input type="date" required value={form.payment_date} onChange={e=>setForm({...form,payment_date:e.target.value})}/></div><div><label>Method</label><select value={form.method} onChange={e=>setForm({...form,method:e.target.value})}><option>Cash</option><option>Mobile Money</option><option>Bank</option><option>Other</option></select></div><div className="wide"><label>Notes / receipt reference</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div><div><button className="btn btn-primary">Save contribution</button></div></form></section><section className="panel"><h3>Contribution history</h3><div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Name</th><th>Vow #</th><th>Amount</th><th>Method</th><th>Notes</th></tr></thead><tbody>{data.map(c=><tr key={c.id}><td>{c.payment_date}</td><td>{c.members?.full_name}</td><td>{c.vows?.vow_sequence}</td><td>{money(c.amount)}</td><td>{c.method}</td><td>{c.notes||'—'}</td></tr>)}</tbody></table></div></section></>}
function Expenses({data,form,setForm,submit}){return <><section className="panel"><h3>Record money used</h3><div className="notice">Use “Other purpose” for every amount taken from the fund for something not directly connected to buying/preparing the regional vehicle. This keeps stewardship transparent.</div><form className="form-grid" onSubmit={submit}><div><label>Amount</label><input type="number" min="1" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div><div><label>Date</label><input type="date" required value={form.expense_date} onChange={e=>setForm({...form,expense_date:e.target.value})}/></div><div><label>Use category</label><select value={form.expense_type} onChange={e=>setForm({...form,expense_type:e.target.value})}><option value="car_project">Car project</option><option value="other_purpose">Other purpose</option></select></div><div><label>Approved by</label><input required value={form.approved_by} onChange={e=>setForm({...form,approved_by:e.target.value})}/></div><div className="full"><label>Purpose / explanation</label><input required value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})}/></div><div><button className="btn btn-red">Record use of funds</button></div></form></section><section className="panel"><h3>Expense / fund-use register</h3><div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Category</th><th>Purpose</th><th>Amount</th><th>Approved by</th></tr></thead><tbody>{data.map(x=><tr key={x.id}><td>{x.expense_date}</td><td><span className={`badge ${x.expense_type==='other_purpose'?'red':''}`}>{x.expense_type==='car_project'?'Car project':'Other purpose'}</span></td><td>{x.purpose}</td><td>{money(x.amount)}</td><td>{x.approved_by}</td></tr>)}</tbody></table></div></section></>}
function AdminSettings({settings,carTarget,targetForm,setTargetForm,submit,carryoverForm,setCarryoverForm,saveCarryover}){
  const lastCheck=settings?.last_keep_alive_at?new Date(settings.last_keep_alive_at):null
  const ageMs=lastCheck?Date.now()-lastCheck.getTime():Infinity
  const fresh=lastCheck&&ageMs<=36*60*60*1000&&settings?.last_keep_alive_status==='online'
  const systemState=!lastCheck?{label:'Waiting for first check',cls:'pending'}:fresh?{label:'Online',cls:'online'}:{label:'Check overdue',cls:'overdue'}
  const lastText=lastCheck?`${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Douala'}).format(lastCheck)} WAT`:'No automatic check recorded yet'
  return <>
    <section className="panel system-status-panel">
      <div className="system-status-head">
        <div><span className="badge">Automatic keep-awake</span><h3>System Status</h3><p>Vercel Cron contacts Supabase once every day and records the latest successful database check here.</p></div>
        <div className={`system-status-pill ${systemState.cls}`}><span className="status-dot"/>{systemState.label}</div>
      </div>
      <div className="status-grid">
        <div className="status-item"><small>Database</small><strong>{fresh?'Supabase responding':lastCheck?'Needs a fresh check':'Awaiting first cron run'}</strong></div>
        <div className="status-item"><small>Last automatic check</small><strong>{lastText}</strong></div>
        <div className="status-item"><small>Daily schedule</small><strong>06:00–06:59 WAT</strong><span>05:00 UTC cron window</span></div>
        <div className="status-item"><small>Keep-awake job</small><strong>Vercel Cron → Supabase</strong><span>Harmless database read + health timestamp</span></div>
      </div>
      {settings?.last_keep_alive_note&&<div className="status-note">Last result: {settings.last_keep_alive_note}</div>}
      <p className="field-help">If this becomes “Check overdue”, open Vercel → Project → Settings → Cron Jobs and inspect the function logs. On Vercel Hobby, daily jobs may run at any time within the scheduled hour.</p>
    </section>
    <section className="panel settings-panel"><div className="settings-heading"><div><span className="badge">Administrator only</span><h3>Regional car target amount</h3><p>Enter the approved amount the Buea Region intends to raise for the car project. The dashboard shows both commitment progress from vows and actual paid/carryover progress.</p></div><div className="settings-current"><small>Current target</small><strong>{carTarget>0?money(carTarget):'Not set'}</strong></div></div><form className="target-form" onSubmit={submit}><div><label>Target amount (FCFA)</label><input type="number" min="1" step="1" required placeholder="e.g. 15000000" value={targetForm} onChange={e=>setTargetForm(e.target.value)}/><small className="field-help">You can change this later if the approved vehicle budget changes.</small></div><button className="btn btn-primary">Save target amount</button></form></section>
    <section className="panel carryover-panel"><div className="settings-heading"><div><span className="badge green">Paid / carried over</span><h3>Carryover / congregation contribution</h3><p>Add money that was already received before the detailed member-by-member tracking started. You can name it “Carryover”, “Congregation contribution”, “First vow total amount”, or another clear description.</p></div><div className="settings-current"><small>Current carryover</small><strong>{money(settings?.carryover_amount||0)}</strong></div></div><form className="carryover-form" onSubmit={saveCarryover}><div><label>Name shown on dashboard and WhatsApp list</label><input required value={carryoverForm.label} onChange={e=>setCarryoverForm({...carryoverForm,label:e.target.value})} placeholder={DEFAULT_CARRYOVER_LABEL}/><small className="field-help">Example: Congregation contribution, Carryover, or First vow total amount.</small></div><div><label>Paid / carryover amount (FCFA)</label><input type="number" min="0" step="1" required value={carryoverForm.amount} onChange={e=>setCarryoverForm({...carryoverForm,amount:e.target.value})} placeholder="0"/><small className="field-help">This amount counts as already received and reduces the cash still needed toward the target.</small></div><button className="btn btn-primary">Save carryover amount</button></form><div className="notice carryover-warning"><strong>Avoid double counting:</strong> if this figure already represents earlier first-vow money, do not also enter the same money again as individual contribution transactions.</div></section>
    <section className="panel"><h3>How the target balances are calculated</h3><p className="settings-copy"><strong>Commitment progress</strong> = carryover + all vows recorded. It shows how much of the target has been covered by promises/commitments as vows come in. <strong>Paid / carryover progress</strong> = carryover + actual contribution transactions received. It shows real money received. Expenses remain separate and reduce the cash balance, not the historical amount raised.</p></section>
  </>
}
function AIReminders({members,vows,selected,setSelected,draft,setDraft,generate,send,openSMS,busy}){const m=members.find(x=>x.id===selected);const latest=vows.filter(v=>v.member_id===selected).sort((a,b)=>b.vow_sequence-a.vow_sequence)[0];return <section className="panel"><h3>AI reminder & no-API WhatsApp</h3><div className="notice"><strong>Preferred sender: {PREFERRED_WHATSAPP_SENDER}.</strong> WhatsApp is opened through its click-to-chat link, so no WhatsApp API key is needed. The browser cannot force a sender account: make sure WhatsApp Web/Desktop or the phone is logged in with {PREFERRED_WHATSAPP_SENDER} before you click send.</div><div className="form-grid"><div className="wide"><label>Member</label><select value={selected} onChange={e=>{setSelected(e.target.value);setDraft('')}}><option value="">Select member</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name} — {m.groups?.name}</option>)}</select></div><div><label>Current vow</label><input readOnly value={latest?`Vow ${latest.vow_sequence}: ${money(latest.balance)} left`:'No vow selected'}/></div><div><label>Digits-only phone</label><input readOnly value={digitsOnly(m?.phone||'')}/></div><div><button className="btn btn-soft" disabled={busy} onClick={generate}>{busy?'Generating…':'Generate reminder'}</button></div><div><button className="btn btn-primary" disabled={busy||!draft} onClick={send}>Open in WhatsApp</button></div><div><button className="btn btn-outline" disabled={busy||!draft} onClick={openSMS}>Open SMS app</button></div><div className="full"><label>Review / edit before sending</label><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Generated reminder appears here…"/></div></div></section>}
function BulkSMS({members,vows,groups}){
  const [groupId,setGroupId]=useState('all')
  const [outstandingOnly,setOutstandingOnly]=useState(true)
  const [template,setTemplate]=useState('Peace and grace be multiplied unto you, {name}. This is a gentle reminder concerning Vow {vow} for the Buea Regional Car Project. Your outstanding balance is {balance}. Thank you for your faithful support. God bless you.')
  const latestFor=id=>vows.filter(v=>v.member_id===id).sort((a,b)=>b.vow_sequence-a.vow_sequence)[0]
  const selectedMembers=members.filter(m=>m.phone).filter(m=>groupId==='all'||m.group_id===groupId).filter(m=>!outstandingOnly||Number(latestFor(m.id)?.balance||0)>0)
  const personalize=m=>{const v=latestFor(m.id);return template.replaceAll('{name}',m.full_name).replaceAll('{group}',m.groups?.name||'').replaceAll('{vow}',v?String(v.vow_sequence):'—').replaceAll('{balance}',v?money(v.balance):money(0))}
  const csvEscape=value=>`"${String(value??'').replaceAll('\"','\"\"')}"`
  const downloadCSV=()=>{
    if(!selectedMembers.length)return
    const rows=[['Name','Phone','Group','Vow','Balance','Message','Requested Sender'],...selectedMembers.map(m=>{const v=latestFor(m.id);return [m.full_name,digitsOnly(m.phone),m.groups?.name||'',v?.vow_sequence||'',v?.balance||0,personalize(m),PREFERRED_WHATSAPP_SENDER]})]
    const csv=rows.map(r=>r.map(csvEscape).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`buea-bulk-sms-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)
  }
  const copyPhones=async()=>{if(selectedMembers.length)await navigator.clipboard.writeText(selectedMembers.map(m=>digitsOnly(m.phone)).join('\n'))}
  return <><section className="panel"><h3>Bulk SMS preparation</h3><div className="notice">A normal web browser cannot transmit bulk SMS by itself. This page prepares a clean digits-only contact list and personalized message CSV that you can upload in a bulk-SMS provider's web portal. Automatic sending from the system can be added later if you choose an SMS provider/API.</div><div className="messaging-sender"><span>Requested sender / return number</span><strong>{PREFERRED_WHATSAPP_SENDER}</strong><small>An SMS provider must support and approve the sender identity/number; the website cannot spoof it.</small></div><div className="form-grid"><div><label>Church group</label><select value={groupId} onChange={e=>setGroupId(e.target.value)}><option value="all">All groups</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div><div><label>Recipients</label><select value={String(outstandingOnly)} onChange={e=>setOutstandingOnly(e.target.value==='true')}><option value="true">Outstanding vows only</option><option value="false">All members with phones</option></select></div><div><label>Ready contacts</label><input readOnly value={`${selectedMembers.length} member${selectedMembers.length===1?'':'s'}`}/></div><div className="full"><label>SMS message template</label><textarea value={template} onChange={e=>setTemplate(e.target.value)}/><small className="field-help">Available placeholders: {'{name}'}, {'{group}'}, {'{vow}'}, {'{balance}'}.</small></div><div><button className="btn btn-primary" type="button" disabled={!selectedMembers.length} onClick={downloadCSV}>Download bulk SMS CSV</button></div><div><button className="btn btn-outline" type="button" disabled={!selectedMembers.length} onClick={copyPhones}>Copy phone list</button></div></div></section><section className="panel"><h3>Bulk SMS preview</h3><div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Group</th><th>Phone</th><th>Message preview</th></tr></thead><tbody>{selectedMembers.slice(0,25).map(m=><tr key={m.id}><td>{m.full_name}</td><td>{m.groups?.name}</td><td>{digitsOnly(m.phone)}</td><td className="message-preview">{personalize(m)}</td></tr>)}</tbody></table></div>{selectedMembers.length>25&&<p className="field-help">Showing the first 25 recipients. The CSV contains all {selectedMembers.length} selected contacts.</p>}</section></>
}
function Letters({letter,setLetter,draft,setDraft,generate,busy}){return <section className="panel"><h3>AI-crafted stakeholder letter</h3><div className="form-grid"><div><label>Stakeholder name</label><input value={letter.stakeholderName} onChange={e=>setLetter({...letter,stakeholderName:e.target.value})}/></div><div><label>Title / role</label><input value={letter.title} onChange={e=>setLetter({...letter,title:e.target.value})}/></div><div className="wide"><label>Purpose of letter</label><input value={letter.purpose} onChange={e=>setLetter({...letter,purpose:e.target.value})} placeholder="e.g. appreciation, project update, support request"/></div><div className="full"><label>Facts/details AI must include</label><textarea value={letter.details} onChange={e=>setLetter({...letter,details:e.target.value})}/></div><div className="wide"><label>Signatory</label><input value={letter.signatory} onChange={e=>setLetter({...letter,signatory:e.target.value})}/></div><div><button className="btn btn-soft" disabled={busy} onClick={generate}>{busy?'Writing…':'Draft letter with AI'}</button></div><div className="full"><label>Review / edit final letter</label><textarea style={{minHeight:260}} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="AI-generated stakeholder letter appears here…"/></div></div></section>}
