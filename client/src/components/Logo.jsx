// The Eng Academy logo + name. Used in the sidebar, login page and public pages.
export default function Logo({ light = false }) {
  return (
    <span className={light ? 'logo logo-light' : 'logo'}>
      <img src="/logo.svg" alt="" width="36" height="36" />
      <span>Eng Academy</span>
    </span>
  );
}
