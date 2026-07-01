
export function el (n, attrs, kids, p) {
  const e = document.createElement(n);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v == null) return;
    if (k === 'style') {
      Object.entries(v).forEach(([prop, value]) => {
        const snake = prop
          .split('-')
          .map((part, idx) => idx ? part.charAt(0).toUpperCase() + part.slice(1) : part)
          .join('');
        e.style[snake] = value;
      });
      return;
    }
    e.setAttribute(k, v);
  });
  (kids || []).forEach((n) => {
    if (typeof n === 'string') e.append(txt(n));
    else e.append(n);
  });
  if (p) p.append(e);
  return e;
}

function txt (str) {
  return document.createTextNode(str);
}
