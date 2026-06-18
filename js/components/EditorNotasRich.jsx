function isHtmlNotasVacio(html) {
  if (!html) return true;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  if (tmp.querySelector("ul, ol, li, b, strong, i, em, u")) return false;
  return !tmp.textContent.trim();
}

function notasToEditorHtml(text) {
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return linkificarHtmlNotas(text);
  return text
    .split("\n")
    .map((line) => (line ? `<p>${linkificarTextoPlano(line)}</p>` : "<p><br></p>"))
    .join("");
}

function normalizeEditorBlocks(editor) {
  if (!editor) return;

  editor.querySelectorAll(":scope > div").forEach((div) => {
    const p = document.createElement("p");
    while (div.firstChild) p.appendChild(div.firstChild);
    if (!p.innerHTML.trim()) p.innerHTML = "<br>";
    div.replaceWith(p);
  });

  if (!editor.innerHTML.trim() || isHtmlNotasVacio(editor.innerHTML)) {
    editor.innerHTML = "<p><br></p>";
  }
}

function ensureEditorSelection(editor) {
  editor.focus();
  normalizeEditorBlocks(editor);

  const sel = window.getSelection();
  if (!sel) return null;

  if (sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) {
    const range = document.createRange();
    const lastBlock = editor.querySelector("p:last-child, li:last-child") || editor.lastChild;
    if (lastBlock) {
      range.selectNodeContents(lastBlock);
      range.collapse(false);
    } else {
      range.setStart(editor, 0);
      range.collapse(true);
    }
    sel.removeAllRanges();
    sel.addRange(range);
  }

  return sel;
}

function getClosestBlock(node, editor) {
  let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el && el !== editor) {
    if (el.tagName === "P" || el.tagName === "LI" || el.tagName === "DIV") return el;
    el = el.parentElement;
  }
  return null;
}

function placeCursorIn(node, atEnd = true) {
  const sel = window.getSelection();
  if (!sel || !node) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(!atEnd);
  sel.removeAllRanges();
  sel.addRange(range);
}

