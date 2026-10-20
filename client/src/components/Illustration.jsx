// Our own simple drawing for the welcome banner and login page: a stack of books and a cap.
// Made of basic shapes (rectangles, a path), so it's tiny and scales to any size.
export default function Illustration({ className = 'welcome-art' }) {
  return (
    <svg className={className} viewBox="0 0 200 140" aria-hidden="true">
      {/* soft circle behind everything */}
      <circle cx="120" cy="78" r="58" fill="#ffffff" opacity="0.15" />
      {/* bottom book */}
      <rect x="40" y="98" width="120" height="22" rx="5" fill="#1e40af" />
      <rect x="46" y="103" width="108" height="5" rx="2" fill="#bfdbfe" />
      {/* middle book */}
      <rect x="52" y="76" width="104" height="22" rx="5" fill="#ffffff" />
      <rect x="58" y="81" width="92" height="5" rx="2" fill="#93c5fd" />
      {/* top book */}
      <rect x="62" y="56" width="86" height="20" rx="5" fill="#60a5fa" />
      <rect x="68" y="61" width="74" height="4" rx="2" fill="#dbeafe" />
      {/* graduation cap on top */}
      <path d="M105 22 70 37l35 15 35-15z" fill="#0f172a" />
      <path d="M86 44v9c0 4 9 7 19 7s19-3 19-7v-9l-19 8z" fill="#1e293b" />
      <path d="M138 38v14" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
      <circle cx="138" cy="54" r="3.5" fill="#fbbf24" />
    </svg>
  );
}
