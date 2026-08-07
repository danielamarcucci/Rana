export interface ServicioSemilla {
  concepto: string;
  detalle: string;
  inmueble: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  link_pago: string;
}

// Datos tomados de Servicios_2026.xlsx
export const SERVICIOS_SEMILLA: ServicioSemilla[] = [
  {
    concepto: "Administración",
    detalle: "Alto Velo 707",
    inmueble: "Alto Velo 707",
    tipo_cuenta: "Cuenta corriente",
    numero_cuenta: "005969997427",
    link_pago: "https://www.davivienda.com/",
  },
  {
    concepto: "Administración",
    detalle: "Oficina 507",
    inmueble: "Oficina 507",
    tipo_cuenta: "Cuenta ahorros",
    numero_cuenta: "057-06671-4",
    link_pago: "https://www.davivienda.com/",
  },
  {
    concepto: "Administración",
    detalle: "Eva Punta Arena Girardot 404",
    inmueble: "Eva Girardot 404",
    tipo_cuenta: "Cuenta ahorros",
    numero_cuenta: "65900001851",
    link_pago: "https://www.davivienda.com/",
  },
  {
    concepto: "Luz ENEL",
    detalle: "Oficina 507 Edificio Grupo 7 Torre 8",
    inmueble: "Oficina 507",
    tipo_cuenta: "Referencia",
    numero_cuenta: "4507411-1",
    link_pago: "https://www.enel.com.co/es/personas/informacion-boton-de-pago.html",
  },
  {
    concepto: "Luz ENEL",
    detalle: "Alto Velo 707",
    inmueble: "Alto Velo 707",
    tipo_cuenta: "Referencia",
    numero_cuenta: "6278089-0",
    link_pago: "https://www.enel.com.co/es/personas/informacion-boton-de-pago.html",
  },
  {
    concepto: "Luz ENEL",
    detalle: "Eva Girardot 404",
    inmueble: "Eva Girardot 404",
    tipo_cuenta: "Referencia",
    numero_cuenta: "8005395-2",
    link_pago: "https://www.enel.com.co/es/personas/informacion-boton-de-pago.html",
  },
  {
    concepto: "Acueducto",
    detalle: "Alto Velo 707",
    inmueble: "Alto Velo 707",
    tipo_cuenta: "Referencia",
    numero_cuenta: "12300880",
    link_pago: "https://www.acueducto.com.co/wps/html/template/index.html?textoffice=1",
  },
  {
    concepto: "Acueducto",
    detalle: "Acuagyr Eva Girardot 404",
    inmueble: "Eva Girardot 404",
    tipo_cuenta: "Referencia",
    numero_cuenta: "97147",
    link_pago: "https://www.psepagos.co/PSEHostingUI/ShowTicketOffice.aspx?ID=8514",
  },
  {
    concepto: "Gas Vanti",
    detalle: "Alto Velo 707",
    inmueble: "Alto Velo 707",
    tipo_cuenta: "Referencia",
    numero_cuenta: "62634467",
    link_pago: "https://pagosenlinea.grupovanti.com/",
  },
  {
    concepto: "Gas Alcanos",
    detalle: "Eva Girardot 404",
    inmueble: "Eva Girardot 404",
    tipo_cuenta: "Referencia",
    numero_cuenta: "960491",
    link_pago: "https://pagosvirtuales.alcanosesp.com/",
  },
];
