"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Settings, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getSecondaryNavItems } from "./floating-nav";
import { useSession } from "next-auth/react";

interface HamburgerMenuProps {
  isVisible: boolean;
  onClose: () => void;
}

export function HamburgerMenu({ isVisible, onClose }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role || "ADMIN";

  // Close menu when nav closes
  useEffect(() => {
    if (!isVisible) {
      setIsOpen(false);
    }
  }, [isVisible]);

  // Don't render anything on desktop or while loading
  if (status === "loading") {
    return null;
  }

  const secondaryItems = getSecondaryNavItems(role);

  // Don't render if no secondary items or nav is not open
  if (secondaryItems.length === 0 || !isVisible) {
    return null;
  }

  const handleItemClick = (href: string) => {
    router.push(href);
    setIsOpen(false);
    onClose();
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Animation timing constants
  const DURATION = 0.4; // 400ms for card morph
  const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]; // ease-out-quint - smooth deceleration
  const ICON_DURATION = 0.35; // 350ms for icon transition
  const ICON_EASE: [number, number, number, number] = [0.34, 1.2, 0.64, 1]; // slight overshoot for gear spin
  const CONTENT_DELAY = 0.12; // 120ms
  const ITEM_STAGGER = 0.04; // 40ms between items

  return (
    <>
      {/* Backdrop - Mobile only */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.3,
              ease: "easeOut",
            }}
            className="fixed inset-0 backdrop-blur-sm bg-black/5 z-40 lg:hidden"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      {/* Container - positioned below navbar in top-right corner - Mobile only */}
      <div 
        className="fixed z-50 lg:hidden content-fade-in" 
        style={{ 
          top: '5rem',
          right: '1.5rem',
        }}
      >
        {/* Morphing card - positioned behind the button */}
        <motion.div
          className="absolute top-0 right-0 bg-white border-2 border-gray-200 overflow-hidden"
          animate={{
            width: isOpen ? "280px" : "48px",
            height: isOpen ? "260px" : "48px",
            borderRadius: isOpen ? "16px" : "24px",
            boxShadow: isOpen 
              ? "0 20px 40px -8px rgba(0, 0, 0, 0.15), 0 8px 16px -4px rgba(0, 0, 0, 0.08)"
              : "0 4px 12px rgba(0, 0, 0, 0.08)",
          }}
          transition={{
            width: { duration: DURATION, ease: EASE },
            height: { duration: DURATION, ease: EASE },
            borderRadius: { duration: DURATION * 0.8, ease: EASE },
            boxShadow: { duration: DURATION * 1.2, ease: "easeOut" },
          }}
          style={{
            minWidth: isOpen ? 280 : 48,
            minHeight: isOpen ? 260 : 48,
          }}
        >
          {/* Card Content - fades in as container expands */}
          <motion.div
            initial={false}
            animate={{
              opacity: isOpen ? 1 : 0,
            }}
            transition={{
              duration: 0.15,
              delay: isOpen ? CONTENT_DELAY : 0,
            }}
            className="absolute inset-0 pt-14 px-3 pb-3"
            style={{
              pointerEvents: isOpen ? 'auto' : 'none',
            }}
          >
            <div className="space-y-2">
              {secondaryItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <motion.button
                    key={item.href}
                    onClick={() => handleItemClick(item.href)}
                    initial={false}
                    animate={{
                      opacity: isOpen ? 1 : 0,
                      y: isOpen ? 0 : -8,
                      x: isOpen ? 0 : 4,
                    }}
                    transition={{
                      opacity: { duration: 0.2, ease: "easeOut" },
                      y: { duration: 0.3, ease: EASE },
                      x: { duration: 0.25, ease: EASE },
                      delay: isOpen ? CONTENT_DELAY + index * ITEM_STAGGER : (secondaryItems.length - 1 - index) * 0.02,
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium",
                      "hover:bg-accent transition-colors duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground"
                    )}
                    style={{
                      pointerEvents: isOpen ? 'auto' : 'none',
                    }}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>

        {/* Icon button - always on top, never scales */}
        <button 
          onClick={handleToggle}
          className="relative z-10 w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100/50 transition-colors"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {/* Gear icon (visible when closed) */}
          <motion.div
            className="absolute"
            initial={false}
            animate={{ 
              opacity: isOpen ? 0 : 1, 
              rotate: isOpen ? 180 : 0,
              scale: isOpen ? 0.5 : 1,
            }}
            transition={{
              opacity: { duration: 0.2, ease: "easeOut" },
              rotate: { duration: ICON_DURATION, ease: ICON_EASE },
              scale: { duration: 0.25, ease: "easeOut" },
            }}
          >
            <Settings className="h-6 w-6 text-gray-700" />
          </motion.div>
          
          {/* X icon (visible when open) */}
          <motion.div
            className="absolute"
            initial={false}
            animate={{ 
              opacity: isOpen ? 1 : 0, 
              rotate: isOpen ? 0 : 90,
              scale: isOpen ? 1 : 0.5,
            }}
            transition={{
              opacity: { duration: 0.2, ease: "easeOut", delay: isOpen ? 0.1 : 0 },
              rotate: { duration: ICON_DURATION, ease: ICON_EASE },
              scale: { duration: 0.25, ease: ICON_EASE, delay: isOpen ? 0.08 : 0 },
            }}
          >
            <X className="h-6 w-6 text-gray-700" />
          </motion.div>
        </button>
      </div>
    </>
  );
}
