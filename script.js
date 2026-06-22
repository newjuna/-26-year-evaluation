// ============================================================
// CONFIG
// ============================================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwXwH9dtech_FxBHFlJdgWtGqfDaR817iSufYJshxI0tI4XFip5MuBgJBmAskx0lmCM/exec';

// ============================================================
// 평가 항목
// ============================================================
const EVAL_ITEMS = [
  { id:'q01', title:'기계·기구 또는 설비의\n안전·보건 점검 및 이상 유무 확인',
    desc:'멀티콘센트, 전등, 자동문, 에어컨, 사다리, 소화기, 리프트, 승강기, 소방설비 등',
    scores:{high:10,mid:null,low:0},
    criteria:{high:'해당 매장 보유 설비의 점검 또는 유지보수 이력 확인 가능', low:'점검자료 없음 또는 이상사항 미조치'} },
  { id:'q02', title:'작업복·보호구 및 방호장치\n점검과 착용·사용 교육·지도',
    desc:'보호구 지급대장, TBM 실시, 신규채용 시 교육 실시 여부 확인',
    scores:{high:10,mid:5,low:0},
    criteria:{high:'보호구 지급대장 6개월, TBM 실시, 신규채용 시 교육 실시 완료', mid:'위 항목 중 1가지 미흡', low:'보호구 지급대장과 교육·지도 기록 모두 없음'} },
  { id:'q03', title:'산업재해 보고 및 응급조치',
    desc:'산업재해 발생 시 즉시 보고, 응급조치, 산업재해조사표 등',
    scores:{high:15,mid:null,low:0},
    criteria:{high:'산업재해 발생 건 전부 즉시 보고 및 조치 완료', low:'미보고 또는 지연 보고가 1건이라도 발생'} },
  { id:'q04', title:'작업장 정리·정돈 및\n통로 확보 확인·감독',
    desc:'순회점검일지 작성, 통로·비상통로 확보, 후방공간 정리정돈 확인',
    scores:{high:10,mid:null,low:0},
    criteria:{high:'순회점검표 월 4회 이상 작성', low:'순회점검일지 미작성 월이 있음'} },
  { id:'q05', title:'안전·보건관리자 또는\n기관에 대한 협조',
    desc:'안전보건팀 요청사항, 비상대피훈련, 개선요청 사항 협조 및 이행 여부',
    scores:{high:10,mid:null,low:0},
    criteria:{high:'비상대피훈련 결과보고 1건 이상 완료', low:'훈련은 실시했으나 결과보고 자료 없음'} },
  { id:'q06', title:'위험성평가 참여 및 실행',
    desc:'위험성평가 참여자료, 위험요인 확인, 개선조치 실행 내역 확인',
    scores:{high:15,mid:8,low:0},
    criteria:{high:'위험성평가 참여자료 및 개선조치 완료 내역 확인', mid:'위험성평가는 참여했으나 개선조치 완료 내역 없음', low:'위험성평가 미참여 또는 개선조치 미실행'} },
  { id:'q07', title:'법규 및 지침 준수 여부',
    desc:'ISO 가이드 PDF 확인 후 매장 안전보건 절차서, 실행문서, 서류, 위험표지 확인',
    scores:{high:5,mid:3,low:0},
    criteria:{high:'안전보건 절차서·실행문서·서류·표지 보관/게시 상태 확인 가능', mid:'일부 자료 누락 또는 최신화 필요', low:'확인 가능한 안전보건 문서·서류·표지 없음'},
    guide:{href:'assets/ISO_guide.pdf', label:'📘 ISO 가이드'} }
];

// ============================================================
// 전역 상태
// ============================================================
let orgTree = {};
let answers = {};
let currentIdx = 0;
let selectedOrg = { hq:'', dept:'', team:'', store:'' };
let signCanvas, signCtx, isDrawing = false, hasSigned = false;
let orgLoaded = false;
let guideStepsAllShown = false;

// ============================================================
// 초기화
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initSignCanvas();
  startGuideAndLoad();
});

// ============================================================
// 가이드 팝업 + 조직도 로딩 동시 진행
// ============================================================
function startGuideAndLoad() {
  loadOrgTree();  // 백그라운드 로딩

  // 스텝 4개를 2초 간격으로 순차 등장
  [0,1,2,3].forEach(i => {
    setTimeout(() => {
      const el = document.getElementById(`gs-${i}`);
      if (el) {
        el.classList.remove('guide-step-hidden');
        el.classList.add('guide-step-visible');
      }
      if (i === 3) {
        guideStepsAllShown = true;
        tryActivateGuideBtn();
      }
    }, 2000 * (i + 1));
  });
}

