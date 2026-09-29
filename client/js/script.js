// ===========================
//  HAMBURGER MENU
// ===========================
const hamburger = document.getElementById('hamburger-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
}

// Close mobile menu on link click
document.querySelectorAll('.mobile-menu a').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// ===========================
//  SMOOTH SCROLL
// ===========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ===========================
//  HEADER SCROLL EFFECT
// ===========================
const header = document.getElementById('site-header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 50) {
        header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
    } else {
        header.style.boxShadow = 'none';
    }
    lastScroll = currentScroll;
});

// ===========================
//  SCROLL REVEAL ANIMATIONS
// ===========================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Add fade-in class and observe elements
function initScrollAnimations() {
    const animateElements = document.querySelectorAll(
        '.feature-card, .step-card, .testimonial-card, .faq-item, .section-header, .preview-wrapper, .stats-bar .stat-item'
    );
    animateElements.forEach((el, i) => {
        el.classList.add('fade-in');
        el.style.transitionDelay = `${(i % 3) * 0.1}s`;
        observer.observe(el);
    });
}

// ===========================
//  STAT COUNTER ANIMATION
// ===========================
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseFloat(counter.getAttribute('data-target'));
                const isDecimal = target % 1 !== 0;
                const duration = 2000;
                const startTime = performance.now();

                function updateCounter(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    // Ease out cubic
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const current = eased * target;

                    if (isDecimal) {
                        counter.textContent = current.toFixed(1);
                    } else {
                        counter.textContent = Math.floor(current).toLocaleString();
                    }

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    }
                }
                requestAnimationFrame(updateCounter);
                statsObserver.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => statsObserver.observe(counter));
}

// ===========================
//  FAQ ACCORDION
// ===========================
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const isActive = item.classList.contains('active');

            // Close all
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

            // Open clicked (if wasn't active)
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// ===========================
//  MINI BAR ANIMATION
// ===========================
function animateMiniBars() {
    const bars = document.querySelectorAll('.mini-bar-fill');
    bars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = width;
        }, 800);
    });
}

// ===========================
//  VIDEO PREVIEW HOVER
// ===========================
function initVideoHover() {
    const previewImg = document.getElementById('preview-img');
    if (previewImg) {
        const staticSrc = previewImg.src;
        const videoSrc = previewImg.getAttribute('data-video');
        
        previewImg.addEventListener('mouseenter', () => {
            if (videoSrc) previewImg.src = videoSrc;
        });
        
        previewImg.addEventListener('mouseleave', () => {
            if (videoSrc) previewImg.src = staticSrc;
        });
    }
}

// ===========================
//  INIT
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    animateCounters();
    initFAQ();
    animateMiniBars();
    initVideoHover();
});
