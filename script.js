// ========================================
// PROJECT HUB - INTERACTIVITY
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initCardInteractions();
    initNavHighlight();
});

// ========================================
// SCROLL ANIMATIONS (Intersection Observer)
// ========================================
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements that should animate on scroll
    document.querySelectorAll('.project-card, .about-content').forEach(el => {
        observer.observe(el);
    });
}

// ========================================
// CARD INTERACTIONS
// ========================================
function initCardInteractions() {
    const cards = document.querySelectorAll('.project-card');

    cards.forEach(card => {
        const isLink = card.tagName === 'A' && card.getAttribute('href');

        // Click feedback - subtle scale pulse (skip for real links to allow navigation)
        if (!isLink) {
            card.addEventListener('click', () => {
                card.style.transform = 'translateY(-4px) scale(0.98)';
                setTimeout(() => {
                    card.style.transform = '';
                }, 150);
            });
        }

        // 3D tilt effect on mouse move
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -3;
            const rotateY = ((x - centerX) / centerX) * 3;

            card.style.transform = `translateY(-8px) perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        // Reset on mouse leave
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
            
            setTimeout(() => {
                card.style.transition = '';
            }, 500);
        });

        // Enhance transition on mouse enter
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'transform 0.15s ease-out';
        });
    });
}

// ========================================
// NAV HIGHLIGHT ON SCROLL
// ========================================
function initNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.main-nav a');

    const observerOptions = {
        root: null,
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                
                navLinks.forEach(link => {
                    link.classList.remove('is-active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('is-active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
}

// ========================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ========================================
// HEADER SHADOW ON SCROLL
// ========================================
let lastScroll = 0;
const header = document.querySelector('.site-header');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 10) {
        header.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    } else {
        header.style.borderColor = 'rgba(255, 255, 255, 0.04)';
    }
    
    lastScroll = currentScroll;
});