function tryActivateGuideBtn() {
  if (!orgLoaded || !guideStepsAllShown) return;
  const row = document.getElementById('guide-loading-row');
  if (row) row.innerHTML = '<span style="color:#16a34a;font-size:18px">✅</span>&nbsp;<span style="color:#16a34a;font-weight:600">데이터 준비 완료!</span>';
  const st = document.getElementById('guide-status');
  if (st) st.textContent = '준비됐습니다. 아래 버튼을 눌러 시작하세요.';
  const btn = document.getElementById('guide-btn');
  if (btn) btn.disabled = false;
}

function closeGuide() {
  document.getElementById('guide-overlay').style.display = 'none';
}

// ============================================================
// 조직도 로드
// ============================================================
async function loadOrgTree() {
  try {
    const res = await fetch(`${GAS_URL}?mode=org`);
    const json = await res.json();
    if (json.ok) orgTree = json.data;
  } catch(e) { console.error('조직도 로드 실패', e); }
  orgLoaded = true;
  tryActivateGuideBtn();
}

// ============================================================
// 계단식 조직도 선택 (onclick 방식)
// ============================================================
function selectHq(btn) {
  document.querySelectorAll('.hq-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  selectedOrg.hq = btn.dataset.val;
  selectedOrg.dept = ''; selectedOrg.team = ''; selectedOrg.store = '';

  // 부서 목록 채우기
  const depts = Object.keys(orgTree[selectedOrg.hq] || {});
  fillSelect('sel-dept', depts, '부서를 선택하세요');
  show('fg-dept');
  hide('fg-team'); hide('fg-store'); hide('fg-empid'); hide('fg-name'); hide('divider-person');
  checkReady();
}

function selectDept() {
  selectedOrg.dept = document.getElementById('sel-dept').value;
  if (!selectedOrg.dept) return;
  selectedOrg.team = ''; selectedOrg.store = '';

  const teams = Object.keys(orgTree[selectedOrg.hq]?.[selectedOrg.dept] || {});
  fillSelect('sel-team', teams, '팀을 선택하세요');
  show('fg-team');
  hide('fg-store'); hide('fg-empid'); hide('fg-name'); hide('divider-person');
  checkReady();
}

function selectTeam() {
  selectedOrg.team = document.getElementById('sel-team').value;
  if (!selectedOrg.team) return;
  selectedOrg.store = '';

  const stores = orgTree[selectedOrg.hq]?.[selectedOrg.dept]?.[selectedOrg.team] || [];
  fillSelect('sel-store', stores, '매장을 선택하세요');
  show('fg-store');
  hide('fg-empid'); hide('fg-name'); hide('divider-person');
  checkReady();
}

function selectStoreFn() {
  selectedOrg.store = document.getElementById('sel-store').value;
  if (!selectedOrg.store) return;

  // 매장 선택 완료 → 사번/이름 입력 노출
  show('divider-person');
  show('fg-empid');
  show('fg-name');
  checkReady();

  // 중복 확인 (비동기, 사번 입력 전이라 아직 안 함)
}

function fillSelect(id, opts, placeholder) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  opts.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v;
    sel.appendChild(o);
  });
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';  // display:none 해제
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ============================================================
// 시작 버튼 활성화 조건
// ============================================================
function checkReady() {
  const ok = selectedOrg.store &&
             document.getElementById('inp-empid')?.value.trim() &&
             document.getElementById('inp-name')?.value.trim();
  const btn = document.getElementById('btn-start');
  if (btn) btn.disabled = !ok;

  // 중복 확인 (사번+매장 다 있을 때)
  const empNum = document.getElementById('inp-empid')?.value.trim();
  if (ok && empNum) checkDuplicate('AD' + empNum, selectedOrg.store);
}

