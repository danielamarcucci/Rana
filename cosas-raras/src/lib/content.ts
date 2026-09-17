export const WHATSAPP_NUMBER = "573504507151";
export const WHATSAPP_DISPLAY = "+57 350 450 7151";
export const EMAIL = "Lauradanielagalvis77@gmail.com";
export const PORTFOLIO_URL = "https://lauradanielgalvis.squarespace.com/";

export function waLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const COLORWAYS = [
  { id: "vino", label: "Vino", hex: "#6E1D3D" },
  { id: "oliva", label: "Oliva", hex: "#C6D463" },
  { id: "verdeazulado", label: "Verde azulado", hex: "#1C8888" },
] as const;

export type ColorwayId = (typeof COLORWAYS)[number]["id"];
export type Colorway = (typeof COLORWAYS)[number];

export type Product = {
  id: string;
  name: string;
  subtitle?: string;
  measures: string;
  price: string;
  description: string;
  image: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "aura",
    name: "Aura",
    measures: "35 × 35 cm",
    price: "$280.000 COP",
    description:
      "Una esfera de listones que respira. Cuelga en el centro del espacio y convierte cualquier techo en cielo encendido.",
    image: "/images/hero-main.webp",
  },
  {
    id: "frida",
    name: "Frida",
    subtitle: "Tejida",
    measures: "35 × 35 cm",
    price: "$280.000 COP",
    description:
      "La versión tejida a mano, hebra a hebra. Más textura, más sombra, el mismo estallido de luz sobre tu techo.",
    image: "/images/gallery-burgundy.webp",
  },
];

export const GALLERY = [
  { src: "/images/gallery-living.webp", caption: "Sala, hora azul" },
  { src: "/images/gallery-kitchen.webp", caption: "Cocina, luz encendida" },
  { src: "/images/gallery-day.webp", caption: "De día, en reposo" },
  { src: "/images/gallery-warm.webp", caption: "El estallido sobre el techo" },
  { src: "/images/gallery-skylights.webp", caption: "Bajo los tragaluces" },
  { src: "/images/gallery-burgundy.webp", caption: "Tejida, en la entrada" },
];

export const MARQUEE_WORDS = [
  "ESCENOGRAFÍA SENSORIAL",
  "HECHO A MANO",
  "ARQUITECTURA DE LA LUZ",
  "DISEÑO ORGÁNICO",
  "EDICIÓN A PEDIDO",
  "COSAS RARAS",
];
