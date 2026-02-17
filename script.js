// Page Registry
const PAGES = [
  'page-1',
  'page-2',
  // 'page-3',
  // 'page-4',
];

// Core Navigation 

function goToPage(targetId, onDone) {
  const current = document.querySelector('.page.active');
  const target  = document.getElementById(targetId);

  if (!target) {
    console.warn(`goToPage: no element with id "${targetId}" found.`);
    return;
  }

  if (current && current !== target) {
    current.style.animation = 'fadeOut 0.35s ease forwards';
    setTimeout(() => {
      current.style.animation = '';
      current.classList.remove('active');
      current.style.display = '';
      target.classList.add('active');
      target.style.animation = 'fadeIn 0.5s ease both';
      if (typeof onDone === 'function') onDone();
    }, 320);
  } else {
    target.classList.add('active');
    if (typeof onDone === 'function') onDone();
  }
}

function goToNextPage() {
  const current = document.querySelector('.page.active');
  if (!current) return;
  const idx = PAGES.indexOf(current.id);
  if (idx === -1 || idx >= PAGES.length - 1) return;
  goToPage(PAGES[idx + 1]);
}

// Page 1 — Landing
(function initPage1() {
  const btn = document.getElementById('btn-start');
  if (!btn) return;

  btn.addEventListener('click', () => goToPage('page-2'));

  btn.addEventListener('touchstart', () => {
    btn.style.transform = 'scale(0.96)';
  }, { passive: true });

  btn.addEventListener('touchend', () => {
    btn.style.transform = '';
  }, { passive: true });
})();

