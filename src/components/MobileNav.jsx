"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Dumbbell, Settings, Home, LogIn, Users, Palette, Apple } from "lucide-react";

export default function MobileNav({ tenant, isCoachAuth, nombreCoach }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const navLinks = [
    { name: "Inicio", href: `/${tenant}`, icon: Home, visible: true },
    {
      name: "Rutinas",
      href: isCoachAuth ? `/${tenant}/panel/rutinas` : `/${tenant}/rutinas`,
      icon: Dumbbell,
      visible: true,
    },
    {
      name: "Nutrición",
      href: isCoachAuth ? `/${tenant}/panel/nutricion` : `/${tenant}/nutricion`,
      icon: Apple,
      visible: true,
    },
    { name: "Alumnos", href: `/${tenant}/panel/alumnos`, icon: Users, visible: isCoachAuth },
    { name: "Modo Entrenador", href: `/${tenant}/panel/entrenador`, icon: Dumbbell, visible: isCoachAuth },
    { name: "Ejercicios", href: `/${tenant}/panel/ejercicios`, icon: Dumbbell, visible: isCoachAuth },
    { name: "Mi Marca", href: `/${tenant}/panel/marca`, icon: Palette, visible: isCoachAuth },
    { name: "Panel Coach", href: `/${tenant}/panel`, icon: Settings, visible: isCoachAuth },
  ];

  return (
    <div className="md:hidden">
      {/* Botón Hamburger */}
      <button
        onClick={toggleMenu}
        className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={closeMenu}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header Drawer */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <span className="font-bold text-white text-lg truncate pr-4">
              {nombreCoach || 'Menú'}
            </span>
            <button
              onClick={closeMenu}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links de Navegación */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {navLinks.filter(link => link.visible).map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMenu}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive 
                          ? "bg-indigo-600/10 text-indigo-400" 
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer Drawer (Auth status) */}
          <div className="p-4 border-t border-slate-800">
            {isCoachAuth ? (
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Autenticado como<br/>
                  <span className="font-semibold text-white truncate max-w-[150px] inline-block">{tenant}</span>
                </div>
                {/* Opcional: botón de logout aquí si se requiere */}
              </div>
            ) : (
              <Link
                href={`/${tenant}/login`}
                onClick={closeMenu}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
