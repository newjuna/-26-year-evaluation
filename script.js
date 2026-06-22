// ============================================================
// CONFIG
// ============================================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxr_w5fDcQDnTVd_zthY-TYZArW5Ti80tkwTXsYk1Hl2qMPwmsrY81-JnForbeiFKG3/exec';

// ============================================================
// 평가 항목
// ============================================================
const EVALUATION_ITEMS = [
  {
    id: 'q01',
    title: '기계·기구 또는 설비의\n안전·보건 점검 및 이상 유무 확인',
    desc: '멀티콘센트, 전등, 자동문, 에어컨, 사다리, 소화기, 리프트, 승강기, 소방설비 등',
    scores: { high: 10, mid: null, low: 0 },
    criteria: {
      high: '해당 매장 보유 설비의 점검 또는 유지보수 이력 확인 가능',
      low: '점검자료 없음 또는 이상사항 미조치'
    }
  },
  {
    id: 'q02',
    title: '작업복·보호구 및 방호장치\n점검과 착용·사용 교육·지도',
    desc: '보호구 지급대장, TBM 실시, 신규채용 시 교육 실시 여부 확인',
    scores: { high: 10, mid: 5, low: 0 },
    criteria: {
      high: '보호구 지급대장 6개월, TBM 실시, 신규채용 시 교육 실시 완료',
      mid: '위 항목 중 1가지 미흡',
      low: '보호구 지급대장과 교육·지도 기록 모두 없음'
    }
  },
  {
    id: 'q03',
    title: '산업재해 보고 및 응급조치',
    desc: '산업재해 발생 시 즉시 보고, 응급조치, 산업재해조사표 등',
    scores: { high: 15, mid: null, low: 0 },
    criteria: {
      high: '산업재해 발생 건 전부 즉시 보고 및 조치 완료',
      low: '미보고 또는 지연 보고가 1건이라도 발생'
    }
  },
  {
    id: 'q04',
    title: '작업장 정리·정돈 및\n통로 확보 확인·감독',
    desc: '순회점검일지 작성, 통로·비상통로 확보, 후방공간 정리정돈 확인',
    scores: { high: 10, mid: null, low: 0 },
    criteria: {
      high: '순회점검표 월 4회 이상 작성',
      low: '순회점검일지 미작성 월이 있음'
    }
  },
  {
    id: 'q05',
    title: '안전·보건관리자 또는\n기관에 대한 협조',
    desc: '안전보건팀 요청사항, 비상대피훈련, 개선요청 사항 협조 및 이행 여부',
    scores: { high: 10, mid: null, low: 0 },
    criteria: {
      high: '비상대피훈련 결과보고 1건 이상 완료',
      low: '훈련은 실시했으나 결과보고 자료 없음'
    }
  },
  {
    id: 'q06',
    title: '위험성평가 참여 및 실행',
    desc: '위험성평가 참여자료, 위험요인 확인, 개선조치 실행 내역 확인',
    scores: { high: 15, mid: 8, low: 0 },
    criteria: {
      high: '위험성평가 참여자료 및 개선조치 완료 내역 확인',
      mid: '위험성평가는 참여했으나 개선조치 완료 내역 없음',
      low: '위험성평가 미참여 또는 개선조치 미실행'
    }
  },
  {
    id: 'q07',
    title: '법규 및 지침 준수 여부',
    desc: 'ISO 가이드 PDF 확인 후 매장 안전보건 절차서, 실행문서, 서류, 위험표지 확인',
    scores: { high: 5, mid: 3, low: 0 },
    criteria: {
      high: '안전보건 절차서·실행문서·서류·표지 보관/게시 상태 확인 가능',
      mid: '일부 자료 누락 또는 최신화 필요',
      low: '확인 가능한 안전보건 문서·서류·표지 없음'
    },
    guide: { href: './assets/ISO_guide.pdf', label: '📘 ISO 가이드 보기' }
  }
];

// ============================================================
// 전역 상태
// ============================================================
let orgTree = {};
let answers = {};
let currentEvalIndex = 0;  // 현재 보고 있는 평가 항목 인덱스
let signCanvas, signCtx, isDrawing = false, hasSigned = false;

