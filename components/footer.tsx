import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gradient-to-l from-[#070128] to-[#011A38] border-[#000000] border-t shadow-lg mt-auto pb-16 md:pb-0">      
      <div className="container mx-auto max-w-7xl px-6 py-8 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link href="/?tab=home" className="group flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="relative w-12 h-12">
                <Image 
                  src="/assets/escudos_monocromaticos/newlogo.svg" 
                  alt="Escudo Liga de Fútbol 9 de Julio Color" 
                  width={48} 
                  height={48}
                  className="w-full h-full object-contain invert"
                />
              </div>
              <span className="text-white font-medium text-lg leading-tight text-center md:text-left">
                Liga Nuevejuliense<br />de Fútbol
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-3">
            <Link href="/?tab=league" className="text-gray-300 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest">
              Campeonato
            </Link>
            <Link href="/?tab=fixture" className="text-gray-300 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest">
              Fixture
            </Link>
            <Link href="/?tab=results" className="text-gray-300 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest">
              Resultados
            </Link>
            <Link href="/?tab=prode" className="text-gray-300 hover:text-white transition-colors text-xs font-medium uppercase tracking-widest">
              Prode
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center justify-center">
          <p className="text-gray-400 text-xs text-center tracking-wide">
            &copy; {currentYear} Liga de Fútbol de 9 de Julio. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}