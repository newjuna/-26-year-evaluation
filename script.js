// ============================================================
// CONFIG
// ============================================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwfAktGmjc97O737o7vN0hkhRo6eNfOKQAJ3ziU9IvEwQ1E-z-mo8_90P1oMCUDQ9Uc/exec';

// ============================================================
// 평가 항목
// ============================================================
const EVALUATION_ITEMS = [
  {
    id: 'q01',
    title: '기계·기구 또는 설비의\n안전·보건 점검 및 이상 유무 확인',
    desc: '멀티콘센트, 전등, 자동문, 에어컨, 사다리, 소화기, 리프트, 승강기, 소방설비 등',
    scores: { high: 10, mid: null, low: 0 },
    criteria: { high: '해당 매장 보유 설비의 점검 또는 유지보수 이력 확인 가능', low: '점검자료 없음 또는 이상사항 미조치' },
    exampleSrc: 'assets/examples/example_1.png'
  },
  {
    id: 'q02',
    title: '작업복·보호구 및 방호장치\n점검과 착용·사용 교육·지도',
    desc: '보호구 지급대장, TBM 실시, 신규채용 시 교육 실시 여부 확인',
    scores: { high: 10, mid: 5, low: 0 },
    criteria: { high: '보호구 지급대장 6개월, TBM 실시, 신규채용 시 교육 실시 완료', mid: '위 항목 중 1가지 미흡', low: '보호구 지급대장과 교육·지도 기록 모두 없음' },
    exampleSrc: 'assets/examples/example_2.png'
  },
  {
    id: 'q03',
    title: '산업재해 보고 및 응급조치',
    desc: '산업재해 발생 시 즉시 보고, 응급조치, 산업재해조사표 등',
    scores: { high: 15, mid: null, low: 0 },
    criteria: { high: '산업재해 발생 건 전부 즉시 보고 및 조치 완료', low: '미보고 또는 지연 보고가 1건이라도 발생' },
    exampleSrc: 'assets/examples/example_3.png'
  },
  {
    id: 'q04',
    title: '작업장 정리·정돈 및\n통로 확보 확인·감독',
    desc: '순회점검일지 작성, 통로·비상통로 확보, 후방공간 정리정돈 확인',
    scores: { high: 10, mid: null, low: 0 },
    criteria: { high: '순회점검표 월 4회 이상 작성', low: '순회점검일지 미작성 월이 있음' },
    exampleSrc: 'assets/examples/example_4.png'
  },
  {
    id: 'q05',
    title: '안전·보건관리자 또는\n기관에 대한 협조',
    desc: '안전보건팀 요청사항, 비상대피훈련, 개선요청 사항 협조 및 이행 여부',
    scores: { high: 10, mid: null, low: 0 },
    criteria: { high: '비상대피훈련 결과보고 1건 이상 완료', low: '훈련은 실시했으나 결과보고 자료 없음' },
    exampleSrc: 'assets/examples/example_5.png'
  },
  {
    id: 'q06',
    title: '위험성평가 참여 및 실행',
    desc: '위험성평가 참여자료, 위험요인 확인, 개선조치 실행 내역 확인',
    scores: { high: 15, mid: 8, low: 0 },
    criteria: { high: '위험성평가 참여자료 및 개선조치 완료 내역 확인', mid: '위험성평가는 참여했으나 개선조치 완료 내역 없음', low: '위험성평가 미참여 또는 개선조치 미실행' },
    exampleSrc: 'assets/examples/example_6.png'
  },
  {
    id: 'q07',
    title: '법규 및 지침 준수 여부',
    desc: 'ISO 가이드 PDF 확인 후 매장 안전보건 절차서, 실행문서, 서류, 위험표지 확인',
    scores: { high: 5, mid: 3, low: 0 },
    criteria: { high: '안전보건 절차서·실행문서·서류·표지 보관/게시 상태 확인 가능', mid: '일부 자료 누락 또는 최신화 필요', low: '확인 가능한 안전보건 문서·서류·표지 없음' },
    exampleSrc: 'assets/examples/example_7.png',
    guide: { href: './assets/ISO_guide.pdf', label: '📘 ISO 가이드 보기' }
  }
];

