export function bindMobileMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const menu = document.querySelector<HTMLElement>('.mobile-menu');
  if (!toggle || !menu) return;

  const btn = toggle;
  const panel = menu;

  function open(): void {
    btn.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
  }

  function close(): void {
    btn.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
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
      close();
      btn.focus();
    }
  });
}

bindMobileMenu();