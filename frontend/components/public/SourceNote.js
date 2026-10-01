export default function SourceNote({ href = 'https://alageum.com/ru', children = 'Официальный сайт ALAGEUM Electric', checkedAt = '30.09.2026' }) {
  return <p className="public-source"><span>Источник</span><a href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a><span>Проверено {checkedAt}</span></p>;
}
