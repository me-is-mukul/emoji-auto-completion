let popup = null;
let selectedIndex = -1;
let matches = [];

function findTriggerWord(text) {
  const match = text.match(/:(\w{1,20})$/);
  return match ? match[1] : null;
}

function getCaretCoordinates() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0).cloneRange();
  const rects = range.getClientRects();
  if (rects.length > 0) {
    return { left: rects[0].left, top: rects[0].top };
  }

  const span = document.createElement("span");
  span.appendChild(document.createTextNode(""));
  range.insertNode(span);
  const rect = span.getBoundingClientRect();
  span.remove();
  return { left: rect.left, top: rect.top };
}

function showEmojiPopup(emojiMatches, coords, onSelect) {
  if (popup) {
    popup.remove();
    popup = null;
  }

  popup = document.createElement("div");
  popup.id = "emoji-autocomplete";
  popup.style.position = "absolute";
  popup.style.left = `${coords.left}px`;
  popup.style.top = `${coords.top - 40}px`;
  popup.style.zIndex = "10000";
  popup.style.background = "white";
  popup.style.border = "1px solid #ccc";
  popup.style.padding = "4px 6px";
  popup.style.borderRadius = "6px";
  popup.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
  popup.style.display = "flex";
  popup.style.gap = "5px";

  emojiMatches.forEach((key, index) => {
    const btn = document.createElement("button");
    btn.textContent = window.emojiMap[key];
    btn.title = `:${key}:`;
    btn.style.background = index === selectedIndex ? "#e0e0e0" : "none";
    btn.style.border = "none";
    btn.style.fontSize = "20px";
    btn.style.cursor = "pointer";
    btn.style.padding = "2px 4px";
    btn.style.borderRadius = "4px";

    btn.onmouseenter = () => {
      selectedIndex = index;
      updateButtonStyles(emojiMatches);
      console.log(`Mouse entered button: index=${index}, key=${key}`);
    };

    btn.onclick = () => {
      console.log(`Button clicked: key=${key}`);
      onSelect(key);
      cleanupPopup();
    };
    popup.appendChild(btn);
  });

  document.body.appendChild(popup);
  console.log(`Popup shown: matches=${JSON.stringify(emojiMatches)}, selectedIndex=${selectedIndex}`);
}

function updateButtonStyles(emojiMatches) {
  if (!popup) return;
  const buttons = popup.getElementsByTagName("button");
  Array.from(buttons).forEach((btn, index) => {
    btn.style.background = index === selectedIndex ? "#e0e0e0" : "none";
  });
  console.log(`Updated button styles: selectedIndex=${selectedIndex}`);
}

function cleanupPopup() {
  if (popup) {
    popup.remove();
    popup = null;
  }
  selectedIndex = -1;
  matches = [];
  console.log("Popup cleaned up");
}

function handleEmojiSelection(key) {
  const target = document.activeElement;
  const isEditable = target.isContentEditable;
  const isInput = target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && target.type === "text");

  console.log(`Handling emoji selection: key=${key}, isEditable=${isEditable}, isInput=${isInput}`);

  if (isEditable) {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      console.log("No selection range found");
      return;
    }
    const range = selection.getRangeAt(0);
    const text = selection.anchorNode.textContent || "";
    const match = /:(\w{1,20})$/.exec(text.substring(0, selection.anchorOffset));
    if (match) {
      const startOffset = selection.anchorOffset - match[0].length;
      range.setStart(selection.anchorNode, startOffset);
      range.deleteContents();
      range.insertNode(document.createTextNode(window.emojiMap[key]));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      console.log(`Replaced in contenteditable: ${match[0]} -> ${window.emojiMap[key]}`);
    } else {
      console.log("No matching shortcode found in contenteditable");
    }
  } else if (isInput) {
    const start = target.selectionStart;
    const before = target.value.substring(0, start);
    const after = target.value.substring(start);
    const match = /:(\w{1,20})$/.exec(before);
    if (match) {
      const newText = before.replace(/:\w{1,20}$/, window.emojiMap[key]) + after;
      target.value = newText;
      target.selectionStart = target.selectionEnd = before.length - match[0].length + window.emojiMap[key].length;
      target.focus();
      console.log(`Replaced in input: ${match[0]} -> ${window.emojiMap[key]}`);
    } else {
      console.log("No matching shortcode found in input");
    }
  }
  cleanupPopup();
}


