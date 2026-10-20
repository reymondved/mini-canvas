// The Eng Academy logo (the dino mascot) + name. Used in the sidebar, login page and public pages.
// light: for blue backgrounds; the mascot sits on a white tile so its blue lines stay visible.
export default function Logo({ light = false }) {
  return (
    <span className={light ? 'logo logo-light' : 'logo'}>
      <img src="/logo.png" alt="" width="40" height="40" />
      <span>Eng Academy</span>
    </span>
  );
}
