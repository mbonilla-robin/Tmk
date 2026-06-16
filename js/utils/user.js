function getInicialUsuario() {
  const u = getLocalStorageItemSafe("robin_usuario_actual", null);
  if (u === "null" || u === "undefined" || u === "") return null;
  return u;
}