// ============================================================
// 전역 상태
// ============================================================
let orgTree = {};
let orgFlatList = []; // 매장 검색용 flat 목록: [{store, hq, dept, team, empId, empName}, ...]
let answers = {};
let currentEvalIndex = 0;
let selectedStore = null; // { store, hq, dept, team }
let signCanvas, signCtx, isDrawing = false, hasSigned = false;

// ============================================================
// 초기화
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setupInfoForm();
  initSignCanvas();
  document.getElementById('btn-submit').addEventListener('click', submitEval);
  // 가이드 팝업 + 조직도 로딩 동시 시작
  startGuideAndLoad();
});

// ============================================================
// 가이드 팝업 + 조직도 로딩 동시 진행
// 스텝 4개를 2초 간격으로 하나씩 등장
// 조직도 로딩 완료 AND 스텝 전부 나온 뒤 버튼 활성화
// ============================================================
let orgLoaded = false;
let guideStepsAllShown = false;

function startGuideAndLoad() {
  // 조직도 로딩 시작 (백그라운드)
  loadOrgTree();

  // 스텝 순차 등장: 0→2초, 1→4초, 2→6초, 3→8초
  const STEP_DELAY = 2000; // 2초 간격
  const totalSteps = 4;

  for (let i = 0; i < totalSteps; i++) {
    setTimeout(() => {
      const el = document.getElementById(`gs-${i}`);
      if (el) {
        el.classList.remove('guide-step-hidden');
        el.classList.add('guide-step-visible');
      }
      // 마지막 스텝 등장 완료
      if (i === totalSteps - 1) {
        guideStepsAllShown = true;
        tryActivateGuideBtn();
      }
    }, STEP_DELAY * (i + 1));
  }
}

// 조직도 로딩 + 스텝 표시 둘 다 완료됐을 때만 버튼 활성화
function tryActivateGuideBtn() {
  if (!orgLoaded || !guideStepsAllShown) return;

  const loadingRow = document.getElementById('guide-loading-row');
  if (loadingRow) {
    loadingRow.innerHTML = '<span style="color:#16a34a;font-size:18px">✅</span> <span style="color:#16a34a;font-weight:600">데이터 준비 완료!</span>';
    loadingRow.classList.add('done');
  }
  const status = document.getElementById('guide-status');
  if (status) status.textContent = '준비가 완료됐습니다. 아래 버튼을 눌러 시작하세요.';

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
    if (json.ok) {
      orgTree = json.data;
      orgFlatList = [];
      Object.entries(orgTree).forEach(([hq, depts]) => {
        Object.entries(depts).forEach(([dept, teams]) => {
          Object.entries(teams).forEach(([team, stores]) => {
            stores.forEach(store => {
              orgFlatList.push({ hq, dept, team, store });
            });
          });
        });
      });
    }
  } catch (e) {
    console.error('조직도 로드 실패', e);
  }
  // 성공/실패 무관하게 완료 처리
  orgLoaded = true;
  tryActivateGuideBtn();
}

