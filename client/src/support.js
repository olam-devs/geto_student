// Geto customer care: change the number here and it updates everywhere on the site.
export const SUPPORT_PHONE = '+255 657 925 368';
export const SUPPORT_TEL   = 'tel:+255657925368';
export const supportWhatsApp = (text = '') =>
  `https://wa.me/255657925368${text ? `?text=${encodeURIComponent(text)}` : ''}`;
