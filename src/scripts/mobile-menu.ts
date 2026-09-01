export function bindMobileMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const menu = document.querySelector<HTMLElement>('.mobile-menu');
  if (!toggle || !menu) return;

  const btn = toggle;
  const panel = menu;
  let lastFocused: HTMLElement | null = null;

  function getFocusable(): HTMLElement[] {
    const selectors = 'a[href], button:not([disabled]), input:not([disabled])';
    return Array.from(panel.querySelectorAll<HTMLElement>(selectors)).filter(
      (el) => el.offsetParent !== null,
    );
  }

  function open(): void {
    lastFocused = document.activeElement as HTMLElement;
    btn.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    // Move focus into the menu
    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }

  function close(): void {
    btn.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    // Restore focus to the toggle button or the element that opened the menu
    const target = lastFocused ?? btn;
    target.focus();
    lastFocused = null;
  }

  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    if (expanded) close();
    else open();
  });

  btn.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) close();
      else open();
    } else if (event.key === 'Escape') {
      if (btn.getAttribute('aria-expanded') === 'true') {
        close();
      }
    }
  });

  // Trap focus within the menu when open, and handle Escape from inside
  panel.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  });

  // Close when clicking outside the menu
  document.addEventListener('click', (event: MouseEvent) => {
    if (panel.hidden) return;
    const target = event.target as Node;
    if (panel.contains(target) || btn.contains(target)) return;
    close();
  });
}

bindMobileMenu();