// Page 2 — Wordle 
(function initPage2() {

  const WORD     = 'SHARK';
  const WORD_LEN = 5;
  const MAX_ROWS = 6;

  const WIN_MSGS = [
    'you got it \u2661',
    'yes!! that\'s it \u2661',
    'perfect \u2661',
    'you\'re amazing \u2661',
    'SHARK! \u2661',
  ];

  let currentRow  = 0;
  let currentCol  = 0;
  let currentWord = '';
  let gameOver    = false;

  const grid    = document.getElementById('wordle-grid');
  const toast   = document.getElementById('wordle-toast');
  const actions = document.getElementById('wordle-actions');
  const btnCont = document.getElementById('btn-continue');
  const btnRet  = document.getElementById('btn-retry');

  // Build 6x5 grid
  function buildGrid() {
    grid.innerHTML = '';
    for (let r = 0; r < MAX_ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'wordle-row';
      row.id = 'row-' + r;
      for (let c = 0; c < WORD_LEN; c++) {
        const tile = document.createElement('div');
        tile.className = 'wordle-tile';
        tile.id = 'tile-' + r + '-' + c;
        row.appendChild(tile);
      }
      grid.appendChild(row);
    }
  }

  function getTile(r, c) {
    return document.getElementById('tile-' + r + '-' + c);
  }

  function getRow(r) {
    return document.getElementById('row-' + r);
  }

  function setTileLetter(r, c, letter) {
    const t = getTile(r, c);
    t.textContent = letter;
    t.classList.toggle('filled', letter !== '');
  }

  let toastTimer = null;
  function showToast(msg, persist) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add('visible');
    if (!persist) {
      toastTimer = setTimeout(() => toast.classList.remove('visible'), 1800);
    }
  }

  const keyStates = {};
  const STATE_RANK = { correct: 2, present: 1, absent: 0 };

  function updateKeyState(letter, state) {
    const existing = keyStates[letter];
    if (!existing || STATE_RANK[state] > STATE_RANK[existing]) {
      keyStates[letter] = state;
      const btn = document.querySelector('.kb-key[data-key="' + letter.toLowerCase() + '"]');
      if (btn) {
        btn.classList.remove('correct', 'present', 'absent');
        btn.classList.add(state);
      }
    }
  }

  // Evaluate guess — returns array of 5 states
  function evaluate(guess) {
    const result = Array(WORD_LEN).fill('absent');
    const target = WORD.split('');
    const gArr   = guess.split('');
    const used   = Array(WORD_LEN).fill(false);

    // Pass 1: correct positions
    for (let i = 0; i < WORD_LEN; i++) {
      if (gArr[i] === target[i]) {
        result[i] = 'correct';
        used[i]   = true;
      }
    }

    // Pass 2: present (right letter, wrong place)
    for (let i = 0; i < WORD_LEN; i++) {
      if (result[i] === 'correct') continue;
      for (let j = 0; j < WORD_LEN; j++) {
        if (!used[j] && gArr[i] === target[j]) {
          result[i] = 'present';
          used[j]   = true;
          break;
        }
      }
    }

    return result;
  }

  function submitRow() {
    if (currentWord.length < WORD_LEN) {
      showToast('not enough letters');
      shakeRow(currentRow);
      return;
    }

    const guess  = currentWord;
    const states = evaluate(guess);
    const row    = currentRow;

    // Apply tile states with staggered flip delay
    for (let c = 0; c < WORD_LEN; c++) {
      (function(col, state) {
        setTimeout(function() {
          const tile = getTile(row, col);
          tile.classList.remove('filled');
          tile.classList.add(state);
        }, col * 100);
      })(c, states[c]);
      updateKeyState(guess[c], states[c]);
    }

    // After all flips finish, check win/lose
    setTimeout(function() {
      if (guess === WORD) {
        // Bounce each tile
        for (let c = 0; c < WORD_LEN; c++) {
          (function(col) {
            setTimeout(function() {
              const tile = getTile(row, col);
              tile.classList.add('bounce');
              tile.addEventListener('animationend', function() {
                tile.classList.remove('bounce');
              }, { once: true });
            }, col * 80);
          })(c);
        }
        setTimeout(function() {
          const msg = WIN_MSGS[Math.floor(Math.random() * WIN_MSGS.length)];
          showToast(msg, true);
          revealContinue();
        }, 500);
        gameOver = true;

      } else if (row === MAX_ROWS - 1) {
        setTimeout(function() {
          showToast('the word was ' + WORD.toLowerCase() + ' \u2661', true);
          revealRetry();
        }, 300);
        gameOver = true;
      }
    }, WORD_LEN * 100 + 400);

    currentRow++;
    currentCol  = 0;
    currentWord = '';
  }

  function shakeRow(r) {
    const row = getRow(r);
    row.classList.add('shake');
    row.addEventListener('animationend', function() {
      row.classList.remove('shake');
    }, { once: true });
  }

  function revealContinue() {
    actions.hidden = false;
    btnCont.hidden = false;
    btnRet.hidden  = true;
  }

  function revealRetry() {
    actions.hidden = false;
    btnRet.hidden  = false;
    btnCont.hidden = true;
  }

  function resetGame() {
    currentRow  = 0;
    currentCol  = 0;
    currentWord = '';
    gameOver    = false;

    toast.textContent = '';
    toast.classList.remove('visible');

    actions.hidden = true;
    btnCont.hidden = true;
    btnRet.hidden  = true;

    document.querySelectorAll('.kb-key').forEach(function(k) {
      k.classList.remove('correct', 'present', 'absent');
    });
    Object.keys(keyStates).forEach(function(k) { delete keyStates[k]; });

    buildGrid();
  }

  function handleKey(key) {
    if (gameOver) return;

    if (key === 'Backspace' || key === '\u232b') {
      if (currentCol > 0) {
        currentCol--;
        currentWord = currentWord.slice(0, -1);
        setTileLetter(currentRow, currentCol, '');
      }
      return;
    }

    if (key === 'Enter') {
      submitRow();
      return;
    }

    if (/^[A-Za-z]$/.test(key) && currentCol < WORD_LEN) {
      setTileLetter(currentRow, currentCol, key.toUpperCase());
      currentWord += key.toUpperCase();
      currentCol++;
    }
  }

  // Physical keyboard
  document.addEventListener('keydown', function(e) {
    if (!document.getElementById('page-2').classList.contains('active')) return;
    handleKey(e.key);
  });

  // On-screen keyboard
  document.getElementById('wordle-keyboard').addEventListener('click', function(e) {
    const btn = e.target.closest('.kb-key');
    if (!btn) return;
    handleKey(btn.dataset.key);
  });

  btnCont.addEventListener('click', function() { goToPage('page-3'); });
  btnRet.addEventListener('click',  function() { resetGame(); });

  buildGrid();

})();

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text)      e.textContent = text;
  return e;
}