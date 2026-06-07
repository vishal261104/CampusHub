"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/utils";

// --- Animation Physics & Variants ---

// 1. The "Fluid" Spring: softer and more elastic feeling
const fluidTransition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 1,
};

// 2. Container for staggering text elements smoothly
const contentContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08, // The delay between name and role appearing
      delayChildren: 0.02,   // Start almost immediately upon expansion
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 }, // Exit FAST so the box can collapse cleanly
  },
};

// 3. The "Elegant Reveal": slides up while un-blurring
const elegantItemVariants = {
  hidden: { y: 12, opacity: 0, filter: "blur(6px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: fluidTransition, // Use the same fluid physics for elements
  },
};

export default function ProfileCard({
  imageSrc,
  name,
  role,
  socials,
  className = "",
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <motion.div
        className={cn(
          "relative z-0 flex items-center overflow-hidden",
          // Base bg + text for both themes
          "bg-white text-slate-900 border border-slate-200 shadow-sm"
        )}
        style={{ cursor: "default" }}
        layout
        initial={{ borderRadius: 40, width: 68, height: 68 }}
        animate={{
          width: isHovered ? "auto" : 68,
          borderRadius: 40,
        }}
        transition={fluidTransition}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Decorative layers */}
        <div className="absolute inset-0 z-20 rounded-[40px] pointer-events-none" />

        {/* Gradient background reacts to theme */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-500 z-0",
            "bg-slate-50",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        />

        {/* --- Avatar Wrapper --- */}
        <motion.div
          layout="position" // Keeps avatar anchored smoothly during expansion
          className="relative z-30 h-14 w-14 shrink-0 m-1.5"
        >
          {/* Living Ambient Glow: Rotates slowly to feel alive */}
          <motion.div
            className="absolute inset-0 rounded-full blur-xl bg-primary-100/50"
            animate={{
              scale: isHovered ? 1.6 : 0.8,
              opacity: isHovered ? 1 : 0,
              rotate: isHovered ? [0, 360] : 0, // Slow rotation
            }}
            transition={{
              scale: { duration: 0.4, ease: "easeOut" },
              opacity: { duration: 0.4 },
              rotate: { duration: 15, repeat: Infinity, ease: "linear" }
            }}
          />

          {/* Avatar Image */}
          <motion.img
            src={imageSrc}
            alt={name}
            className="relative h-full w-full rounded-full object-cover border-[2.5px] border-white shadow-sm"
            animate={{ scale: isHovered ? 1 : 0.96 }}
            transition={fluidTransition}
          />

          {/* Status Dot Pop-in */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: isHovered ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-[2.5px] border-white z-40"
          />
        </motion.div>

        {/* --- Text Content --- */}
        <div className="relative z-20 overflow-hidden">
          {/* Use mode="wait" for cleaner exit/enter transitions */}
          <AnimatePresence mode="wait">
            {isHovered && (
              <motion.div
                // Connect to our staggered container variants
                variants={contentContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col justify-center pl-4 pr-8 min-w-[180px]"
              >
                {/* Header Row: Name & Social */}
                <div className="flex items-center justify-between gap-6 mb-1">
                  <motion.h3
                    variants={elegantItemVariants}
                    className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap"
                  >
                    {name}
                  </motion.h3>

                  {socials?.github && (
                    <motion.a
                      href={socials.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      variants={elegantItemVariants}
                      className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 text-black hover:bg-black hover:text-white transition-colors"
                    >
                      <Github size={16} />
                    </motion.a>
                  )}
                </div>

                {/* Bottom Row: Role & Action */}
                <motion.div
                  variants={elegantItemVariants}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {role}
                  </span>
                  <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
