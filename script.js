// ============================================================
// CONFIG - 배포 후 웹앱 URL을 여기에 입력하세요
// ============================================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxr_w5fDcQDnTVd_zthY-TYZArW5Ti80tkwTXsYk1Hl2qMPwmsrY81-JnForbeiFKG3/exec';

// ============================================================
// 평가 항목 정의
// ============================================================
const EVALUATION_ITEMS = [
  {
    id: 'q01',
    title: '기계·기구 또는 설비의 안전·보건 점검 및 이상 유무 확인',
    desc: '멀티콘센트, 전등, 자동문, 에어컨, 사다리, 소화기, 리프트, 승강기, 소방설비 등',
    scores: { high: 10, mid: null, low: 0 },
    criteria: {
      high: '해당 매장 보유 설비의 점검 또는 유지보수 이력 확인 가능',
      low: '점검자료 없음 또는 이상사항 미조치'
    }
  },
  {
    id: 'q02',
    title: '작업복·보호구 및 방호장치 점검과 착용·사용 교육·지도',
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
    title: '작업장 정리·정돈 및 통로 확보 확인·감독',
    desc: '순회점검일지 작성, 통로·비상통로 확보, 후방공간 정리정돈 확인',
    scores: { high: 10, mid: null, low: 0 },
    criteria: {
      high: '순회점검표 월 4회 이상 작성',
      low: '순회점검일지 미작성 월이 있음'
    }
  },
  {
    id: 'q05',
    title: '안전·보건관리자 또는 기관에 대한 협조',
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
    guide: { href: './assets/ISO_guide.pdf', label: '📘 ISO 가이드' }
  }
];

// ============================================================
// 전역 상태
// ============================================================
let orgTree = {};
let answers = {};       // { q01: { score:'상', photoUrl:'', photoFile:null }, ... }
let uploadQueue = {};   // 사진 업로드 상태 추적
let signCanvas, signCtx, isSigning = false;

// ============================================================
// 초기화
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadOrgTree();
  initSignCanvas();
  setupInfoForm();
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
      populateSelect('sel-hq', Object.keys(orgTree), '영업본부를 선택하세요');
    }
  } catch (e) {
    console.error('조직도 로드 실패', e);
  }
}

function populateSelect(id, options, placeholder) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt; el.textContent = opt;
    sel.appendChild(el);
  });
  sel.disabled = options.length === 0;
}

// ============================================================
// 정보 입력 폼 이벤트
// ============================================================
function setupInfoForm() {
  const selHq    = document.getElementById('sel-hq');
  const selDept  = document.getElementById('sel-dept');
  const selTeam  = document.getElementById('sel-team');
  const selStore = document.getElementById('sel-store');
  const inpName  = document.getElementById('inp-name');
  const inpEmpId = document.getElementById('inp-empid');
  const btnStart = document.getElementById('btn-start');

  selHq.addEventListener('change', () => {
    const hq = selHq.value;
    selDept.disabled = !hq;
    selTeam.disabled = true;
    selStore.disabled = true;
    selTeam.innerHTML = '<option value="">팀을 먼저 선택하세요</option>';
    selStore.innerHTML = '<option value="">팀을 먼저 선택하세요</option>';
    if (hq) populateSelect('sel-dept', Object.keys(orgTree[hq] || {}), '부서를 선택하세요');
    checkStartBtn();
  });

  selDept.addEventListener('change', () => {
    const hq = selHq.value, dept = selDept.value;
    selTeam.disabled = !dept;
    selStore.disabled = true;
    selStore.innerHTML = '<option value="">팀을 먼저 선택하세요</option>';
    if (dept) populateSelect('sel-team', Object.keys(orgTree[hq]?.[dept] || {}), '팀을 선택하세요');
    checkStartBtn();
  });

  selTeam.addEventListener('change', () => {
    const hq = selHq.value, dept = selDept.value, team = selTeam.value;
    selStore.disabled = !team;
    if (team) populateSelect('sel-store', orgTree[hq]?.[dept]?.[team] || [], '매장을 선택하세요');
    checkStartBtn();
  });

  selStore.addEventListener('change', () => {
    checkStartBtn();
    // 매장+사번 입력되면 미리 중복 체크
    if (selStore.value && inpEmpId.value) checkDuplicate();
  });

  inpName.addEventListener('input', checkStartBtn);
  inpEmpId.addEventListener('input', () => {
    inpEmpId.value = inpEmpId.value.toUpperCase();
    checkStartBtn();
    if (selStore.value && inpEmpId.value.length >= 5) checkDuplicate();
  });

  document.getElementById('btn-start').addEventListener('click', startEval);
}

