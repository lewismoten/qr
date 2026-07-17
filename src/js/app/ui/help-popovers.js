export function initializeHelpPopovers({
  document = globalThis.document,
  window = globalThis.window,
} = {}) {
  const popovers = [...document.querySelectorAll('.help-popover')];

  const close = (popover, { dismissed = false } = {}) => {
    popover.classList.remove('is-open');
    popover.classList.toggle('is-dismissed', dismissed);
    popover
      .querySelector('.help-popover-trigger')
      ?.setAttribute('aria-expanded', 'false');
  };

  const closeOthers = (current) => {
    popovers.forEach((popover) => {
      if (popover !== current) close(popover);
    });
  };

  popovers.forEach((popover) => {
    const trigger = popover.querySelector('.help-popover-trigger');
    const content = popover.querySelector('.help-popover-content');
    if (!trigger || !content) return;
    let visibleBeforeActivation = false;
    trigger.setAttribute('aria-expanded', 'false');

    const rememberVisibility = (event) => {
      visibleBeforeActivation =
        event.pointerType && event.pointerType !== 'mouse'
          ? popover.classList.contains('is-open')
          : window.getComputedStyle(content).visibility === 'visible';
    };
    trigger.addEventListener('pointerdown', rememberVisibility);
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') rememberVisibility();
    });
    trigger.addEventListener('focus', () => {
      if (!popover.classList.contains('is-dismissed'))
        trigger.setAttribute('aria-expanded', 'true');
    });
    trigger.addEventListener('click', () => {
      const shouldClose =
        visibleBeforeActivation || popover.classList.contains('is-open');
      visibleBeforeActivation = false;
      closeOthers(popover);
      if (shouldClose) {
        close(popover, { dismissed: true });
        return;
      }
      popover.classList.remove('is-dismissed');
      popover.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    });
    popover.addEventListener('focusout', (event) => {
      if (popover.contains(event.relatedTarget)) return;
      close(popover, { dismissed: true });
      window.setTimeout(() => {
        if (!popover.matches(':focus-within') && !popover.matches(':hover')) {
          popover.classList.remove('is-dismissed');
        }
      }, 0);
    });
  });

  document.addEventListener('pointerdown', (event) => {
    popovers.forEach((popover) => {
      if (!popover.contains(event.target)) close(popover, { dismissed: true });
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    popovers.forEach((popover) => {
      if (
        popover.classList.contains('is-open') ||
        popover.matches(':focus-within')
      ) {
        close(popover, { dismissed: true });
      }
    });
  });
}