// ============================================================
// 정보 입력 폼
// ============================================================
function setupInfoForm() {
  const inpEmpId = document.getElementById('inp-empid');

  // 사번 입력 시 매장 자동 검색
  inpEmpId.addEventListener('input', onPersonInfoChange);
  inpEmpId.addEventListener('keyup', onPersonInfoChange);

  // 수동 조직도
  document.querySelectorAll('.hq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hq-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('sel-hq').value = btn.dataset.value;
      hideCascade('group-dept', 'group-team', 'group-store-manual');
      const depts = Object.keys(orgTree[btn.dataset.value] || {});
      showCascade('group-dept', 'sel-dept', depts, '부서를 선택하세요');
    });
  });

  document.getElementById('sel-dept').addEventListener('change', () => {
    hideCascade('group-team', 'group-store-manual');
    const hq = document.getElementById('sel-hq').value;
    const dept = document.getElementById('sel-dept').value;
    if (dept) showCascade('group-team', 'sel-team', Object.keys(orgTree[hq]?.[dept] || {}), '팀을 선택하세요');
  });

  document.getElementById('sel-team').addEventListener('change', () => {
    hideCascade('group-store-manual');
    const hq   = document.getElementById('sel-hq').value;
    const dept = document.getElementById('sel-dept').value;
    const team = document.getElementById('sel-team').value;
    if (team) showCascade('group-store-manual', 'sel-store-manual', orgTree[hq]?.[dept]?.[team] || [], '매장을 선택하세요');
  });

  document.getElementById('sel-store-manual').addEventListener('change', () => {
    const store = document.getElementById('sel-store-manual').value;
    if (!store) return;
    const hq   = document.getElementById('sel-hq').value;
    const dept = document.getElementById('sel-dept').value;
    const team = document.getElementById('sel-team').value;
    selectStore({ store, hq, dept, team });
  });

  document.getElementById('btn-start').addEventListener('click', startEval);
}

let searchTimer = null;
function onPersonInfoChange() {
  const empNum = document.getElementById('inp-empid').value.trim();

  // 이미 선택된 매장 있으면 체크만
  if (selectedStore) { checkStartBtn(); return; }

  clearTimeout(searchTimer);

  if (!empNum) {
    document.getElementById('store-search-result').style.display = 'none';
    document.getElementById('store-searching').style.display = 'none';
    document.getElementById('manual-toggle-wrap').style.display = 'none';
    checkStartBtn();
    return;
  }

  document.getElementById('store-searching').style.display = 'flex';
  document.getElementById('store-search-result').style.display = 'none';

  // 사번 입력 후 0.8초 뒤 조회 (타이핑 끝날 때까지 대기)
  searchTimer = setTimeout(() => {
    fetchStoreByEmpId('AD' + empNum);
  }, 800);
}

async function fetchStoreByEmpId(empId) {
  try {
    const res = await fetch(`${GAS_URL}?mode=findByEmpId&empId=${encodeURIComponent(empId)}`);
    const json = await res.json();
    document.getElementById('store-searching').style.display = 'none';

    if (json.ok && json.data) {
      // 이름 자동 완성 + 이름 필드 표시
      const inpName = document.getElementById('inp-name');
      if (json.data.empName) {
        inpName.value = json.data.empName;
        document.getElementById('name-group').style.display = 'block';
      }
      showStoreResults([json.data]);
    } else {
      showStoreResults([]);
    }
  } catch (e) {
    document.getElementById('store-searching').style.display = 'none';
    showStoreResults([]);
  }
}

function showStoreResults(results) {
  const resultWrap = document.getElementById('store-search-result');
  const cards = document.getElementById('store-cards');
  const manualToggle = document.getElementById('manual-toggle-wrap');

  if (results.length === 0) {
    // 못 찾음 → 수동 선택 버튼만 표시
    resultWrap.style.display = 'none';
    manualToggle.style.display = 'block';
    manualToggle.querySelector('.manual-toggle-btn').textContent = '⚠️ 매장을 찾지 못했습니다. 조직도 직접 선택 ▾';
    checkStartBtn();
    return;
  }

  cards.innerHTML = '';
  results.forEach(r => {
    const card = document.createElement('div');
    card.className = 'store-card';
    card.innerHTML = `
      <div>
        <div class="store-card-name">${r.store}</div>
        <div class="store-card-org">${r.hq} · ${r.dept} · ${r.team}</div>
      </div>
      <div class="store-card-check">✅</div>`;
    card.addEventListener('click', () => selectStore(r));
    cards.appendChild(card);
  });

  resultWrap.style.display = 'block';
  manualToggle.style.display = 'block';
  manualToggle.querySelector('.manual-toggle-btn').textContent = '📋 조직도 직접 선택하기 ▾';
  checkStartBtn();
}

