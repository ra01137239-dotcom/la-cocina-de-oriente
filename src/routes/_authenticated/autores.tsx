
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen,
  Code2,
  GraduationCap,
  HeartHandshake,
  Laptop,
  Lightbulb,
  Users,
  Camera,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/autores")({
  head: () => ({
    meta: [
      {
        title: "Nuestros Autores — La Cocina de Oriente POS",
      },
      {
        name: "description",
        content:
          "Conoce a los integrantes responsables del desarrollo del sistema La Cocina de Oriente.",
      },
    ],
  }),
  component: Autores,
});

// ========================================
// INFORMACIÓN DE LOS INTEGRANTES
// ========================================

type Autor = {
  nombre: string;
  imagen: string;
  iniciales: string;
  descripcion: string;
};

const AUTORES: Autor[] = [
  {
    nombre: "Willian Antonio Romero",
    imagen: "willian.jpeg",
    iniciales: "WR",
    descripcion:
      "Fue el encargado de la programación y el desarrollo técnico del sistema, participando en la implementación de las funcionalidades, la conexión y gestión de la base de datos, así como en la solución de aspectos relacionados con el área informática.",
  },
  {
    nombre: "Noemí Marisol Mejía",
    imagen: "noemi.jpeg",
    iniciales: "NM",
    descripcion:
      "Fue la responsable de elaborar y organizar la documentación del proyecto, dando seguimiento a los documentos requeridos durante las diferentes etapas de desarrollo y contribuyendo a mantener organizada la información del sistema.",
  },
  {
    nombre: "Diana Beatriz Pérez",
    imagen: "diana.jpg",
    iniciales: "DP",
    descripcion:
      "Fue la encargada del diseño visual y la presentación del sistema, trabajando en los estilos, colores, distribución de los elementos y experiencia de usuario. También colaboró en la elaboración y organización de la documentación del proyecto.",
  },
];

// ========================================
// COMPONENTE DE FOTOGRAFÍA
// ========================================

function FotoAutor({ autor }: { autor: Autor }) {
  const [errorImagen, setErrorImagen] = useState(false);

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-2xl border border-border bg-brand/5">

      {!errorImagen ? (
        <img
          src={autor.imagen}
          alt={`Fotografía de ${autor.nombre}`}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          onError={() => setErrorImagen(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-brand/5 p-5 text-center">

          <div className="grid h-24 w-24 place-items-center rounded-full bg-brand text-3xl font-extrabold text-white shadow-lg">
            {autor.iniciales}
          </div>

          <Camera className="h-6 w-6 text-brand" />

          <p className="text-sm font-semibold text-foreground">
            Fotografía pendiente
          </p>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Coloca la fotografía en la carpeta public/autores.
          </p>
        </div>
      )}

      <div className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-brand/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
        Equipo de desarrollo
      </div>
    </div>
  );
}

// ========================================
// PÁGINA PRINCIPAL DE AUTORES
// ========================================

function Autores() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">

      {/* ENCABEZADO PRINCIPAL */}
      <section className="relative overflow-hidden rounded-2xl bg-brand px-5 py-10 text-brand-foreground shadow-lifted sm:px-10 sm:py-14">

        {/* Elementos decorativos */}
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-white/10" />

        <div className="pointer-events-none absolute -bottom-20 -right-5 h-64 w-64 rounded-full border border-white/10" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">

          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-white/10">
            <Users className="h-7 w-7 text-amber-300" />
          </div>

          <span className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
            La Cocina de Oriente
          </span>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Conoce a nuestros autores
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-brand-foreground/80 sm:text-base">
            Detrás de cada proyecto existe un equipo de personas
            comprometidas con transformar ideas en soluciones.
            Conoce a los integrantes que hicieron posible el
            desarrollo de este sistema.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">

            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium">
              <GraduationCap className="h-4 w-4 text-amber-300" />
              Práctica Profesional
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium">
              <Code2 className="h-4 w-4 text-amber-300" />
              Desarrollo de software
            </span>

          </div>
        </div>
      </section>

      {/* PRESENTACIÓN DEL EQUIPO */}
      <section className="space-y-2 text-center">

        <h2 className="text-2xl font-extrabold tracking-tight">
          Nuestro equipo de desarrollo
        </h2>

        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Conoce a las personas que participaron en la planificación,
          diseño y desarrollo de La Cocina de Oriente.
        </p>

      </section>

      {/* TARJETAS DE AUTORES */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

        {AUTORES.map((autor, index) => (
          <article
            key={autor.nombre}
            className="group overflow-hidden rounded-2xl border bg-card p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lifted sm:p-5"
          >

            {/* NÚMERO DEL INTEGRANTE */}
            <div className="mb-4 flex items-center justify-between">

              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Integrante {String(index + 1).padStart(2, "0")}
              </span>

              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand">
                <Code2 className="h-5 w-5" />
              </div>

            </div>

            {/* FOTOGRAFÍA */}
            <FotoAutor autor={autor} />

            {/* INFORMACIÓN DEL AUTOR */}
            <div className="mt-5 space-y-3">

              <div>

                <h3 className="text-lg font-extrabold leading-snug tracking-tight">
                  {autor.nombre}
                </h3>

                <p className="mt-1 text-xs font-semibold text-brand">
                  Integrante del equipo de desarrollo
                </p>

              </div>

              <div className="h-px bg-border" />

              <p className="text-sm leading-relaxed text-muted-foreground">
                {autor.descripcion}
              </p>

              <div className="flex items-center gap-2 pt-1 text-xs font-medium text-muted-foreground">

                <Laptop className="h-4 w-4 text-brand" />

                Desarrollo del sistema POS

              </div>

            </div>

          </article>
        ))}

      </section>

      {/* RECONOCIMIENTO AL TRABAJO EN EQUIPO */}
      <section className="rounded-2xl border bg-card p-6 shadow-soft sm:p-8">

        <div className="mx-auto max-w-3xl text-center">

          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
            <HeartHandshake className="h-6 w-6" />
          </div>

          <h2 className="text-xl font-extrabold">
            Un proyecto construido en equipo
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            La Cocina de Oriente representa el esfuerzo, la
            colaboración y los conocimientos adquiridos durante
            el proceso de formación profesional. Este proyecto
            busca aportar una herramienta tecnológica que facilite
            la administración de las actividades del negocio.
          </p>

          <div className="mt-5 flex items-center justify-center gap-2 text-brand">

            <Lightbulb className="h-5 w-5" />

            <span className="text-sm font-semibold">
              Tecnología, innovación y trabajo en equipo
            </span>

          </div>

        </div>
      </section>

      {/* IDENTIDAD UNIVERSITARIA */}
      <footer className="rounded-2xl bg-brand p-6 text-center text-brand-foreground shadow-soft sm:p-8">

        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-amber-300/50 text-sm font-extrabold tracking-wider text-amber-300">
          ULS
        </div>

        <h2 className="text-lg font-extrabold">
          Universidad Luterana Salvadoreña
        </h2>

        <p className="mt-1 text-sm text-brand-foreground/75">
          Práctica Profesional Informática
        </p>

        <div className="mx-auto my-4 h-px max-w-xs bg-white/20" />

        <div className="flex items-center justify-center gap-2 text-xs text-brand-foreground/70">

          <BookOpen className="h-4 w-4" />

          <span>Proyecto académico · La Cocina de Oriente</span>

        </div>

        <p className="mt-3 text-xs text-brand-foreground/60">
          © {new Date().getFullYear()} Universidad Luterana Salvadoreña.
          Todos los derechos reservados.
        </p>

      </footer>

    </div>
  );
}
