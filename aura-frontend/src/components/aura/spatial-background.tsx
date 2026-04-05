"use client"

import { motion } from "framer-motion"

const orbs = [
  {
    color: "bg-blue-400/40",
    size: "w-[600px] h-[600px]",
    position: "top-[-10%] left-[-5%]",
    animate: {
      x: [0, 80, -40, 0],
      y: [0, -60, 40, 0],
    },
    duration: 22,
  },
  {
    color: "bg-purple-400/30",
    size: "w-[500px] h-[500px]",
    position: "top-[20%] right-[-10%]",
    animate: {
      x: [0, -70, 50, 0],
      y: [0, 80, -30, 0],
    },
    duration: 26,
  },
  {
    color: "bg-rose-400/25",
    size: "w-[550px] h-[550px]",
    position: "bottom-[-5%] left-[30%]",
    animate: {
      x: [0, 60, -80, 0],
      y: [0, -40, 60, 0],
    },
    duration: 30,
  },
  {
    color: "bg-sky-300/30",
    size: "w-[400px] h-[400px]",
    position: "bottom-[30%] left-[5%]",
    animate: {
      x: [0, -50, 70, 0],
      y: [0, 50, -50, 0],
    },
    duration: 24,
  },
]

export function SpatialBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-50 -z-10" aria-hidden="true">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${orb.color} ${orb.size} ${orb.position} blur-[140px]`}
          animate={orb.animate}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}
