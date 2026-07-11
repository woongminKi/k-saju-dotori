import { BirthForm } from '../../components/BirthForm';

export default function InputPage() {
  return (
    <section className="space-y-6">
      <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-sand">
        <span aria-hidden="true" className="text-6xl">🔮</span>
      </div>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-extrabold text-acorn-dark">Tell Dotori your birthday</h1>
        <p className="text-sm text-bark/70">
          Just your birth date, time, and place — that&apos;s all the acorn needs.
        </p>
      </div>
      <BirthForm />
    </section>
  );
}
