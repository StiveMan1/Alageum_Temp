"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import SelectionNavigation from "@/components/catalog/SelectionNavigation";
import { useAuth } from "@/components/AuthProvider";

const sections = [
  {
    href: "/catalog", label: "Каталог", title: "Технический каталог", note: "Оборудование, характеристики и подборка для проекта.",
    links: [
      ["Трансформаторы", "/catalog?category=transformers", "Параметры и исполнение"],
      ["Распределительные устройства", "/catalog?category=switchgear", "Коммутация и распределение"],
      ["Подстанции", "/catalog?category=substations", "Комплектные решения"],
    ],
  },
  {
    href: "/solutions", label: "Решения", title: "От задачи к оборудованию", note: "Начните подбор с направления вашего проекта.",
    links: [
      ["Направления решений", "/solutions", "Структура проектного подбора"],
      ["Проекты", "/projects", "Подтверждённые публикации и поставки"],
      ["Подготовить запрос", "/inquiry", "Исходные данные для менеджера"],
    ],
  },
  {
    href: "/company", label: "Компания", title: "ALAGEUM Electric", note: "Предприятия, компетенции и проверенные публичные материалы.",
    links: [
      ["О компании", "/company", "Производство, инжиниринг и сервис"],
      ["Предприятия", "/manufacturers", "Профили заводов и компетенции"],
      ["Документы", "/documents", "Каталоги и официальные источники"],
    ],
  },
  {
    href: "/contacts", label: "Контакты", title: "Связь по вашему проекту", note: "Официальные каналы связи и подготовка вашего обращения.",
    links: [
      ["Контактная информация", "/contacts", "Телефоны, почта и региональные офисы"],
      ["Подготовить запрос", "/inquiry", "Соберите исходные данные"],
      ["Демо-кабинет", "/workspace", "Покупатель и проверка менеджером"],
    ],
  },
];

function Chevron({ expanded = false }) {
  return <svg className={`site-chevron${expanded ? " is-expanded" : ""}`} width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>;
}

