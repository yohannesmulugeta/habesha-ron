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
let pageFrame = 0;
let railFrame = 0;
let targetRailLeft = rail ? rail.scrollLeft : 0;
let currentRailLeft = targetRailLeft;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function activeSlideIndex() {
  if (!rail || !rail.clientWidth) return 0;
  return clamp(Math.round(rail.scrollLeft / rail.clientWidth), 0, slides.length - 1);
}

function updateSlideStates() {
  if (!rail || !rail.clientWidth) return;
  const center = rail.scrollLeft + rail.clientWidth / 2;

  slides.forEach((slide) => {
    const slideCenter = slide.offsetLeft + slide.clientWidth / 2;
    const distance = Math.abs(center - slideCenter) / rail.clientWidth;
    slide.classList.toggle('is-current', distance < 0.52);

    if (!reducedMotion.matches) {
      const media = slide.querySelector('[data-slide-media]');
      const copy = slide.querySelector('[data-slide-copy]');
      const signed = (slideCenter - center) / rail.clientWidth;
      if (media) media.style.transform = `translate3d(${signed * 14}px,0,0)`;
      if (copy) copy.style.transform = `translate3d(${signed * -10}px,0,0)`;
    }
  });
}

function updateRunwayInterface() {
  if (!rail) return;

  const maximum = Math.max(rail.scrollWidth - rail.clientWidth, 1);
  const position = clamp(rail.scrollLeft / maximum, 0, 1);
  const index = activeSlideIndex();

  if (currentLabel) currentLabel.textContent = String(index + 1).padStart(2, '0');
  if (progressBar) progressBar.style.width = `${position * 100}%`;

  updateSlideStates();
}

function setRailPosition(value) {
  if (!rail) return;
  currentRailLeft = value;
  rail.scrollLeft = value;
  updateRunwayInterface();
}

function smoothRailToTarget() {
  if (!rail || railFrame || reducedMotion.matches || isTouchingRail) return;

  const tick = () => {
    railFrame = 0;
    if (!rail || isTouchingRail) return;

    const delta = targetRailLeft - currentRailLeft;

    if (Math.abs(delta) < 0.25) {
      setRailPosition(targetRailLeft);
      return;
    }

    setRailPosition(currentRailLeft + delta * 0.13);
    railFrame = window.requestAnimationFrame(tick);
  };

  railFrame = window.requestAnimationFrame(tick);
}

function updateFromPageScroll() {
  if (!runway || !rail) return;

  const rect = runway.getBoundingClientRect();
  const scrollDistance = Math.max(runway.offsetHeight - window.innerHeight, 1);
  const progress = clamp(-rect.top / scrollDistance, 0, 1);
  const maximum = Math.max(rail.scrollWidth - rail.clientWidth, 0);
  targetRailLeft = progress * maximum;

  if (!isTouchingRail) {
    if (reducedMotion.matches) setRailPosition(targetRailLeft);
    else smoothRailToTarget();
  }

  if (header) {
    const runwayHasPassed = rect.bottom < window.innerHeight * 0.32;
    header.classList.toggle('is-solid', runwayHasPassed);
  }
}

function requestPageUpdate() {
  if (pageFrame) return;

  pageFrame = window.requestAnimationFrame(() => {
    pageFrame = 0;
    updateFromPageScroll();
  });
}

function runwayDestinationForRail(left) {
  if (!rail || !runway) return window.scrollY;

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

  window.scrollTo({
    top: runwayDestinationForRail(rail.scrollLeft),
    behavior: 'auto'
  });

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
    smoothRailToTarget();
  }

  window.scrollTo({
    top: destination,
    behavior: reducedMotion.matches ? 'auto' : 'smooth'
  });
}

window.addEventListener('scroll', requestPageUpdate, { passive: true });

window.addEventListener('resize', () => {
  currentRailLeft = rail ? rail.scrollLeft : 0;
  requestPageUpdate();
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

    if (railFrame) {
      window.cancelAnimationFrame(railFrame);
      railFrame = 0;
    }
  });

  rail.addEventListener('pointerup', () => {
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
  document.body.classList.toggle('menu-open', open);
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
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
  { threshold: 0.14 }
);

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const id = entry.target.getAttribute('data-section');
      navigation?.querySelectorAll('[data-nav]').forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('data-nav') === id);
      });
    });
  },
  {
    rootMargin: '-35% 0px -55% 0px',
    threshold: 0
  }
);

document.querySelectorAll('[data-section]').forEach((section) => sectionObserver.observe(section));

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();

updateFromPageScroll();
updateRunwayInterface();