// ============================================================
// 초기화
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadOrgTree();
  setupInfoForm();
  initSignCanvas();
  document.getElementById('btn-submit').addEventListener('click', submitEval);
});

// ============================================================
// 조직도 로드
// ============================================================
async function loadOrgTree() {
  try {
    const res = await fetch(`${GAS_URL}?mode=org`);
    const json = await res.json();
    if (json.ok) {
      orgTree = json.data;
      populateSelect('sel-hq', Object.keys(orgTree), '선택하세요');
    }
  } catch (e) {
    console.error('조직도 로드 실패', e);
  }
}

function populateSelect(id, options, placeholder) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  options.forEach(v => {
    const o = document.createElement('option');
    o.value = v; o.textContent = v;
    sel.appendChild(o);
  });
  sel.disabled = false;
}

// ============================================================
// 정보 입력 폼
// ============================================================
function setupInfoForm() {
  const selHq = document.getElementById('sel-hq');
  const selDept = document.getElementById('sel-dept');
  const selTeam = document.getElementById('sel-team');
  const selStore = document.getElementById('sel-store');
  const inpName = document.getElementById('inp-name');
  const inpEmpId = document.getElementById('inp-empid');

  selHq.addEventListener('change', () => {
    resetSelect('sel-dept', '부서 선택');
    resetSelect('sel-team', '팀 선택');
    resetSelect('sel-store', '매장 선택');
    if (selHq.value) populateSelect('sel-dept', Object.keys(orgTree[selHq.value] || {}), '부서를 선택하세요');
    checkStartBtn();
  });
  selDept.addEventListener('change', () => {
    resetSelect('sel-team', '팀 선택');
    resetSelect('sel-store', '매장 선택');
    if (selDept.value) populateSelect('sel-team', Object.keys(orgTree[selHq.value]?.[selDept.value] || {}), '팀을 선택하세요');
    checkStartBtn();
  });
  selTeam.addEventListener('change', () => {
    resetSelect('sel-store', '매장 선택');
    if (selTeam.value) populateSelect('sel-store', orgTree[selHq.value]?.[selDept.value]?.[selTeam.value] || [], '매장을 선택하세요');
    checkStartBtn();
  });
  selStore.addEventListener('change', () => {
    checkStartBtn();
    tryCheckDuplicate();
  });
  inpName.addEventListener('input', checkStartBtn);
  inpEmpId.addEventListener('input', () => {
    inpEmpId.value = inpEmpId.value.toUpperCase();
    checkStartBtn();
    if (inpEmpId.value.length >= 5) tryCheckDuplicate();
  });

  document.getElementById('btn-start').addEventListener('click', startEval);
}

function resetSelect(id, placeholder) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  sel.disabled = true;
}

function checkStartBtn() {
  const ok = document.getElementById('sel-store').value &&
             document.getElementById('inp-name').value.trim() &&
             document.getElementById('inp-empid').value.trim();
  document.getElementById('btn-start').disabled = !ok;
}

let dupTimer = null;
function tryCheckDuplicate() {
  clearTimeout(dupTimer);
  dupTimer = setTimeout(async () => {
    const empId = document.getElementById('inp-empid').value.trim();
    const store = document.getElementById('sel-store').value;
    if (!empId || !store) return;
    try {
      const res = await fetch(`${GAS_URL}?mode=duplicate&empId=${encodeURIComponent(empId)}&store=${encodeURIComponent(store)}`);
      const json = await res.json();
      const msg = document.getElementById('duplicate-msg');
      if (json.ok && json.isDuplicate) {
        msg.textContent = `⚠️ "${store}" 매장 / 사번 ${empId}로 이미 제출된 평가가 있습니다.`;
        msg.style.display = 'block';
        document.getElementById('btn-start').disabled = true;
      } else {
        msg.style.display = 'none';
        checkStartBtn();
      }
    } catch (_) {}
  }, 700);
}

// ============================================================
// 평가 시작
// ============================================================
function startEval() {
  answers = {};
  EVALUATION_ITEMS.forEach(item => {
    answers[item.id] = { score: null, photoUrl: '' };
  });
  currentEvalIndex = 0;
  buildEvalCards();
  showScreen('screen-eval');
  document.getElementById('screen-eval').classList.add('has-progress');
  updateProgress();
  updateEvalNav();
}

