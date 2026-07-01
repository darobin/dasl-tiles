
type ElAttrValue = string | number | null | undefined | Record<string, string>;

export function el (n: string, attrs?: Record<string, ElAttrValue>, kids?: (Node | string)[], p?: Element | null): HTMLElement {
  const e = document.createElement(n);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v == null) return;
    if (k === 'style') {
      Object.entries(v as Record<string, string>).forEach(([prop, value]) => {
        const snake = prop
          .split('-')
          .map((part, idx) => idx ? part.charAt(0).toUpperCase() + part.slice(1) : part)
          .join('');
        (e.style as unknown as Record<string, string>)[snake] = value;
      });
      return;
    }
    e.setAttribute(k, String(v));
  });
  (kids || []).forEach((n) => {
    if (typeof n === 'string') e.append(txt(n));
    else e.append(n);
  });
  if (p) p.append(e);
  return e;
}

function txt (str: string) {
  return document.createTextNode(str);
}
