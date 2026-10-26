// Logo aplikasi dari Pengaturan aplikasi: gambar logo bila diunggah, selain itu huruf pertama nama.
export default function Logo({ app }) {
  const showName = !app.logo_url || app.show_name !== '0';
  return (
    <span className="logo">
      {app.logo_url ? (
        <img className="logo-img" src={app.logo_url} alt={showName ? '' : app.app_name} />
      ) : (
        <span className="logo-mark" aria-hidden="true">{app.app_name[0]}</span>
      )}
      {showName && app.app_name}
    </span>
  );
}
