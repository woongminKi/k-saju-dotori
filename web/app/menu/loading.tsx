import { MascotLoader } from '../../components/MascotLoader';

export default function MenuLoading() {
  return (
    <section aria-busy="true" aria-live="polite">
      <MascotLoader />
    </section>
  );
}