let dupTimer = null;
function checkDuplicate(empId, store) {
  clearTimeout(dupTimer);
  dupTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${GAS_URL}?mode=duplicate&empId=${encodeURIComponent(empId)}&store=${encodeURIComponent(store)}`);
      const json = await res.json();
      const msg = document.getElementById('dup-msg');
      if (json.ok && json.isDuplicate) {
        msg.textContent = `⚠️ "${store}" / ${empId}로 이미 제출된 평가가 있습니다.`;
        msg.style.display = 'block';
        document.getElementById('btn-start').disabled = true;
      } else {
        msg.style.display = 'none';
      }
    } catch(_) {}
  }, 600);
}

// ============================================================
// 평가 시작
// ============================================================
function startEval() {
  answers = {};
  EVAL_ITEMS.forEach(item => { answers[item.id] = { score: null, photoUrl: '', memo: '' }; });
  currentIdx = 0;
  buildCards();
  showScreen('screen-eval');
  updateProgress();
  updateNav();
}

// ============================================================
// 평가 카드 빌드
// ============================================================
function buildCards() {
  const wrap = document.getElementById('eval-wrap');
  wrap.innerHTML = '';
  EVAL_ITEMS.forEach((item, idx) => {
    const hasMid = item.scores.mid !== null;
    const criteria = [
      `<div class="c-row"><span class="c-lbl hi">상</span><span>${item.criteria.high}</span></div>`,
      hasMid ? `<div class="c-row"><span class="c-lbl mid">중</span><span>${item.criteria.mid}</span></div>` : '',
      `<div class="c-row"><span class="c-lbl lo">하</span><span>${item.criteria.low}</span></div>`,
    ].join('');
    const guideHtml = item.guide
      ? `<a href="${item.guide.href}" target="_blank" class="guide-link-btn">${item.guide.label}</a>` : '';

    const card = document.createElement('div');
    card.className = 'eval-card' + (idx === 0 ? ' active' : '');
    card.id = `card-${item.id}`;
    card.innerHTML = `
      <div class="card-head">
        <div class="card-step">항목 ${idx+1} / ${EVAL_ITEMS.length}</div>
        <div class="card-title">${item.title.replace(/\n/g,'<br>')}</div>
        <div class="card-desc">${item.desc}</div>
      </div>
      <div class="card-body">
        <div class="criteria-box">${criteria}</div>
        ${guideHtml}
        <button type="button" class="ex-toggle-btn" data-qid="${item.id}" onclick="toggleEx('${item.id}')">🖼 증빙 예시 보기</button>
        <div class="ex-img-wrap" id="ex-${item.id}">
          <img src="assets/examples/example_${idx+1}.png" loading="lazy" alt="예시"
               onerror="this.parentElement.style.display='none'">
        </div>
        <div class="level-btns">
          <button class="lv-btn" data-qid="${item.id}" data-lv="상" onclick="pickLevel(this)">
            상<span class="lv-pt">${item.scores.high}점</span>
          </button>
          <button class="lv-btn ${hasMid?'':'lv-disabled'}" data-qid="${item.id}" data-lv="중"
                  onclick="${hasMid?'pickLevel(this)':''}" ${hasMid?'':'disabled'}>
            중<span class="lv-pt">${hasMid ? item.scores.mid+'점' : '—'}</span>
          </button>
          <button class="lv-btn" data-qid="${item.id}" data-lv="하" onclick="pickLevel(this)">
            하<span class="lv-pt">0점</span>
          </button>
        </div>
        <div class="memo-box" id="memo-box-${item.id}">
          <div class="memo-lbl">📝 미흡 사유 (선택)</div>
          <textarea id="memo-${item.id}" rows="2" placeholder="간략히 적어주세요"
                    oninput="answers['${item.id}'].memo=this.value"></textarea>
        </div>
        <div class="photo-area">
          <label class="photo-lbl" for="photo-${item.id}">
            📷 증빙 사진 첨부 <span style="font-size:12px;font-weight:400">(선택)</span>
            <input type="file" id="photo-${item.id}" accept="image/*"
                   capture="environment" data-qid="${item.id}" onchange="onPhoto(this)">
          </label>
          <div id="photo-st-${item.id}"></div>
        </div>
      </div>`;
    wrap.appendChild(card);
  });
}

function toggleEx(qid) {
  const w = document.getElementById(`ex-${qid}`);
  w.classList.toggle('open');
}

function pickLevel(btn) {
  const qid = btn.dataset.qid, lv = btn.dataset.lv;
  document.querySelectorAll(`.lv-btn[data-qid="${qid}"]`).forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  answers[qid].score = lv;
  const mb = document.getElementById(`memo-box-${qid}`);
  if (lv === '하') mb.classList.add('open');
  else { mb.classList.remove('open'); answers[qid].memo = ''; document.getElementById(`memo-${qid}`).value = ''; }
  updateProgress();
}

function goPrev() { if (currentIdx > 0) showCard(currentIdx - 1); }
function goNext() {
  const item = EVAL_ITEMS[currentIdx];
  if (!answers[item.id]?.score) {
    const g = document.querySelector(`#card-${item.id} .level-btns`);
    g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
    return;
  }
  if (currentIdx < EVAL_ITEMS.length - 1) showCard(currentIdx + 1);
  else showScreen('screen-sign');
}
function jumpToLast() { showCard(EVAL_ITEMS.length - 1); }

