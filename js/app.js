/**
 * RVolution X - Main Application Script
 * Handles: Mobile nav, scroll animations, project filters, smart FAQ, contact form
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. Mobile Navigation
    // ==========================================
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            const isOpen = mobileMenu.classList.contains('open');
            menuToggle.innerHTML = isOpen
                ? '<iconify-icon icon="solar:close-circle-linear" style="font-size: 1.5rem;"></iconify-icon>'
                : '<iconify-icon icon="solar:hamburger-menu-linear" style="font-size: 1.5rem;"></iconify-icon>';
        });

        // Close menu on link click
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
                menuToggle.innerHTML = '<iconify-icon icon="solar:hamburger-menu-linear" style="font-size: 1.5rem;"></iconify-icon>';
            });
        });
    }

    // ==========================================
    // 2. Scroll Reveal Animations
    // ==========================================
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        revealElements.forEach(el => observer.observe(el));
    }

    // ==========================================
    // 3. Project Filters (projects.html)
    // ==========================================
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectItems = document.querySelectorAll('.project-item');

    if (filterBtns.length > 0 && projectItems.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active button
                filterBtns.forEach(b => {
                    b.classList.remove('active', 'bg-white/10', 'text-white');
                    b.classList.add('bg-transparent', 'text-neutral-400');
                });
                btn.classList.add('active', 'bg-white/10', 'text-white');
                btn.classList.remove('bg-transparent', 'text-neutral-400');

                const filter = btn.dataset.filter;

                projectItems.forEach(item => {
                    if (filter === 'all' || item.dataset.category === filter) {
                        item.style.display = '';
                        item.style.opacity = '0';
                        item.style.transform = 'translateY(20px)';
                        requestAnimationFrame(() => {
                            item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                            item.style.opacity = '1';
                            item.style.transform = 'translateY(0)';
                        });
                    } else {
                        item.style.opacity = '0';
                        item.style.transform = 'translateY(20px)';
                        setTimeout(() => { item.style.display = 'none'; }, 400);
                    }
                });
            });
        });
    }

    // ==========================================
    // 4. Smart FAQ System (services.html)
    // ==========================================
    const faqContainer = document.getElementById('faq-container');
    if (faqContainer) {
        initSmartFAQ();
    }

    // ==========================================
    // 5. Contact Form Handler (contact.html)
    // ==========================================
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Netlify forms handle submission automatically when deployed
            // For demo purposes, show success message
            const formData = new FormData(contactForm);

            fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(formData).toString()
            })
            .then(() => {
                contactForm.style.display = 'none';
                document.getElementById('contact-success').classList.remove('hidden');
            })
            .catch(() => {
                // Show success anyway for local testing
                contactForm.style.display = 'none';
                document.getElementById('contact-success').classList.remove('hidden');
            });
        });
    }

    // ==========================================
    // 6. Navbar scroll effect
    // ==========================================
    const nav = document.querySelector('nav');
    if (nav) {
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            if (currentScroll > 100) {
                nav.style.borderBottomColor = 'rgba(255,255,255,0.1)';
            } else {
                nav.style.borderBottomColor = 'rgba(255,255,255,0.05)';
            }
            lastScroll = currentScroll;
        }, { passive: true });
    }
});


// ==========================================
// Smart FAQ - Interactive Service Recommender
// ==========================================
function initSmartFAQ() {
    const questions = [
        {
            id: 'goal',
            question: 'Quel est votre objectif principal ?',
            options: [
                { label: 'Creer ou refondre un site web / application', value: 'web', icon: 'solar:monitor-smartphone-linear' },
                { label: 'Ameliorer ma visibilite en ligne (SEO, marketing)', value: 'visibility', icon: 'solar:chart-2-linear' },
                { label: 'Automatiser des processus avec l\'IA', value: 'ai', icon: 'solar:magic-stick-3-linear' },
                { label: 'Securiser et optimiser mon infrastructure', value: 'infra', icon: 'solar:cloud-linear' }
            ]
        },
        {
            id: 'stage',
            question: 'Ou en etes-vous dans votre projet ?',
            options: [
                { label: 'J\'ai une idee, je pars de zero', value: 'scratch', icon: 'solar:lightbulb-linear' },
                { label: 'J\'ai deja quelque chose, je veux ameliorer', value: 'improve', icon: 'solar:refresh-linear' },
                { label: 'J\'ai besoin d\'un audit / conseil', value: 'audit', icon: 'solar:magnifer-linear' },
                { label: 'J\'ai un probleme urgent a resoudre', value: 'urgent', icon: 'solar:alarm-linear' }
            ]
        },
        {
            id: 'budget',
            question: 'Quel est votre budget approximatif ?',
            options: [
                { label: 'Moins de 5 000 EUR', value: 'small', icon: 'solar:wallet-linear' },
                { label: '5 000 - 15 000 EUR', value: 'medium', icon: 'solar:card-linear' },
                { label: '15 000 - 50 000 EUR', value: 'large', icon: 'solar:safe-2-linear' },
                { label: 'Plus de 50 000 EUR', value: 'enterprise', icon: 'solar:buildings-linear' }
            ]
        },
        {
            id: 'timeline',
            question: 'Quel est votre delai souhaite ?',
            options: [
                { label: 'Le plus vite possible (< 1 mois)', value: 'asap', icon: 'solar:running-2-linear' },
                { label: '1 a 3 mois', value: 'normal', icon: 'solar:calendar-linear' },
                { label: '3 a 6 mois', value: 'relaxed', icon: 'solar:hourglass-linear' },
                { label: 'Pas de deadline, je veux que ce soit bien fait', value: 'quality', icon: 'solar:star-linear' }
            ]
        }
    ];

    const services = {
        'web-dev': {
            title: 'Developpement Web',
            desc: 'Nous vous recommandons notre service de developpement web sur mesure. Que ce soit un site vitrine, une application ou un e-commerce, nous avons l\'expertise pour concrétiser votre vision avec les meilleures technologies.',
            icon: 'solar:code-square-linear',
            color: 'indigo'
        },
        'strategy': {
            title: 'Strategie Digitale',
            desc: 'Notre equipe strategie est faite pour vous. Audit SEO, marketing digital, analytics - nous construirons un plan d\'action personnalise pour maximiser votre visibilite et vos conversions.',
            icon: 'solar:chart-2-linear',
            color: 'cyan'
        },
        'ai-solutions': {
            title: 'Solutions IA',
            desc: 'L\'intelligence artificielle peut transformer vos processus. Chatbots, automatisation, analyse predictive - nous integrerons les solutions IA les plus pertinentes pour votre activite.',
            icon: 'solar:magic-stick-3-linear',
            color: 'emerald'
        },
        'cloud-infra': {
            title: 'Infrastructure Cloud',
            desc: 'Votre infrastructure merite une mise a niveau. Hebergement haute disponibilite, CI/CD, monitoring et securite - nous optimiserons vos systemes pour plus de performance et de fiabilite.',
            icon: 'solar:cloud-linear',
            color: 'purple'
        },
        'full-package': {
            title: 'Pack Complet RVX',
            desc: 'Votre projet necessite une approche globale. Nous vous proposons notre pack complet combinant developpement, strategie, IA et infrastructure pour un resultat optimal de bout en bout.',
            icon: 'solar:star-shine-linear',
            color: 'indigo'
        }
    };

    let currentStep = 0;
    let answers = {};

    const questionEl = document.getElementById('faq-question');
    const optionsEl = document.getElementById('faq-options');
    const progressEl = document.getElementById('faq-progress');
    const stepLabel = document.getElementById('faq-step-label');
    const percentEl = document.getElementById('faq-percent');
    const prevBtn = document.getElementById('faq-prev');
    const nextBtn = document.getElementById('faq-next');
    const questionArea = document.getElementById('faq-question-area');
    const resultArea = document.getElementById('faq-result');
    const resultIcon = document.getElementById('faq-result-icon');
    const resultTitle = document.getElementById('faq-result-title');
    const resultDesc = document.getElementById('faq-result-desc');
    const restartBtn = document.getElementById('faq-restart');
    const navArea = document.getElementById('faq-nav');

    function renderQuestion() {
        const q = questions[currentStep];
        questionEl.textContent = q.question;
        optionsEl.innerHTML = '';

        q.options.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'faq-option p-4 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-4';
            if (answers[q.id] === opt.value) {
                div.classList.add('selected');
            }
            div.innerHTML = `
                <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 shrink-0">
                    <iconify-icon icon="${opt.icon}" style="font-size: 1.25rem;"></iconify-icon>
                </div>
                <span class="text-sm font-medium text-neutral-200">${opt.label}</span>
            `;
            div.addEventListener('click', () => {
                answers[q.id] = opt.value;
                optionsEl.querySelectorAll('.faq-option').forEach(o => o.classList.remove('selected'));
                div.classList.add('selected');
                nextBtn.disabled = false;

                // Auto-advance after a short delay
                if (currentStep < questions.length - 1) {
                    setTimeout(() => {
                        currentStep++;
                        renderQuestion();
                        updateProgress();
                    }, 300);
                } else {
                    setTimeout(() => showResult(), 300);
                }
            });
            optionsEl.appendChild(div);
        });

        prevBtn.disabled = currentStep === 0;
        nextBtn.disabled = !answers[q.id];
        updateProgress();
    }

    function updateProgress() {
        const progress = ((currentStep) / questions.length) * 100;
        progressEl.style.width = progress + '%';
        stepLabel.textContent = `Question ${currentStep + 1} / ${questions.length}`;
        percentEl.textContent = Math.round(progress) + '%';
    }

    function determineService() {
        const goal = answers.goal;
        const stage = answers.stage;
        const budget = answers.budget;

        // Primary recommendation based on goal
        if (goal === 'web') {
            if (budget === 'enterprise' || (budget === 'large' && stage === 'scratch')) {
                return 'full-package';
            }
            return 'web-dev';
        }
        if (goal === 'visibility') {
            return 'strategy';
        }
        if (goal === 'ai') {
            if (budget === 'enterprise') return 'full-package';
            return 'ai-solutions';
        }
        if (goal === 'infra') {
            if (budget === 'enterprise' && stage === 'scratch') return 'full-package';
            return 'cloud-infra';
        }

        return 'full-package';
    }

    function showResult() {
        const serviceKey = determineService();
        const service = services[serviceKey];

        questionArea.classList.add('hidden');
        navArea.classList.add('hidden');
        resultArea.classList.remove('hidden');

        const colorMap = {
            indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
            cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
            emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
            purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' }
        };

        const colors = colorMap[service.color] || colorMap.indigo;
        resultIcon.className = `w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${colors.bg} border ${colors.border} ${colors.text}`;
        resultIcon.innerHTML = `<iconify-icon icon="${service.icon}" style="font-size: 2rem;"></iconify-icon>`;
        resultTitle.textContent = service.title;
        resultDesc.textContent = service.desc;

        // Update progress to 100%
        progressEl.style.width = '100%';
        stepLabel.textContent = 'Resultat';
        percentEl.textContent = '100%';
    }

    // Navigation
    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            renderQuestion();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentStep < questions.length - 1) {
            currentStep++;
            renderQuestion();
        } else {
            showResult();
        }
    });

    restartBtn.addEventListener('click', () => {
        currentStep = 0;
        answers = {};
        questionArea.classList.remove('hidden');
        navArea.classList.remove('hidden');
        resultArea.classList.add('hidden');
        renderQuestion();
    });

    // Initialize
    renderQuestion();
}