// ============================================================
// 평가 카드 생성
// ============================================================
function buildEvalCards() {
  const wrap = document.getElementById('eval-slider-wrap');
  wrap.innerHTML = '';

  EVALUATION_ITEMS.forEach((item, idx) => {
    const hasMid = item.scores.mid !== null;
    const criteriaRows = [
      `<div class="c-row"><span class="c-label high">상</span><span>${item.criteria.high}</span></div>`,
      hasMid ? `<div class="c-row"><span class="c-label mid">중</span><span>${item.criteria.mid}</span></div>` : '',
      `<div class="c-row"><span class="c-label low">하</span><span>${item.criteria.low}</span></div>`,
    ].join('');

    const guideHtml = item.guide
      ? `<a href="${item.guide.href}" target="_blank" class="guide-link">${item.guide.label}</a>`
      : '';

    const card = document.createElement('div');
    card.className = 'eval-card' + (idx === 0 ? ' active' : '');
    card.id = `card-${item.id}`;
    card.innerHTML = `
      <div class="eval-card-header">
        <div class="eval-card-step">항목 ${idx + 1} / ${EVALUATION_ITEMS.length}</div>
        <div class="eval-card-title">${item.title.replace(/\n/g, '<br>')}</div>
        <div class="eval-card-desc">${item.desc}</div>
      </div>
      <div class="eval-card-body">
        <div class="criteria-box">${criteriaRows}</div>
        ${guideHtml}
        <div class="level-group">
          <button class="level-btn" data-qid="${item.id}" data-level="상">
            상<span class="level-score">${item.scores.high}점</span>
          </button>
          <button class="level-btn ${hasMid ? '' : 'disabled-btn'}" data-qid="${item.id}" data-level="중" ${hasMid ? '' : 'disabled'}>
            중<span class="level-score">${hasMid ? item.scores.mid + '점' : '—'}</span>
          </button>
          <button class="level-btn" data-qid="${item.id}" data-level="하">
            하<span class="level-score">0점</span>
          </button>
        </div>
        <div class="photo-area">
          <label class="photo-btn-label" for="photo-${item.id}">
            📷 증빙 사진 첨부 <span style="font-size:12px;font-weight:400">(선택)</span>
            <input type="file" id="photo-${item.id}" accept="image/*" capture="environment" data-qid="${item.id}">
          </label>
          <div class="photo-status" id="photo-status-${item.id}"></div>
        </div>
      </div>`;
    wrap.appendChild(card);
  });

  // 이벤트 바인딩
  wrap.querySelectorAll('.level-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', onLevelSelect);
  });
  wrap.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', onPhotoSelect);
  });

  // 이전/다음 버튼
  document.getElementById('btn-prev').addEventListener('click', goPrev);
  document.getElementById('btn-next').addEventListener('click', goNext);
}

