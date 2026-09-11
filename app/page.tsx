"use client";

import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense } from "react";
import Image from "next/image";


import HomeView from "@/components/views/home";
import LeagueView from "@/components/views/league";
import FixtureView from "@/components/views/fixture";
import ResultsView from "@/components/views/results";
import ProdeView from "@/components/views/prode";

function ViewManager() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "home";

  const components: Record<string, JSX.Element> = {
    home: <HomeView />,
    league: <LeagueView />,
    fixture: <FixtureView />,
    results: <ResultsView />,
    prode: <ProdeView />
  };

  const ComponentToRender = components[currentTab] || components.home;

  const viewVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    },
    exit: { 
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1, 
        when: "afterChildren"
      }
    }
  };

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">

        <motion.div
          key={currentTab}
          variants={viewVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full md:mt-0 mt-10"
        >
                  <motion.div className="flex w-full relative h-15">
          <Image 
            src="/assets/escudos_color/cat.svg" 
            alt="Escudo Liga de Fútbol 9 de Julio Negro" 
            width={52} 
            height={52}
            className="absolute inset-0 w-full h-full object-contain"
          />
        </motion.div>
          {ComponentToRender}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return (
    <div className="w-full min-h-screen overflow-x-hidden">
      <div className="mx-auto">
        <Suspense fallback={<div className="text-center">Cargando vistas...</div>}>
          <ViewManager />
        </Suspense>
      </div>
    </div>
  );
}