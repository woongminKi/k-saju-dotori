import { MascotLoader } from '../../components/MascotLoader';

export default function ResultLoading() {
  return (
    <section aria-busy="true" aria-live="polite">
      <MascotLoader hint="Dotori is reading your fortune with care. This can take about 20 seconds." />
    </section>
  );
}
