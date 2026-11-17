import './style.css';
import './process.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setupRoute } from './process-route.js';
import { setupProcessEntry } from './process-entry.js';
import {
  createScrollGesture,
  createRouteTransition,
  createFastScroll,
} from './process-scroll.js';

gsap.registerPlugin(ScrollTrigger);

const truck = document.querySelector('.delivery-truck');
const ride = document.querySelector('.ride');
const stage = document.querySelector('.ride-stage');
const panels = [...document.querySelectorAll('.ride-panel')];
const controls = [...document.querySelectorAll('[data-ride-stop]')];
const rideTruck = document.querySelector('.ride-truck');
rideTruck.append(truck.querySelector('svg').cloneNode(true));

gsap.matchMedia().add(
  {
    mobile: '(max-width: 640px)',
    reducedMotion: '(prefers-reduced-motion: reduce)',
    desktop: '(min-width: 641px)',
  },
  ({ conditions: { mobile, reducedMotion } }) => {
    const routes = [...document.querySelectorAll('.route-demo')];
    const cleanups = [];
    if (reducedMotion) {
      routes.forEach((root) =>
        cleanups.push(setupRoute(root, { mobile, reducedMotion })),
      );
      return () => cleanups.forEach((cleanup) => cleanup());
    }

    ride.classList.add('is-animated');
    const leadIn = 0.8;
    const totalDuration = leadIn + 4;
    let current = -1;
    let requested = -1;
    let playback;
    const sceneTransition = createRouteTransition();
    const scrollGesture = createScrollGesture();
    const fastScroll = createFastScroll();
    const timeline = gsap.timeline({ paused: true });
    const locations = [...document.querySelectorAll('.ride-location')];
    const cargo = [...document.querySelectorAll('.cargo-item')];
    gsap.set(locations.slice(1), { autoAlpha: 0, x: mobile ? 140 : 340 });
    gsap.set(panels, { autoAlpha: 0, y: 24 });
    gsap.set('.ride-landscape', { autoAlpha: 0 });
    gsap.set(rideTruck, { autoAlpha: 0, x: -110 });
    gsap.set(locations[0], { autoAlpha: 0, y: 12 });
    timeline.to('.ride-start-hint', { autoAlpha: 0, duration: 0.18 }, 0.2);
    timeline.to('.ride-landscape', { autoAlpha: 1, duration: 0.35 }, 0.25);
    timeline.to(panels[0], { autoAlpha: 1, y: 0, duration: 0.3 }, 0.3);
    timeline.to(
      rideTruck,
      { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power1.out' },
      0.35,
    );
    timeline.to(locations[0], { autoAlpha: 1, y: 0, duration: 0.3 }, 0.5);
    panels.forEach((panel, index) => {
      const at = leadIn + index;
      timeline.fromTo(
        cargo[index],
        {
          autoAlpha: 0,
          x: index === 0 ? (mobile ? 90 : 160) : 0,
          y: 45,
          scale: 0.9,
        },
        {
          autoAlpha: 1,
          x: 0,
          y: -38,
          scale: 1,
          duration: 0.25,
          ease: 'sine.inOut',
        },
        at + 0.25,
      );
      timeline.to(
        cargo[index],
        { y: -38, duration: 0.18, ease: 'none' },
        at + 0.4,
      );
      timeline.to(
        cargo[index],
        {
          autoAlpha: 0,
          x: index === 3 ? (mobile ? 90 : 160) : 0,
          y: 45,
          scale: 0.9,
          duration: 0.25,
          ease: 'sine.inOut',
        },
        at + 0.7,
      );
      if (index > 0) {
        timeline.to(
          rideTruck,
          { x: mobile ? 12 : 28, duration: 0.25, ease: 'sine.inOut' },
          at,
        );
        timeline.to(
          rideTruck,
          { x: 0, duration: 0.35, ease: 'sine.inOut' },
          at + 0.25,
        );
        timeline.to(
          locations[index - 1],
          { autoAlpha: 0, x: mobile ? -160 : -360, duration: 0.35 },
          at,
        );
        timeline.to(
          locations[index],
          { autoAlpha: 1, x: 0, duration: 0.35 },
          at + 0.02,
        );
        timeline.to(
          panels[index - 1],
          { autoAlpha: 0, y: -24, duration: 0.16 },
          at,
        );
        timeline.to(panel, { autoAlpha: 1, y: 0, duration: 0.16 }, at + 0.05);
      }
    });

    timeline.to(
      '.ride-road-markings',
      { x: -1400, ease: 'none', duration: 4 },
      leadIn,
    );
    timeline.to(
      '.ride-progress-fill',
      { scaleX: 1, ease: 'none', duration: 4 },
      leadIn,
    );
    timeline.to(
      '.ride-backdrop',
      { xPercent: -16, duration: 4, ease: 'none' },
      leadIn,
    );
    panels.forEach((panel, index) => {
      panel.inert = true;
      panel.setAttribute('aria-hidden', 'true');
      controls[index].setAttribute('aria-pressed', 'false');
    });
    const playRequestedScene = (retarget = false) => {
      const destination =
        requested < 0
          ? 0
          : requested === 3
            ? totalDuration
            : leadIn + requested + 0.98;
      if (
        requested === current &&
        (sceneTransition.moving ||
          Math.abs(timeline.time() - destination) < 0.001)
      )
        return;
      if (sceneTransition.moving && !retarget) return;
      const run = sceneTransition.begin(true);
      playback?.kill();
      current = requested;
      panels.forEach((panel, index) => {
        panel.inert = index !== current;
        panel.setAttribute('aria-hidden', String(index !== current));
        controls[index].setAttribute('aria-pressed', String(index === current));
      });
      rideTruck.classList.add('is-driving');
      playback = timeline.tweenTo(destination, {
        duration: gsap.utils.clamp(
          1.4,
          3,
          Math.abs(destination - timeline.time()) / 0.85,
        ),
        ease: 'none',
        onComplete: () => {
          if (!sceneTransition.finish(run)) return;
          rideTruck.classList.remove('is-driving');
          playback = null;
          playRequestedScene();
        },
        onInterrupt: () => {
          if (!sceneTransition.finish(run)) return;
          playback = null;
          rideTruck.classList.remove('is-driving');
        },
      });
    };
    const requestScene = ({ progress, isActive }) => {
      // Ignore scroll callbacks left over from the navigation already in flight.
      if (sceneTransition.moving) return;
      const sceneTime = progress * totalDuration - leadIn;
      const index =
        sceneTime < -0.5 ? -1 : Math.min(3, Math.floor(Math.max(0, sceneTime)));
      requested = isActive ? Math.min(index, current + 1) : index;
      playRequestedScene();
    };
    const trigger = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: () => `+=${innerHeight * 3.6}`,
      pin: true,
      invalidateOnRefresh: true,
      onUpdate: requestScene,
      onRefresh: requestScene,
    });
    const onWheel = (event) => {
      if (
        !trigger.isActive ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      )
        return;
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (!delta) return;
      if (
        !sceneTransition.moving &&
        ((current === 3 && delta > 0) || (current < 0 && delta < 0))
      )
        return;
      if (!event.cancelable) return;
      event.preventDefault();
      const fast = fastScroll(delta, event.timeStamp);
      const sign = scrollGesture(delta, event.timeStamp);
      if (!sign && !fast) return;
      const next = fast
        ? delta > 0
          ? 3
          : -1
        : gsap.utils.clamp(-1, 3, requested + sign);
      if (next === requested) {
        if (fast) playback?.timeScale(3);
        return;
      }
      requested = next;
      playRequestedScene(true);
      if (fast) playback?.timeScale(3);
      window.scrollTo({
        top:
          next < 0
            ? trigger.start
            : trigger.start +
              ((leadIn + next + 0.5) / totalDuration) *
                (trigger.end - trigger.start),
        behavior: 'instant',
      });
      playRequestedScene();
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    const handlers = controls.map((button, index) => {
      const handler = () => {
        requested = index;
        playRequestedScene(true);
        window.scrollTo({
          top:
            trigger.start +
            ((leadIn + index + 0.5) / totalDuration) *
              (trigger.end - trigger.start),
          behavior: 'instant',
        });
      };
      button.addEventListener('click', handler);
      return handler;
    });

    // Measure both road sections after the middle concept adds its pin distance.
    routes.forEach((root) =>
      cleanups.push(setupRoute(root, { mobile, reducedMotion })),
    );
    ScrollTrigger.sort();
    ScrollTrigger.refresh();

    const routeEntry = (root) => {
      const journey = root.querySelector('.journey');
      const position = (fraction) =>
        scrollY +
        journey.getBoundingClientRect().top +
        journey.clientHeight * fraction -
        innerHeight * 0.52;
      return {
        start: () => Math.max(0, position(0.125)),
        end: () => position(0.875),
        cancel: () => root.dispatchEvent(new Event('process:cancel')),
        enter: (direction) =>
          root.dispatchEvent(
            new CustomEvent('process:enter', { detail: direction }),
          ),
      };
    };
    const stopEntry = setupProcessEntry([
      routeEntry(routes[0]),
      {
        start: () => trigger.start + 1,
        end: () => trigger.end - 1,
        cancel: () => {
          sceneTransition.cancel();
          playback?.kill();
          playback = null;
          rideTruck.classList.remove('is-driving');
        },
        enter: (direction) => {
          sceneTransition.cancel();
          playback?.kill();
          playback = null;
          current = requested = direction > 0 ? -1 : 3;
          timeline.pause(direction > 0 ? 0 : totalDuration);
          rideTruck.classList.remove('is-driving');
          panels.forEach((panel, index) => {
            panel.inert = index !== current;
            panel.setAttribute('aria-hidden', String(index !== current));
            controls[index].setAttribute(
              'aria-pressed',
              String(index === current),
            );
          });
        },
      },
      routeEntry(routes[1]),
    ]);

    return () => {
      stopEntry();
      cleanups.forEach((cleanup) => cleanup());
      sceneTransition.cancel();
      playback?.kill();
      window.removeEventListener('wheel', onWheel);
      ride.classList.remove('is-animated');
      rideTruck.classList.remove('is-driving');
      panels.forEach((panel, index) => {
        panel.inert = false;
        panel.removeAttribute('aria-hidden');
        controls[index].removeEventListener('click', handlers[index]);
      });
    };
  },
);
