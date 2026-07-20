// auth.js — Guard de autenticación
// Importar este módulo en main-v4.js para proteger todas las páginas del dashboard.
// Las páginas de auth (login, register, forgot_password, etc.) se excluyen automáticamente.

const AUTH_KEY = 'evidencia:token';
const USER_KEY = 'evidencia:user';

// Páginas que NO requieren autenticación
const PUBLIC_PAGES = [
  'login.html',
  'register.html',
  'forgot_password.html',
  'lock_screen.html',
  'verify_2fa.html',
  'coming_soon.html',
  'maintenance.html',
  'offline.html',
  'page_403.html',
  'page_404.html',
  'page_500.html',
  'landing.html',
];

/**
 * Devuelve el nombre del archivo HTML actual (sin path).
 */
function currentPage() {
  const parts = window.location.pathname.split('/');
  return parts[parts.length - 1] || 'index.html';
}

/**
 * Guarda el token y datos de usuario en localStorage.
 */
export function saveSession(token, user) {
  localStorage.setItem(AUTH_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Elimina la sesión y redirige al login.
 */
export function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
  // Redirigir preservando la ruta base (production/)
  const base = window.location.pathname.replace(/[^/]*$/, '');
  window.location.href = base + 'login.html';
}

/**
 * Devuelve el token activo, o null si no hay sesión.
 */
export function getToken() {
  return localStorage.getItem(AUTH_KEY);
}

/**
 * Devuelve los datos del usuario logueado, o null.
 */
export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Guard principal. Llámalo al inicio de main-v4.js.
 * Si la página requiere auth y no hay sesión → redirige a login.
 */
export function requireAuth() {
  const page = currentPage();
  const isPublic = PUBLIC_PAGES.some((p) => page === p || page === '');

  if (!isPublic && !getToken()) {
    const base = window.location.pathname.replace(/[^/]*$/, '');
    window.location.replace(base + 'login.html');
    // Detener ejecución para evitar que el JS de la página protegida siga corriendo
    throw new Error('AUTH_REDIRECT');
  }
}
