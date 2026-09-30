import { useEffect, useRef } from 'react';
import { api } from '../services/api';

// Progressive enhancement: ordinary browsers do not need this proposed API.
export function useWebMCP(actions) {
  const current = useRef(actions);
  current.current = actions;
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: 'search_secondhand_catalog',
        title: 'Search SECONDHAND',
        description: 'Read matching product names, prices, sizes and availability. Does not change the bag or purchase anything.',
        inputSchema: { type: 'object', properties: { query: { type: 'string', maxLength: 150 } }, required: ['query'], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          if (!input || typeof input.query !== 'string' || input.query.length > 150 || Object.keys(input).some(key => key !== 'query')) throw new Error('Supply a query of up to 150 characters.');
          const { products, total } = await api('/products?q=' + encodeURIComponent(input.query));
          return { total, products: products.map(p => ({ id: p.id, name: p.name, price_centavos: p.price, currency: 'PHP', size: p.size, stock: p.stock })) };
        }
      },
      {
        name: 'add_secondhand_piece_to_bag',
        title: 'Add one piece to the bag',
        description: 'Add one unit of a product to the signed-in customer’s saved shopping bag. Does not reserve inventory or place an order.',
        inputSchema: { type: 'object', properties: { product_id: { type: 'integer', minimum: 1 } }, required: ['product_id'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          if (!input || !Number.isInteger(input.product_id) || input.product_id < 1 || Object.keys(input).some(key => key !== 'product_id')) throw new Error('Supply a positive product_id.');
          if (!current.current.user) throw new Error('Sign in before adding a piece.');
          await current.current.addToBag(input.product_id);
          await new Promise(resolve => requestAnimationFrame(resolve));
          return { added: input.product_id, quantity: 1, reserved: false };
        }
      }
    ];
    for (const tool of tools) {
      try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); }
      catch { /* Optional browser API; the visible application remains usable. */ }
    }
    return () => lifecycle.abort();
  }, []);
}
