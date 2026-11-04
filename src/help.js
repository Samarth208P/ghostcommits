// Native popovers put help above the app without clipping it inside panels.
const tooltip = document.createElement('div');
tooltip.id = 'context-help';
tooltip.className = 'help-tooltip';
tooltip.setAttribute('role', 'tooltip');
tooltip.setAttribute('popover', 'manual');
document.body.append(tooltip);

let active = null;
let pinned = false;
let showTimer;
let hideTimer;
let lastOpened = -Infinity;

export function closeHelp() {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  active?.removeAttribute('aria-describedby');
  active = null;
  pinned = false;
  tooltip.hidePopover();
}

function showHelp(trigger) {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  if (active === trigger) return;
  const instant = performance.now() - lastOpened < 500;
  closeHelp();
  active = trigger;
  tooltip.toggleAttribute('data-instant', instant);
  tooltip.textContent = trigger.dataset.help;
  tooltip.style.width = `${Math.min(360, document.documentElement.clientWidth - 32)}px`;
  tooltip.style.maxHeight = 'calc(100dvh - 32px)';
  trigger.setAttribute('aria-describedby', tooltip.id);
  tooltip.showPopover();
  positionHelp();
  lastOpened = performance.now();
}

function positionHelp() {
  if (!active) return;
  const rect = active.getBoundingClientRect();
  if (!active.isConnected || rect.bottom < 0 || rect.top > window.innerHeight) {
    closeHelp();
    return;
  }
  tooltip.style.maxHeight = 'calc(100dvh - 32px)';
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  const viewportHeight = window.innerHeight;
  const below = viewportHeight - rect.bottom - 26;
  const above = rect.top - 26;
  const opensBelow = below >= height || below >= above;
  tooltip.style.maxHeight = `${Math.max(60, opensBelow ? below : above)}px`;
  const left = Math.min(
    Math.max(16, rect.left + rect.width / 2 - width / 2),
    document.documentElement.clientWidth - width - 16,
  );
  const top = opensBelow ? rect.bottom + 10 : rect.top - tooltip.offsetHeight - 10;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.max(16, top)}px`;
  tooltip.style.setProperty(
    '--transform-origin',
    `${rect.left + rect.width / 2 - left}px ${opensBelow ? 'top' : 'bottom'}`,
  );
}

function scheduleClose() {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  if (!pinned && document.activeElement !== active) hideTimer = setTimeout(closeHelp, 140);
}

document.addEventListener('pointerover', (event) => {
  if (event.pointerType === 'touch') return;
  if (tooltip.contains(event.target)) {
    clearTimeout(hideTimer);
    return;
  }
  const trigger = event.target.closest('[data-help]');
  if (!trigger || trigger.contains(event.relatedTarget)) return;
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  showTimer = setTimeout(() => showHelp(trigger), performance.now() - lastOpened < 500 ? 0 : 250);
});
document.addEventListener('pointerout', (event) => {
  const trigger = event.target.closest('[data-help]');
  if (trigger && !trigger.contains(event.relatedTarget)) scheduleClose();
  if (tooltip.contains(event.target) && !tooltip.contains(event.relatedTarget)) scheduleClose();
});
document.addEventListener('focusin', (event) => {
  const trigger = event.target.closest('[data-help]');
  if (trigger) showHelp(trigger);
  else closeHelp();
});
document.addEventListener('focusout', (event) => {
  if (event.target === active) closeHelp();
});
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-help]');
  if (!trigger) return;
  if (active === trigger && pinned) closeHelp();
  else {
    showHelp(trigger);
    pinned = true;
  }
});
document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('[data-help]') && !tooltip.contains(event.target)) closeHelp();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeHelp();
});
window.addEventListener('resize', positionHelp);
document.addEventListener(
  'scroll',
  (event) => {
    if (event.target !== tooltip) positionHelp();
  },
  true,
);
