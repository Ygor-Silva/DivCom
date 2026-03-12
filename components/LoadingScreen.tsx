'use client';

import { motion } from "motion/react";
import { Percent } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: [0.8, 1.1, 1],
          opacity: 1 
        }}
        transition={{ 
          duration: 0.5,
          ease: "easeOut"
        }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div 
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="h-20 w-20 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-600/40"
        >
          <Percent className="text-white h-10 w-10" strokeWidth={3} />
        </motion.div>
        
        <div className="flex flex-col items-center">
          <motion.span 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-black text-3xl tracking-tighter leading-none text-foreground"
          >
            DIVCOM
          </motion.span>
          <motion.span 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs font-bold text-emerald-600 tracking-[0.3em] leading-none mt-1"
          >
            SISTEMAS
          </motion.span>
        </div>

        <div className="mt-8 flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="h-1.5 w-1.5 rounded-full bg-emerald-600"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
