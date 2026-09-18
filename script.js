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
let ticking = false;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function activeSlideIndex() {
  if (!rail || !rail.clientWidth) return 0;
  return clamp(Math.round(rail.scrollLeft / rail.clientWidth), 0, slides.length - 1);
}

function updateRunwayInterface() {
  if (!rail) return;
  const maximum = Math.max(rail.scrollWidth - rail.clientWidth, 1);
  const position = clamp(rail.scrollLeft / maximum, 0, 1);
  const index = activeSlideIndex();
  currentLabel.textContent = String(index + 1).padStart(2, '0');
  progressBar.style.width = `${position * 100}%`;
}

function updateFromPageScroll() {
  if (!runway || !rail) return;
  const rect = runway.getBoundingClientRect();
  const scrollDistance = Math.max(runway.offsetHeight - window.innerHeight, 1);
  const progress = clamp(-rect.top / scrollDistance, 0, 1);
  const maximum = Math.max(rail.scrollWidth - rail.clientWidth, 0);

  if (!isTouchingRail && !reducedMotion.matches) {
    rail.scrollLeft = progress * maximum;
  }

  header.classList.toggle('is-solid', rect.bottom < window.innerHeight * 0.35);
  updateRunwayInterface();
}

function requestScrollUpdate() {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(() => {
    updateFromPageScroll();
    ticking = false;
  });
}

function goToSlide(index) {
  const nextIndex = clamp(index, 0, slides.length - 1);
  rail.scrollTo({ left: nextIndex * rail.clientWidth, behavior: reducedMotion.matches ? 'auto' : 'smooth' });

  const runwayTop = window.scrollY + runway.getBoundingClientRect().top;
  const scrollDistance = runway.offsetHeight - window.innerHeight;
  const destination = runwayTop + (nextIndex / (slides.length - 1)) * scrollDistance;
  window.scrollTo({ top: destination, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate);
rail.addEventListener('scroll', updateRunwayInterface, { passive: true });
rail.addEventListener('pointerdown', () => { isTouchingRail = true; });
rail.addEventListener('pointerup', () => {
  window.setTimeout(() => { isTouchingRail = false; }, 400);
});
rail.addEventListener('pointercancel', () => { isTouchingRail = false; });

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

previousButton.addEventListener('click', () => goToSlide(activeSlideIndex() - 1));
nextButton.addEventListener('click', () => goToSlide(activeSlideIndex() + 1));

menuButton.addEventListener('click', () => {
  const open = navigation.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
});

navigation.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
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
document.querySelector('[data-year]').textContent = new Date().getFullYear();
updateFromPageScroll();
