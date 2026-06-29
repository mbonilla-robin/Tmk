// 🟢 DECLARACIÓN INMEDIATA DE HOOKS (Previene Temporal Dead Zone / ReferenceError en Babel)
const useState = React.useState;
const useEffect = React.useEffect;
const useLayoutEffect = React.useLayoutEffect;
const useMemo = React.useMemo;
const useRef = React.useRef;
const useCallback = React.useCallback;