export default function SiteHeader({ selectionCount }) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const headerRef = useRef(null);
  const toggleRef = useRef(null);
  const navRefs = useRef([]);
  const lastTrigger = useRef(null);
  const suppressFocusPreview = useRef(false);
  const pendingSubmenuFocus = useRef(false);
  const [menu, setMenu] = useState({ pathname, preview: null, desktop: false, mobile: false, group: null });
  const navPath = ['/manufacturers', '/documents'].some((prefix) => pathname.startsWith(prefix)) ? '/company' : pathname.startsWith('/projects') ? '/solutions' : pathname.startsWith('/inquiry') || pathname.startsWith('/workspace') ? '/contacts' : pathname;
  const currentIndex = sections.findIndex((section) => navPath === section.href || navPath.startsWith(`${section.href}/`));
  const onCurrentPath = menu.pathname === pathname;
  const desktopOpen = onCurrentPath && menu.desktop;
  const mobileOpen = onCurrentPath && menu.mobile;
  const previewIndex = desktopOpen && menu.preview !== null ? menu.preview : currentIndex;
  const activeSection = sections[previewIndex];
  const anyOpen = desktopOpen || mobileOpen;

  // Focus only after React has committed the submenu and removed its inert state.
  useLayoutEffect(() => {
    if (desktopOpen && pendingSubmenuFocus.current) {
      pendingSubmenuFocus.current = false;
      headerRef.current?.querySelector('.site-mega-link')?.focus();
    }
  }, [desktopOpen, menu]);

  function closeMenus(restoreFocus = false) {
    setMenu({ pathname, preview: null, desktop: false, mobile: false, group: null });
    if (restoreFocus) lastTrigger.current?.focus();
  }

  function previewSection(index) {
    lastTrigger.current = navRefs.current[index];
    setMenu((previous) => ({ ...previous, pathname, preview: index, desktop: true }));
  }

  useEffect(() => {
    if (!anyOpen) return;
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenu({ pathname, preview: null, desktop: false, mobile: false, group: null });
      if (lastTrigger.current && document.activeElement !== lastTrigger.current) {
        suppressFocusPreview.current = true;
        lastTrigger.current.focus();
      }
    }
    function onPointerDown(event) {
      if (!headerRef.current?.contains(event.target)) {
        setMenu({ pathname, preview: null, desktop: false, mobile: false, group: null });
      }
    }
    function onResize() {
      setMenu({ pathname, preview: null, desktop: false, mobile: false, group: null });
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
    };
  }, [anyOpen, pathname]);

  return (
    <>
      <a className="site-skip-link" href="#main-content">Перейти к содержанию</a>
      <div className={`site-nav-backdrop${anyOpen ? " is-visible" : ""}`} aria-hidden="true" onClick={() => closeMenus()} />
      <header className="site-header" ref={headerRef} onMouseLeave={() => { if (desktopOpen) closeMenus(); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) closeMenus(); }}>
        <div className="site-header-rail">
          <Link href="/" className="site-brand" aria-label="ALAGEUM Electric — главная" onNavigate={() => closeMenus()}>
            <Image src="/brand/logo-black.png" alt="ALAGEUM Electric" width={138} height={36} priority className="site-brand-image" />
          </Link>
          <nav className="site-desktop-nav" aria-label="Основная навигация">
            <div className="site-nav-rail">
              {sections.map((section, index) => (
                <Link key={section.href} href={section.href} ref={(element) => { navRefs.current[index] = element; }} className={`site-nav-link${currentIndex === index ? " is-current" : ""}`} aria-current={currentIndex === index ? "page" : undefined} aria-expanded={desktopOpen && previewIndex === index} aria-controls="site-mega-navigation" onMouseEnter={() => previewSection(index)} onFocus={() => {
                  if (suppressFocusPreview.current) { suppressFocusPreview.current = false; return; }
                  previewSection(index);
                }} onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    pendingSubmenuFocus.current = true;
                    previewSection(index);
                  }
                }} onNavigate={() => closeMenus()}>
                  {section.label}<Chevron />
                </Link>
              ))}
              <span className="site-nav-indicator site-nav-indicator-committed" aria-hidden="true" style={{ "--nav-index": Math.max(currentIndex, 0), opacity: currentIndex < 0 ? 0 : 1 }} />
              <span className="site-nav-indicator site-nav-indicator-preview" aria-hidden="true" style={{ "--nav-index": Math.max(previewIndex, 0), opacity: previewIndex < 0 ? 0 : 1 }} />
            </div>
            <div id="site-mega-navigation" className={`site-mega-navigation${desktopOpen ? " is-open" : ""}`} inert={!desktopOpen}>
              {activeSection && (
                <div className="site-mega-inner" key={activeSection.href}>
                  <div className="site-mega-intro"><span className="site-eyebrow">{activeSection.label}</span><strong>{activeSection.title}</strong><p>{activeSection.note}</p></div>
                  {activeSection.links.map(([label, href, note]) => <Link key={href} href={href} className="site-mega-link" onNavigate={() => closeMenus()}><span>{label}</span><small className="site-metadata">{note}</small></Link>)}
                </div>
              )}
            </div>
          </nav>
          <div className="site-header-actions">
            <Link href="/workspace" className="site-language site-metadata" onNavigate={() => closeMenus()}>Демо-кабинет</Link>
            {hasPermission('catalog.manage') && <Link href="/admin/catalog" className="site-selection-link">Управление каталогом</Link>}
            <Suspense fallback={<Link href="/selection" className="site-selection-link">Подборка</Link>}><SelectionNavigation selectionCount={selectionCount} onNavigate={() => closeMenus()} /></Suspense>
            <button ref={toggleRef} type="button" className="site-menu-toggle" aria-label={mobileOpen ? "Закрыть навигацию" : "Открыть навигацию"} aria-expanded={mobileOpen} aria-controls="site-mobile-navigation" onClick={() => {
              lastTrigger.current = toggleRef.current;
              setMenu({ pathname, preview: null, desktop: false, mobile: !mobileOpen, group: currentIndex >= 0 ? currentIndex : 0 });
            }}><span /><span /><span /></button>
          </div>
        </div>
        <nav className={`site-mobile-navigation${mobileOpen ? " is-open" : ""}`} id="site-mobile-navigation" aria-label="Мобильная навигация" inert={!mobileOpen}>
          {sections.map((section, index) => (
            <div className="site-mobile-group" key={section.href}>
              <div className="site-mobile-group-heading">
                <Link href={section.href} aria-current={currentIndex === index ? "page" : undefined} onNavigate={() => closeMenus()}>{section.label}</Link>
                <button type="button" aria-label={`${menu.group === index ? "Свернуть" : "Развернуть"} раздел «${section.label}»`} aria-controls={`site-mobile-group-${index}`} aria-expanded={menu.group === index} onClick={() => setMenu((previous) => ({ ...previous, group: previous.group === index ? null : index }))}><Chevron expanded={menu.group === index} /></button>
              </div>
              <div id={`site-mobile-group-${index}`} className="site-mobile-group-links" hidden={menu.group !== index}>{section.links.map(([label, href]) => <Link key={href} href={href} onNavigate={() => closeMenus()}>{label}</Link>)}</div>
            </div>
          ))}
          <p className="site-metadata site-mobile-note">Тестовая версия сайта · RU</p>
        </nav>
      </header>
    </>
  );
}
