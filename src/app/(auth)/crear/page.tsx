import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Crear perfil" };

export default function CrearPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-extrabold uppercase tracking-[2px] text-accent">
          Predicciones del Mundial
        </span>
        <h1 className="font-display text-4xl font-extrabold italic uppercase leading-[0.92] text-fg">
          Crea tu perfil
        </h1>
        <p className="mt-1 text-sm text-muted">
          Un solo perfil para todas tus quinielas. Sin contraseñas complicadas.
        </p>
      </header>
      <RegisterForm />
    </div>
  );
}