function selectStore(storeObj) {
  selectedStore = storeObj;
  // 카드 선택 표시
  document.querySelectorAll('.store-card').forEach(c => c.classList.remove('selected'));
  const box = document.getElementById('selected-store-box');
  box.style.display = 'block';
  document.getElementById('selected-store-info').innerHTML = `
    <div>${storeObj.store}</div>
    <div class="selected-store-sub">${storeObj.hq} · ${storeObj.dept} · ${storeObj.team}</div>`;
  document.getElementById('store-search-result').style.display = 'none';
  document.getElementById('manual-org-wrap').style.display = 'none';
  document.getElementById('manual-toggle-wrap').style.display = 'none';
  checkDuplicateWithStore();
  checkStartBtn();
}

function resetStoreSelection() {
  selectedStore = null;
  document.getElementById('selected-store-box').style.display = 'none';
  document.getElementById('manual-toggle-wrap').style.display = 'block';
  onPersonInfoChange();
  checkStartBtn();
}

function toggleManualOrg() {
  const wrap = document.getElementById('manual-org-wrap');
  const isOpen = wrap.style.display !== 'none';
  wrap.style.display = isOpen ? 'none' : 'block';
  document.getElementById('manual-toggle-btn').textContent =
    isOpen ? '📋 조직도 직접 선택하기 ▾' : '📋 조직도 직접 선택하기 ▴';
}

function showCascade(groupId, selectId, options, placeholder) {
  const group = document.getElementById(groupId);
  const sel = document.getElementById(selectId);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  options.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
  group.style.display = 'block';
}
function hideCascade(...ids) { ids.forEach(id => { const g = document.getElementById(id); if (g) g.style.display = 'none'; }); }

function checkStartBtn() {
  const hasEmpId = document.getElementById('inp-empid').value.trim().length > 0;
  const hasStore = !!selectedStore;
  document.getElementById('btn-start').disabled = !(hasEmpId && hasStore);
}

let dupTimer = null;
function checkDuplicateWithStore() {
  clearTimeout(dupTimer);
  dupTimer = setTimeout(async () => {
    if (!selectedStore) return;
    const empId = 'AD' + document.getElementById('inp-empid').value.trim();
    const store = selectedStore.store;
    try {
      const res = await fetch(`${GAS_URL}?mode=duplicate&empId=${encodeURIComponent(empId)}&store=${encodeURIComponent(store)}`);
      const json = await res.json();
      const msg = document.getElementById('duplicate-msg');
      if (json.ok && json.isDuplicate) {
        msg.textContent = `⚠️ "${store}" 매장 / ${empId}로 이미 제출된 평가가 있습니다.`;
        msg.style.display = 'block';
        document.getElementById('btn-start').disabled = true;
      } else {
        msg.style.display = 'none';
        checkStartBtn();
      }
    } catch (_) {}
  }, 500);
}

// ============================================================
// 평가 시작
// ============================================================
function startEval() {
  answers = {};
  EVALUATION_ITEMS.forEach(item => { answers[item.id] = { score: null, photoUrl: '', memo: '' }; });
  currentEvalIndex = 0;
  buildEvalCards();
  showScreen('screen-eval');
  updateProgress();
  updateEvalNav();
}

