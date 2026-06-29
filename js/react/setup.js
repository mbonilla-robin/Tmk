// 🟢 DECLARACIÓN INMEDIATA DE HOOKS (Previene Temporal Dead Zone / ReferenceError en Babel)
const useState = React.useState;
const useEffect = React.useEffect;
const useLayoutEffect = React.useLayoutEffect;
const useMemo = React.useMemo;
const useRef = React.useRef;
const useCallback = React.useCallback;

// Deep link: abrir entregable desde ?task= en la URL (notificaciones / push)
var TASK_KEY_URL_PARAMS = ["task", "task_key", "tarea"];

function leerTaskKeyDesdeUrl() {
  try {
    var params = new URLSearchParams(window.location.search || "");
    for (var i = 0; i < TASK_KEY_URL_PARAMS.length; i++) {
      var valor = String(params.get(TASK_KEY_URL_PARAMS[i]) || "").trim();
      if (valor) return valor;
    }
  } catch (e) { /* ignore */ }
  return "";
}

function limpiarTaskKeyEnUrl() {
  try {
    var url = new URL(window.location.href);
    var changed = false;
    TASK_KEY_URL_PARAMS.forEach(function (key) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    });
    if (!changed) return;
    var query = url.searchParams.toString();
    var nextUrl = query
      ? url.pathname + "?" + query + url.hash
      : url.pathname + url.hash;
    window.history.replaceState({}, "", nextUrl);
  } catch (e) { /* ignore */ }
}
