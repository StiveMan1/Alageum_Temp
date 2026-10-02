import { quoteStatus } from '@/lib/quotes/model';
import { QUOTE_PRINT_NOTICE, QUOTE_PRINT_TITLE, quotePrintDate, quotePrintItem } from '@/lib/quotes/print';

export default function QuotePrintDocument({ quote, paper = false }) {
  return <article className="quote-print-document" data-quote-print-document={paper ? 'paper' : 'preview'}>
    <header className="quote-print-heading"><p className="quote-print-eyebrow">Сохранённый запрос покупателя</p><h1>{QUOTE_PRINT_TITLE}</h1><p className="quote-print-id">ID: {quote.id}</p><p>Дата сохранения: <time dateTime={quote.created_at}>{quotePrintDate(quote.created_at)}</time></p><p>Статус: {quoteStatus(quote.status)} · Позиций: {quote.items.length}</p></header>
    <p className="quote-print-notice">{QUOTE_PRINT_NOTICE}</p>
    {quote.comment && <section className="quote-print-comment"><h2>Сообщение покупателя</h2><p>{quote.comment}</p></section>}
    <section className="quote-print-items"><h2>Состав сохранённого запроса</h2><p className="quote-print-explanation">Данные приведены только из сохранённого запроса. Отсутствующие исторические сведения не заменяются актуальными данными каталога или профиля компании.</p>
      <ol>{quote.items.map((item, index) => {
        const line = quotePrintItem(item);
        return <li key={line.id} className="quote-print-item"><h3><span>{index + 1}. </span>{line.title}</h3>
          {line.missingSnapshot ? <p className="quote-print-missing">Историческая копия товара не сохранена. Название, артикул, цена и версия на дату запроса недоступны.</p> : line.missingName && <p className="quote-print-missing">Историческое название товара не сохранено.</p>}
          <dl><div><dt>Артикул</dt><dd>{line.sku}</dd></div><div><dt>Количество</dt><dd>{line.quantity}</dd></div><div><dt>Справочная цена за единицу</dt><dd>{line.price}</dd></div><div><dt>Версия товара</dt><dd>{line.version}</dd></div></dl>
          <p className="quote-print-product-id">ID товара: {line.productId}</p>
        </li>;
      })}</ol>
    </section>
    <footer className="quote-print-end">Конец запроса · ID: {quote.id}</footer>
  </article>;
}
