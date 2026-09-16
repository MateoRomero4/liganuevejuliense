"use client";
import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

import HomeView from "@/components/views/home";
import LeagueView from "@/components/views/league";
import FixtureView from "@/components/views/fixture";
import ResultsView from "@/components/views/results";
import ProdeView from "@/components/views/prode";

const ZOCALOS_VIDEOS = [
  "/assets/zocalos/ceres.zocalo.mp4",
  "/assets/zocalos/CEYS_zócalo.mp4",
  "/assets/zocalos/lumen.mp4",
  "/assets/zocalos/nitrum.zocalo.mp4",
  "/assets/zocalos/nutralmix.zocalo.mp4",
  "/assets/zocalos/peluche.mp4",
  "/assets/zocalos/pique..mp4",
  "/assets/zocalos/SENSA_.mp4",
  "/assets/zocalos/solocash.mp4",
  "/assets/zocalos/TELEMEDICINA_ZÓCALO.mp4",
];

function ZocalosPlayer() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ZOCALOS_VIDEOS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-24 mt-8 overflow-hidden bg-transparent flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.video
          key={currentIndex}
          src={ZOCALOS_VIDEOS[currentIndex]}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-contain" 
        />
      </AnimatePresence>
    </div>
  );
}

function ViewManager() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "home";

  const components: Record<string, React.ReactNode> = {
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
    <div className="relative w-full flex flex-col min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          variants={viewVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full md:mt-0 mt-10 flex-grow"
        >
          <motion.div className="flex w-full items-center justify-center gap-7 relative h-15">
            <Image 
              src="/assets/escudos_monocromaticos/newlogo.svg" 
              alt="Escudo Liga de Fútbol 9 de Julio Negro" 
              width={42} 
              height={42}
              className="object-cover opacity-50"
            />
            <Image 
              src="/assets/escudos_color/cat.svg" 
              alt="Escudo Liga de Fútbol 9 de Julio Negro" 
              width={52} 
              height={52}
              className="object-cover brightness-0 opacity-50"
            />
          </motion.div>

          {ComponentToRender}
          
        </motion.div>
      </AnimatePresence>

      <ZocalosPlayer />
    </div>
  );
}

export default function Home() {
  return (
    <div className="w-full min-h-screen overflow-x-hidden">
      <div className="mx-auto flex flex-col h-full">
        <Suspense fallback={<div className="text-center mt-10">Cargando vistas...</div>}>
          <ViewManager />
        </Suspense>
      </div>
    </div>
  );
}