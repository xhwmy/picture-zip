export function langRedirect(): void {
  if (typeof location !== 'undefined' && location.pathname.startsWith('/zh')) {
    return;
  }
  try {
    const pref = localStorage.getItem('pz-lang-pref');
    if (pref === 'zh') {
      location.replace('/zh/');
      return;
    }
    if (pref === 'en') {
      return;
    }
  } catch {
    // localStorage unavailable (private mode), fall through to navigator detection
  }
  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('zh')) {
    location.replace('/zh/');
  }
}

langRedirect();