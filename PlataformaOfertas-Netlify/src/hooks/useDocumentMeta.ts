import { useEffect } from 'react';

export function useDocumentMeta(title: string, description?: string, image?: string | null) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;

    const setMeta = (selector: string, attribute: string, value: string) => {
      let node = document.querySelector<HTMLMetaElement>(selector);
      if (!node) {
        node = document.createElement('meta');
        const [key, raw] = attribute.split('=');
        if (key && raw) node.setAttribute(key, raw.replace(/["']/g, ''));
        document.head.appendChild(node);
      }
      node.setAttribute('content', value);
    };

    if (description) {
      setMeta('meta[name="description"]', 'name=description', description);
      setMeta('meta[property="og:description"]', 'property=og:description', description);
    }
    setMeta('meta[property="og:title"]', 'property=og:title', title);
    if (image) setMeta('meta[property="og:image"]', 'property=og:image', image);

    return () => { document.title = previous; };
  }, [title, description, image]);
}