function checkStartBtn() {
  const ok = document.getElementById('sel-store').value &&
             document.getElementById('inp-name').value.trim() &&
             document.getElementById('inp-empid').value.trim();
  document.getElementById('btn-start').disabled = !ok;
}

// 미리 중복 확인 (사번 입력 완료 시점)
let dupCheckTimer = null;
async function checkDuplicate() {
  clearTimeout(dupCheckTimer);
  dupCheckTimer = setTimeout(async () => {
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
    } catch (e) { /* 무시 */ }
  }, 800);
}

// ============================================================
// 평가 시작
// ============================================================
function startEval() {
  // 답변 초기화
  answers = {};
  EVALUATION_ITEMS.forEach(item => { answers[item.id] = { score: null, photoUrl: '', photoFile: null }; });

  renderEvalItems();
  showScreen('screen-eval');
}

// ============================================================
// 평가 항목 렌더링
// ============================================================
function renderEvalItems() {
  const container = document.getElementById('eval-items-container');
  container.innerHTML = '';

  EVALUATION_ITEMS.forEach((item, idx) => {
    const hasMid = item.scores.mid !== null;

    let criteriaHtml = `
      <div class="criteria-box">
        <div class="c-row"><span class="c-label high">상</span><span>${item.criteria.high}</span></div>
        ${hasMid ? `<div class="c-row"><span class="c-label mid">중</span><span>${item.criteria.mid}</span></div>` : ''}
        <div class="c-row"><span class="c-label low">하</span><span>${item.criteria.low}</span></div>
      </div>`;

    let guideHtml = item.guide
      ? `<a href="${item.guide.href}" target="_blank" style="font-size:13px;color:var(--navy);text-decoration:none;margin-bottom:10px;display:inline-block;">${item.guide.label}</a>`
      : '';

    const midDisabledClass = hasMid ? '' : 'disabled-btn';

    const el = document.createElement('div');
    el.className = 'eval-item';
    el.id = `eval-item-${item.id}`;
    el.innerHTML = `
      <div class="eval-item-header">
        <div class="eval-item-num">항목 ${idx + 1} / 7</div>
        <div class="eval-item-title">${item.title}</div>
        <div class="eval-item-desc">${item.desc}</div>
      </div>
      <div class="eval-item-body">
        ${criteriaHtml}
        ${guideHtml}
        <div class="level-group">
          <button class="level-btn" data-qid="${item.id}" data-level="상">상<br><span style="font-size:11px;font-weight:400">${item.scores.high}점</span></button>
          <button class="level-btn ${midDisabledClass}" data-qid="${item.id}" data-level="중" ${hasMid ? '' : 'disabled'}>중<br><span style="font-size:11px;font-weight:400">${hasMid ? item.scores.mid + '점' : '-'}</span></button>
          <button class="level-btn" data-qid="${item.id}" data-level="하">하<br><span style="font-size:11px;font-weight:400">0점</span></button>
        </div>
        <div class="photo-area">
          <label class="photo-label" for="photo-${item.id}">
            📷 증빙 사진 첨부 <span style="font-size:11px">(선택)</span>
            <input type="file" id="photo-${item.id}" accept="image/*" capture="environment" data-qid="${item.id}">
          </label>
          <div id="photo-status-${item.id}"></div>
        </div>
      </div>`;
    container.appendChild(el);
  });

  // 이벤트 바인딩
  container.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', onLevelSelect);
  });
  container.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', onPhotoSelect);
  });

  document.getElementById('btn-submit').addEventListener('click', submitEval);
}

