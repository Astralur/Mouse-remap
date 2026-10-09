// Synthetic keyboard events have no browser default action. Implement page-local Tab.
(() => {
  function tab(target, backwards) {
    const candidates = [];
    function visit(root) {
      for (const element of root.querySelectorAll('*')) {
        if (element.tabIndex >= 0 && !element.matches(':disabled') &&
            !element.closest('[inert]') && element.getClientRects().length &&
            getComputedStyle(element).visibility === 'visible') candidates.push(element);
        if (element.shadowRoot) visit(element.shadowRoot);
      }
    }
    visit(document);
    const elements = candidates.filter(element => {
      if (element.tagName !== 'INPUT' || element.type !== 'radio' || !element.name) return true;
      const group = candidates.filter(other => other.tagName === 'INPUT' && other.type === 'radio' &&
        other.name === element.name && other.form === element.form && other.getRootNode() === element.getRootNode());
      return element === (group.find(other => other.checked) || group[0]);
    }).sort((a, b) => {
      const first = a.tabIndex > 0 ? a.tabIndex : Infinity;
      const second = b.tabIndex > 0 ? b.tabIndex : Infinity;
      return first === second ? 0 : first - second;
    });
    if (!elements.length) return;
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    const current = elements.indexOf(active);
    const next = current < 0 ? (backwards ? elements.length - 1 : 0)
      : (current + (backwards ? -1 : 1) + elements.length) % elements.length;
    elements[next].focus();
  }
  MouseRemap.performDefault = (target, binding) => {
    if (binding.key === 'Tab' && !binding.ctrlKey && !binding.altKey && !binding.metaKey) {
      tab(target, binding.shiftKey);
    }
  };
})();
