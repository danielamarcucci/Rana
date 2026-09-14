import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Problema from "@/components/Problema";
import Metodo from "@/components/Metodo";
import Proceso from "@/components/Proceso";
import Lineas from "@/components/Lineas";
import SobreCarolina from "@/components/SobreCarolina";
import Testimonios from "@/components/Testimonios";
import Contacto from "@/components/Contacto";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problema />
        <Metodo />
        <Proceso />
        <Lineas />
        <SobreCarolina />
        <Testimonios />
        <Contacto />
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
