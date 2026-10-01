'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { clearInquiries, removeInquiry, saveInquiry, updateInquiry, useInquiries } from '@/lib/workspace/store';
import { createDemoInquiry, documentNames, getWorkspaceStatus, WORKSPACE_STATUSES } from '@/lib/workspace/domain';

const dateLabel = (value) => new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const shortId = (id) => `DEMO-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
function Status({ status }) { return <span className={`workspace-status status-${status}`}><span />{getWorkspaceStatus(status).label}</span>; }
function Icon({ kind = 'file' }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{kind === 'arrow' ? <><path d="M5 12h14M13 6l6 6-6 6" /></> : kind === 'shield' ? <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></> : <><path d="M14 3H6v18h12V7l-4-4Z" /><path d="M14 3v5h4M9 12h6M9 16h6" /></>}</svg>;
}

function CustomerEditor({ inquiry, onChange }) {
  const [error, setError] = useState('');
  const needsInfo = inquiry.status === 'needs-information';
  function save(event) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    const action = event.nativeEvent.submitter?.value || 'save';
    const comment = String(data.get('comment') || '').trim();
    if (action === 'submit' && needsInfo && !comment) { setError('Добавьте ответ на уточнение перед возвратом на демо-проверку.'); return; }
    try {
      updateInquiry(inquiry.id, {
        subject: data.get('subject'), text: data.get('text'), contactName: data.get('contactName'), company: data.get('company'), email: data.get('email'), phone: data.get('phone'),
        documents: documentNames(String(data.get('documents') || '').split('\n')),
        status: action === 'submit' ? (needsInfo ? 'review' : 'submitted') : inquiry.status,
        role: 'customer', comment,
      });
      onChange(action === 'submit' ? 'Локальный этап обновлён. Запрос никуда не отправлен.' : 'Изменения сохранены в этом браузере.');
    } catch (reason) { setError(reason.message); }
  }
  return <section className="workspace-panel"><div className="workspace-section-heading"><div><p className="catalog-kicker">ДЕЙСТВИЕ ЗАКАЗЧИКА</p><h3>{needsInfo ? 'Дополнить запрос' : 'Подготовить запрос'}</h3></div><span className="workspace-local-label">Только локально</span></div>
    <form onSubmit={save} className="workspace-form">
      <label>Тема запроса<input name="subject" defaultValue={inquiry.subject} maxLength={180} required /></label>
      <label>Описание задачи<textarea name="text" defaultValue={inquiry.text} maxLength={24000} rows={5} required placeholder="Укажите учебные требования к оборудованию" /></label>
      <div className="workspace-form-grid"><label>Контактное лицо<input name="contactName" defaultValue={inquiry.contactName} maxLength={160} autoComplete="off" /></label><label>Название компании<input name="company" defaultValue={inquiry.company} maxLength={240} autoComplete="off" /></label><label>Email<input name="email" type="email" defaultValue={inquiry.email} maxLength={200} autoComplete="off" /></label><label>Телефон<input name="phone" type="tel" defaultValue={inquiry.phone} maxLength={100} autoComplete="off" /></label></div>
      <label>Названия документов<textarea name="documents" defaultValue={inquiry.documents.join('\n')} maxLength={3800} rows={3} placeholder={'DEMO_техническое_задание.pdf\nDEMO_карточка_компании.pdf'} /><small>Одно название на строку, до 20. Сохраняются только имена: файлы не загружаются, их содержимое не читается. Для реального запроса коммерческого предложения нужны документы компании; их точный перечень, сроки предоставления и порядок проверки пока не определены.</small></label>
      {needsInfo && <label>Ответ на уточнение<textarea name="comment" rows={3} maxLength={4000} placeholder="Учебный ответ заказчика" /></label>}
      <p className="workspace-fine">Используйте вымышленные данные. Не вводите банковские реквизиты, пароли и конфиденциальную информацию.</p>
      {error && <p className="workspace-error" role="alert">{error}</p>}
      <div className="workspace-actions"><button className="catalog-button primary" type="submit" value="submit">{needsInfo ? 'Вернуть на демо-проверку' : 'Запустить демо-сценарий'}<Icon kind="arrow" /></button><button className="catalog-button" type="submit" value="save">Сохранить изменения</button></div>
    </form>
  </section>;
}

function ManagerEditor({ inquiry, onChange }) {
  const [error, setError] = useState('');
  function save(event) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    const status = String(data.get('status'));
    const comment = String(data.get('comment') || '').trim();
    if (['needs-information', 'quoted'].includes(status) && !comment) { setError('Для уточнения или демо-ответа добавьте комментарий.'); return; }
    if (status === inquiry.status && !comment) { setError('Выберите другой этап или добавьте комментарий.'); return; }
    try { updateInquiry(inquiry.id, { status, comment, role: 'manager' }); onChange('Демо-решение сохранено локально. Заказчику ничего не отправлено.'); }
    catch (reason) { setError(reason.message); }
  }
  if (inquiry.status === 'draft') return <section className="workspace-panel workspace-manager"><p className="catalog-kicker">ДЕМО-РОЛЬ МЕНЕДЖЕРА</p><h3>Запрос ещё в черновике</h3><p>Переключитесь в роль заказчика, проверьте данные и нажмите «Запустить демо-сценарий». После этого здесь можно будет менять этап и оставлять учебные ответы.</p></section>;
  return <section className="workspace-panel workspace-manager"><div className="workspace-section-heading"><div><p className="catalog-kicker">ДЕМО-РОЛЬ МЕНЕДЖЕРА</p><h3>Проверить и ответить</h3></div><span className="workspace-local-label">Имитация</span></div><p>Вы сами играете роль менеджера. Это демонстрация интерфейса без доступа сотрудника и без реальной проверки.</p>
    <form className="workspace-form" onSubmit={save}><label>Следующий локальный этап<select name="status" defaultValue={inquiry.status === 'submitted' ? 'review' : inquiry.status}><option value="review">Демо-проверка</option><option value="needs-information">Нужно уточнение · демо</option><option value="quoted">Демо-ответ готов</option></select></label><label>Комментарий демо-менеджера<textarea name="comment" maxLength={4000} rows={4} placeholder="Например: для учебной проверки уточните напряжение и условия установки" /><small>Комментарий появится в этом браузере и в режиме заказчика. Он не является коммерческим предложением.</small></label>{error && <p className="workspace-error" role="alert">{error}</p>}<button className="catalog-button primary" type="submit">Сохранить демо-решение<Icon kind="arrow" /></button></form>
  </section>;
}

function InquiryDetail({ inquiry, role, onChange, onDelete }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const editable = role === 'customer' && ['draft', 'needs-information'].includes(inquiry.status);
  const stages = ['draft', 'submitted', 'review', 'quoted'];
  const activeStage = inquiry.status === 'needs-information' ? 2 : stages.indexOf(inquiry.status);
  return <article className="workspace-detail" aria-labelledby="request-heading"><div className="workspace-detail-head"><div className="workspace-detail-meta"><span className="catalog-meta">{shortId(inquiry.id)}</span><Status status={inquiry.status} /></div><h2 id="request-heading">{inquiry.subject}</h2><p>Создан {dateLabel(inquiry.createdAt)} · Локальная демонстрация</p></div>
    <ol className="workspace-steps" aria-label="Учебные этапы запроса">{stages.map((status, index) => <li key={status} className={index <= activeStage ? 'is-reached' : ''} aria-current={index === activeStage ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span><strong>{getWorkspaceStatus(status).short}</strong></li>)}</ol>
    <div className={`workspace-stage-note stage-${inquiry.status}`}><strong>{getWorkspaceStatus(inquiry.status).label}</strong><p>{getWorkspaceStatus(inquiry.status).description}</p></div>
    <section className="workspace-panel"><div className="workspace-section-heading"><h3>Состав запроса</h3><span className="catalog-meta">{inquiry.items.length} ПОЗИЦИЙ</span></div>{inquiry.items.length ? <ul className="workspace-products">{inquiry.items.map((item) => <li key={item.id}><span className="workspace-product-icon"><Icon /></span><div><strong>{item.name}</strong><span>{item.sku || 'Без артикула'} · {item.source === 'demo' ? 'Синтетическая позиция' : item.source === 'official' ? 'Публичная серия; исполнение уточняется' : 'Данные из локальной подборки'}</span></div><b>{item.quantity} шт.</b></li>)}</ul> : <p className="workspace-fine">Запрос без выбранного оборудования. Требования можно описать текстом.</p>}<p className="workspace-fine">Исполнение, параметры, стоимость и сроки уточняются по реальному запросу.{inquiry.items.some((item) => item.source === 'demo') && ' Синтетические позиции условные и не подходят для проектирования или заказа.'}</p></section>
    {!editable && <section className="workspace-panel"><h3>Задача и контактные данные</h3><p className="workspace-request-text">{inquiry.text || 'Описание пока не добавлено.'}</p><dl className="workspace-contact"><div><dt>Компания</dt><dd>{inquiry.company || 'Не указана'}</dd></div><div><dt>Контактное лицо</dt><dd>{inquiry.contactName || 'Не указано'}</dd></div><div><dt>Email</dt><dd>{inquiry.email || 'Не указан'}</dd></div><div><dt>Телефон</dt><dd>{inquiry.phone || 'Не указан'}</dd></div></dl><h4>Названия документов · без файлов</h4>{inquiry.documents.length ? <ul className="workspace-documents">{inquiry.documents.map((name) => <li key={name}><Icon /><span>{name}</span><small>Только имя</small></li>)}</ul> : <p className="workspace-fine">Имена документов не добавлены.</p>}<p className="workspace-fine">Для реального запроса коммерческого предложения понадобятся документы компании. Точный перечень, момент предоставления и порядок проверки пока не определены. Здесь сохранены только названия: файлы не загружены и недоступны для просмотра.</p></section>}
    {inquiry.comments.length > 0 && <section className="workspace-panel"><div className="workspace-section-heading"><h3>Локальные комментарии</h3><span className="catalog-meta">{inquiry.comments.length}</span></div><ol className="workspace-comments">{inquiry.comments.map((comment) => <li key={comment.id} className={`from-${comment.role}`}><div><strong>{comment.role === 'manager' ? 'Демо-менеджер' : 'Демо-заказчик'}</strong><time dateTime={comment.createdAt}>{dateLabel(comment.createdAt)}</time></div><p>{comment.text}</p></li>)}</ol></section>}
    {editable && <CustomerEditor key={`${inquiry.id}:${inquiry.updatedAt}`} inquiry={inquiry} onChange={onChange} />}
    {role === 'manager' && <ManagerEditor key={`${inquiry.id}:${inquiry.updatedAt}`} inquiry={inquiry} onChange={onChange} />}
    <section className="workspace-panel"><h3>История в этом браузере</h3><ol className="workspace-history">{[...inquiry.history].reverse().map((event) => <li key={event.id}><span className="workspace-history-dot" /><div><strong>{event.text}</strong><span>{event.role === 'manager' ? 'Демо-менеджер' : 'Демо-заказчик'} · {dateLabel(event.createdAt)}</span></div></li>)}</ol></section>
    <div className="workspace-delete">{confirmRemove ? <div role="group" aria-label="Подтверждение удаления запроса"><p>Удалить этот локальный запрос и его историю? Отменить удаление нельзя.</p><button className="catalog-button compact" onClick={() => onDelete(inquiry.id)}>Да, удалить запрос</button><button className="catalog-button compact" onClick={() => setConfirmRemove(false)}>Отмена</button></div> : <button className="text-button" onClick={() => setConfirmRemove(true)}>Удалить этот локальный запрос</button>}</div>
  </article>;
}

export default function Workspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { inquiries, corrupt, storageUnavailable } = useInquiries();
  const [role, setRole] = useState('customer');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const requestedId = searchParams.get('request');
  const visible = inquiries.filter((inquiry) => (filter === 'all' || inquiry.status === filter) && `${inquiry.subject} ${inquiry.company} ${shortId(inquiry.id)}`.toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru')));
  const selected = requestedId ? inquiries.find((inquiry) => inquiry.id === requestedId) : visible[0];
  function openRequest(id) { router.push(`/workspace?request=${encodeURIComponent(id)}`, { scroll: false }); setNotice(''); setError(''); }
  function showChange(message) { setNotice(message); setError(''); }
  function addSample() {
    try { const id = saveInquiry(createDemoInquiry()); setFilter('all'); setSearch(''); openRequest(id); setNotice('Синтетический пример создан. Все имена, товары и документы учебные.'); }
    catch (reason) { setError(reason.message); }
  }
  function deleteRequest(id) {
    try { removeInquiry(id); router.replace('/workspace', { scroll: false }); showChange('Локальный запрос удалён из этого браузера.'); }
    catch (reason) { setError(reason.message); }
  }
  function reset() {
    try { clearInquiries(); setConfirmReset(false); router.replace('/workspace', { scroll: false }); showChange('Все локальные демо-запросы удалены. Можно начать заново.'); }
    catch (reason) { setError(reason.message); }
  }
  return <div className="catalog-page workspace-page"><nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/">Главная</Link><span>/</span><span aria-current="page">Демо-кабинет</span></nav>
    <header className="catalog-heading workspace-heading"><div><p className="catalog-kicker">ЛОКАЛЬНЫЙ ДЕМО-СЦЕНАРИЙ</p><h1>От задачи<br /><span>к демо-ответу</span></h1></div><div><p>Соберите запрос, уточните детали и посмотрите, как мог бы выглядеть диалог заказчика и менеджера.</p><Link className="catalog-button" href="/inquiry">Новый запрос<Icon kind="arrow" /></Link></div></header>
    <div className="workspace-safety"><Icon kind="shield" /><div><strong>Это демонстрация, а не личный кабинет клиента</strong><p>Данные хранятся только в этом браузере. Запросы, документы и ответы не отправляются в ALAGEUM. Роли переключаются без авторизации. Очистка данных браузера удалит историю; на другом устройстве она не появится.</p></div><span className="workspace-demo-tag">DEMO</span></div>
    {storageUnavailable && <p className="workspace-error" role="alert">Локальное хранилище недоступно. Сохранение изменений не работает. Разрешите хранение данных в настройках браузера или откройте обычное окно.</p>}
    {corrupt && <div className="workspace-error" role="alert"><p>Локальные демо-данные повреждены. Можно сбросить их и начать заново.</p><button className="catalog-button compact" onClick={() => setConfirmReset(true)}>Сбросить демо-данные</button></div>}
    <div className="workspace-toolbar"><div className="workspace-role" role="group" aria-label="Демонстрационная роль"><button type="button" aria-pressed={role === 'customer'} onClick={() => { setRole('customer'); setNotice(''); }}>Заказчик</button><button type="button" aria-pressed={role === 'manager'} onClick={() => { setRole('manager'); setNotice(''); }}>Демо-менеджер</button></div><p>{role === 'customer' ? 'Ваша учебная заявка и её локальный статус' : 'Учебная проверка и комментарии от вашего имени'}</p><button className="text-button" onClick={() => setConfirmReset(true)} disabled={!inquiries.length && !corrupt}>Сбросить демо-данные</button></div>
    {confirmReset && <div className="workspace-confirm" role="group" aria-label="Подтверждение сброса"><div><strong>Удалить все демо-запросы из этого браузера?</strong><p>Удалятся запросы, контактные данные, названия документов, комментарии и история. Отменить сброс нельзя.</p></div><div className="workspace-actions"><button className="catalog-button primary" onClick={reset}>Удалить все демо-запросы</button><button className="catalog-button" onClick={() => setConfirmReset(false)}>Отмена</button></div></div>}
    <p className="workspace-feedback" role="status" aria-live="polite">{notice}</p>{error && <p className="workspace-error" role="alert">{error}</p>}
    {requestedId && !selected && inquiries.length === 0 && <p className="workspace-error" role="status">Запрос по этой ссылке не найден в данном браузере. Ссылка не переносит данные между устройствами.</p>}
    {inquiries.length === 0 && !corrupt ? <section className="workspace-empty"><div className="workspace-empty-art" aria-hidden="true"><span>01</span><Icon /><i /><span>02</span><Icon /><i /><span>03</span></div><p className="catalog-kicker">ПЕРВЫЙ ШАГ</p><h2>Начните с одного запроса</h2><p>Создайте запрос из подборки или откройте вымышленный пример. Затем переключайте роли и пройдите весь путь: от черновика до учебного ответа.</p><div className="workspace-actions"><Link className="catalog-button primary" href="/inquiry">Создать запрос<Icon kind="arrow" /></Link><button className="catalog-button" onClick={addSample}>Открыть демо-пример</button></div><div className="workspace-empty-steps"><div><b>01 / Заказчик</b><span>Задача, подборка и имена документов</span></div><div><b>02 / Демо-менеджер</b><span>Проверка, уточнение и комментарий</span></div><div><b>03 / Заказчик</b><span>Ответ на уточнение и история запроса</span></div></div></section> : !corrupt && <div className="workspace-layout"><aside className="workspace-sidebar" aria-label="Локальные запросы"><div className="workspace-list-heading"><h2>Мои запросы</h2><span>{inquiries.length}</span></div><label className="workspace-search"><span className="sr-only">Поиск локальных запросов</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Тема, компания или номер" /></label><label className="workspace-filter"><span className="sr-only">Фильтр по этапу</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Все этапы</option>{WORKSPACE_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label><div className="workspace-request-list">{visible.length ? visible.map((inquiry) => <button type="button" key={inquiry.id} className={`workspace-request-card ${selected?.id === inquiry.id ? 'is-active' : ''}`} aria-current={selected?.id === inquiry.id ? 'true' : undefined} onClick={() => openRequest(inquiry.id)}><span className="workspace-card-meta">{shortId(inquiry.id)}<span>{new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(inquiry.createdAt))}</span></span><strong>{inquiry.subject}</strong><span className="workspace-card-company">{inquiry.company || 'Компания не указана'}</span><Status status={inquiry.status} /></button>) : <div className="workspace-list-empty"><p>По этим условиям запросов нет.</p><button className="text-button" onClick={() => { setSearch(''); setFilter('all'); }}>Сбросить фильтры</button></div>}</div><button className="workspace-add-sample" onClick={addSample}>＋ Добавить учебный пример</button><p className="workspace-fine">До 50 запросов в этом браузере. Не используйте демо-кабинет для хранения настоящих документов.</p></aside>
      {selected ? <InquiryDetail key={selected.id} inquiry={selected} role={role} onChange={showChange} onDelete={deleteRequest} /> : <section className="workspace-missing"><Icon /><h2>{requestedId ? 'Запрос не найден' : 'Нет запросов по фильтру'}</h2><p>{requestedId ? 'Этот запрос не сохранён в данном браузере или уже удалён. Ссылка не переносит данные между устройствами.' : 'Измените фильтры или создайте новый локальный запрос.'}</p>{requestedId && <button className="catalog-button" onClick={() => router.replace('/workspace', { scroll: false })}>Показать доступные запросы</button>}</section>}
    </div>}
    <footer className="workspace-footnote"><span>Демонстрационный процесс. Реальные правила согласования и сроки не определены.</span><Link href="/contacts">Официальные контакты<Icon kind="arrow" /></Link></footer>
  </div>;
}