function onLevelSelect(e) {
  const btn = e.currentTarget;
  const qid = btn.dataset.qid;
  const level = btn.dataset.level;

  // 같은 항목 버튼 전체 deselect
  document.querySelectorAll(`.level-btn[data-qid="${qid}"]`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  answers[qid].score = level;
}

// ============================================================
// 사진 선택 → 즉시 업로드 (렉 방지 핵심)
// ============================================================
async function onPhotoSelect(e) {
  const input = e.target;
  const qid = input.dataset.qid;
  const file = input.files[0];
  if (!file) return;

  const statusEl = document.getElementById(`photo-status-${qid}`);
  statusEl.innerHTML = '<div class="photo-uploading"><span>⏳</span> 업로드 중...</div>';

  try {
    // 이미지 압축 (모바일 원본은 수 MB → 500KB 이하로)
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
        empId,
        store,
        questionId: qid,
      })
    });
    const json = await res.json();

    if (json.ok) {
      answers[qid].photoUrl = json.fileUrl;
      statusEl.innerHTML = `
        <div class="photo-done">✅ 업로드 완료</div>
        <div class="photo-preview"><img src="${compressed}" alt="첨부사진"></div>`;
    } else {
      throw new Error(json.error);
    }
  } catch (err) {
    statusEl.innerHTML = `<div style="color:var(--red);font-size:12px;">⚠️ 업로드 실패. 다시 시도해주세요.</div>`;
    console.error('사진 업로드 오류', err);
  }
}

