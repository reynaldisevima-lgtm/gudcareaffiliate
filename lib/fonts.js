import { Plus_Jakarta_Sans, Poppins, Nunito, Lora } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap' });
const lora = Lora({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap' });

// font-family per pilihan di lib/brandStyle.js; file font hanya diunduh browser bila dipakai.
export const FONT_FAMILY = {
  jakarta: jakarta.style.fontFamily,
  poppins: poppins.style.fontFamily,
  nunito: nunito.style.fontFamily,
  lora: lora.style.fontFamily,
};