function showCard(idx) {
  document.querySelectorAll('.eval-card').forEach(c => c.classList.remove('active'));
  document.getElementById(`card-${EVAL_ITEMS[idx].id}`).classList.add('active');
  currentIdx = idx;
  window.scrollTo(0, 0);
  updateProgress();
  updateNav();
}

function updateProgress() {
  const done = EVAL_ITEMS.filter(i => answers[i.id]?.score).length;
  const pct  = Math.round(done / EVAL_ITEMS.length * 100);
  const fill  = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');
  if (fill)  fill.style.width = pct + '%';
  if (label) label.textContent = `${done} / ${EVAL_ITEMS.length} 완료`;
}

function updateNav() {
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  if (prev) prev.style.visibility = currentIdx === 0 ? 'hidden' : 'visible';
  if (next) next.textContent = currentIdx === EVAL_ITEMS.length - 1 ? '서명하기 →' : '다음 →';
}

// ============================================================
// 사진 즉시 업로드
// ============================================================
function onPhoto(input) {
  const qid = input.dataset.qid, file = input.files[0];
  if (!file) return;
  const st = document.getElementById(`photo-st-${qid}`);
  st.innerHTML = '<span class="spinner"></span> 업로드 중...';
  compress(file, 1200, 0.75).then(b64 => {
    const base64 = b64.split(',')[1];
    const empId  = 'AD' + document.getElementById('inp-empid').value.trim();
    const store  = selectedOrg.store;
    fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action:'uploadPhoto', base64, mimeType:'image/jpeg',
        fileName:`${qid}_${empId}_${Date.now()}.jpg`, empId, store })
    })
    .then(r => r.json())
    .then(r => {
      if (r.ok) {
        answers[qid].photoUrl = r.fileUrl;
        st.innerHTML = `<div style="color:#16a34a;font-size:13px">✅ 업로드 완료</div>
          <img src="${b64}" style="width:100%;border-radius:10px;margin-top:6px;max-height:160px;object-fit:cover">`;
      } else { st.innerHTML = '<span style="color:#E60012;font-size:13px">⚠️ 업로드 실패. 다시 시도해주세요.</span>'; }
    })
    .catch(() => { st.innerHTML = '<span style="color:#E60012;font-size:13px">⚠️ 업로드 실패.</span>'; });
  });
}

function compress(file, max, q) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > max || h > max) { if(w>h){h=Math.round(h*max/w);w=max;}else{w=Math.round(w*max/h);h=max;} }
        const c = document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = rej; img.src = ev.target.result;
    };
    reader.onerror = rej; reader.readAsDataURL(file);
  });
}

// ============================================================
// 서명 캔버스
// ============================================================
function initSignCanvas() {
  signCanvas = document.getElementById('sign-canvas');
  signCtx = signCanvas.getContext('2d');
  function resize() {
    const rect = signCanvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    signCanvas.width = rect.width * dpr; signCanvas.height = rect.height * dpr;
    signCtx.scale(dpr, dpr);
    signCtx.strokeStyle = '#0D1B36'; signCtx.lineWidth = 2.5;
    signCtx.lineCap = 'round'; signCtx.lineJoin = 'round';
  }
  resize(); window.addEventListener('resize', resize);
  const pos = e => { const r=signCanvas.getBoundingClientRect(), s=e.touches?e.touches[0]:e; return {x:s.clientX-r.left,y:s.clientY-r.top}; };
  const down = e => { isDrawing=true; hasSigned=true; document.getElementById('canvas-hint').style.display='none'; signCtx.beginPath(); const p=pos(e); signCtx.moveTo(p.x,p.y); };
  const move = e => { if(!isDrawing)return; e.preventDefault(); const p=pos(e); signCtx.lineTo(p.x,p.y); signCtx.stroke(); };
  const up   = () => isDrawing=false;
  signCanvas.addEventListener('mousedown',down);
  signCanvas.addEventListener('mousemove',move);
  signCanvas.addEventListener('mouseup',up);
  signCanvas.addEventListener('mouseleave',up);
  signCanvas.addEventListener('touchstart',down,{passive:false});
  signCanvas.addEventListener('touchmove',move,{passive:false});
  signCanvas.addEventListener('touchend',up);
}

