/* ============================================
   RVOLUTION X — faq-smart.js
   Smart service recommender widget
   ============================================ */

const SERVICES = {
  image: {
    tag: 'Image de Marque',
    title: 'Développement de votre image de marque',
    messages: {
      hospital: `En tant que chirurgien encore à l'hôpital, <strong>votre image en ligne est votre première vitrine privée</strong>. Construire une présence cohérente maintenant vous donnera une longueur d'avance décisive au moment de votre transition. Commençons par un audit de votre visibilité actuelle.`,
      liberal: `En libéral, <strong>votre image est votre différenciateur principal</strong>. Les patients font leur choix en moins de 30 secondes sur votre site. Un positionnement clair et une présence soignée peuvent transformer votre taux de conversion significativement.`,
      transition: `Votre moment de transition est le meilleur pour <strong>redéfinir votre image de marque</strong>. Repartir d'une base claire, cohérente et professionnelle plutôt que de faire évoluer quelque chose de bancal — c'est ce que nous ferons ensemble.`,
    }
  },
  organisation: {
    tag: 'Organisation',
    title: "Audit de votre organisation et gestion du temps",
    messages: {
      hospital: `Avant de passer en libéral, <strong>poser les bases d'une organisation solide est crucial</strong>. Les chirurgiens qui structurent leurs processus avant la transition perdent 60% moins de temps dans les premières années. Voyons ensemble comment vous y préparer.`,
      liberal: `En libéral, <strong>le temps perdu est du revenu perdu</strong>. 1 à 2 heures par jour en tâches non optimisées représentent jusqu'à 15 000 € de manque à gagner annuel. L'audit identifie précisément où vous perdez du temps — et comment le récupérer.`,
      transition: `La transition est le moment idéal pour <strong>ne pas reproduire les mauvaises habitudes hospitalières</strong>. On construit ensemble une organisation adaptée à la pratique libérale, agile et scalable.`,
    }
  },
  acquisition: {
    tag: 'Acquisition Patient',
    title: "Définition d'une stratégie d'acquisition patient",
    messages: {
      hospital: `Commencer à réfléchir à votre acquisition patient <strong>avant de passer en libéral est une décision stratégique</strong>. Les chirurgiens qui anticipent ce travail arrivent avec un flux de patients déjà amorcé. Ne partez pas de zéro.`,
      liberal: `<strong>70% des chirurgiens en libéral ne savent pas combien leur coûte réellement un patient</strong>. Sans cette donnée, vous naviguez à l'aveugle. L'audit posera les bases d'une stratégie mesurable, rentable et indépendante du bouche-à-oreille.`,
      transition: `La transition est votre fenêtre d'opportunité pour <strong>construire votre pipeline patient dès le premier jour</strong>. Stratégie de contenu, présence locale, référencement — on définit ensemble les leviers adaptés à votre spécialité.`,
    }
  },
  unknown: {
    tag: 'Audit Complet',
    title: "Audit stratégique personnalisé",
    messages: {
      hospital: `Pas de problème — c'est précisément l'objectif de l'audit. <strong>En 45 minutes, on identifie ensemble vos véritables priorités</strong> et les leviers les plus impactants pour votre situation spécifique, avant même votre transition.`,
      liberal: `C'est exactement pour ça que l'audit existe. <strong>Un regard extérieur et structuré permet souvent de voir des opportunités invisibles de l'intérieur.</strong> On fait le point ensemble, sans jargon, sans engagement.`,
      transition: `<strong>La transition est un moment riche en questions — c'est normal.</strong> L'audit est conçu pour vous aider à prioriser, clarifier et poser les bases d'une activité libérale qui vous ressemble vraiment.`,
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {

  let step = 1;
  let selectedDefi = null;
  let selectedEtape = null;

  const steps      = document.querySelectorAll('.finder-step');
  const stepDots   = document.querySelectorAll('.finder-step-dot');
  const result     = document.getElementById('finder-result');
  const resetBtn   = document.getElementById('finder-reset');
  const finderQ    = document.getElementById('finder-question');
  const finderOpts = document.getElementById('finder-options');

  function updateStepDots() {
    stepDots.forEach((dot, i) => {
      dot.classList.remove('active', 'done');
      if (i + 1 < step) dot.classList.add('done');
      if (i + 1 === step) dot.classList.add('active');
    });
  }

  function showStep(n) {
    step = n;
    updateStepDots();
    document.querySelectorAll('.finder-step').forEach(s => s.style.display = 'none');
    const current = document.querySelector(`.finder-step[data-step="${n}"]`);
    if (current) current.style.display = 'block';
  }

  function showResult() {
    // Hide steps
    document.querySelectorAll('.finder-step').forEach(s => s.style.display = 'none');
    stepDots.forEach(dot => { dot.classList.remove('active'); dot.classList.add('done'); });

    const service = SERVICES[selectedDefi] || SERVICES.unknown;
    const etapeKey = selectedEtape || 'liberal';
    const message  = service.messages[etapeKey] || service.messages.liberal;

    document.getElementById('result-tag').textContent     = service.tag;
    document.getElementById('result-title').textContent   = service.title;
    document.getElementById('result-message').innerHTML   = message;

    result.classList.add('visible');
  }

  // Step 1 options click
  document.querySelectorAll('[data-defi]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDefi = btn.dataset.defi;
      document.querySelectorAll('[data-defi]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      setTimeout(() => showStep(2), 300);
    });
  });

  // Step 2 options click
  document.querySelectorAll('[data-etape]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedEtape = btn.dataset.etape;
      document.querySelectorAll('[data-etape]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      setTimeout(() => showResult(), 300);
    });
  });

  // Reset
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      selectedDefi = null;
      selectedEtape = null;
      result.classList.remove('visible');
      document.querySelectorAll('.finder-option').forEach(b => b.classList.remove('selected'));
      showStep(1);
    });
  }

  // Init
  showStep(1);
});
