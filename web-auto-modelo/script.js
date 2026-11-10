/**
 * BOCHO DRIVE · Quito, Ecuador
 * Motor de secuencia de fotogramas en Canvas + Scrollytelling interactivo
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. CONFIGURACIÓN DEL CANVAS Y SECUENCIA DE IMÁGENES
  // ==========================================================================
  const TOTAL_FRAMES = 143;
  const tourTrack = document.getElementById('recorrido');
  const canvas = document.getElementById('tour-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const progressFill = document.getElementById('tour-progress-fill');
  const stepBadge = document.getElementById('tour-step-badge');
  const stories = document.querySelectorAll('.tour-story');

  const frameCache = new Array(TOTAL_FRAMES + 1);
  let loadedCount = 0;
  let currentDrawnIndex = 1;
  let targetFrameIndex = 1;
  let currentLerpedIndex = 1;
  let isCanvasInView = false;
  let isTicking = false;

  function getFramePath(index) {
    const padded = String(index).padStart(4, '0');
    return `media/frames/frame_${padded}.webp`;
  }

  // Pre-cargar fotogramas
  function initFrames() {
    if (!canvas || !ctx) return;

    // Cargar frame 1 prioritario
    const firstImg = new Image();
    firstImg.src = getFramePath(1);
    firstImg.onload = () => {
      frameCache[1] = firstImg;
      loadedCount++;
      resizeCanvas();
      drawFrame(1);
    };

    // Iniciar precarga del resto en segundo plano inmediatamente
    for (let i = 2; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        frameCache[i] = img;
        loadedCount++;
        // Si el fotograma que acaba de cargar coincide con el actual, repintar
        if (Math.round(currentLerpedIndex) === i) {
          drawFrame(i);
        }
      };
    }
  }

  // Ajuste responsive de resolución en Canvas manteniendo nitidez (HiDPI)
  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();

    const w = Math.round((rect.width || window.innerWidth) * dpr);
    const h = Math.round((rect.height || window.innerHeight) * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    drawFrame(Math.round(currentDrawnIndex));
  }

  // Dibujar fotograma con ajuste "cover" sin distorsión
  function drawFrame(frameIndex) {
    if (!ctx || !canvas) return;

    // Buscar el fotograma solicitado o el más cercano disponible en toda la caché
    let img = frameCache[frameIndex];
    if (!img || !img.complete) {
      for (let i = frameIndex - 1; i >= 1; i--) {
        if (frameCache[i] && frameCache[i].complete) {
          img = frameCache[i];
          break;
        }
      }
      if (!img) {
        for (let i = frameIndex + 1; i <= TOTAL_FRAMES; i++) {
          if (frameCache[i] && frameCache[i].complete) {
            img = frameCache[i];
            break;
          }
        }
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) return;

    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let renderW, renderH, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      renderW = canvas.width;
      renderH = canvas.width / imgRatio;
      offsetX = 0;
      offsetY = (canvas.height - renderH) / 2;
    } else {
      renderH = canvas.height;
      renderW = canvas.height * imgRatio;
      offsetX = (canvas.width - renderW) / 2;
      offsetY = 0;
    }

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
    currentDrawnIndex = frameIndex;
  }

  // ==========================================================================
  // 2. CÁLCULO DE PROGRESO DE SCROLL Y TRANSICIÓN DE HISTORIAS
  // ==========================================================================
  const STORY_WINDOWS = [
    { start: 0.00, end: 0.25, title: 'ETAPA 01 / 04' },
    { start: 0.25, end: 0.50, title: 'ETAPA 02 / 04' },
    { start: 0.50, end: 0.75, title: 'ETAPA 03 / 04' },
    { start: 0.75, end: 1.01, title: 'ETAPA 04 / 04' }
  ];

  function onScroll() {
    if (!tourTrack) return;

    const rect = tourTrack.getBoundingClientRect();
    const scrollDistance = tourTrack.offsetHeight - window.innerHeight;

    if (scrollDistance <= 0) return;

    // Progreso normalizado entre 0.0 y 1.0
    const progress = Math.min(1, Math.max(0, -rect.top / scrollDistance));

    // Mapeo a índice de fotograma (1 a TOTAL_FRAMES)
    targetFrameIndex = Math.min(
      TOTAL_FRAMES,
      Math.max(1, Math.round(progress * (TOTAL_FRAMES - 1)) + 1)
    );

    // Barra de progreso inferior
    if (progressFill) {
      progressFill.style.width = `${(progress * 100).toFixed(1)}%`;
    }

    // Actualizar historias activas con transiciones suaves
    let activeIndex = -1;
    STORY_WINDOWS.forEach((win, idx) => {
      if (progress >= win.start && progress <= win.end) {
        activeIndex = idx;
      }
    });

    stories.forEach((story, idx) => {
      if (idx === activeIndex) {
        story.classList.add('is-active');
      } else {
        story.classList.remove('is-active');
      }
    });

    if (stepBadge && activeIndex !== -1) {
      stepBadge.textContent = STORY_WINDOWS[activeIndex].title;
    }

    requestTick();
  }

  function requestTick() {
    if (!isTicking) {
      isTicking = true;
      requestAnimationFrame(updateLoop);
    }
  }

  // Bucle de animación con interpolación suave (lerp)
  function updateLoop() {
    isTicking = false;

    // Suavizado cinemático
    const diff = targetFrameIndex - currentLerpedIndex;
    if (Math.abs(diff) > 0.05) {
      currentLerpedIndex += diff * 0.18;
      const targetInt = Math.round(currentLerpedIndex);
      if (targetInt !== currentDrawnIndex) {
        drawFrame(targetInt);
      }
      requestTick();
    } else {
      currentLerpedIndex = targetFrameIndex;
      const targetInt = Math.round(currentLerpedIndex);
      if (targetInt !== currentDrawnIndex) {
        drawFrame(targetInt);
      }
    }
  }

  // ==========================================================================
  // 3. CONTROL DEL VIDEO HERO Y ACCESIBILIDAD
  // ==========================================================================
  const heroVideo = document.getElementById('hero-video');
  const heroElement = document.getElementById('hero');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let isHeroIntersecting = true;

  function syncHeroVideo() {
    if (!heroVideo) return;

    if (motionQuery.matches) {
      if (!heroVideo.paused) heroVideo.pause();
      return;
    }

    if (document.hidden || !isHeroIntersecting) {
      if (!heroVideo.paused) heroVideo.pause();
      return;
    }

    const playPromise = heroVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  }

  if ('IntersectionObserver' in window) {
    // Observer para pausar el video hero cuando esté fuera de pantalla
    if (heroElement || heroVideo) {
      const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          isHeroIntersecting = entry.isIntersecting;
          syncHeroVideo();
        });
      }, { threshold: 0.1 });
      heroObserver.observe(heroElement || heroVideo);
    }

    // Observer para activar el render del canvas solo cuando el recorrido esté visible
    if (tourTrack) {
      const tourObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          isCanvasInView = entry.isIntersecting;
          if (isCanvasInView) {
            onScroll();
          }
        });
      }, { threshold: 0.02 });
      tourObserver.observe(tourTrack);
    }
  }

  // Escucha de preferencias de movimiento y visibilidad
  if (motionQuery.addEventListener) {
    motionQuery.addEventListener('change', syncHeroVideo);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(syncHeroVideo);
  }

  document.addEventListener('visibilitychange', () => {
    syncHeroVideo();
    if (!document.hidden && isCanvasInView) {
      onScroll();
    }
  });

  // Eventos de scroll y resize
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    resizeCanvas();
    onScroll();
  }, { passive: true });

  // ==========================================================================
  // 4. SELECTOR DE EXPERIENCIA Y PAISAJE INTERACTIVO EN THREE.JS
  // ==========================================================================
  const routeForm = document.getElementById('route-picker-form');
  const routeSceneContainer = document.getElementById('route-scene-container');
  const routeSceneCanvas = document.getElementById('route-scene-canvas');
  const routeSceneStatus = document.getElementById('route-scene-status');
  const routeDetails = {
    volcanes: {
      index: 'RUTA 01',
      name: 'Volcanes',
      description: 'Sigue vías abiertas al tránsito hasta los miradores habilitados del Cotopaxi y el Pichincha. Una ruta de altura, siempre de acuerdo con las indicaciones locales.',
      label: 'VOLCANES',
      sky: 0xc9d9dd,
      ground: 0x91836d,
      terrain: 0x77775f,
      mountains: [
        [-5.2, -5.3, 2.8, 4.2],
        [-1.4, -6.4, 3.2, 5.7],
        [3.1, -5.7, 2.8, 4.7],
        [6.3, -7, 3.2, 5.2]
      ],
      snow: true
    },
    lagunas: {
      index: 'RUTA 02',
      name: 'Lagunas',
      description: 'Llega por accesos permitidos a miradores de aguas turquesa, islas y páramo. Un paseo para detenerse solo en lugares habilitados y seguros.',
      label: 'LAGUNAS',
      sky: 0xb9d3d4,
      ground: 0x899178,
      terrain: 0x70765e,
      mountains: [
        [-5.2, -6.2, 3.3, 4.2],
        [-1.4, -7.2, 3.5, 5],
        [4.1, -6, 3.1, 4.4]
      ],
      lake: true
    },
    atardecer: {
      index: 'RUTA 03',
      name: 'Atardecer',
      description: 'Visita miradores habilitados cuando la luz baja y pinta la cordillera de cobre. Un recorrido tranquilo por vías abiertas para cerrar el día entre montañas.',
      label: 'ATARDECER',
      sky: 0xc98769,
      ground: 0x725e56,
      terrain: 0x534b47,
      mountains: [
        [-5.4, -6.2, 3.2, 4],
        [-1.3, -7.2, 3.4, 4.7],
        [4.3, -6.1, 3.1, 4.3]
      ],
      sunset: true
    }
  };
  const routeInputs = routeForm
    ? routeForm.querySelectorAll('input[name="experiencia"]')
    : [];
  const routeIndex = document.getElementById('route-detail-index');
  const routeTitle = document.getElementById('route-detail-title');
  const routeCopy = document.getElementById('route-detail-copy');
  const selectedExperience = document.getElementById('selected-experience');
  const routeSelectionValue = document.getElementById('route-selection-value');
  const consultForm = document.getElementById('consult-form');
  const consultDate = document.getElementById('consult-date');
  const consultPeople = document.getElementById('consult-people');
  const consultMessage = document.getElementById('consult-message');
  const consultStatus = document.getElementById('consult-status');
  const consultRouteLabel = document.getElementById('consult-route-label');
  const consultRouteValue = document.getElementById('consult-route-value');
  const copyConsultButton = document.getElementById('copy-consult-message');
  let activeRoute = 'volcanes';
  let landscapeGroup = null;
  let landscapeRenderer = null;
  let landscapeCamera = null;
  let landscapeScene = null;
  let THREE = null;

  function updateConsultMessage() {
    const route = routeDetails[activeRoute];
    if (!route || !consultMessage) return;

    if (consultRouteLabel) consultRouteLabel.textContent = route.label;
    if (consultRouteValue) consultRouteValue.value = activeRoute;

    if (!consultDate || !consultDate.value || !consultPeople || !consultPeople.value) {
      consultMessage.value = '';
      if (copyConsultButton) copyConsultButton.disabled = true;
      if (consultStatus) consultStatus.textContent = 'Completa la fecha y el número de personas para preparar el mensaje.';
      return;
    }

    const date = new Date(`${consultDate.value}T12:00:00-05:00`);
    const formattedDate = new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'long',
      timeZone: 'America/Guayaquil'
    }).format(date);
    consultMessage.value = [
      'Hola, quisiera consultar por un paseo de Bocho Drive.',
      '',
      `Fecha tentativa: ${formattedDate}`,
      `Número de personas: ${consultPeople.value}`,
      `Experiencia elegida: ${route.name}`,
      '',
      '¿Me pueden confirmar la disponibilidad y ayudarme a coordinar un recorrido por vías y accesos autorizados? ¡Gracias!'
    ].join('\n');

    if (copyConsultButton) {
      copyConsultButton.disabled = !consultForm || !consultForm.checkValidity();
    }
    if (consultStatus) consultStatus.textContent = 'Mensaje listo. Puedes copiarlo para enviarlo.';
  }

  if (consultDate) {
    const today = new Date();
    const localDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('-');
    consultDate.min = localDate;
  }

  if (consultDate) consultDate.addEventListener('input', updateConsultMessage);
  if (consultPeople) consultPeople.addEventListener('input', updateConsultMessage);

  if (consultForm && consultMessage) {
    consultForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!consultForm.reportValidity()) return;

      updateConsultMessage();
      try {
        await navigator.clipboard.writeText(consultMessage.value);
        if (consultStatus) consultStatus.textContent = 'Mensaje copiado. Ya puedes pegarlo donde quieras enviarlo.';
      } catch (error) {
        console.error('No se pudo copiar el mensaje de consulta.', error);
        consultMessage.focus();
        consultMessage.select();
        const copied = document.execCommand('copy');
        if (consultStatus) {
          consultStatus.textContent = copied
            ? 'Mensaje copiado. Ya puedes pegarlo donde quieras enviarlo.'
            : 'No se pudo copiar automáticamente. El mensaje está seleccionado para que lo copies manualmente.';
        }
      }
    });
  }

  function setSelectedRoute(routeKey) {
    const route = routeDetails[routeKey];
    if (!route) return;

    activeRoute = routeKey;
    if (routeIndex) routeIndex.textContent = route.index;
    if (routeTitle) routeTitle.textContent = route.name;
    if (routeCopy) routeCopy.textContent = route.description;
    if (selectedExperience) selectedExperience.value = routeKey;
    if (routeSelectionValue) routeSelectionValue.textContent = route.label;
    updateConsultMessage();
    if (routeSceneContainer) {
      Object.keys(routeDetails).forEach((key) => routeSceneContainer.classList.remove(`route-${key}`));
      routeSceneContainer.classList.add(`route-${routeKey}`);
    }

    try {
      window.sessionStorage.setItem('bocho-drive-experience', routeKey);
    } catch (error) {
      console.error('No se pudo guardar la experiencia elegida para esta sesión.', error);
    }

    if (landscapeScene) renderLandscape(routeKey);
  }

  function renderLandscape(routeKey) {
    const route = routeDetails[routeKey];
    if (!route || !landscapeGroup || !landscapeScene || !landscapeRenderer) return;

    while (landscapeGroup.children.length) {
      const object = landscapeGroup.children[0];
      landscapeGroup.remove(object);
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    }

    landscapeScene.background.setHex(route.sky);
    landscapeScene.fog.color.setHex(route.sky);

    const terrainGeometry = new THREE.PlaneGeometry(42, 34, 64, 48);
    const terrainPositions = terrainGeometry.attributes.position;
    for (let i = 0; i < terrainPositions.count; i++) {
      const x = terrainPositions.getX(i);
      const z = terrainPositions.getY(i);
      const height = Math.sin(x * 0.25) * Math.cos(z * 0.22) * 0.13;
      terrainPositions.setZ(i, -height);
    }
    terrainGeometry.computeVertexNormals();
    terrainGeometry.rotateX(-Math.PI / 2);
    const terrain = new THREE.Mesh(
      terrainGeometry,
      new THREE.MeshStandardMaterial({ color: route.terrain, roughness: 1 })
    );
    terrain.position.y = -0.1;
    landscapeGroup.add(terrain);

    route.mountains.forEach(([x, z, radius, height], index) => {
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 9),
        new THREE.MeshStandardMaterial({
          color: route.ground,
          roughness: 0.96,
          flatShading: true
        })
      );
      mountain.position.set(x, height / 2 - 0.04, z);
      mountain.rotation.y = index * 0.34;
      landscapeGroup.add(mountain);

      if (route.snow && index < 3) {
        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(radius * 0.32, height * 0.2, 9),
          new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.85, flatShading: true })
        );
        cap.position.set(x, height * 0.84, z);
        cap.rotation.y = mountain.rotation.y;
        landscapeGroup.add(cap);
      }
    });

    if (route.lake) {
      const lake = new THREE.Mesh(
        new THREE.CircleGeometry(2.65, 48),
        new THREE.MeshStandardMaterial({
          color: 0x6bb9b4,
          roughness: 0.28,
          metalness: 0.08
        })
      );
      lake.rotation.x = -Math.PI / 2;
      lake.scale.set(1.35, 1, 0.72);
      lake.position.set(0, 0.16, -2.7);
      landscapeGroup.add(lake);

      const island = new THREE.Mesh(
        new THREE.ConeGeometry(0.65, 0.75, 8),
        new THREE.MeshStandardMaterial({ color: 0x78775d, roughness: 1, flatShading: true })
      );
      island.position.set(0.15, 0.44, -2.55);
      landscapeGroup.add(island);
    }

    if (route.sunset) {
      const sun = new THREE.Mesh(
        new THREE.SphereGeometry(0.82, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0xffc17b })
      );
      sun.position.set(3.5, 3.5, -8);
      landscapeGroup.add(sun);
    }

    landscapeRenderer.render(landscapeScene, landscapeCamera);
  }

  async function initializeRouteScene() {
    if (!routeSceneCanvas || !routeSceneContainer) return;

    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
    landscapeScene = new THREE.Scene();
    landscapeScene.fog = new THREE.Fog(0xc9d9dd, 14, 32);
    landscapeCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    landscapeCamera.position.set(0, 5.4, 12.5);
    landscapeCamera.lookAt(0, 1.15, -1.5);
    landscapeRenderer = new THREE.WebGLRenderer({
      canvas: routeSceneCanvas,
      antialias: true,
      powerPreference: 'low-power'
    });
    landscapeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    landscapeRenderer.outputColorSpace = THREE.SRGBColorSpace;
    landscapeRenderer.toneMapping = THREE.ACESFilmicToneMapping;

    landscapeScene.add(new THREE.AmbientLight(0xffffff, 1.45));
    const sunlight = new THREE.DirectionalLight(0xffefd7, 2.1);
    sunlight.position.set(-5, 9, 7);
    landscapeScene.add(sunlight);
    landscapeGroup = new THREE.Group();
    landscapeScene.add(landscapeGroup);

    function resizeRouteScene() {
      const bounds = routeSceneContainer.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      landscapeCamera.aspect = bounds.width / bounds.height;
      landscapeCamera.updateProjectionMatrix();
      landscapeRenderer.setSize(bounds.width, bounds.height, false);
      landscapeRenderer.render(landscapeScene, landscapeCamera);
    }

    const resizeObserver = new ResizeObserver(resizeRouteScene);
    resizeObserver.observe(routeSceneContainer);
    routeSceneContainer.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const bounds = routeSceneContainer.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      landscapeGroup.rotation.y = (x - 0.5) * 0.16;
      landscapeGroup.rotation.x = (y - 0.5) * -0.06;
      landscapeRenderer.render(landscapeScene, landscapeCamera);
    });
    routeSceneContainer.addEventListener('pointerleave', () => {
      landscapeGroup.rotation.set(0, 0, 0);
      landscapeRenderer.render(landscapeScene, landscapeCamera);
    });

    resizeRouteScene();
    renderLandscape(activeRoute);
    routeSceneContainer.classList.add('is-ready');
  }

  if (routeForm) {
    let savedRoute = null;
    try {
      savedRoute = window.sessionStorage.getItem('bocho-drive-experience');
    } catch (error) {
      console.error('No se pudo recuperar la experiencia guardada para esta sesión.', error);
    }

    if (savedRoute && routeDetails[savedRoute]) {
      const savedInput = Array.from(routeInputs).find((input) => input.value === savedRoute);
      if (savedInput) savedInput.checked = true;
      setSelectedRoute(savedRoute);
    }

    routeInputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) setSelectedRoute(input.value);
      });
    });

    initializeRouteScene().catch((error) => {
      console.error('No se pudo cargar el paisaje interactivo de Three.js.', error);
      routeSceneContainer.classList.add('is-fallback');
      if (routeSceneStatus) {
        routeSceneStatus.textContent = 'El paisaje 3D no está disponible, pero puedes elegir tu experiencia.';
      }
    });
  }
  updateConsultMessage();

  // ==========================================================================
  // INICIALIZACIÓN
  // ==========================================================================
  initFrames();
  syncHeroVideo();
  onScroll();

  // Soporte para pruebas de scroll mediante parámetro de URL (?scroll=1200)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('scroll')) {
      const scrollY = parseInt(params.get('scroll'), 10);
      if (!isNaN(scrollY)) {
        setTimeout(() => {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
          onScroll();
          currentLerpedIndex = targetFrameIndex;
          drawFrame(targetFrameIndex);
        }, 100);
      }
    }
  } catch (e) {}
})();
