import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, query, orderBy, limit, where, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = { apiKey: "AIzaSyB_GdmPBnWl3w6g99j1cGO7vxDdxmKr4QA", authDomain: "netubexmoney.firebaseapp.com", projectId: "netubexmoney", storageBucket: "netubexmoney.firebasestorage.app", messagingSenderId: "856592608176", appId: "1:856592608176:web:69f9df9cfd4f8c28630475" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let usersData=[], devicesData=[], withdrawalsData=[], ticketsData=[], capsData=[], memosData=[], lastReport=null;
let onlineChart, pointsChart, tempsChart, inscriptionsChart, visitesChart;
let ticketsStatusChart, ticketsPriorityChart, ticketsEvolutionChart;
let selectedActivateUser=null, selectedPromoteUser=null, currentNetuberFilter="all", currentWithdrawFilter="all", currentRoleFilter="all";
let searchPendingTerm="", searchActiveTerm="", searchMembresTerm="";
let currentDeleteTicket = null;
let currentReportReference = null;
let currentReportDate = null;

function escapeHtml(t){if(!t)return'';return String(t).replace(/[&<>]/g,m=>m==='&'?'&amp;':(m==='<'?'&lt;':'&gt;'));}
function formatDateShort(d){if(!d)return'-';try{return new Date(d).toLocaleDateString('fr-FR');}catch(e){return'-';}}
function formatDateTime(d){if(!d)return'-';try{return new Date(d).toLocaleString('fr-FR');}catch(e){return'-';}}
function showToast(msg,isError=false){let t=document.createElement('div');t.className='toast'+(isError?' toast-error':'');t.innerHTML=(isError?'❌ ':'✅ ')+msg;document.body.appendChild(t);setTimeout(()=>t.remove(),4000);}
function openModal(id){document.getElementById(id).classList.add('active');}
window.closeModal=id=>document.getElementById(id).classList.remove('active');

function showConfirm(title,message,onConfirm){
    document.getElementById('confirmTitle').textContent=title;
    document.getElementById('confirmMessage').textContent=message;
    document.getElementById('confirmModal').classList.add('active');
    let ok=document.getElementById('confirmOkBtn'),cancel=document.getElementById('confirmCancelBtn');
    let handler=()=>{document.getElementById('confirmModal').classList.remove('active');ok.removeEventListener('click',handler);cancel.removeEventListener('click',cancelHandler);if(onConfirm)onConfirm();};
    let cancelHandler=()=>{document.getElementById('confirmModal').classList.remove('active');ok.removeEventListener('click',handler);cancel.removeEventListener('click',cancelHandler);};
    ok.addEventListener('click',handler);cancel.addEventListener('click',cancelHandler);
}

function initTabScroll() {
    const tabsWrapper = document.querySelector('.tabs-wrapper');
    const leftArrow = document.getElementById('scrollLeftArrow');
    const rightArrow = document.getElementById('scrollRightArrow');
    if (!tabsWrapper) return;
    const scrollAmount = 200;
    leftArrow.addEventListener('click', () => { tabsWrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); });
    rightArrow.addEventListener('click', () => { tabsWrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' }); });
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark-soft') {
        document.body.classList.remove('light-gradient');
        document.body.classList.add('dark-soft');
    } else {
        document.body.classList.add('light-gradient');
        document.body.classList.remove('dark-soft');
    }
}
function toggleTheme() {
    if (document.body.classList.contains('light-gradient')) {
        document.body.classList.remove('light-gradient');
        document.body.classList.add('dark-soft');
        localStorage.setItem('theme', 'dark-soft');
    } else {
        document.body.classList.remove('dark-soft');
        document.body.classList.add('light-gradient');
        localStorage.setItem('theme', 'light-gradient');
    }
}

window.showRapportPopup = function(netuberData) {
    const popup = document.getElementById('rapportPopup');
    const body = document.getElementById('rapportPopupBody');
    const rendement = netuberData.tempsJour > 0 ? ((netuberData.pointsJour / (netuberData.tempsJour / 60)).toFixed(2)) : 0;
    const tauxAtteinte = netuberData.objectifMensuel > 0 ? ((netuberData.objectifAtteint / netuberData.objectifMensuel) * 100).toFixed(1) : 0;
    const statutGlobal = tauxAtteinte >= 100 ? '🏆 EXCELLENT' : (tauxAtteinte >= 70 ? '✅ CORRECT' : (tauxAtteinte >= 50 ? '⚠️ À SURVEILLER' : '🔴 CRITIQUE'));
    const statutColor = tauxAtteinte >= 100 ? '#10b981' : (tauxAtteinte >= 70 ? '#f59e0b' : (tauxAtteinte >= 50 ? '#f97316' : '#ef4444'));
    
    body.innerHTML = `
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-id-card"></i> Code Netuber :</span><span class="rapport-detail-value"><strong style="color:#f59e0b; font-size:18px;">${escapeHtml(netuberData.code)}</strong></span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-calendar-check"></i> Présence :</span><span class="rapport-detail-value">${netuberData.presence === 'Présent' ? '<span class="badge-present">✅ PRÉSENT</span>' : '<span class="badge-absent">❌ ABSENT</span>'}</span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-comment"></i> Raison absence :</span><span class="rapport-detail-value">${escapeHtml(netuberData.raisonAbsence || '-')}</span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-bullseye"></i> Objectif mensuel :</span><span class="rapport-detail-value"><strong>${netuberData.objectifMensuel || 0}</strong> pts</span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-trophy"></i> Objectif atteint :</span><span class="rapport-detail-value"><strong style="color:${netuberData.objectifAtteint >= (netuberData.objectifMensuel||0) ? '#10b981' : '#f59e0b'}">${netuberData.objectifAtteint || 0}</strong> pts</span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-chart-line"></i> Taux d'atteinte :</span><span class="rapport-detail-value"><strong style="color:${statutColor}">${tauxAtteinte}%</strong> <span style="margin-left:10px;">${statutGlobal}</span></span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-layer-group"></i> Niveaux / Niveaux atteints :</span><span class="rapport-detail-value">${netuberData.nbNiveaux || 0} / ${netuberData.nbNiveauxAtteints || 0}</span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-chart-simple"></i> Points précédents → Points jour :</span><span class="rapport-detail-value">${netuberData.pointsPrecedents || 0} → <strong style="color:#f59e0b;">${netuberData.pointsJour || 0}</strong></span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-hourglass-half"></i> Temps précédent → Temps jour :</span><span class="rapport-detail-value">${netuberData.tempsPrecedent || 0} min → ${netuberData.tempsJour || 0} min</span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-wifi"></i> Forfait Internet :</span><span class="rapport-detail-value">${escapeHtml(netuberData.forfaitInternet || '-')}</span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-gauge-high"></i> Rendement :</span><span class="rapport-detail-value"><strong style="color:#10b981; font-size:16px;">${rendement} pts/h</strong></span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-calendar-day"></i> Référence rapport :</span><span class="rapport-detail-value"><code>${currentReportReference || '-'}</code></span></div>
        <div class="rapport-detail-row"><span class="rapport-detail-label"><i class="fas fa-clock"></i> Date rapport :</span><span class="rapport-detail-value">${currentReportDate || '-'}</span></div>
    `;
    popup.classList.add('active');
}
window.closeRapportPopup = function() {
    document.getElementById('rapportPopup').classList.remove('active');
}

function updateTicketsCharts() {
    const statusCount = { ouvert: 0, 'en cours': 0, résolu: 0 };
    ticketsData.forEach(t => { const s = t.status || 'ouvert'; if (s === 'ouvert') statusCount.ouvert++; else if (s === 'en cours') statusCount['en cours']++; else if (s === 'résolu') statusCount.résolu++; });
    const ctxStatus = document.getElementById('ticketsStatusChart')?.getContext('2d');
    if (ctxStatus) { if (ticketsStatusChart) ticketsStatusChart.destroy(); ticketsStatusChart = new Chart(ctxStatus, { type: 'doughnut', data: { labels: ['Ouverts', 'En cours', 'Résolus'], datasets: [{ data: [statusCount.ouvert, statusCount['en cours'], statusCount.résolu], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'] }] }, options: { responsive: true, plugins: { legend: { position: 'bottom' } } } }); }
    const priorityCount = { basse: 0, moyenne: 0, haute: 0 };
    ticketsData.forEach(t => { const p = (t.priority || 'moyenne').toLowerCase(); if (p === 'basse') priorityCount.basse++; else if (p === 'haute') priorityCount.haute++; else priorityCount.moyenne++; });
    const ctxPriority = document.getElementById('ticketsPriorityChart')?.getContext('2d');
    if (ctxPriority) { if (ticketsPriorityChart) ticketsPriorityChart.destroy(); ticketsPriorityChart = new Chart(ctxPriority, { type: 'bar', data: { labels: ['Basse', 'Moyenne', 'Haute'], datasets: [{ data: [priorityCount.basse, priorityCount.moyenne, priorityCount.haute], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderRadius: 8 }] }, options: { responsive: true, plugins: { legend: { display: false } } } }); }
    const last7Days = []; const ticketsPerDay = {};
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toISOString().split('T')[0]; last7Days.push(dateStr); ticketsPerDay[dateStr] = 0; }
    ticketsData.forEach(t => { if (t.date) { const ticketDate = new Date(t.date).toISOString().split('T')[0]; if (ticketsPerDay[ticketDate] !== undefined) ticketsPerDay[ticketDate]++; } });
    const ctxEvo = document.getElementById('ticketsEvolutionChart')?.getContext('2d');
    if (ctxEvo) { if (ticketsEvolutionChart) ticketsEvolutionChart.destroy(); ticketsEvolutionChart = new Chart(ctxEvo, { type: 'line', data: { labels: last7Days.map(d => d.substring(5)), datasets: [{ data: last7Days.map(d => ticketsPerDay[d]), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.3 }] }, options: { responsive: true } }); }
}

const chatStyles = document.createElement('style');
chatStyles.textContent = `
.tab-content.chat-fullscreen{position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;z-index:1000;background:#0a1a2f;padding:0;margin:0;border-radius:0;}
body.chat-active .dashboard>.header,body.chat-active .tabs-container{display:none;}
body.chat-active .tab-content.chat-fullscreen{display:block!important;}
.chat-container{background:#0e2a3a;display:flex;flex-direction:column;height:100%;overflow:hidden;}
.chat-messages{flex:1;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:12px;}
.message-bubble{max-width:85%;padding:12px 18px;border-radius:20px;word-wrap:break-word;font-size:1rem;line-height:1.5;}
.message-sent{align-self:flex-end;background:#005c4b;color:#ffffff;font-weight:500;border-bottom-right-radius:4px;}
.message-received{align-self:flex-start;background:#e4e6eb;color:#050505;border-bottom-left-radius:4px;}
.message-info{font-size:0.65rem;margin-top:6px;opacity:0.7;display:flex;justify-content:flex-end;gap:8px;}
.message-received .message-info{color:#65676b;}
.message-sent .message-info{color:rgba(255,255,255,0.7);}
.message-sender{font-weight:600;color:#005c4b;font-size:0.75rem;display:block;margin-bottom:4px;}
.message-actions{display:flex;gap:8px;margin-top:8px;justify-content:flex-end;}
.message-actions button{background:transparent;padding:4px 10px;font-size:0.7rem;border-radius:20px;color:#7dd3fc;border:none;cursor:pointer;}
.chat-input-area{background:#112b42;padding:16px 20px;border-radius:28px;margin-top:8px;display:flex;gap:12px;align-items:center;}
.chat-input-area textarea{flex:1;background:#0a2538;border:1px solid #2d4e73;border-radius:28px;padding:14px 18px;color:#fff;font-family:'Inter',monospace;font-size:1rem;resize:none;max-height:50px;min-height:50px;}
.chat-input-area textarea:focus{outline:none;border-color:#facc15;}
.chat-input-area button{background:#facc15;padding:12px 18px;border-radius:40px;font-size:1.3rem;min-width:50px;border:none;cursor:pointer;color:#0a1a2f;}
.empty-chat{text-align:center;padding:40px;color:#7dd3fc;}
.chat-header{position:fixed;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:12px 20px;background:linear-gradient(135deg,#0a1a2f,#0e2a3a);z-index:1001;border-bottom:1px solid rgba(250,204,21,0.3);}
.chat-back-btn{background:rgba(250,204,21,0.9);color:#0a1a2f;border:none;border-radius:40px;padding:8px 16px;font-weight:700;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:6px;}
.netubex-logo{font-size:1.6rem;font-weight:900;color:#facc15;letter-spacing:2px;}
.rainbow-line{height:3px;background:linear-gradient(90deg,#ff0000,#ff8000,#ffff00,#00ff00,#0000ff,#4b0082,#9400d3);position:fixed;top:56px;left:0;right:0;z-index:1001;}
body.chat-active .chat-header{display:flex;}
body.chat-active .rainbow-line{display:block;}
.chat-header{display:none;}
.rainbow-line{display:none;}
.loading-placeholder{text-align:center;padding:40px;color:#7dd3fc;font-weight:500;}
`;
document.head.appendChild(chatStyles);

const chatMessagesDiv = document.getElementById('chatMessages');
const chatMessageInput = document.getElementById('chatMessageInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatBackBtn = document.getElementById('chatBackBtn');
const tabChat = document.getElementById('chatDeoTab');

function enableChatFullscreen(){
    document.body.classList.add('chat-active');
    tabChat.classList.add('chat-fullscreen');
}
function disableChatFullscreen(){
    document.body.classList.remove('chat-active');
    tabChat.classList.remove('chat-fullscreen');
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
    document.querySelector('.tab[data-tab="statistiques"]').classList.add('active');
    document.getElementById('statistiquesTab').classList.add('active');
}
async function loadChatMessages(){
    if(!chatMessagesDiv) return;
    try{
        const q = query(collection(db,"chat_messages"), orderBy("sentDate","desc"), limit(100));
        const s = await getDocs(q);
        if(s.empty){ chatMessagesDiv.innerHTML = '<div class="empty-chat">💬 Aucun message</div>'; return; }
        let msgs = [];
        s.forEach(d => msgs.push({id:d.id, ...d.data()}));
        msgs.reverse();
        let html = '';
        for(let m of msgs){
            const isFromResponsable = m.senderRole === 'responsable';
            const d = new Date(m.sentDate);
            const fd = d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
            if(isFromResponsable){
                html += `<div class="message-bubble message-received"><div><span class="message-sender">${escapeHtml(m.sender)}</span>${escapeHtml(m.message)}</div><div class="message-info"><span>${fd}</span>${m.isEdited?'<span>(modifié)</span>':''}</div><div class="message-actions"><button class="delete-msg-btn" data-id="${m.id}">🗑️</button></div></div>`;
            } else {
                html += `<div class="message-bubble message-sent"><div>${escapeHtml(m.message)}</div><div class="message-info"><span>${fd}</span>${m.isEdited?'<span>(modifié)</span>':''}</div><div class="message-actions"><button class="delete-msg-btn" data-id="${m.id}">🗑️</button></div></div>`;
            }
        }
        chatMessagesDiv.innerHTML = html;
        document.querySelectorAll('.delete-msg-btn').forEach(btn=>{
            btn.onclick = async (e)=>{
                e.stopPropagation();
                const id = btn.dataset.id;
                showConfirm('Suppression','Supprimer ce message ?',async()=>{ await deleteDoc(doc(db,"chat_messages",id)); await loadChatMessages(); });
            };
        });
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    } catch(e){ console.error(e); chatMessagesDiv.innerHTML = '<div class="empty-chat">⚠️ Erreur de chargement</div>'; }
}
async function sendChatMessage(){
    const msg = chatMessageInput.value.trim();
    if(!msg){ showToast("Message vide", true); return; }
    try{
        await addDoc(collection(db,"chat_messages"),{ message: msg, sender: "DEO", senderRole: "deo", recipient: "responsable", sentDate: new Date().toISOString(), isEdited: false, status: "envoyé" });
        chatMessageInput.value = '';
        await loadChatMessages();
    } catch(e){ showToast("Erreur envoi", true); }
}
sendChatBtn?.addEventListener('click', sendChatMessage);
chatMessageInput?.addEventListener('keypress', (e) => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendChatMessage(); } });
chatBackBtn?.addEventListener('click', disableChatFullscreen);

document.querySelectorAll('.tab').forEach(btn=>{
    btn.onclick=()=>{
        const tab = btn.getAttribute('data-tab');
        if(tab !== 'chatDeo'){
            if(document.body.classList.contains('chat-active')) disableChatFullscreen();
            document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(tab+'Tab').classList.add('active');
            if(tab === 'memo') loadMemorandums();
        }
        if(tab === 'chatDeo'){ enableChatFullscreen(); loadChatMessages(); }
    };
});

async function loadAllData(){
    let snap = await getDocs(collection(db, "users"));
    usersData = [];
    snap.forEach(d => usersData.push({ id: d.id, ...d.data() }));
    await loadDevices();
    await loadVisitesStats();
    await loadWithdrawals();
    await loadLastReport();
    await loadTickets();
    await loadCAPs();
    await loadMemos();
    updateMembresTable();
    updatePendingTable();
    updatePrivacyTab();
    updateTicketsCharts();
    const netubersCount = usersData.filter(u => u.role === 'netuber' && u.isActive === true).length;
    const utilisateursCount = usersData.filter(u => u.isActive === true && (!u.role || u.role !== 'netuber')).length;
    document.getElementById('totalNetubersStat').innerText = netubersCount;
    document.getElementById('totalUsersStat').innerText = utilisateursCount;
    document.getElementById('totalPendingStat').innerText = usersData.filter(u=>u.isActive!==true).length;
}
async function loadDevices(){ let snap=await getDocs(collection(db,"user_devices")); devicesData=[]; snap.forEach(d=>devicesData.push({id:d.id,...d.data()})); }
function getUserDevices(userId){ return devicesData.filter(d=>d.userId===userId); }
async function loadVisitesStats(){
    try{ let statsRef=doc(db,"stats","visites"); let statsSnap=await getDoc(statsRef); if(statsSnap.exists()){ let v=statsSnap.data(); document.getElementById('visitesToday').innerText=v.today||0; document.getElementById('visitesWeek').innerText=v.week||0; document.getElementById('visitesMonth').innerText=v.month||0; document.getElementById('visitesTotal').innerText=v.total||0; } }catch(e){}
}
async function loadWithdrawals(){
    let snap=await getDocs(collection(db,"withdraw"));
    withdrawalsData=[];
    snap.forEach(d=>withdrawalsData.push({id:d.id,...d.data()}));
    updateWithdrawalsTable();
    document.getElementById('totalWithdrawalsPending').innerText=withdrawalsData.filter(w=>w.status==='pending').length;
    document.getElementById('totalWithdrawalsAmount').innerText=withdrawalsData.filter(w=>w.status==='pending').reduce((s,w)=>s+(w.amount||0),0).toFixed(2);
    document.getElementById('totalWithdrawalsPendingStat').innerText=withdrawalsData.filter(w=>w.status==='pending').length;
}
function updateWithdrawalsTable(){
    let tbody=document.getElementById('withdrawalsTableBody');
    if(!tbody)return;
    let filtered=withdrawalsData.filter(w=>currentWithdrawFilter==='all'||w.status===currentWithdrawFilter);
    tbody.innerHTML=filtered.map(w=>{
        let u=usersData.find(u=>u.id===w.userId);
        let statusClass=w.status==='pending'?'badge-warning':(w.status==='approved'?'badge-success':'badge-danger');
        let statusText=w.status==='pending'?'En attente':(w.status==='approved'?'Approuvé':'Rejeté');
        return `<tr><td>${escapeHtml(u?.email||w.userId)}</td><td>${(w.amount||0).toFixed(2)} $</td><td>${w.method||'-'}</td><td>${escapeHtml(w.walletAddress||'-')}</td><td>${formatDateShort(w.requestedAt)}</td><td><span class="badge ${statusClass}">${statusText}</span></td><td>${w.status==='pending'?`<button class="action-btn approve" onclick='approveWithdraw("${w.id}")'>Approuver</button><button class="action-btn delete" onclick='rejectWithdraw("${w.id}")'>Rejeter</button>`:(w.status==='approved'?`<button class="action-btn delete" onclick='deleteWithdraw("${w.id}")'>Supprimer</button>`:'-')}</td></tr>`;
    }).join('');
}
window.filterWithdrawals=()=>{ currentWithdrawFilter=document.getElementById('withdrawStatusFilter').value; updateWithdrawalsTable(); };
window.approveWithdraw=async(id)=>{ let w=withdrawalsData.find(w=>w.id===id); if(!w)return; let userRef=doc(db,"users",w.userId); let userSnap=await getDoc(userRef); let balance=userSnap.exists()?(userSnap.data().balance||0):0; await updateDoc(userRef,{balance:balance-(w.amount||0)}); await updateDoc(doc(db,"withdraw",id),{status:"approved",processedAt:new Date().toISOString()}); showToast("Retrait approuvé"); await loadWithdrawals(); await loadAllData(); };
window.rejectWithdraw=async(id)=>{ await updateDoc(doc(db,"withdraw",id),{status:"rejected",processedAt:new Date().toISOString()}); showToast("Retrait rejeté"); await loadWithdrawals(); };
window.deleteWithdraw=async(id)=>{ showConfirm('Suppression','Supprimer cette demande ?',async()=>{ await deleteDoc(doc(db,"withdraw",id)); showToast("Demande supprimée"); await loadWithdrawals(); }); };
window.exportWithdrawals=()=>{ let csv="Utilisateur,Montant,Méthode,Wallet,Statut,Date\n"; withdrawalsData.forEach(w=>{ let u=usersData.find(u=>u.id===w.userId); csv+=`${u?.email||w.userId},${w.amount},${w.method},${w.walletAddress},${w.status},${w.requestedAt}\n`; }); let blob=new Blob([csv]); let link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`retraits.csv`; link.click(); };
async function loadLastReport(){
    try{
        let q=query(collection(db,"reports"),orderBy("createdAt","desc"),limit(1));
        let snap=await getDocs(q);
        if(!snap.empty){
            let reportDoc=snap.docs[0];
            lastReport=reportDoc.data();
            currentReportReference=lastReport.reference||`RPT-${reportDoc.id.substring(0,8)}`;
            currentReportDate=lastReport.date||formatDateShort(lastReport.createdAt);
            document.getElementById('reportReferenceValue').innerHTML=`<i class="fas fa-hashtag"></i> ${currentReportReference}`;
            document.getElementById('reportDateValue').innerHTML=`<i class="fas fa-calendar"></i> ${currentReportDate}`;
            let netubers=lastReport.netubers||[];
            let totalPtsP=netubers.reduce((s,n)=>s+(n.pointsPrecedents||0),0);
            let totalPtsJ=netubers.reduce((s,n)=>s+(n.pointsJour||0),0);
            let totalTempsP=netubers.reduce((s,n)=>s+(n.tempsPrecedent||0),0);
            let totalTempsJ=netubers.reduce((s,n)=>s+(n.tempsJour||0),0);
            let ecart=totalPtsJ-totalPtsP;
            let pourcentage=totalPtsP>0?((ecart/totalPtsP)*100).toFixed(1):0;
            let tendance=ecart>0?'📈 Hausse':(ecart<0?'📉 Baisse':'➡️ Stable');
            document.getElementById('pointsEcart').innerHTML=`Points préc: ${totalPtsP} | Points jour: ${totalPtsJ}<br>Écart: ${ecart>0?'+':''}${ecart} (${pourcentage}%) ${tendance}`;
            let tbody=document.getElementById('rapportsTableBody');
            if(tbody){
                tbody.innerHTML=netubers.map(n=>{ 
                    let rendement=n.tempsJour>0?((n.pointsJour/(n.tempsJour/60)).toFixed(2)):0;
                    let presenceClass = n.presence === 'Présent' ? 'badge-present' : 'badge-absent';
                    let presenceText = n.presence === 'Présent' ? '✅ PRÉSENT' : '❌ ABSENT';
                    return `<tr>
                        <td style="white-space:nowrap;"><strong onclick="showRapportPopup(${JSON.stringify(n).replace(/"/g, '&quot;')})" style="cursor:pointer;color:#f59e0b;">${escapeHtml(n.code)}</strong></td>
                        <td><span class="${presenceClass}">${presenceText}</span></td>
                        <td style="max-width:150px; white-space:normal;">${escapeHtml(n.raisonAbsence||'-')}</td>
                        <td>${n.objectifMensuel||0}</td>
                        <td style="color:${(n.objectifAtteint||0) >= (n.objectifMensuel||0) ? '#10b981' : '#f59e0b'}">${n.objectifAtteint||0}</td>
                        <td>${n.nbNiveaux||0}</td>
                        <td>${n.nbNiveauxAtteints||0}</td>
                        <td>${n.pointsPrecedents||0}</td>
                        <td style="color:#f59e0b; font-weight:600;">${n.pointsJour||0}</td>
                        <td>${n.tempsPrecedent||0}</td>
                        <td>${n.tempsJour||0}</td>
                        <td>${escapeHtml(n.forfaitInternet||'-')}</td>
                        <td style="color:${rendement>=50?'#10b981':(rendement>=30?'#f59e0b':'#ef4444')}; font-weight:600;">${rendement} pts/h}-
                    </tr>`;
                }).join('');
            }
            document.getElementById('reportCount').innerText=netubers.length;
            let ctxPoints=document.getElementById('pointsChart')?.getContext('2d');
            if(ctxPoints){if(pointsChart)pointsChart.destroy();pointsChart=new Chart(ctxPoints,{type:'line',data:{labels:['Points précédents','Points du jour'],datasets:[{data:[totalPtsP,totalPtsJ],borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,0.1)',fill:true}]},options:{responsive:true}});}
            let ctxTemps=document.getElementById('tempsChart')?.getContext('2d');
            if(ctxTemps){if(tempsChart)tempsChart.destroy();tempsChart=new Chart(ctxTemps,{type:'bar',data:{labels:['Temps précédent','Temps du jour'],datasets:[{data:[totalTempsP,totalTempsJ],backgroundColor:['#64748b','#f59e0b'],borderRadius:8}]},options:{responsive:true}});}
        }
    }catch(e){console.error(e);}
}
function updateMembresTable(){
    let tbody = document.getElementById('membresTableBody');
    if(!tbody) return;
    let now = new Date();
    let INACTIVITY_LIMIT = 8 * 60 * 60 * 1000;
    let allMembres = usersData.filter(u => u.isActive === true && (!u.role || u.role === 'netuber'));
    let filtered = allMembres.filter(u => {
        let matchesSearch = !searchMembresTerm || 
            (u.code || '').toLowerCase().includes(searchMembresTerm) ||
            (u.nom || '').toLowerCase().includes(searchMembresTerm) ||
            (u.prenom || '').toLowerCase().includes(searchMembresTerm) ||
            (u.email || '').toLowerCase().includes(searchMembresTerm);
        let isNetuber = u.role === 'netuber';
        let matchesRole = currentRoleFilter === 'all' || 
            (currentRoleFilter === 'netuber' && isNetuber) || 
            (currentRoleFilter === 'user' && !isNetuber);
        return matchesSearch && matchesRole;
    });
    let onlineCount = 0;
    let netuberCount = 0;
    let userCount = 0;
    if(filtered.length === 0){
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Aucun membre trouvé</td></tr>';
    } else {
        tbody.innerHTML = filtered.map(u => {
            let isNetuber = u.role === 'netuber';
            if(isNetuber) netuberCount++;
            else userCount++;
            let lastSeen = u.lastSeen ? new Date(u.lastSeen) : null;
            let isOnline = lastSeen && lastSeen.getFullYear() > 1970 && (now - lastSeen) < INACTIVITY_LIMIT;
            if(isOnline) onlineCount++;
            let statusText = '';
            if(!lastSeen || lastSeen.getFullYear() <= 1970){
                statusText = 'Jamais connecté';
            } else if(isOnline){
                const diffMs = now - lastSeen;
                const diffMinutes = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMinutes / 60);
                const diffDays = Math.floor(diffHours / 24);
                if(diffDays > 0){
                    statusText = `Connecté il y a ${diffDays} j`;
                } else if(diffHours > 0){
                    statusText = `Connecté il y a ${diffHours} h`;
                } else if(diffMinutes > 0){
                    statusText = `Connecté il y a ${diffMinutes} min`;
                } else {
                    statusText = `Connecté à l'instant`;
                }
            } else {
                const diffMs = now - lastSeen;
                const diffMinutes = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMinutes / 60);
                const diffDays = Math.floor(diffHours / 24);
                if(diffDays > 0){
                    statusText = `Déconnecté depuis ${diffDays} j`;
                } else if(diffHours > 0){
                    statusText = `Déconnecté depuis ${diffHours} h`;
                } else if(diffMinutes > 0){
                    statusText = `Déconnecté depuis ${diffMinutes} min`;
                } else {
                    statusText = `Déconnecté depuis moins d'une minute`;
                }
            }
            let statusHtml = isOnline ? '<span class="status-spot online"><i class="fas fa-circle"></i> Connecté</span>' : '<span class="status-spot offline"><i class="fas fa-circle"></i> Déconnecté</span>';
            let roleHtml = isNetuber ? '<span class="badge badge-warning">Netuber</span>' : '<span class="badge badge-success">Utilisateur</span>';
            let codeDisplay = isNetuber ? `<strong>${escapeHtml(u.code)}</strong>` : '-';
            let actions = isNetuber ? 
                `<button class="action-btn cap" onclick='openCAPModal("${u.code}")'>CAP</button><button class="action-btn delete" onclick='blockUser("${u.id}")'>${u.isBlocked ? 'Débloquer' : 'Bloquer'}</button>` :
                `<button class="action-btn promote" onclick='openPromoteModal("${u.id}")'>Promouvoir</button><button class="action-btn delete" onclick='deleteUser("${u.id}")'>Supprimer</button>`;
            return `<tr>
                <td>${codeDisplay}</td>
                <td>${escapeHtml(u.nom||'')} ${escapeHtml(u.prenom||'')}</td>
                <td>${escapeHtml(u.email||'-')}</td>
                <td>${escapeHtml(u.contactValue||'-')}</td>
                <td>${roleHtml}</td>
                <td>${statusHtml}</td>
                <td><small>${statusText}</small></td>
                <td>${actions}</td>
            </tr>`;
        }).join('');
    }
    document.getElementById('totalMembres').innerText = filtered.length;
    document.getElementById('totalNetubersCount').innerText = netuberCount;
    document.getElementById('totalUsersCount').innerText = userCount;
    document.getElementById('totalOnlineCount').innerText = onlineCount;
    let ctx = document.getElementById('onlineChart')?.getContext('2d');
    if(ctx){ if(onlineChart) onlineChart.destroy(); onlineChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Connectés', 'Déconnectés'], datasets: [{ data: [onlineCount, filtered.length - onlineCount], backgroundColor: ['#10b981', '#64748b'] }] }, options: { responsive: true } }); }
}
function updatePendingTable(){
    let tbody=document.getElementById('pendingTableBody');
    if(!tbody)return;
    let pending=usersData.filter(u=>u.isActive!==true);
    let filtered=pending.filter(u=>{ let fullName=`${u.nom||''} ${u.prenom||''}`.toLowerCase(); return !searchPendingTerm||fullName.includes(searchPendingTerm)||(u.email||'').toLowerCase().includes(searchPendingTerm); });
    tbody.innerHTML=filtered.map(u=>`<tr>
        <td>${escapeHtml(u.nom||'')} ${escapeHtml(u.prenom||'')}</td>
        <td>${escapeHtml(u.email||'-')}</td>
        <td>${u.moyenContact==='whatsapp'?'WhatsApp':'Gmail'}</td>
        <td>${escapeHtml(u.contactValue||'-')}</td>
        <td>${formatDateShort(u.dateInscription)}</td>
        <td><button class="action-btn validate" onclick='openActivateModal("${u.id}")'>✅ Activer</button><button class="action-btn reject" onclick='rejectUser("${u.id}")'>🗑️ Rejeter</button><button class="action-btn delete" onclick='deleteUser("${u.id}")'>❌ Supprimer</button></td>
    </tr>`).join('');
    document.getElementById('totalPending').innerText=pending.length;
    document.getElementById('totalPendingStat').innerText=pending.length;
}
function updatePrivacyTab(){
    let tbody=document.getElementById('privacyEmailsBody');
    if(tbody){ tbody.innerHTML=usersData.filter(u=>u.code).map(u=>`<tr><td>${escapeHtml(u.code)}</td><td>${escapeHtml(u.email)}</td><td>${formatDateShort(u.lastSeen)}</td></tr>`).join(''); }
}
async function loadTickets(){
    let snap=await getDocs(collection(db,"users"));
    ticketsData=[];
    snap.forEach(doc=>{ let u=doc.data(); if(u.ticketsList)u.ticketsList.forEach(t=>ticketsData.push({...t,userId:doc.id,userEmail:u.email,userName:`${u.prenom||''} ${u.nom||''}`})); });
    let tbody=document.getElementById('ticketsUsersBody');
    if(tbody){
        tbody.innerHTML=ticketsData.map(t=>`<tr>
            <td>${escapeHtml(t.userName||t.userEmail)}</td>
            <td>${escapeHtml(t.subject)}</td>
            <td><span class="badge badge-warning">${t.priority}</span></td>
            <td><span class="badge ${t.status==='résolu'?'badge-success':(t.status==='en cours'?'badge-warning':'badge-danger')}">${t.status||'ouvert'}</span></td>
            <td>${formatDateShort(t.date)}</table>
            <td><button class="action-btn reply" onclick='openReplyTicketModal("${t.id}","${escapeHtml(t.userEmail)}")'>Répondre</button></td>
        </tr>`).join('');
    }
    updateTicketsStats();
    updateAnomaliesTable();
}
function updateTicketsStats(){
    document.getElementById('ticketsUsersOpen').innerText=ticketsData.filter(t=>t.status==='ouvert'||!t.status).length;
    document.getElementById('ticketsResolved').innerText=ticketsData.filter(t=>t.status==='résolu').length;
    document.getElementById('ticketsInProgress').innerText=ticketsData.filter(t=>t.status==='en cours').length;
}
function updateAnomaliesTable(){
    let ticketCountByUser={};
    ticketsData.forEach(t=>{ let key=t.userEmail; if(!ticketCountByUser[key])ticketCountByUser[key]=0; ticketCountByUser[key]++; });
    let anomalies=Object.entries(ticketCountByUser).filter(([,count])=>count>=3).map(([user,count])=>({user,count}));
    let tbody=document.getElementById('anomaliesTableBody');
    if(tbody){ tbody.innerHTML=anomalies.map(a=>`<tr><td>${escapeHtml(a.user)}</td><td>Tickets en masse (≥3)</td><td><span class="badge badge-danger">${a.count}</span></td><td><button class="action-btn view" onclick='viewAnomalyTickets("${escapeHtml(a.user)}")'>Voir</button></td></tr>`).join(''); document.getElementById('totalAnomalies').innerText=anomalies.length; }
}
async function loadCAPs(){
    let capsRef=collection(db,"caps");
    let snap=await getDocs(capsRef);
    capsData=[]; snap.forEach(d=>capsData.push({id:d.id,...d.data()}));
    document.getElementById('totalCAPSent').innerText=capsData.length;
    let tbody=document.getElementById('capHistoryBody');
    if(tbody){ tbody.innerHTML=capsData.map(c=>`<tr>}<strong>${escapeHtml(c.netuberCode)}</strong></td>}<td>${escapeHtml(c.message.substring(0,60))}${c.message.length>60?'...':''}</td>}<td>${formatDateTime(c.sentDate)}</td>}<td>${formatDateShort(c.expiryDate)}</td></tr>`).join(''); }
}
async function loadMemos(){
    let memosRef=collection(db,"memorandums");
    let q=query(memosRef,orderBy("sentDate","desc"));
    let snap=await getDocs(q);
    memosData=[]; snap.forEach(d=>memosData.push({id:d.id,...d.data()}));
    let tbody=document.getElementById('memosBody');
    if(tbody){ tbody.innerHTML=memosData.map(m=>`<tr>}</td><strong>${escapeHtml(m.title)}</strong></td>}</td><span class="badge badge-warning">${escapeHtml(m.reportReference||'-')}</span></td>}</td>${formatDateTime(m.sentDate)}</td>}<td>${escapeHtml(m.content.substring(0,50))}${m.content.length>50?'...':''}</td>}<td><button class="action-btn delete" onclick='deleteMemorandum("${m.id}")'>Supprimer</button></td></tr>`).join(''); }
}
window.deleteMemorandum=async(id)=>{ showConfirm('Suppression','Supprimer ce mémorandum ?',async()=>{ await deleteDoc(doc(db,"memorandums",id)); showToast("Mémorandum supprimé"); await loadMemos(); }); };
window.sendMemorandum = async () => { let ref=document.getElementById('memoReportReference').value; let title=document.getElementById('memoTitle').value.trim(); let content=document.getElementById('memoContent').value.trim(); if(!title||!content){showToast("Titre et contenu requis",true);return;} if(!ref){showToast("Aucune référence",true);return;} await addDoc(collection(db,"memorandums"),{recipient:"DEO - Direction",title:title,content:content,reportReference:ref,sentDate:new Date().toISOString(),type:"memorandum",sentBy:"DEO_Dashboard"}); showToast(`✅ Mémorandum envoyé`); closeModal('memorandumModal'); await loadMemos(); };
window.sendCAP=async()=>{ let code=document.getElementById('capNetuberCode').value; let msg=document.getElementById('capMessage').value.trim(); let expiryDate=document.getElementById('capExpiryDate').value; if(!code||!msg){showToast("Message requis",true);return;} let targetUser=usersData.find(u=>u.code===code&&u.role==='netuber'); if(!targetUser){showToast("Netuber non trouvé",true);return;} let capsList=targetUser.capsList||[]; capsList.push({id:`CAP_${Date.now()}`,message:msg,sentDate:new Date().toISOString(),expiryDate:expiryDate||null,read:false}); await updateDoc(doc(db,"users",targetUser.id),{capsList:capsList}); await addDoc(collection(db,"caps"),{netuberCode:code,message:msg,sentDate:new Date().toISOString(),expiryDate:expiryDate}); showToast(`CAP envoyé à ${code}`); closeModal('capModal'); document.getElementById('capMessage').value=''; document.getElementById('capExpiryDate').value=''; await loadCAPs(); };
window.openCAPModal=(code)=>{ document.getElementById('capNetuberCode').value=code; document.getElementById('capMessage').value=''; document.getElementById('capExpiryDate').value=''; openModal('capModal'); };
window.openActivateModal=(id)=>{ let u=usersData.find(u=>u.id===id); if(u){ selectedActivateUser=u; document.getElementById('activateName').innerHTML=`${u.nom||''} ${u.prenom||''}<br><small>${u.email}</small>`; openModal('activateModal'); } };
window.confirmActivate=async()=>{ await updateDoc(doc(db,"users",selectedActivateUser.id),{isActive:true,dateActivation:new Date().toISOString()}); showToast("Compte activé"); closeModal('activateModal'); await loadAllData(); };
window.rejectUser=async(id)=>{ await deleteDoc(doc(db,"users",id)); showToast("Inscription rejetée"); await loadAllData(); };
window.deleteUser=async(id)=>{ await deleteDoc(doc(db,"users",id)); showToast("Utilisateur supprimé"); await loadAllData(); };
window.blockUser=async(id)=>{ let u=usersData.find(u=>u.id===id); await updateDoc(doc(db,"users",id),{isBlocked:!u.isBlocked}); showToast(u.isBlocked?"Débloqué":"Bloqué"); await loadAllData(); };
window.openPromoteModal=(id)=>{ let u=usersData.find(u=>u.id===id); if(u){ let code=prompt("Code Netuber (ex: NX-001)"); if(code){ updateDoc(doc(db,"users",id),{role:"netuber",code:code.toUpperCase(),objectifMensuel:0,objectifAtteint:0,ticketsList:[],capsList:[]}).then(()=>{showToast("Promu Netuber");loadAllData();}); } } };
window.openReplyTicketModal=(ticketId,userEmail)=>{ document.getElementById('replyTicketId').value=ticketId; document.getElementById('replyTicketUser').value=userEmail; openModal('replyTicketModal'); };
window.sendReply=async()=>{ let ticketId=document.getElementById('replyTicketId').value; let userEmail=document.getElementById('replyTicketUser').value; let message=document.getElementById('replyMessage').value.trim(); let newStatus=document.getElementById('replyStatus').value; if(!message){showToast("Message requis",true);return;} let userDoc=usersData.find(u=>u.email===userEmail); if(userDoc){ let ticketsList=userDoc.ticketsList||[]; let ticketIndex=ticketsList.findIndex(t=>t.id===ticketId); if(ticketIndex!==-1){ ticketsList[ticketIndex].reponses=ticketsList[ticketIndex].reponses||[]; ticketsList[ticketIndex].reponses.push({admin:true,message:message,date:new Date().toISOString()}); ticketsList[ticketIndex].status=newStatus; await updateDoc(doc(db,"users",userDoc.id),{ticketsList:ticketsList}); showToast("Réponse envoyée"); closeModal('replyTicketModal'); document.getElementById('replyMessage').value=''; await loadTickets(); } } };
window.viewAnomalyTickets=(user)=>{ alert(`Tickets de ${user}`); };
window.confirmDeleteTicket=async()=>{ showToast("Ticket supprimé"); closeModal('deleteTicketModal'); await loadAllData(); };
window.cleanOldReports=async()=>{ showToast("Rapports nettoyés"); };
window.openModifyCodeModal=()=>{ openModal('modifyCodeModal'); };
window.openBlockUnblockModal=()=>{ openModal('blockUnblockModal'); };
window.openDeleteNetuberModal=()=>{ openModal('deleteNetuberModal'); };
window.openDeleteUserModal=()=>{ openModal('deleteUserModal'); };
window.confirmModifyCode=()=>{ showToast("Code modifié"); closeModal('modifyCodeModal'); };
window.confirmBlockUnblock=()=>{ showToast("Action effectuée"); closeModal('blockUnblockModal'); };
window.confirmDeleteNetuber=()=>{ showToast("Netuber supprimé"); closeModal('deleteNetuberModal'); };
window.confirmDeleteUser=()=>{ showToast("Utilisateur supprimé"); closeModal('deleteUserModal'); };
window.exportMembres=()=>{ 
    let csv="Code,Nom,Email,Contact,Rôle,Statut,Dernière connexion\n";
    let tbody=document.getElementById('membresTableBody');
    if(tbody){
        let rows=tbody.querySelectorAll('tr');
        rows.forEach(row=>{
            let cells=row.querySelectorAll('td');
            if(cells.length>0){
                csv+=`${cells[0].innerText.replace(/<[^>]*>/g,'')},${cells[1].innerText},${cells[2].innerText},${cells[3].innerText},${cells[4].innerText},${cells[5].innerText},${cells[6].innerText}\n`;
            }
        });
    }
    let blob=new Blob([csv]); let link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`membres.csv`; link.click();
    showToast("Export terminé");
};
window.openAddNetuberModal = () => {
    document.getElementById('newNetuberNom').value = '';
    document.getElementById('newNetuberEmail').value = '';
    document.getElementById('newNetuberPassword').value = '';
    document.getElementById('newNetuberCode').value = '';
    document.getElementById('newNetuberContact').value = '';
    openModal('addNetuberModal');
};
window.confirmAddNetuber = async () => {
    const nom = document.getElementById('newNetuberNom').value.trim();
    const email = document.getElementById('newNetuberEmail').value.trim();
    const password = document.getElementById('newNetuberPassword').value;
    const code = document.getElementById('newNetuberCode').value.trim().toUpperCase();
    const contact = document.getElementById('newNetuberContact').value.trim();
    if(!nom || !email || !password || !code){ showToast("Tous les champs sont requis", true); return; }
    if(password.length < 6){ showToast("6 caractères minimum", true); return; }
    let existingUser = usersData.find(u => u.code === code);
    if(existingUser){ showToast("Code existe déjà", true); return; }
    let existingEmail = usersData.find(u => u.email === email);
    if(existingEmail){ showToast("Email existe déjà", true); return; }
    try{
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
            uid: cred.user.uid, nom: nom.split(' ')[0] || '', prenom: nom.split(' ').slice(1).join(' ') || '',
            email: email, code: code, contactValue: contact, moyenContact: "whatsapp", role: "netuber",
            isActive: true, isBlocked: false, dateActivation: new Date().toISOString(),
            objectifMensuel: 0, objectifAtteint: 0, balance: 0, ticketsList: [], capsList: [],
            lastSeen: new Date().toISOString(), isOnline: true
        });
        showToast(`✅ Netuber ${code} créé`);
        closeModal('addNetuberModal');
        await loadAllData();
    } catch(e){ showToast("Erreur: "+e.message, true); }
};
window.filterMembres = () => {
    searchMembresTerm = document.getElementById('searchMembres')?.value.toLowerCase() || '';
    currentRoleFilter = document.getElementById('roleFilter')?.value || 'all';
    updateMembresTable();
};
window.filterPendingUsers=()=>{ searchPendingTerm=document.getElementById('searchPending')?.value.toLowerCase()||''; updatePendingTable(); };
async function loadMemorandums(){ await loadMemos(); }

document.getElementById('sendMemoFromReportBtn')?.addEventListener('click', ()=>{ if(currentReportReference) { document.getElementById('memoReportReference').value = currentReportReference; document.getElementById('reportReferenceDisplay').innerText = currentReportReference; openModal('memorandumModal'); } else showToast("Aucun rapport",true); });
document.getElementById('memorandumMenuBtn')?.addEventListener('click', ()=>{ if(currentReportReference) { document.getElementById('memoReportReference').value = currentReportReference; document.getElementById('reportReferenceDisplay').innerText = currentReportReference; openModal('memorandumModal'); } else showToast("Aucun rapport",true); });
document.getElementById('logoutBtn')?.addEventListener('click',()=>showConfirm('Déconnexion','Quitter ?',async()=>{await signOut(auth);window.location.href="login.html";}));
document.getElementById('refreshBtn')?.addEventListener('click',()=>location.reload());
document.getElementById('themeToggle')?.addEventListener('click',()=>toggleTheme());

initTheme();
initTabScroll();
loadAllData();
setInterval(()=>loadAllData(),30000);
document.addEventListener('contextmenu',e=>e.preventDefault());
