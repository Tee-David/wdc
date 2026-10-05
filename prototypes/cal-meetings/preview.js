const app = document.querySelector('#app');
const state = { screen: 'booking', step: 0, date: 12, time: '', view: 'month', tab: 'Calendar', selected: 0, error: false, changes: 0, name: '', email: '', notes: '' };
const meetings = [
  { title: 'Project conversation', client: 'Sample client · new enquiry', day: 12, time: '10:00', status: 'Confirmed' },
  { title: 'Brand direction review', client: 'Sample client · branding project', day: 14, time: '14:00', status: 'Awaiting approval' },
  { title: 'Project check-in', client: 'Sample client · website project', day: 16, time: '11:30', status: 'Confirmed' }
];
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const components = window.WDC_COMPONENTS;
const icon = name => components.icons[name] || '';
const button = (label, action, cls = '', extra = '') => {
  const glyph = { '‹':'ChevronLeft', '›':'ChevronRight', '×':'X', '+':'Plus' }[label];
  const leading = {'Schedule a meeting':'Plus','View meeting':'CalendarClock','Copy booking link':'Link','Join meeting':'Video','Reschedule':'CalendarClock','Save changes':'Check','Add a date override':'Plus'}[label];
  const kit = glyph ? 'ad__iconButton' : cls.includes('public-') || cls==='day' || cls.startsWith('day ') ? '' : 'ad__btn';
  return `<button class="${kit} ${cls==='primary'?'ad__btn--primary':cls}" data-action="${action}" ${extra}>${glyph?icon(glyph):(leading?icon(leading):'')+label}</button>`;
};
function toast(message) { const box = document.querySelector('#announcement'); box.textContent = message; box.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => box.classList.remove('visible'), 3500); }
function month(booking = false) {
  return `<div class="month-toolbar">${button('‹','previous-month','','aria-label="Previous month"')}<strong>October 2026</strong>${button('›','next-month','','aria-label="Next month"')}</div><div class="month">${['M','T','W','T','F','S','S'].map((d,i)=>`<span class="weekday" aria-label="${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]}">${d}</span>`).join('')}${'<span></span>'.repeat(3)}${Array.from({length:31},(_,i)=> { const d=i+1; const available = d >= 8 && ![10,11,17,18,24,25,31].includes(d); return button(d,`date:${d}`,`day ${available?'available':''} ${state.date===d?'selected':''}`,`aria-label="October ${d}, 2026" aria-pressed="${state.date===d}" ${booking&&!available?'disabled':''}`); }).join('')}</div>`;
}
function booking() {
  const steps = ['Meeting','Date & time','Your details','Review'];
  let content = '';
  if(state.step===0) content = `<h2>Let’s talk about your project</h2><p class="muted">A little time together to understand what you have in mind.</p><button class="choice selected" data-action="next"><span class="choices-icon" aria-hidden="true">↗</span><span class="choice-main"><b>Project conversation</b><small>30 minutes · Video call · No charge</small></span><span aria-hidden="true">→</span></button><div class="notice"><strong>Prefer to write it down?</strong>Our project enquiry form remains available.</div>${button('Tell us about your project','contact','public-secondary')}`;
  if(state.step===1) content = `<h2>Choose a date and time</h2><p class="muted">Times are shown in your selected time zone.</p><div class="timezone">${button('Africa/Lagos · UTC+1 ▾','timezone')}</div>${state.error?`<div class="notice"><strong>We couldn’t load available times.</strong>Your details are safe. Try again or send a project enquiry.${button('Try again','retry')}</div>`:`<div class="date-time"><section class="calendar-section" aria-label="Choose date">${month(true)}</section><section><h3>October ${state.date}</h3><p class="muted">30-minute conversations</p><div class="slots">${['09:00','10:00','11:30','14:00','15:00','16:00'].map(t=>button(t,`time:${t}`,state.time===t?'selected':'',`aria-pressed="${state.time===t}"`)).join('')}</div></section></div>`}<div class="preview-state">Preview a recovery state: ${button('Availability unavailable','error')}</div>`;
  if(state.step===2) content = `<h2>A little about you</h2><p class="muted">Help us arrive prepared.</p><form id="details"><div class="fields"><label>Your name<input name="name" autocomplete="name" required value="${esc(state.name)}"></label><label>Email address<input name="email" type="email" autocomplete="email" required value="${esc(state.email)}"></label><label class="wide">What would you like to discuss?<textarea name="notes">${esc(state.notes)}</textarea></label></div><p class="privacy-note">In the finished flow, we’ll use these details to manage your meeting. This preview sends nothing.</p></form>`;
  if(state.step===3) content = `<h2>Everything look right?</h2><p class="muted">Check the details before confirming.</p><dl class="review-list"><dt>Meeting</dt><dd>Project conversation</dd><dt>When</dt><dd>October ${state.date}, 2026 · ${state.time}</dd><dt>Time zone</dt><dd>Africa/Lagos · UTC+1</dd><dt>Duration</dt><dd>30 minutes</dd><dt>Location</dt><dd>Video call · link after confirmation</dd><dt>Your details</dt><dd>${esc(state.name)}<br>${esc(state.email)}</dd></dl>`;
  if(state.step===4) content = `<div class="success-mark" aria-hidden="true">✓</div><h2>You’re all set</h2><p>This is the proposed confirmation screen. No meeting was booked.</p><dl class="review-list"><dt>Conversation</dt><dd>October ${state.date} · ${state.time}<br>Africa/Lagos · 30 minutes</dd><dt>Next steps</dt><dd>Your confirmation would include the video link and secure options to reschedule or cancel.</dd></dl><div class="button-row">${button('Manage meeting','manage','public-primary')}${button('Back to booking','restart','public-secondary')}</div>`;
  return `<header class="hero"><div class="hero-nav"><span class="wordmark">We Dig Creativity</span><span>Meet the studio</span></div><span class="eyebrow">A conversation is a good place to start</span><h1>Make time for your next idea.</h1><p>Choose a time that works for you. We’ll bring the questions, the attention and a fresh perspective.</p></header><main class="booking-wrap"><aside class="panel summary"><span class="pill">We Dig Creativity</span><h2>Project conversation</h2><p>Tell us where you are and where you want to go.</p><div class="figure">30 <small>min</small></div><div class="summary-row">Video conversation</div><div class="summary-details"><div class="summary-row">No charge for this first conversation</div><p class="muted">A clear next step, whether we work together now or later.</p></div></aside><section class="panel booking-body"><ol class="step-indicator">${steps.map((s,i)=>`<li class="${state.step===i?'current':''}" ${state.step===i?'aria-current="step"':''}>${i+1}. ${s}</li>`).join('')}</ol>${content}${state.step<4?`<div class="actions">${button(state.step?'Back':'Contact instead',state.step?'back':'contact','public-secondary')}${button(state.step===3?'Confirm sample booking':'Continue','next','public-primary',state.step===1&&!state.time?'disabled':'')}</div>`:''}</section></main>`;
}
function shell(content, settings = false) {
  return components.shell.replace('__PAGE__',components.demo + content);
}
function agenda(items) { return items.length?`<div class="agenda-list">${items.map(m=>`<button class="agenda-row" data-action="meeting:${meetings.indexOf(m)}"><span class="agenda-time">${m.time}<small>Oct ${m.day}</small></span><span class="agenda-copy"><b>${m.title}</b><small>${m.client}</small><span class="pill ${m.status==='Awaiting approval'?'request':m.status==='Cancelled'?'cancelled':''}">${m.status}</span></span><span aria-hidden="true">→</span></button>`).join('')}</div>`:`<div class="notice"><strong>Nothing here yet</strong>Meetings will appear here when their status changes.${button('View calendar','calendar')}</div>`; }
function workspace() {
  const m = meetings[state.selected];
  let calendar = agenda(meetings);
  if(state.tab==='Requests') calendar=agenda(meetings.filter(m=>m.status==='Awaiting approval'));
  else if(state.tab==='History') calendar=agenda(meetings.filter(m=>m.status==='Cancelled'));
  else if(state.view==='month') calendar=`<div class="calendar-table">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span class="weekday">${d}</span>`).join('')}${Array.from({length:35},(_,i)=>{const d=i-2;return `<div class="calendar-cell ${d===5?'today':''}">${d>0&&d<=31?`<span class="date-number">${d}</span>${meetings.filter(m=>m.day===d&&m.status!=='Cancelled').map(m=>`<button class="event ${m.status==='Awaiting approval'?'request':''}" data-action="meeting:${meetings.indexOf(m)}"><span>${m.time}</span><span>${m.title}</span></button>`).join('')}`:''}</div>`;}).join('')}</div><div class="mobile-calendar">${month()}<h3>Upcoming meetings</h3>${agenda(meetings)}</div>`;
  else if(state.view==='week') calendar=`<div class="week-grid"><div class="week-row head"><div>Time</div>${[12,13,14,15,16].map(d=>`<div>Oct ${d}</div>`).join('')}</div>${['09:00','10:00','11:30','14:00'].map(t=>`<div class="week-row"><div class="time">${t}</div>${[12,13,14,15,16].map(d=>`<div>${meetings.filter(m=>m.day===d&&m.time===t).map(m=>`<button class="event" data-action="meeting:${meetings.indexOf(m)}">${m.title}</button>`).join('')}</div>`).join('')}</div>`).join('')}</div>`;
  else if(state.view==='day') calendar=agenda(meetings.filter(m=>m.day===state.date));
  return shell(`<header class="page-head"><div><h1>Meetings</h1><p>A little preparation. Better conversations.</p></div>${button('Schedule a meeting','booking','primary')}</header><section class="panel next-meeting"><div><span class="eyebrow">Next conversation · sample</span><h3>Project conversation</h3><span class="muted">Oct 12 · 30 minutes · Video call</span></div><span class="next-time">10:00</span><div class="button-row">${button('View meeting','meeting:0','primary')}${button('Copy booking link','copy')}</div></section><div class="tabs">${['Calendar','Requests','History'].map(t=>button(t,`tab:${t}`,state.tab===t?'active':'')).join('')}</div><div class="meeting-layout"><section class="panel calendar-panel"><div class="toolbar"><div class="toolbar-nav">${button('‹','previous-month','','aria-label="Previous period"')}<strong>October 2026</strong>${button('›','next-month','','aria-label="Next period"')}</div><div class="view-buttons">${['agenda','day','week','month'].map(v=>button(v[0].toUpperCase()+v.slice(1),`view:${v}`,state.view===v?'active':'',`data-view="${v}"`)).join('')}</div></div><h2 class="day-agenda-title">${state.tab==='Calendar'?'Your schedule':state.tab}</h2>${calendar}</section><aside class="panel detail" id="meeting-detail">${button('×','close-detail','close-detail','aria-label="Close meeting details"')}<span class="pill ${m.status==='Awaiting approval'?'request':''}">${m.status}</span><h2>${m.title}</h2><p class="muted">${m.client}</p><dl><dt>Date & time</dt><dd>October ${m.day}, 2026 · ${m.time}</dd><dt>Duration</dt><dd>30 minutes</dd><dt>Location</dt><dd>Video call</dd><dt>Project context</dt><dd>Discuss goals, scope and the best next step.</dd></dl><div class="detail-actions">${m.status==='Awaiting approval'?button('Approve sample request','approve','primary'):button('Join meeting','join','primary')}${button('Reschedule','reschedule')}${button('Cancel meeting','cancel')}</div><div class="timeline"><strong>Activity</strong><p>Sample booking received.<br>Confirmation state shown for design review.</p></div></aside></div>`);
}
function availability() { return shell(`<header class="page-head"><div><h1>Availability</h1><p>Your time, on your terms.</p></div>${button('View booking page','booking','primary')}</header><div class="settings-layout"><nav class="settings-nav">${['Availability','Meeting types','Calendars & video','Reminders'].map(n=>button(n,`setting:${n}`,n==='Availability'?'active':'')).join('')}</nav><div class="settings-body"><section class="panel settings-panel"><h2>Weekly hours</h2><p>Set your usual week. Date overrides take priority.</p><div class="timezone">${button('Africa/Lagos · UTC+1 ▾','timezone')}</div>${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d,i)=>`<div class="hours-row"><strong>${d}</strong><div class="hours-control">${i<5?`${button('09:00',`hours:${d}`)}<span>to</span>${button('17:00',`hours:${d}`)}`:'Unavailable'}</div>${button('+',`period:${d}`,'plus',`aria-label="Add hours for ${d}"`)}</div>`).join('')}</section><section class="panel settings-panel"><h2>Date overrides</h2><p>Take a day off or add hours for a particular date.</p><div class="override"><div><strong>October 23, 2026</strong><p class="muted">Unavailable · Sample override</p></div>${button('Edit','override')}</div><p>${button('Add a date override','override')}</p></section><section class="panel settings-panel"><h2>Booking boundaries</h2><p>Proposed defaults; yours to adjust.</p><div class="button-row">${button('24 hours notice','boundary')}${button('15 minute buffers','boundary')}${button('30 day booking window','boundary')}</div></section><div class="save-bar"><p>${state.changes?`${state.changes} unsaved change${state.changes===1?'':'s'}`:'No unsaved changes'} · Preview only</p><div class="button-row">${button('Discard','discard')}${button('Save changes','save','primary',state.changes?'':'disabled')}</div></div></div></div>`,true); }
function render() {
 app.innerHTML=state.screen==='booking'?booking():state.screen==='meetings'?workspace():availability();
 document.querySelectorAll('[data-screen]').forEach(b=>b.setAttribute('aria-current',b.dataset.screen===state.screen));
 app.querySelectorAll('.page-head').forEach(el=>el.classList.add('ad__head'));
 app.querySelectorAll('.pill').forEach(el=>{el.classList.add('ad__pill'); if(el.classList.contains('request'))el.classList.add('ad__pill--warn'); else if(el.classList.contains('cancelled'))el.classList.add('ad__pill--flat'); else if(el.textContent==='Confirmed')el.classList.add('ad__pill--good');});
 app.querySelectorAll('.settings-panel,.calendar-panel,.detail').forEach(el=>{
  const title=el.querySelector('h2');const titleText=title?.textContent || 'Meeting details';title?.remove();
  const replacement=document.createElement('div');replacement.innerHTML=components.panel.replace('__TITLE__',esc(titleText)).replace('__CONTENT__','<div class="meeting-panel-body">'+el.innerHTML+'</div>');
  const panel=replacement.firstElementChild;panel.classList.add(...[...el.classList].filter(c=>c!=='panel'));if(el.id)panel.id=el.id;el.replaceWith(panel);
 });
 app.querySelectorAll('.choices-icon').forEach(el=>el.innerHTML=icon('Video'));
 app.querySelectorAll('.choice>span:last-child,.agenda-row>span:last-child').forEach(el=>el.innerHTML=icon('ArrowRight'));
 app.querySelectorAll('.success-mark').forEach(el=>el.innerHTML=icon('Check'));
 app.querySelectorAll('.hero-nav .wordmark').forEach(el=>el.innerHTML=components.logo+'<span>We Dig Creativity</span>');
 const menu=app.querySelector('.ad__topMenu');if(menu)menu.dataset.action='drawer';
 const theme=app.querySelector('.ad__themeBtn');if(theme){theme.dataset.action='theme';theme.innerHTML=icon(document.documentElement.classList.contains('dark')?'Sun':'Moon');}
 const pin=app.querySelector('[data-tour="sidebar-pin"]');if(pin)pin.dataset.action='collapse';
 app.querySelectorAll('a[href^="/admin"]').forEach(el=>{el.dataset.action=el.getAttribute('href')==='/admin/settings'?'settings':'preview-link';el.setAttribute('href','#');});
 if(state.screen==='availability'){app.querySelector('[data-action="calendar"]')?.classList.remove('is-on');app.querySelector('.ad__nav [data-action="settings"]')?.classList.add('is-on');}
}
document.addEventListener('click',e=>{
 const target=e.target.closest('[data-screen],[data-action]');if(!target)return;e.preventDefault();
 if(target.dataset.screen){state.screen=target.dataset.screen;render();return;}
 const [action,value]=target.dataset.action.split(':');
 if(action==='next'){if(state.step===2){const form=document.querySelector('#details');if(!form.reportValidity())return;const data=new FormData(form);state.name=data.get('name');state.email=data.get('email');state.notes=data.get('notes');}state.step=Math.min(4,state.step+1);}
 else if(action==='back')state.step=Math.max(0,state.step-1);
 else if(action==='date'){state.date=Number(value);state.time='';}
 else if(action==='time')state.time=value+':'+target.dataset.action.split(':')[2];
 else if(action==='view')state.view=value;
 else if(action==='tab')state.tab=value;
 else if(action==='calendar'){state.tab='Calendar';state.view='month';}
 else if(action==='meeting'){state.selected=Number(value);render();document.querySelector('#meeting-detail').classList.add('open');return;}
 else if(action==='close-detail'){document.querySelector('#meeting-detail').classList.remove('open');return;}
 else if(action==='cancel'){document.querySelector('#confirm').showModal();return;}
 else if(action==='approve'){meetings[state.selected].status='Confirmed';toast('Updated · sample request approved');}
 else if(action==='booking'||action==='reschedule'||action==='restart'){state.screen='booking';state.step=action==='reschedule'?1:0;state.time='';}
 else if(action==='settings')state.screen='availability';
 else if(action==='error')state.error=true;
 else if(action==='retry')state.error=false;
 else if(['period','hours','override','boundary'].includes(action)){state.changes++;toast('Sample change added. Save or discard below.');}
 else if(action==='save'){state.changes=0;toast('Saved · preview only');}
 else if(action==='discard'){state.changes=0;toast('Sample changes discarded');}
 else if(action==='manage'){state.screen='meetings';state.selected=0;}
 else if(action==='drawer'){const dialog=document.createElement('dialog');dialog.className='drawer ad';dialog.innerHTML=`${app.querySelector('.ad__sideInner').innerHTML}<div>${button('Close menu','close-menu')}</div>`;document.body.append(dialog);dialog.showModal();return;}
 else if(action==='collapse'){app.querySelector('.ad__wrap').classList.toggle('is-collapsed');return;}
 else if(action==='theme'){document.querySelector('#theme').click();render();return;}
 else if(action==='close-menu'){target.closest('dialog').remove();return;}
 else if(action==='timezone')toast('Preview time zone: Africa/Lagos (UTC+1). A searchable zone picker is included in the implementation plan.');
 else if(action==='copy')toast('The finished flow will copy your public booking link. This preview has no live booking URL.');
 else if(action==='join')toast('The confirmed provider video link will open here. No sample meeting room exists.');
 else if(action==='contact')toast('The existing project enquiry form stays available alongside booking.');
 else if(action==='setting')toast(`${value} is included in the plan. This artifact focuses on availability.`);
 else toast('This design preview shows October 2026 and the Meetings workspace.');
 render();
});
document.querySelector('#theme').addEventListener('click',()=>{const dark=document.documentElement.classList.toggle('dark');document.querySelector('#theme').textContent=dark?'Light theme':'Dark theme';document.querySelector('#theme').setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');});
document.querySelector('#keep').onclick=()=>document.querySelector('#confirm').close();
document.querySelector('#cancel-confirm').onclick=()=>{meetings[state.selected].status='Cancelled';document.querySelector('#confirm').close();render();toast('Updated · sample meeting cancelled');};
render();
