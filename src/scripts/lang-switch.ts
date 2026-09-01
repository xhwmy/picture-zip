export function bindLangSwitch(): void {
  const switches = document.querySelectorAll<HTMLAnchorElement>('.lang-switch');
  if (switches.length === 0) return;
  switches.forEach((el) => {
    el.addEventListener('click', () => {
      try {
        localStorage.setItem('pz-lang-pref', el.dataset.lang ?? 'en');
      } catch {
        // localStorage unavailable, preference not persisted
      }
    });
  });
}

bindLangSwitch();