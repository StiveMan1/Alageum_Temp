'use client';

import { useEffect, useId, useRef, useState } from 'react';
import EquipmentIcon from './EquipmentIcon';
import { MODEL_DISCLOSURE, equipmentModelName, resolveModelType } from '@/lib/catalog/models/types';
import styles from './models/EquipmentModel.module.css';

function ModelViewer({ type, className }) {
  const [status, setStatus] = useState('idle');
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const activateRef = useRef(null);
  const restoreFocusRef = useRef(false);
  const helpId = useId();
  const active = status === 'loading' || status === 'ready';
  const label = equipmentModelName(type);
  useEffect(() => {
    if (status === 'idle' && restoreFocusRef.current) {
      activateRef.current?.focus({ preventScroll: true });
      restoreFocusRef.current = false;
    }
  }, [status]);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let session;
    // Dynamic import lives inside the explicit activation effect: icon-only lists
    // and initial detail views never download Three.js or allocate a WebGL context.
    import('./models/createEquipmentViewer').then(({ createEquipmentViewer }) => {
      if (cancelled || !canvasRef.current) return;
      session = createEquipmentViewer(canvasRef.current, type, () => { if (!cancelled) setStatus('error'); });
      viewerRef.current = session;
      setStatus('ready');
      canvasRef.current?.focus({ preventScroll: true });
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => {
      cancelled = true;
      session?.dispose();
      viewerRef.current = null;
    };
  }, [active, type]);
  return <section className={`${styles.viewer} ${className || ''}`} aria-label={`Модель типа: ${label}`} data-equipment-model={type} data-model-status={status}>
    <div className={styles.topline}><span>БИБЛИОТЕКА ТИПОВ</span><span className={styles.badge}>3D</span></div>
    <div className={styles.viewport}>
      {active && <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} aria-label={`Интерактивная 3D-модель: ${label}`} aria-describedby={helpId}/>}
      {!active && <div className={styles.preview}><EquipmentIcon type={type} size={148}/><span className={styles.previewLabel}>{label}</span></div>}
      {status === 'loading' && <div className={styles.loading} role="status">Загружаем 3D-модель…</div>}
      {status === 'idle' && <button ref={activateRef} type="button" className={styles.activate} onClick={() => setStatus('loading')}><span aria-hidden="true">↗</span> Открыть 3D-модель</button>}
      {status === 'error' && <div className={styles.fallback} role="status"><p>3D недоступно в этом браузере. Выше показана схема типа оборудования.</p><button type="button" className={styles.retry} onClick={() => setStatus('loading')}>Попробовать снова</button></div>}
    </div>
    {active && <div className={styles.controls} role="group" aria-label="Управление 3D-моделью">
      <button type="button" disabled={status !== 'ready'} aria-label="Повернуть модель влево" onClick={() => viewerRef.current?.rotate(.25)}>↶</button>
      <button type="button" disabled={status !== 'ready'} aria-label="Повернуть модель вправо" onClick={() => viewerRef.current?.rotate(-.25)}>↷</button>
      <button type="button" disabled={status !== 'ready'} aria-label="Приблизить модель" onClick={() => viewerRef.current?.zoom(1)}>+</button>
      <button type="button" disabled={status !== 'ready'} aria-label="Отдалить модель" onClick={() => viewerRef.current?.zoom(-1)}>−</button>
      <button type="button" className={styles.reset} disabled={status !== 'ready'} onClick={() => viewerRef.current?.reset()}>Сброс</button>
      <button type="button" className={styles.close} onClick={() => { restoreFocusRef.current = true; setStatus('idle'); }} aria-label="Закрыть 3D-модель">Закрыть</button>
    </div>}
    <p id={helpId} className={styles.help}>{active ? 'Вращайте мышью или пальцем. Масштаб: два пальца или + / −. С клавиатуры: стрелки, + / −, Home для сброса.' : 'Одна модель для всего типа оборудования. Доступна после открытия.'}</p>
    <p className={styles.disclosure}>{MODEL_DISCLOSURE}</p>
  </section>;
}

export default function EquipmentModel({ type, className = '' }) {
  const resolved = resolveModelType(type);
  // Type changes fully release the previous viewer, including pending imports.
  return <ModelViewer key={resolved} type={resolved} className={className}/>;
}
