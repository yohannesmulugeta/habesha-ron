const runway = document.querySelector('.runway');
const rail = document.querySelector('#runway-rail');
const slides = Array.from(document.querySelectorAll('.runway-slide'));
const progressBar = document.querySelector('[data-progress]');
const currentLabel = document.querySelector('[data-current]');
const header = document.querySelector('[data-header]');
const previousButton = document.querySelector('[data-prev]');
const nextButton = document.querySelector('[data-next]');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let isTouchingRail = false;
let pageScrollFrame = 0;
let smoothingFrame = 0;
let targetRailLeft = rail ? rail.scrollLeft : 0;
let currentRailLeft = targetRailLeft;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function activeSlideIndex() {
  if (!rail || !rail.clientWidth) return 0;
  return clamp(Math.round(rail.scrollLeft / rail.clientWidth), 0, slides.length - 1);
}

function updateRunwayInterface() {
  if (!rail || !progressBar || !currentLabel) return;
  const maximum = Math.max(rail.scrollWidth - rail.clientWidth, 1);
  const position = clamp(rail.scrollLeft / maximum, 0, 1);
  const index = activeSlideIndex();
  currentLabel.textContent = String(index + 1).padStart(2, '0');
  progressBar.style.width = `${position * 100}%`;
}

function setRailPosition(value) {
  if (!rail) return;
  currentRailLeft = value;
  rail.scrollLeft = value;
  updateRunwayInterface();
}

function runRailSmoothing() {
  if (!rail || smoothingFrame || reducedMotion.matches || isTouchingRail) return;

  const tick = () => {
    smoothingFrame = 0;
    if (!rail || isTouchingRail) return;

    const delta = targetRailLeft - currentRailLeft;
    if (Math.abs(delta) < 0.35) {
      setRailPosition(targetRailLeft);
      return;
    }

    // A restrained lerp keeps vertical wheel/trackpad input feeling fluid
    // without adding a long, floaty delay.
    setRailPosition(currentRailLeft + delta * 0.14);
    smoothingFrame = window.requestAnimationFrame(tick);
  };

  smoothingFrame = window.requestAnimationFrame(tick);
}

function updateFromPageScroll() {
  if (!runway || !rail) return;

  const rect = runway.getBoundingClientRect();
  const scrollDistance = Math.max(runway.offsetHeight - window.innerHeight, 1);
  const progress = clamp(-rect.top / scrollDistance, 0, 1);
  const maximum = Math.max(rail.scrollWidth - rail.clientWidth, 0);
  targetRailLeft = progress * maximum;

  if (!isTouchingRail) {
    if (reducedMotion.matches) {
      setRailPosition(targetRailLeft);
    } else {
      runRailSmoothing();
    }
  }

  if (header) {
    header.classList.toggle('is-solid', rect.bottom < window.innerHeight * 0.35);
  }
}

function requestScrollUpdate() {
  if (pageScrollFrame) return;
  pageScrollFrame = window.requestAnimationFrame(() => {
    pageScrollFrame = 0;
    updateFromPageScroll();
  });
}

function runwayDestinationForRail(left) {
  const maximum = Math.max(rail.scrollWidth - rail.clientWidth, 1);
  const progress = clamp(left / maximum, 0, 1);
  const runwayTop = window.scrollY + runway.getBoundingClientRect().top;
  const scrollDistance = Math.max(runway.offsetHeight - window.innerHeight, 0);
  return runwayTop + progress * scrollDistance;
}

function syncPageToRail() {
  if (!runway || !rail) return;
  targetRailLeft = rail.scrollLeft;
  currentRailLeft = rail.scrollLeft;
  window.scrollTo({ top: runwayDestinationForRail(rail.scrollLeft), behavior: 'auto' });
  updateRunwayInterface();
}

function goToSlide(index) {
  if (!rail || !runway || !slides.length) return;
  const nextIndex = clamp(index, 0, slides.length - 1);
  const left = nextIndex * rail.clientWidth;
  const destination = runwayDestinationForRail(left);

  targetRailLeft = left;
  if (reducedMotion.matches) {
    setRailPosition(left);
  } else {
    runRailSmoothing();
  }

  window.scrollTo({
    top: destination,
    behavior: reducedMotion.matches ? 'auto' : 'smooth'
  });
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', () => {
  currentRailLeft = rail ? rail.scrollLeft : 0;
  requestScrollUpdate();
});

if (rail) {
  rail.addEventListener('scroll', () => {
    if (isTouchingRail) {
      currentRailLeft = rail.scrollLeft;
      targetRailLeft = rail.scrollLeft;
    }
    updateRunwayInterface();
  }, { passive: true });

  rail.addEventListener('pointerdown', () => {
    isTouchingRail = true;
    if (smoothingFrame) {
      window.cancelAnimationFrame(smoothingFrame);
      smoothingFrame = 0;
    }
  });

  rail.addEventListener('pointerup', () => {
    // Let native momentum finish briefly, then make the page position agree
    // with the horizontal gesture so it never snaps back.
    window.setTimeout(() => {
      isTouchingRail = false;
      syncPageToRail();
    }, 140);
  });

  rail.addEventListener('pointercancel', () => {
    isTouchingRail = false;
    syncPageToRail();
  });

  rail.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToSlide(activeSlideIndex() + 1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToSlide(activeSlideIndex() - 1);
    }
  });
}

previousButton?.addEventListener('click', () => goToSlide(activeSlideIndex() - 1));
nextButton?.addEventListener('click', () => goToSlide(activeSlideIndex() + 1));

menuButton?.addEventListener('click', () => {
  const open = navigation?.classList.toggle('is-open') ?? false;
  menuButton.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();

updateFromPageScroll();