function toggleList(editor, ordered) {
  editor.focus();
  normalizeEditorBlocks(editor);

  const sel = window.getSelection();
  if (!sel) return false;

  if (sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) {
    const block = editor.querySelector("p, li") || editor;
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  const range = sel.getRangeAt(0);
  let anchor = range.commonAncestorContainer;
  if (anchor.nodeType === Node.TEXT_NODE) anchor = anchor.parentElement;

  const existingList = anchor?.closest?.("ul, ol");
  const targetTag = ordered ? "OL" : "UL";

  if (existingList && editor.contains(existingList)) {
    if (existingList.tagName === targetTag) {
      [...existingList.querySelectorAll(":scope > li")].forEach((li) => {
        const p = document.createElement("p");
        p.innerHTML = li.innerHTML.trim() || "<br>";
        existingList.before(p);
      });
      existingList.remove();
      const lastP = editor.querySelector("p:last-child");
      if (lastP) placeCursorIn(lastP);
      return true;
    }

    const converted = document.createElement(ordered ? "ol" : "ul");
    while (existingList.firstChild) converted.appendChild(existingList.firstChild);
    existingList.replaceWith(converted);
    placeCursorIn(converted.querySelector("li") || converted);
    return true;
  }

  const block = getClosestBlock(range.commonAncestorContainer, editor);
  const list = document.createElement(ordered ? "ol" : "ul");
  const li = document.createElement("li");

  if (block && block.tagName === "P") {
    const content = block.innerHTML.trim();
    li.innerHTML = content && content !== "<br>" ? content : "";
    if (!li.childNodes.length) li.appendChild(document.createElement("br"));
    list.appendChild(li);
    block.replaceWith(list);
    placeCursorIn(li);
    return true;
  }

  if (!range.collapsed) {
    li.appendChild(range.extractContents());
  } else {
    li.appendChild(document.createElement("br"));
  }
  list.appendChild(li);
  range.insertNode(list);
  placeCursorIn(li);
  return true;
}

function EditorNotasRich({ value, onChange, placeholder = "Escribe notas o contexto adicional...", minHeight = "6rem" }) {
  const editorRef = useRef(null);
  const syncingRef = useRef(false);
  const savedRangeRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(() => isHtmlNotasVacio(value));

  const captureSelection = () => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel?.rangeCount || !el.contains(sel.anchorNode)) return;
    savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    const el = editorRef.current;
    const saved = savedRangeRef.current;
    if (!el || !saved) return false;
    try {
      if (!el.contains(saved.startContainer)) return false;
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(saved);
      return true;
    } catch (_) {
      return false;
    }
  };

  useEffect(() => {
    const el = editorRef.current;
    if (!el || syncingRef.current) return;
    const next = notasToEditorHtml(value || "");
    if (el.innerHTML !== next) {
      el.innerHTML = next || "";
      normalizeEditorBlocks(el);
    }
    setIsEmpty(isHtmlNotasVacio(el.innerHTML));
  }, [value]);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    syncingRef.current = true;
    const html = el.innerHTML;
    setIsEmpty(isHtmlNotasVacio(html));
    onChange(isHtmlNotasVacio(html) ? "" : html);
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };

  const runToolbarAction = (action) => {
    const el = editorRef.current;
    if (!el) return;
    action(el);
    emitChange();
  };

  const execFormat = (cmd, arg) => {
    runToolbarAction((el) => {
      ensureEditorSelection(el);
      document.execCommand(cmd, false, arg ?? null);
    });
  };

  const handleList = (ordered) => {
    runToolbarAction((el) => {
      restoreSelection();
      toggleList(el, ordered);
    });
  };

  const handleFocus = () => {
    const el = editorRef.current;
    if (!el) return;
    if (isHtmlNotasVacio(el.innerHTML)) {
      el.innerHTML = "<p><br></p>";
      setIsEmpty(false);
      placeCursorIn(el.querySelector("p"));
    }
  };

  const aplicarEnlacesEnEditor = (el) => {
    const linked = linkificarHtmlNotas(el.innerHTML);
    if (linked !== el.innerHTML) {
      el.innerHTML = linked;
      normalizeEditorBlocks(el);
    }
    el.querySelectorAll("a").forEach((a) => {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });
  };

  const handleBlur = () => {
    const el = editorRef.current;
    if (!el) return;
    aplicarEnlacesEnEditor(el);
    emitChange();
  };

  const handleInsertLink = () => {
    runToolbarAction((el) => {
      ensureEditorSelection(el);
      const url = window.prompt("URL del enlace:", "https://");
      if (!url) return;
      const norm = normalizarUrlEnlace(url);
      if (!norm) return;
      document.execCommand("createLink", false, norm);
      aplicarEnlacesEnEditor(el);
    });
  };

  const handleKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey) {
      const key = e.key.toLowerCase();
      if (key === "b") { e.preventDefault(); execFormat("bold"); }
      if (key === "i") { e.preventDefault(); execFormat("italic"); }
      if (key === "u") { e.preventDefault(); execFormat("underline"); }
    }
  };

  const toolbarBtnClass = (cmd) => {
    let active = false;
    try {
      active = document.queryCommandState(cmd);
    } catch (_) {}
    return `rich-notes-btn${active ? " is-active" : ""}`;
  };

  const handleToolbarMouseDown = (e, action) => {
    e.preventDefault();
    captureSelection();
    action();
  };

  return (
    <div className="rich-notes-editor">
      <div className="rich-notes-toolbar" role="toolbar" aria-label="Formato de texto">
        <button type="button" className={toolbarBtnClass("bold")} onMouseDown={(e) => handleToolbarMouseDown(e, () => execFormat("bold"))} title="Negrita (⌘B)">
          <i className="fa-solid fa-bold" />
        </button>
        <button type="button" className={toolbarBtnClass("italic")} onMouseDown={(e) => handleToolbarMouseDown(e, () => execFormat("italic"))} title="Cursiva (⌘I)">
          <i className="fa-solid fa-italic" />
        </button>
        <button type="button" className={toolbarBtnClass("underline")} onMouseDown={(e) => handleToolbarMouseDown(e, () => execFormat("underline"))} title="Subrayado (⌘U)">
          <i className="fa-solid fa-underline" />
        </button>
        <span className="rich-notes-toolbar-sep" aria-hidden="true" />
        <button type="button" className={toolbarBtnClass("insertUnorderedList")} onMouseDown={(e) => handleToolbarMouseDown(e, () => handleList(false))} title="Lista con viñetas">
          <i className="fa-solid fa-list-ul" />
        </button>
        <button type="button" className={toolbarBtnClass("insertOrderedList")} onMouseDown={(e) => handleToolbarMouseDown(e, () => handleList(true))} title="Lista numerada">
          <i className="fa-solid fa-list-ol" />
        </button>
        <span className="rich-notes-toolbar-sep" aria-hidden="true" />
        <button type="button" className="rich-notes-btn" onMouseDown={(e) => handleToolbarMouseDown(e, handleInsertLink)} title="Insertar enlace">
          <i className="fa-solid fa-link" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        className={`rich-notes-content${isEmpty ? " is-empty" : ""}`}
        style={{ minHeight }}
        onFocus={handleFocus}
        onMouseUp={captureSelection}
        onKeyUp={captureSelection}
        onInput={emitChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