function onLevelSelect(e) {
  const btn = e.currentTarget;
  const qid = btn.dataset.qid;
  const level = btn.dataset.level;
  document.querySelectorAll(`.level-btn[data-qid="${qid}"]`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  answers[qid].score = level;
  updateProgress();
}

function goPrev() {
  if (currentEvalIndex > 0) {
    showEvalCard(currentEvalIndex - 1);
  }
}

function goNext() {
  // 현재 항목 미선택 체크
  const item = EVALUATION_ITEMS[currentEvalIndex];
  if (!answers[item.id]?.score) {
    // 해당 카드의 level-group 살짝 흔들기
    const card = document.getElementById(`card-${item.id}`);
    const group = card.querySelector('.level-group');
    group.style.animation = 'none';
    group.offsetHeight; // reflow
    group.style.animation = 'shake 0.4s ease';
    return;
  }

  if (currentEvalIndex < EVALUATION_ITEMS.length - 1) {
    showEvalCard(currentEvalIndex + 1);
  } else {
    // 마지막 항목 → 서명 화면으로
    showScreen('screen-sign');
  }
}

function showEvalCard(idx) {
  document.querySelectorAll('.eval-card').forEach(c => c.classList.remove('active'));
  document.getElementById(`card-${EVALUATION_ITEMS[idx].id}`).classList.add('active');
  currentEvalIndex = idx;
  window.scrollTo(0, 0);
  updateProgress();
  updateEvalNav();
}

function updateProgress() {
  const answered = EVALUATION_ITEMS.filter(i => answers[i.id]?.score).length;
  const total = EVALUATION_ITEMS.length;
  const pct = Math.round((answered / total) * 100);
  document.getElementById('top-progress-bar').style.width = pct + '%';
  document.getElementById('top-progress-label').textContent = `${answered} / ${total} 완료`;
}

function updateEvalNav() {
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  prevBtn.style.display = currentEvalIndex === 0 ? 'none' : 'flex';
  if (currentEvalIndex === EVALUATION_ITEMS.length - 1) {
    nextBtn.textContent = '서명하기 →';
  } else {
    nextBtn.textContent = '다음 →';
  }
}

function scrollToLastItem() {
  showEvalCard(EVALUATION_ITEMS.length - 1);
}

// ============================================================
// 사진 선택 → 즉시 업로드
// ============================================================
async function onPhotoSelect(e) {
  const input = e.target;
  const qid = input.dataset.qid;
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById(`photo-status-${qid}`);
  statusEl.innerHTML = '<div class="photo-uploading"><span class="spinner"></span> 업로드 중...</div>';

  try {
    const compressed = await compressImage(file, 1200, 0.75);
    const base64 = compressed.split(',')[1];
    const store = document.getElementById('sel-store').value;
    const empId = document.getElementById('inp-empid').value.trim();

    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'uploadPhoto',
        base64,
        mimeType: 'image/jpeg',
        fileName: `${qid}_${empId}_${Date.now()}.jpg`,
        empId, store, questionId: qid,
      })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    answers[qid].photoUrl = json.fileUrl;
    statusEl.innerHTML = `
      <div class="photo-done-row">✅ 업로드 완료</div>
      <img class="photo-preview-img" src="${compressed}" alt="첨부사진">`;
  } catch (err) {
    statusEl.innerHTML = `<div class="alert-box">⚠️ 업로드 실패. 다시 시도해주세요.</div>`;
  }
}

