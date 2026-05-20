/**
 * ============================================================
 * COMPOSABLE: useAnimations
 * src/composables/useAnimations.js
 *
 * Centraliza las animaciones GSAP de HomeTab.
 *
 * POLÍTICA DE USO:
 *   - useAnimations → timelines, stagger, countUp, ScrollTrigger.
 *   - CSS puro (animations.css) → hover, focus, transiciones simples.
 *   - Vue <Transition> → aparición/desaparición de elementos v-if/v-show.
 *
 * DEPENDENCIAS:
 *   - gsap (npm install gsap)
 *
 * ACCESIBILIDAD:
 *   Todas las funciones comprueban `prefers-reduced-motion`
 *   antes de ejecutar la animación. Si el usuario prefiere
 *   movimiento reducido, el elemento aparece sin animación.
 *
 * EJEMPLOS DE USO:
 *
 *   // En onMounted de LandingView:
 *   import { useAnimations } from '@/composables/useAnimations'
 *   const { fadeInUp, staggerFadeIn, popIn } = useAnimations()
 *
 *   onMounted(() => {
 *     fadeInUp('.hero-title')
 *     staggerFadeIn('.feature-card', { delay: 0.2 })
 *   })
 * ============================================================
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Registrar plugins de GSAP que usamos
gsap.registerPlugin(ScrollTrigger)

/**
 * Detecta si el usuario prefiere movimiento reducido.
 * @returns {boolean}
 */
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useAnimations() {

  // ──────────────────────────────────────────────
  // ANIMACIONES DE ENTRADA
  // ──────────────────────────────────────────────

  /**
   * Fade in con movimiento sutil desde abajo.
   * Ideal para secciones y contenedores al montar.
   *
   * @param {string|Element} target - Selector CSS o elemento DOM
   * @param {Object} opts - Opciones adicionales de GSAP
   */
  const fadeInUp = (target, opts = {}) => {
    if (prefersReducedMotion()) return gsap.set(target, { opacity: 1 })
    return gsap.from(target, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      ease: 'power2.out',
      ...opts
    })
  }

  /**
   * Pop in rebotón — para tarjetas y modales.
   * Escala desde 0.85 con un pequeño bounce.
   *
   * @param {string|Element} target
   * @param {Object} opts
   */
  const popIn = (target, opts = {}) => {
    if (prefersReducedMotion()) return gsap.set(target, { opacity: 1 })
    return gsap.from(target, {
      opacity: 0,
      scale: 0.85,
      duration: 0.5,
      ease: 'back.out(1.7)',
      ...opts
    })
  }

  /**
   * Stagger fade in — para listas de elementos.
   * Cada elemento aparece con un pequeño retraso entre sí.
   *
   * @param {string|NodeList} targets - Selector CSS o NodeList
   * @param {Object} opts - stagger, delay, etc.
   */
  const staggerFadeIn = (targets, opts = {}) => {
    if (prefersReducedMotion()) return gsap.set(targets, { opacity: 1 })
    return gsap.from(targets, {
      opacity: 0,
      y: 20,
      duration: 0.45,
      stagger: 0.08,
      ease: 'power2.out',
      ...opts
    })
  }

  /**
   * Slide in desde la izquierda.
   * Para bloques de texto en secciones de features.
   *
   * @param {string|Element} target
   * @param {Object} opts
   */
  const slideInLeft = (target, opts = {}) => {
    if (prefersReducedMotion()) return gsap.set(target, { opacity: 1 })
    return gsap.from(target, {
      opacity: 0,
      x: -30,
      duration: 0.55,
      ease: 'power2.out',
      ...opts
    })
  }

  /**
   * Slide in desde la derecha.
   * Para los post-its en secciones de features.
   *
   * @param {string|Element} target
   * @param {Object} opts
   */
  const slideInRight = (target, opts = {}) => {
    if (prefersReducedMotion()) return gsap.set(target, { opacity: 1 })
    return gsap.from(target, {
      opacity: 0,
      x: 30,
      duration: 0.55,
      ease: 'power2.out',
      ...opts
    })
  }

  // ──────────────────────────────────────────────
  // ANIMACIONES DE SCROLL (ScrollTrigger)
  // ──────────────────────────────────────────────

  /**
   * Anima un elemento cuando entra en el viewport (scroll).
   * Ideal para los feature blocks de LandingView.
   *
   * @param {string|Element} target
   * @param {Object} animProps - Props de gsap.from()
   * @param {Object} triggerOpts - Opciones de ScrollTrigger
   */
  const onScroll = (target, animProps = {}, triggerOpts = {}) => {
    if (prefersReducedMotion()) return gsap.set(target, { opacity: 1 })
    return gsap.from(target, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: 'power2.out',
      ...animProps,
      scrollTrigger: {
        trigger: target,
        start: 'top 85%',
        toggleActions: 'play none none none',
        ...triggerOpts
      }
    })
  }

  /**
   * Anima un grupo de elementos al entrar en scroll (stagger).
   *
   * @param {string|NodeList} targets
   * @param {Object} opts
   */
  const staggerOnScroll = (targets, opts = {}) => {
    if (prefersReducedMotion()) return gsap.set(targets, { opacity: 1 })
    const el = typeof targets === 'string' ? document.querySelectorAll(targets) : targets
    el.forEach((item, i) => {
      gsap.from(item, {
        opacity: 0,
        y: 25,
        duration: 0.5,
        ease: 'power2.out',
        delay: i * 0.08,
        scrollTrigger: {
          trigger: item,
          start: 'top 88%',
          toggleActions: 'play none none none',
          ...opts.trigger
        }
      })
    })
  }

  // ──────────────────────────────────────────────
  // ANIMACIONES DE DATOS
  // ──────────────────────────────────────────────

  /**
   * Anima un número desde 0 hasta el valor objetivo.
   * Para los "big numbers" del DashboardTab.
   *
   * @param {Element} el - Elemento DOM donde se muestra el número
   * @param {number} endValue - Valor final
   * @param {Object} opts - duration, ease, etc.
   */
  const countUp = (el, endValue, opts = {}) => {
    if (prefersReducedMotion() || !el) {
      if (el) el.textContent = endValue
      return
    }
    const counter = { value: 0 }
    gsap.to(counter, {
      value: endValue,
      duration: 1.2,
      ease: 'power1.out',
      onUpdate: () => { el.textContent = Math.round(counter.value) },
      ...opts
    })
  }

  /**
   * Anima una barra de progreso de 0% al valor objetivo.
   * Para las barras de progreso del DashboardTab.
   *
   * @param {Element} el - Elemento DOM de la barra (la barra fill)
   * @param {number} percent - Porcentaje final (0-100)
   */
  const animateProgress = (el, percent) => {
    if (!el) return
    if (prefersReducedMotion()) {
      el.style.width = `${percent}%`
      return
    }
    gsap.fromTo(el,
      { width: '0%' },
      { width: `${percent}%`, duration: 1.2, ease: 'power2.out', delay: 0.3 }
    )
  }

  // ──────────────────────────────────────────────
  // UTILIDADES
  // ──────────────────────────────────────────────

  /**
   * Limpia todos los ScrollTriggers.
   * Llamar en onUnmounted para evitar memory leaks.
   */
  const killScrollTriggers = () => {
    ScrollTrigger.getAll().forEach(t => t.kill())
  }

  return {
    // Entrada
    fadeInUp,
    popIn,
    staggerFadeIn,
    slideInLeft,
    slideInRight,
    // Scroll
    onScroll,
    staggerOnScroll,
    // Datos
    countUp,
    animateProgress,
    // Utils
    killScrollTriggers,
    // gsap raw (para timelines avanzadas)
    gsap,
    ScrollTrigger
  }
}
