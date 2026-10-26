// Catalogue data — single source of truth for the grid, bag, wishlist and search.
// `img` / `alt` are Unsplash photo ids (front shot, then the hover shot) with their alt text.

export const CURRENCY = 'LKR';

export const products = [
  {
    id: 'p1', name: 'Aurèle Travel Coat', category: 'Outerwear', colour: 'Camel', price: 89500, tag: 'New',
    img: ['1781454226691-5c858b262dd7', '1772442366425-62a79caca681'],
    alt: 'Model in the camel Aurèle travel coat seated at a café table',
  },
  {
    id: 'p2', name: 'Marlowe Linen Blazer', category: 'Tailoring', colour: 'Sand', price: 58000, tag: null,
    img: ['1779406166699-662a041a12a9', '1779406165962-7df12de281b1'],
    alt: 'Model in the sand Marlowe linen blazer over a white shirt',
  },
  {
    id: 'p3', name: 'Handloom Resort Set', category: 'Resort', colour: 'Ivory', price: 42000, tag: 'Handloom',
    img: ['1779323539321-28d7fa5b8165', '1779323825065-8476aecb6176'],
    alt: 'Model in the ivory handloom resort set walking along the shore',
  },
  {
    id: 'p4', name: 'Silk Column Dress', category: 'Dresses', colour: 'Midnight', price: 54000, tag: 'New',
    img: ['1704775983143-2c83798831db', '1659522761084-79196b64abe4'],
    alt: 'Model in the midnight silk column dress against a burgundy backdrop',
  },
  {
    id: 'p5', name: 'Handloom Bib Shirt', category: 'Shirting', colour: 'Ivory', price: 18500, tag: null,
    img: ['1772855430420-e9d3b3c5f784', '1637248666370-70a4a603c23e'],
    alt: 'Model in the ivory handloom cotton bib shirt by a window',
  },
  {
    id: 'p6', name: 'Wide-Leg Linen Trouser', category: 'Tailoring', colour: 'Onyx', price: 26500, tag: null,
    img: ['1654512697681-8434b50096dd', '1613915617430-8ab0fd7c6baf'],
    alt: 'Model seated on a stool in onyx wide-leg linen trousers',
  },
  {
    id: 'p7', name: 'Featherweight Trench', category: 'Outerwear', colour: 'Tobacco', price: 79000, tag: 'Limited',
    img: ['1663343683182-70885ae0a792', '1648066380643-675d30c3cd17'],
    alt: 'Model in the tobacco featherweight trench coat',
  },
  {
    id: 'p8', name: 'Ossane Saddle Bag', category: 'Accessories', colour: 'Cognac', price: 46000, tag: null,
    img: ['1630484179057-75e24310e2ff', '1575032617751-6ddec2089882'],
    alt: 'The cognac leather Ossane saddle bag resting on folded cloth',
  },
];

export const byId = new Map(products.map((p) => [p.id, p]));

// Shown as "Rs 89,500", the way Sri Lankan shoppers read prices.
const fmt = new Intl.NumberFormat('en-LK', { style: 'currency', currency: CURRENCY, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 });

export const formatPrice = (n) => fmt.format(n);
export const formatSubtotal = (lines) => fmt.format(lines.reduce((sum, l) => sum + byId.get(l.id).price * l.qty, 0));
