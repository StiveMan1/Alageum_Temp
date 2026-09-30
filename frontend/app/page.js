import Link from "next/link";

export default function HomePage() {
  return (
    <section className="hero">
      <p className="muted">Корпоративная B2B-платформа</p>
      <h1>Информационный и клиентский контур ALAGEUM.COM</h1>
      <p>Нейтральный функциональный shell до завершения Discovery и разработки итоговой дизайн-системы.</p>
      <Link className="button" href="/catalog">Открыть тестовый каталог</Link>
    </section>
  );
}