// 이미지 압축 (Canvas 활용)
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
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================
// 서명 캔버스 (모바일 터치 완벽 지원)
// ============================================================
function initSignCanvas() {
  signCanvas = document.getElementById('signCanvas');
  signCtx = signCanvas.getContext('2d');

  // 캔버스 실제 픽셀 크기 맞추기 (Retina 대응)
  function resizeCanvas() {
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
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function getPos(e) {
    const rect = signCanvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  // Mouse
  signCanvas.addEventListener('mousedown',  e => { isSigning = true; signCtx.beginPath(); const p = getPos(e); signCtx.moveTo(p.x, p.y); });
  signCanvas.addEventListener('mousemove',  e => { if (!isSigning) return; const p = getPos(e); signCtx.lineTo(p.x, p.y); signCtx.stroke(); });
  signCanvas.addEventListener('mouseup',    () => isSigning = false);
  signCanvas.addEventListener('mouseleave', () => isSigning = false);

  // Touch (모바일)
  signCanvas.addEventListener('touchstart', e => { e.preventDefault(); isSigning = true; signCtx.beginPath(); const p = getPos(e); signCtx.moveTo(p.x, p.y); }, { passive: false });
  signCanvas.addEventListener('touchmove',  e => { e.preventDefault(); if (!isSigning) return; const p = getPos(e); signCtx.lineTo(p.x, p.y); signCtx.stroke(); }, { passive: false });
  signCanvas.addEventListener('touchend',   () => isSigning = false);
}

function clearSign() {
  const dpr = window.devicePixelRatio || 1;
  signCtx.clearRect(0, 0, signCanvas.width / dpr, signCanvas.height / dpr);
}

function isSignEmpty() {
  const data = signCtx.getImageData(0, 0, signCanvas.width, signCanvas.height).data;
  return !data.some(v => v !== 0);
}

function getSignBase64() {
  return signCanvas.toDataURL('image/png').split(',')[1];
}

// ============================================================
// 제출
// ============================================================
async function submitEval() {
  // 유효성 검사
  const unanswered = EVALUATION_ITEMS.filter(item => !answers[item.id]?.score);
  if (unanswered.length > 0) {
    document.getElementById('eval-required-msg').style.display = 'block';
    document.getElementById(`eval-item-${unanswered[0].id}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  document.getElementById('eval-required-msg').style.display = 'none';

  if (isSignEmpty()) {
    document.getElementById('sign-required-msg').style.display = 'block';
    document.querySelector('.sign-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  document.getElementById('sign-required-msg').style.display = 'none';

  showLoading(true);
  setStep(0, 'active');

  try {
    // step 0: 중복 확인 (이미 미리 했지만 최종 확인)
    await delay(300);
    setStep(0, 'done');
    setStep(1, 'active');
    setProgress(30);

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

    // step 1~2: 서버 전송 (사진은 이미 업로드됨 → URL만 전달)
    setProgress(50);
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setStep(1, 'done');
    setStep(2, 'active');
    setProgress(80);

    if (!json.ok) {
      if (json.error === 'DUPLICATE') {
        showLoading(false);
        alert('이미 제출된 평가입니다.');
        return;
      }
      throw new Error(json.error || '서버 오류');
    }

    await delay(400);
    setStep(2, 'done');
    setStep(3, 'done');
    setProgress(100);
    await delay(600);

    showLoading(false);
    showResult(json);
    showScreen('screen-done');

    // PDF 완료 폴링 시작
    pollPdfStatus(json.submissionId);

  } catch (err) {
    showLoading(false);
    alert('제출 중 오류가 발생했습니다.\n' + err.message);
  }
}

// ============================================================
// PDF 상태 폴링 (완료 화면에서 링크 표시)
// ============================================================
async function pollPdfStatus(submissionId) {
  const box = document.getElementById('pdf-status-box');
  let attempts = 0;
  const maxAttempts = 20; // 최대 2분 대기

  const timer = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts) {
      clearInterval(timer);
      box.innerHTML = '<div style="font-size:13px;color:var(--gray-500)">PDF 생성이 지연되고 있습니다. 잠시 후 다시 확인해주세요.</div>';
      return;
    }
    try {
      const res = await fetch(`${GAS_URL}?mode=pdfStatus&submissionId=${encodeURIComponent(submissionId)}`);
      const json = await res.json();
      if (json.ok && json.data?.status === 'DONE' && json.data?.pdfUrl) {
        clearInterval(timer);
        box.innerHTML = `
          <div style="margin-bottom:8px;font-weight:600;color:var(--navy)">📄 결과서 PDF 완성</div>
          <a href="${json.data.pdfUrl}" target="_blank" class="btn btn-outline" style="font-size:14px;">PDF 열기</a>`;
      }
    } catch (e) { /* 무시 */ }
  }, 6000); // 6초마다 체크
}

// ============================================================
// 완료 화면 표시
// ============================================================
function showResult(json) {
  document.getElementById('res-score').textContent = json.score;
  const grade = json.grade || (json.score >= 90 ? '우수' : json.score >= 70 ? '양호' : '미흡');
  const gradeEl = document.getElementById('res-grade');
  gradeEl.textContent = grade;
  gradeEl.className = `result-grade grade-${grade}`;
  document.getElementById('res-info').textContent =
    `원점수 ${json.rawScore}점 / 75점`;
}

// ============================================================
// 유틸
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function showLoading(visible) {
  document.getElementById('loading-overlay').classList.toggle('active', visible);
}

function setStep(idx, state) {
  const el = document.getElementById(`step-${idx}`);
  if (!el) return;
  el.classList.remove('done', 'active');
  if (state) el.classList.add(state);
  if (state === 'done') {
    el.querySelector('.step-icon').textContent = '✅';
  }
}

function setProgress(pct) {
  document.getElementById('progress-bar').style.width = pct + '%';
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
