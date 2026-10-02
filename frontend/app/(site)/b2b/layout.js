import B2BNav from "@/components/B2BNav";

export default function B2BLayout({ children }) {
  return <div className="shell"><B2BNav /><section>{children}</section></div>;
}