function clearSign() {
  const dpr = window.devicePixelRatio||1;
  signCtx.clearRect(0,0,signCanvas.width/dpr,signCanvas.height/dpr);
  hasSigned = false;
  document.getElementById('canvas-hint').style.display = '';
}

// ============================================================
// 제출
// ============================================================
async function submitEval() {
  if (!hasSigned) { document.getElementById('sign-err').style.display='block'; return; }
  document.getElementById('sign-err').style.display='none';

  showOverlay(true); setStep(0,'active'); setBar(10);

  const empId  = 'AD' + document.getElementById('inp-empid').value.trim();
  const empName = document.getElementById('inp-name').value.trim();
  const payload = {
    action: 'submit',
    org: { headquarter: selectedOrg.hq, department: selectedOrg.dept, team: selectedOrg.team },
    empName, empId, store: selectedOrg.store,
    answers,
    signatureBase64: signCanvas.toDataURL('image/png'),
    userAgent: navigator.userAgent,
  };

  await wait(300); setStep(0,'done'); setStep(1,'active'); setBar(35);

  try {
    const res  = await fetch(GAS_URL, { method:'POST', body: JSON.stringify(payload) });
    const json = await res.json();
    setStep(1,'done'); setStep(2,'active'); setBar(75);

    if (!json.ok) {
      showOverlay(false);
      if (json.error === 'DUPLICATE') { alert('이미 제출된 평가입니다.'); return; }
      alert('오류: ' + (json.error||'서버 오류')); return;
    }

    await wait(400);
    setStep(2,'done'); setStep(3,'done'); setBar(100);
    await wait(500);
    showOverlay(false);
    showResult(json);
    showScreen('screen-done');
    pollPdf(json.submissionId);

  } catch(e) { showOverlay(false); alert('제출 오류: ' + e.message); }
}

async function pollPdf(submissionId) {
  const box = document.getElementById('pdf-box');
  let n = 0;
  const check = async () => {
    if (++n > 20) return;
    try {
      const r = await fetch(`${GAS_URL}?mode=pdfStatus&submissionId=${encodeURIComponent(submissionId)}`);
      const j = await r.json();
      if (j.ok && j.data?.status === 'DONE' && j.data?.pdfUrl) {
        box.innerHTML = `<a href="${j.data.pdfUrl}" target="_blank"
          style="display:block;background:#E60012;color:#fff;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-align:center;text-decoration:none;">📄 결과서 PDF 열기</a>`;
        return;
      }
    } catch(_) {}
    setTimeout(check, 6000);
  };
  setTimeout(check, 8000);
}

function showResult(json) {
  document.getElementById('res-score').textContent = json.score;
  const grade = json.grade || (json.score>=90?'우수':json.score>=70?'양호':'미흡');
  const el = document.getElementById('res-grade');
  el.textContent = grade;
  el.className = 'grade-badge grade-' + grade;
  document.getElementById('res-sub').textContent = `원점수 ${json.rawScore} / 75점`;
}

// ============================================================
// 화면 전환
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);

  const pw = document.getElementById('progress-wrap');
  pw.style.display = id === 'screen-eval' ? 'block' : 'none';
  if (id === 'screen-eval') updateProgress();

  const titles = {
    'screen-info': '반기 업무수행 평가',
    'screen-eval': '평가 항목',
    'screen-sign': '서명',
    'screen-done': '제출 완료',
  };
  const ht = document.getElementById('header-title');
  if (ht) ht.textContent = titles[id] || '';
}

// ============================================================
// 오버레이 / 로딩
// ============================================================
function showOverlay(v) {
  const el = document.getElementById('submit-overlay');
  if (el) el.style.display = v ? 'flex' : 'none';
}
function setStep(idx, s) {
  const el = document.getElementById(`st-${idx}`);
  if (!el) return;
  el.classList.remove('done','active');
  if (s) el.classList.add(s);
  if (s === 'done') el.querySelector('.st-icon').textContent = '✅';
}
function setBar(p) {
  const el = document.getElementById('submit-bar');
  if (el) el.style.width = p + '%';
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