// ============================================================
// 평가 카드 생성 (예시 이미지 + 하 메모 포함)
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
      ? `<a href="${item.guide.href}" target="_blank" class="guide-link">${item.guide.label}</a>` : '';

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
        <button type="button" class="example-toggle" onclick="toggleExample('${item.id}')">
          🖼️ 증빙 예시 보기
        </button>
        <div class="example-img-wrap" id="example-${item.id}">
          <img src="${item.exampleSrc}" alt="예시" loading="lazy"
               onerror="this.parentElement.style.display='none'">
        </div>
        <div class="level-group">
          <button class="level-btn" data-qid="${item.id}" data-level="상">
            상<span class="level-score">${item.scores.high}점</span>
          </button>
          <button class="level-btn ${hasMid ? '' : 'disabled-btn'}"
                  data-qid="${item.id}" data-level="중" ${hasMid ? '' : 'disabled'}>
            중<span class="level-score">${hasMid ? item.scores.mid + '점' : '—'}</span>
          </button>
          <button class="level-btn" data-qid="${item.id}" data-level="하">
            하<span class="level-score">0점</span>
          </button>
        </div>
        <div class="memo-area" id="memo-area-${item.id}">
          <div class="memo-label">📝 미흡 사유를 간략히 적어주세요</div>
          <textarea id="memo-${item.id}" rows="3"
                    placeholder="예) 순회점검일지 미작성 월 있음 등"
                    oninput="answers['${item.id}'].memo = this.value"></textarea>
        </div>
        <div class="photo-area">
          <label class="photo-btn-label" for="photo-${item.id}">
            📷 증빙 사진 첨부 <span style="font-size:12px;font-weight:400">(선택)</span>
            <input type="file" id="photo-${item.id}" accept="image/*"
                   capture="environment" data-qid="${item.id}">
          </label>
          <div class="photo-status" id="photo-status-${item.id}"></div>
        </div>
      </div>`;
    wrap.appendChild(card);
  });

  wrap.querySelectorAll('.level-btn:not([disabled])').forEach(btn => btn.addEventListener('click', onLevelSelect));
  wrap.querySelectorAll('input[type="file"]').forEach(input => input.addEventListener('change', onPhotoSelect));
  document.getElementById('btn-prev').addEventListener('click', goPrev);
  document.getElementById('btn-next').addEventListener('click', goNext);
}

function toggleExample(qid) {
  document.getElementById(`example-${qid}`).classList.toggle('visible');
}

function onLevelSelect(e) {
  const btn = e.currentTarget;
  const qid = btn.dataset.qid;
  const level = btn.dataset.level;
  document.querySelectorAll(`.level-btn[data-qid="${qid}"]`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  answers[qid].score = level;
  const memoArea = document.getElementById(`memo-area-${qid}`);
  if (level === '하') {
    memoArea.classList.add('visible');
  } else {
    memoArea.classList.remove('visible');
    answers[qid].memo = '';
    document.getElementById(`memo-${qid}`).value = '';
  }
  updateProgress();
}

function goPrev() { if (currentEvalIndex > 0) showEvalCard(currentEvalIndex - 1); }

function goNext() {
  const item = EVALUATION_ITEMS[currentEvalIndex];
  if (!answers[item.id]?.score) {
    const group = document.querySelector(`#card-${item.id} .level-group`);
    group.style.animation = 'none'; group.offsetHeight;
    group.style.animation = 'shake 0.4s ease';
    return;
  }
  if (currentEvalIndex < EVALUATION_ITEMS.length - 1) showEvalCard(currentEvalIndex + 1);
  else showScreen('screen-sign');
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
  const pct = Math.round((answered / EVALUATION_ITEMS.length) * 100);
  const bar = document.getElementById('top-progress-bar');
  const label = document.getElementById('top-progress-label');
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = `${answered} / ${EVALUATION_ITEMS.length} 완료`;
}

function updateEvalNav() {
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  prevBtn.style.display = currentEvalIndex === 0 ? 'none' : 'flex';
  nextBtn.textContent = currentEvalIndex === EVALUATION_ITEMS.length - 1 ? '서명하기 →' : '다음 →';
}

function scrollToLastItem() { showEvalCard(EVALUATION_ITEMS.length - 1); }

