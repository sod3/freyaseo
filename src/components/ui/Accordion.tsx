"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { FAQ } from "@/src/types";
import { cn } from "@/src/lib/cn";

export function Accordion({ items }: { items: FAQ[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const open = openIndex === index;
        const id = `faq-panel-${index}`;
        return (
          <div className="accordion-item" key={item.question}>
            <button
              className="accordion-trigger"
              aria-expanded={open}
              aria-controls={id}
              onClick={() => setOpenIndex(open ? -1 : index)}
              type="button"
            >
              <span>{item.question}</span>
              <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  id={id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <p className="accordion-content">{item.answer}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