function compressImage(file, maxPx, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else        { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================
// 서명 캔버스 (터치 완벽 지원)
// ============================================================
function initSignCanvas() {
  signCanvas = document.getElementById('signCanvas');
  signCtx = signCanvas.getContext('2d');

  function resize() {
    const rect = signCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    signCanvas.width  = rect.width  * dpr;
    signCanvas.height = rect.height * dpr;
    signCtx.scale(dpr, dpr);
    signCtx.strokeStyle = '#0D1B36';
    signCtx.lineWidth = 2.5;
    signCtx.lineCap = 'round';
    signCtx.lineJoin = 'round';
  }
  resize();
  window.addEventListener('resize', resize);

  const getPos = e => {
    const rect = signCanvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = e => {
    isDrawing = true; hasSigned = true;
    document.getElementById('sign-hint').classList.add('hidden');
    signCtx.beginPath();
    const p = getPos(e); signCtx.moveTo(p.x, p.y);
  };
  const move = e => {
    if (!isDrawing) return;
    e.preventDefault();
    const p = getPos(e); signCtx.lineTo(p.x, p.y); signCtx.stroke();
  };
  const end = () => isDrawing = false;

  signCanvas.addEventListener('mousedown', start);
  signCanvas.addEventListener('mousemove', move);
  signCanvas.addEventListener('mouseup', end);
  signCanvas.addEventListener('mouseleave', end);
  signCanvas.addEventListener('touchstart', start, { passive: false });
  signCanvas.addEventListener('touchmove', move, { passive: false });
  signCanvas.addEventListener('touchend', end);
}

function clearSign() {
  const dpr = window.devicePixelRatio || 1;
  signCtx.clearRect(0, 0, signCanvas.width / dpr, signCanvas.height / dpr);
  hasSigned = false;
  document.getElementById('sign-hint').classList.remove('hidden');
}

function getSignBase64() {
  return signCanvas.toDataURL('image/png').split(',')[1];
}

// ============================================================
// 제출
// ============================================================
async function submitEval() {
  if (!hasSigned) {
    document.getElementById('sign-required-msg').style.display = 'block';
    return;
  }
  document.getElementById('sign-required-msg').style.display = 'none';

  showLoading(true);
  setStep(0, 'active'); setProgress(10);

  try {
    await delay(200);
    setStep(0, 'done'); setStep(1, 'active'); setProgress(30);

    const payload = {
      action: 'submit',
      org: {
        headquarter: document.getElementById('sel-hq').value,
        department:  document.getElementById('sel-dept').value,
        team:        document.getElementById('sel-team').value,
      },
      empName: document.getElementById('inp-name').value.trim(),
      empId:   document.getElementById('inp-empid').value.trim(),
      store:   document.getElementById('sel-store').value,
      answers,
      signatureBase64: getSignBase64(),
      userAgent: navigator.userAgent,
    };

    setProgress(50);
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
    const json = await res.json();
    setStep(1, 'done'); setStep(2, 'active'); setProgress(75);

    if (!json.ok) {
      if (json.error === 'DUPLICATE') { showLoading(false); alert('이미 제출된 평가입니다.'); return; }
      throw new Error(json.error || '서버 오류');
    }

    await delay(400);
    setStep(2, 'done'); setStep(3, 'done'); setProgress(100);
    await delay(500);

    showLoading(false);
    showResult(json);
    showScreen('screen-done');
    pollPdfStatus(json.submissionId);

  } catch (err) {
    showLoading(false);
    alert('제출 오류: ' + err.message);
  }
}

// ============================================================
// PDF 폴링
// ============================================================
async function pollPdfStatus(submissionId) {
  const box = document.getElementById('pdf-status-box');
  let attempts = 0;
  const timer = setInterval(async () => {
    if (++attempts > 20) { clearInterval(timer); return; }
    try {
      const res = await fetch(`${GAS_URL}?mode=pdfStatus&submissionId=${encodeURIComponent(submissionId)}`);
      const json = await res.json();
      if (json.ok && json.data?.status === 'DONE' && json.data?.pdfUrl) {
        clearInterval(timer);
        box.innerHTML = `
          <div style="font-weight:700;color:#0D1B36;margin-bottom:10px">📄 결과서 PDF 완성!</div>
          <a href="${json.data.pdfUrl}" target="_blank" style="display:block;background:#E60012;color:#fff;padding:13px;border-radius:12px;font-weight:700;font-size:15px;text-align:center;text-decoration:none;">PDF 열기</a>`;
      }
    } catch (_) {}
  }, 6000);
}

// ============================================================
// 완료 화면
// ============================================================
function showResult(json) {
  document.getElementById('res-score').textContent = json.score;
  const grade = json.grade || (json.score >= 90 ? '우수' : json.score >= 70 ? '양호' : '미흡');
  const el = document.getElementById('res-grade');
  el.textContent = grade; el.className = `result-grade grade-${grade}`;
  document.getElementById('res-info').textContent = `원점수 ${json.rawScore} / 75점`;
}

// ============================================================
// 유틸
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const s = document.getElementById(id);
  s.classList.add('active');
  window.scrollTo(0, 0);

  // 진행률 바: 평가 화면에서만 표시
  const progressWrap = document.getElementById('top-progress-wrap');
  if (id === 'screen-eval') {
    progressWrap.style.display = 'block';
    progressWrap.innerHTML = `
      <div class="top-progress-bar-bg">
        <div class="top-progress-bar" id="top-progress-bar"></div>
      </div>
      <div class="top-progress-label" id="top-progress-label"></div>`;
    updateProgress();
  } else {
    progressWrap.style.display = 'none';
  }

  // 헤더 타이틀
  const titles = {
    'screen-info': '반기 업무수행 평가',
    'screen-eval': '평가 항목',
    'screen-sign': '서명',
    'screen-done': '제출 완료',
  };
  document.getElementById('header-title').textContent = titles[id] || '';
}

function showLoading(v) {
  document.getElementById('loading-overlay').classList.toggle('active', v);
}

function setStep(idx, state) {
  const el = document.getElementById(`step-${idx}`);
  if (!el) return;
  el.classList.remove('done', 'active');
  if (state) el.classList.add(state);
  if (state === 'done') el.querySelector('.step-icon').textContent = '✅';
}

function setProgress(pct) {
  document.getElementById('progress-bar').style.width = pct + '%';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
