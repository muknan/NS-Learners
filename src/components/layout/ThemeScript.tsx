export function ThemeScript() {
  const script = `
    (() => {
      try {
        const stored = localStorage.getItem('nsLearner.theme');
        const theme = stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      } catch {
        document.documentElement.dataset.theme = 'light';
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