// ============================================================
// 사진 즉시 업로드
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
    const store = selectedStore?.store || '';
    const empId = 'AD' + document.getElementById('inp-empid').value.trim();
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'uploadPhoto', base64, mimeType: 'image/jpeg',
        fileName: `${qid}_${empId}_${Date.now()}.jpg`, empId, store, questionId: qid })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    answers[qid].photoUrl = json.fileUrl;
    statusEl.innerHTML = `<div class="photo-done-row">✅ 업로드 완료</div>
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
// 서명 캔버스
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
    signCtx.strokeStyle = '#0D1B36'; signCtx.lineWidth = 2.5;
    signCtx.lineCap = 'round'; signCtx.lineJoin = 'round';
  }
  resize();
  window.addEventListener('resize', resize);
  const getPos = e => {
    const rect = signCanvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };
  const start = e => { isDrawing = true; hasSigned = true; document.getElementById('sign-hint').classList.add('hidden'); signCtx.beginPath(); const p = getPos(e); signCtx.moveTo(p.x, p.y); };
  const move  = e => { if (!isDrawing) return; e.preventDefault(); const p = getPos(e); signCtx.lineTo(p.x, p.y); signCtx.stroke(); };
  const end   = () => isDrawing = false;
  signCanvas.addEventListener('mousedown', start);
  signCanvas.addEventListener('mousemove', move);
  signCanvas.addEventListener('mouseup', end);
  signCanvas.addEventListener('mouseleave', end);
  signCanvas.addEventListener('touchstart', start, { passive: false });
  signCanvas.addEventListener('touchmove',  move,  { passive: false });
  signCanvas.addEventListener('touchend', end);
}

function clearSign() {
  const dpr = window.devicePixelRatio || 1;
  signCtx.clearRect(0, 0, signCanvas.width / dpr, signCanvas.height / dpr);
  hasSigned = false;
  document.getElementById('sign-hint').classList.remove('hidden');
}

function getSignBase64() { return signCanvas.toDataURL('image/png').split(',')[1]; }

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
    const empId = 'AD' + document.getElementById('inp-empid').value.trim();
    const payload = {
      action: 'submit',
      org: { headquarter: selectedStore.hq, department: selectedStore.dept, team: selectedStore.team },
      empName: document.getElementById('inp-name').value.trim(),
      empId,
      store: selectedStore.store,
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
// PDF 폴링 / 완료 화면 / 유틸
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
        box.innerHTML = `<div style="font-weight:700;color:#0D1B36;margin-bottom:10px">📄 결과서 PDF 완성!</div>
          <a href="${json.data.pdfUrl}" target="_blank" style="display:block;background:#E60012;color:#fff;padding:13px;border-radius:12px;font-weight:700;font-size:15px;text-align:center;text-decoration:none;">PDF 열기</a>`;
      }
    } catch (_) {}
  }, 6000);
}

function showResult(json) {
  document.getElementById('res-score').textContent = json.score;
  const grade = json.grade || (json.score >= 90 ? '우수' : json.score >= 70 ? '양호' : '미흡');
  const el = document.getElementById('res-grade');
  el.textContent = grade; el.className = `result-grade grade-${grade}`;
  document.getElementById('res-info').textContent = `원점수 ${json.rawScore} / 75점`;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  const progressWrap = document.getElementById('top-progress-wrap');
  if (id === 'screen-eval') {
    progressWrap.style.display = 'block';
    updateProgress();
  } else {
    progressWrap.style.display = 'none';
  }
  const titles = { 'screen-info': '반기 업무수행 평가', 'screen-eval': '평가 항목', 'screen-sign': '서명', 'screen-done': '제출 완료' };
  document.getElementById('header-title').textContent = titles[id] || '';
}

function showLoading(v) { document.getElementById('loading-overlay').classList.toggle('active', v); }
function setStep(idx, state) {
  const el = document.getElementById(`step-${idx}`);
  if (!el) return;
  el.classList.remove('done', 'active');
  if (state) el.classList.add(state);
  if (state === 'done') el.querySelector('.step-icon').textContent = '✅';
}
function setProgress(pct) { document.getElementById('progress-bar').style.width = pct + '%'; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