document.addEventListener("keydown", (e) => {
  if (!popup || matches.length === 0) {
    console.log("Keydown ignored: no popup or matches");
    return;
  }

  console.log(`Keydown: key=${e.key}, selectedIndex=${selectedIndex}, matches=${JSON.stringify(matches)}`);

  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    e.stopImmediatePropagation();
    selectedIndex = Math.min(selectedIndex + 1, matches.length - 1);
    updateButtonStyles(matches);
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    e.stopImmediatePropagation();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    updateButtonStyles(matches);
  } else if (e.key === "Enter") {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (selectedIndex >= 0 && selectedIndex < matches.length) {
      handleEmojiSelection(matches[selectedIndex]);
    } else {
      handleEmojiSelection(matches[0]); 
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    e.stopImmediatePropagation();
    cleanupPopup();
  }
}, { capture: true, passive: false });

document.addEventListener("input", (e) => {
  const target = e.target;
  const isEditable = target.isContentEditable;
  const isInput = target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && target.type === "text");

  if (!isEditable && !isInput) {
    console.log("Input ignored: not editable or input");
    return;
  }

  let text;
  if (isEditable) {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      console.log("Input ignored: no selection range");
      return;
    }
    text = selection.anchorNode.textContent?.substring(0, selection.anchorOffset) || "";
  } else {
    text = target.value.substring(0, target.selectionStart);
  }

  const word = findTriggerWord(text);
  if (!word) {
    cleanupPopup();
    console.log("Input: no trigger word found");
    return;
  }

  matches = Object.keys(window.emojiMap).filter(k => k.startsWith(word));
  if (matches.length === 0) {
    cleanupPopup();
    console.log("Input: no matches found for word:", word);
    return;
  }

  const coords = isEditable ? getCaretCoordinates() : {
    left: target.getBoundingClientRect().left,
    top: target.getBoundingClientRect().top + target.offsetHeight
  };

  selectedIndex = 0;
  showEmojiPopup(matches.slice(0, 5), coords, handleEmojiSelection);
  console.log(`Input triggered: word=${word}, matches=${JSON.stringify(matches)}`);
});


document.addEventListener("input", (e) => {
  const target = e.target.closest('[contenteditable="true"], [data-text="true"], [role="textbox"]');
  if (!target) {
    console.log("Instagram input ignored: no matching target");
    return;
  }

  const selection = window.getSelection();
  if (!selection.rangeCount) {
    console.log("Instagram input ignored: no selection range");
    return;
  }
  const text = selection.anchorNode.textContent?.substring(0, selection.anchorOffset) || "";

  const word = findTriggerWord(text);
  if (!word) {
    cleanupPopup();
    console.log("Instagram input: no trigger word found");
    return;
  }

  matches = Object.keys(window.emojiMap).filter(k => k.startsWith(word));
  if (matches.length === 0) {
    cleanupPopup();
    console.log("Instagram input: no matches found for word:", word);
    return;
  }

  const coords = getCaretCoordinates();
  selectedIndex = 0; 
  showEmojiPopup(matches.slice(0, 5), coords, handleEmojiSelection);
  console.log(`Instagram input triggered: word=${word}, matches=${JSON.stringify(matches)}`);
});


document.addEventListener("click", (e) => {
  if (popup && !popup.contains(e.target) && e.target !== document.activeElement) {
    cleanupPopup();
    console.log("Popup closed: clicked outside");
  }
});