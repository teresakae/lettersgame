const PAGES = [
  'page-1',
  'page-2',
  // 'page-3',
  // 'page-4',
];

/**
 @param {string} targetId  
 @param {Function} [onDone]
 */
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

// Page 1
(function initPage1() {
  const btn = document.getElementById('btn-start');
  if (!btn) return;

  btn.addEventListener('click', () => {
    goToPage('page-2');
  });

  btn.addEventListener('touchstart', () => {
    btn.style.transform = 'scale(0.96)';
  }, { passive: true });

  btn.addEventListener('touchend', () => {
    btn.style.transform = '';
  }, { passive: true });
})();

// Page 2

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text)      e.textContent = text;
  return e;
}