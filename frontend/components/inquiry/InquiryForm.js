'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { products } from '@/lib/catalog/data';
import { useSelection } from '@/components/catalog/SelectionProvider';
import { saveInquiry } from '@/lib/workspace/store';
import { SALES_EMAIL, SALES_PHONE, INQUIRY_INTENTS, FIELD_LIMITS, normalizeInquiry, validateInquiry, inquiryItems, documentNames, inquirySubject, buildInquiryText, buildEmailDraft } from '@/lib/inquiry/model';

function Field({ name, label, values, errors, onChange, wide, multiline, ...props }) {
  const id = `inquiry-${name}`;
  const inputProps = { id, name, value: values[name], onChange: (event) => onChange(name, event.target.value), maxLength: FIELD_LIMITS[name], 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${id}-error` : undefined, ...props };
  return <label className={`inquiry-field${wide ? ' wide' : ''}`} htmlFor={id}><span>{label}</span>{multiline ? <textarea {...inputProps} /> : <input {...inputProps} />}{errors[name] && <span id={`${id}-error`} className="inquiry-error">{errors[name]}</span>}</label>;
}

function Quantity({ item, onChange }) {
  const [draft, setDraft] = useState(String(item.quantity));
  function commit() {
    const quantity = Math.min(999, Math.max(1, Math.floor(Number(draft)) || 1));
    setDraft(String(quantity));
    onChange(quantity);
  }
  return <label className="inquiry-quantity"><span>Кол-во, шт.</span><input aria-label={`Количество ${item.sku}`} type="number" min="1" max="999" step="1" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} /></label>;
}

export default function InquiryForm({ initial }) {
  const selection = useSelection();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [documents, setDocuments] = useState([]);
  const [prepared, setPrepared] = useState(false);
  const [status, setStatus] = useState('');
  const [savedId, setSavedId] = useState('');
  const formRef = useRef(null);
  const previewRef = useRef(null);
  const textRef = useRef(null);
  const items = inquiryItems(selection.items, products);
  const text = buildInquiryText(values, items, documents);
  const emailDraft = buildEmailDraft(values, text);
  const hasDemo = items.some((item) => item.source === 'demo');

  function invalidate() { setPrepared(false); setStatus(''); }
  function change(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    invalidate();
  }
  function validate() {
    const nextErrors = validateInquiry(values);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) return true;
    setPrepared(false);
    setStatus('Проверьте отмеченные поля. Заявка не отправлялась.');
    formRef.current?.querySelector(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus();
    return false;
  }
  function prepare(event) {
    event.preventDefault();
    if (!validate()) return;
    setPrepared(true);
    setStatus('Текст готов к проверке. Выберите, как его сохранить или использовать. Ничего не отправлено.');
    window.setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }
  async function copy() {
    if (!validate()) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Текст скопирован. Вставьте его в письмо и отправьте самостоятельно.');
    } catch {
      textRef.current?.focus();
      textRef.current?.select();
      setStatus('Автоматическое копирование недоступно. Текст выделен: скопируйте его вручную.');
    }
  }
  function download() {
    if (!validate()) return;
    const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'alageum-project-inquiry.txt';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Файл TXT подготовлен к скачиванию. Заявка не отправлена.');
  }
  function saveLocal() {
    if (!validate()) return;
    try {
      const draft = normalizeInquiry(values);
      const id = saveInquiry({ id: savedId || undefined, subject: inquirySubject(draft), text, contactName: draft.contactName, company: draft.company, email: draft.email, phone: draft.phone, documents, items, status: 'draft' });
      setSavedId(id);
      setStatus('Черновик сохранён только в этом браузере. Откройте демо-кабинет, чтобы проверить сценарий рассмотрения.');
    } catch {
      setStatus('Не удалось сохранить черновик в браузере. Скачайте TXT или скопируйте текст, чтобы не потерять его.');
    }
  }
  const field = { values, errors, onChange: change };

  return <div className="catalog-page inquiry-page">
    <nav className="breadcrumbs" aria-label="Хлебные крошки"><Link href="/">Главная</Link><span>/</span><span>Запрос по проекту</span></nav>
    <div className="catalog-heading"><div><p className="catalog-kicker">ОТ ЗАДАЧИ К ОБОРУДОВАНИЮ</p><h1>Обсудим ваш проект</h1></div><p>Соберите исходные данные и состав оборудования.<br />Подготовьте понятный запрос для отдела продаж.</p></div>
    <div className="inquiry-note"><span className="notice-mark" aria-hidden="true">i</span><div><strong>Сначала подготовка, затем отправка вами.</strong> Эта форма формирует текст в браузере и не отправляет данные на сервер. Можно скачать запрос, скопировать его или открыть письмо в вашей почтовой программе. Контакты не сохраняются, пока вы сами не сохраните локальный черновик.</div></div>
    <div className="inquiry-layout">
      <div>
        <form className="inquiry-form" ref={formRef} onSubmit={prepare} noValidate>
          {Object.values(errors).some(Boolean) && <div className="inquiry-error-summary" role="alert">Проверьте поля, отмеченные красным. Нужны описание задачи, имя и хотя бы один контакт для ответа.</div>}
          <fieldset className="inquiry-section"><legend><span>01</span>Задача и объект</legend><p>Даже если спецификация ещё не готова, расскажите, что нужно вашему проекту. Обязательные поля отмечены *.</p>
            <div className="inquiry-fields">
              <label className="inquiry-field" htmlFor="inquiry-intent"><span>Цель обращения</span><select id="inquiry-intent" name="intent" value={values.intent} onChange={(event) => change('intent', event.target.value)}>{INQUIRY_INTENTS.map((intent) => <option value={intent.value} key={intent.value}>{intent.label}</option>)}</select></label>
              <Field {...field} name="project" label="Название проекта" placeholder="Например, подстанция для нового цеха" />
              <Field {...field} name="location" label="Место поставки / объекта" placeholder="Город, регион или страна" />
              <Field {...field} name="deadline" label="Планируемый срок" placeholder="Например, II квартал 2027 года" />
              {values.solution && <Field {...field} name="solution" label="Направление проекта" wide />}
              <Field {...field} name="description" label="Что требуется решить? *" placeholder="Назначение объекта, требуемая мощность и напряжение, условия эксплуатации, стадия проекта. Если параметры пока неизвестны, опишите задачу." multiline wide required />
            </div>
          </fieldset>
          <fieldset className="inquiry-section"><legend><span>02</span>Состав оборудования</legend><p>Добавьте позиции из каталога или оставьте подбор специалисту. Количество можно менять здесь.</p>
            {items.length ? <div className="inquiry-equipment">{items.map((item) => <div className="inquiry-item" key={item.id}><div><strong>{item.name}</strong><small>{item.sku} · {item.source === 'demo' ? 'Синтетический пример, не реальный товар' : item.source === 'official' ? 'Публичная серия; исполнение уточняется' : 'Позиция каталога'}</small></div><Quantity key={`${item.id}-${item.quantity}`} item={item} onChange={(quantity) => { if (quantity !== item.quantity) { selection.setQuantity(item.id, quantity); invalidate(); } }} /><button className="remove-item" type="button" aria-label={`Удалить ${item.sku}`} onClick={() => { selection.remove(item.id); invalidate(); }}>×</button></div>)}</div> : <div className="inquiry-empty"><p>Оборудование не выбрано. Это не мешает подготовить запрос: опишите задачу, и в письме появится просьба помочь с подбором.</p><Link className="catalog-button compact" href="/catalog" target="_blank" rel="noreferrer">Выбрать в каталоге ↗</Link><span className="inquiry-help"> Каталог откроется в новой вкладке; форма останется здесь.</span></div>}
            {items.length > 0 && <Link className="catalog-button compact" href="/catalog" target="_blank" rel="noreferrer">Дополнить подборку в новой вкладке ↗</Link>}
            {hasDemo && <p className="inquiry-error">В подборке есть синтетические тестовые позиции. В тексте запроса они будут отдельно отмечены; использовать их характеристики для проектирования нельзя.</p>}
            {selection.storageUnavailable && <p className="inquiry-help">Хранилище браузера недоступно. Подборка может исчезнуть после закрытия страницы.</p>}
          </fieldset>
          <fieldset className="inquiry-section"><legend><span>03</span>Документы к обсуждению</legend><p>Для запроса коммерческого предложения нужны документы компании. Точный перечень, этап передачи и порядок проверки уточняются с менеджером. Здесь можно отметить названия планируемых документов: техническое задание, спецификацию или карточку компании. Файлы не читаются и не загружаются. Не вводите банковские данные в описание проекта.</p>
            <label className="inquiry-field" htmlFor="inquiry-documents"><span>Выбрать файлы, чтобы добавить только их названия</span><input className="inquiry-file-input" id="inquiry-documents" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg" onChange={(event) => { const names = documentNames(event.target.files); setDocuments((current) => documentNames([...current, ...names])); event.target.value = ''; invalidate(); }} /><span className="inquiry-help">До 10 названий. При отправке письма вложения нужно добавить самостоятельно. Для банковских реквизитов и платёжных документов согласуйте канал передачи с менеджером.</span></label>
            {documents.length > 0 && <ul className="inquiry-documents" aria-label="Названия планируемых документов">{documents.map((name) => <li key={name}><span>{name}</span><button type="button" aria-label={`Убрать ${name}`} onClick={() => { setDocuments((current) => current.filter((item) => item !== name)); invalidate(); }}>×</button></li>)}</ul>}
          </fieldset>
          <fieldset className="inquiry-section"><legend><span>04</span>Контакт для ответа</legend><p>Укажите имя и email или телефон. Введённые контакты появятся в тексте, который вы сможете проверить перед использованием.</p>
            <div className="inquiry-fields"><Field {...field} name="contactName" label="Ваше имя *" autoComplete="name" required /><Field {...field} name="company" label="Компания" autoComplete="organization" /><Field {...field} name="email" label="Email" type="email" autoComplete="email" inputMode="email" placeholder="name@company.kz" /><Field {...field} name="phone" label="Телефон" type="tel" autoComplete="tel" inputMode="tel" placeholder="+7 …" /></div>
          </fieldset>
          <div className="inquiry-submit"><button type="submit" className="catalog-button primary">Подготовить текст запроса <span aria-hidden="true">→</span></button><p>Следующий шаг — проверка текста.<br />Эта кнопка ничего не отправляет.</p></div>
        </form>
        {prepared && <section ref={previewRef} className="inquiry-preview" aria-labelledby="inquiry-preview-heading"><p className="catalog-kicker">ПРОВЕРЬТЕ ПЕРЕД ИСПОЛЬЗОВАНИЕМ</p><h2 id="inquiry-preview-heading">Ваш запрос готов</h2><p>Проверьте состав и контакты. Чтобы изменить текст, поправьте поля выше и подготовьте его заново.</p><label className="inquiry-field" htmlFor="inquiry-preview-text"><span>Текст запроса</span><textarea id="inquiry-preview-text" readOnly ref={textRef} value={text} /></label><div className="inquiry-actions"><button type="button" className="catalog-button primary" onClick={copy}>Скопировать текст</button><button type="button" className="catalog-button" onClick={download}>Скачать TXT ↓</button><a className="catalog-button" href={emailDraft.href} onClick={(event) => { if (!validate()) event.preventDefault(); else setStatus('Почтовая программа может открыться. Проверьте письмо, добавьте вложения и отправьте его самостоятельно. Сайт не отслеживает отправку.'); }}>Открыть почтовую программу ↗</a></div><p className="inquiry-mail-note">Получатель: <strong>{SALES_EMAIL}</strong>. {emailDraft.includesBody ? 'В почтовую программу передаётся текст запроса с указанными контактами.' : 'Запрос слишком большой для надёжной передачи через ссылку. Откроется только тема письма: скопируйте и вставьте текст самостоятельно.'} Файлы не прикрепляются автоматически. Если программа не открылась, создайте письмо вручную. Открытие программы не означает отправку.</p><div className="inquiry-local-save"><p><strong>Посмотреть путь заявки в демо-кабинете?</strong><br />Сохраните черновик с контактами и названиями документов только в этом браузере. Его увидит любой, кто пользуется этим профилем браузера; удалить его можно в демо-кабинете. Для проверки используйте тестовые данные.</p><button className="catalog-button" type="button" onClick={saveLocal}>{savedId ? 'Обновить локальный черновик' : 'Сохранить локальный черновик'}</button>{savedId && <p><Link href={`/workspace?request=${encodeURIComponent(savedId)}`}>Открыть черновик в демо-кабинете →</Link></p>}</div></section>}
        <p className="inquiry-status" role="status" aria-live="polite">{status}</p>
      </div>
      <aside className="inquiry-sidebar"><p className="catalog-kicker">ПРОСТОЙ СЛЕДУЮЩИЙ ШАГ</p><h2>От описания задачи<br />к предметному разговору</h2><ol className="inquiry-steps"><li>Опишите объект, сроки и технические требования</li><li>Проверьте оборудование и контактные данные</li><li>Сохраните текст или откройте письмо и отправьте его сами</li></ol><div className="inquiry-sales"><p>Публичные контакты отдела продаж</p><a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a><a href="tel:+77710052222">{SALES_PHONE}</a><a href="https://alageum.com/ru/" target="_blank" rel="noreferrer">Источник контактов: официальный сайт ↗</a></div></aside>
    </div>
  </div>;
}
