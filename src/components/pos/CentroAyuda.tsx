
import { useState } from "react";
import {
  ShoppingCart,
  Package,
  ClipboardList,
  History,
  Users,
  ShieldCheck,
  Database,
  Code2,
  CircleHelp,
  PlusCircle,
  Save,
  Printer,
  CreditCard,
  Search,
  Pencil,
  Trash2,
  Eye,
  ArrowLeft,
  BookOpen,
  ChefHat,
  CheckCircle2,
  FileText,
  Truck,
} from "lucide-react";

const modulos = [
  {
    id: "pos",
    nombre: "Punto de Venta",
    icono: ShoppingCart,
    descripcion:
      "Permite registrar las ventas, seleccionar productos del menú, gestionar pedidos y realizar los cobros de los clientes.",
    funciones: [
      {
        nombre: "Agregar producto",
        descripcion:
          "Añade un alimento o bebida al pedido actual. Selecciona el producto y se agregará automáticamente al detalle de la venta.",
        icono: PlusCircle,
      },
      {
        nombre: "Guardar pedido",
        descripcion:
          "Registra el pedido actual para conservarlo y continuar con su atención posteriormente.",
        icono: Save,
      },
      {
        nombre: "Ticket de cocina",
        descripcion:
          "Genera e imprime la comanda con los productos y cantidades que el personal de cocina debe preparar.",
        icono: ChefHat,
      },
      {
        nombre: "Pagar e imprimir ticket",
        descripcion:
          "Permite finalizar la venta, registrar el método de pago y generar el comprobante para el cliente.",
        icono: CreditCard,
      },
      {
        nombre: "Comedor y para llevar",
        descripcion:
          "Permite indicar si el pedido será consumido en el establecimiento o si será preparado para llevar.",
        icono: Truck,
      },
      {
        nombre: "Buscar productos",
        descripcion:
          "Facilita la localización de alimentos y bebidas mediante el buscador y las categorías disponibles.",
        icono: Search,
      },
    ],
  },
  {
    id: "inventario",
    nombre: "Inventario",
    icono: Package,
    descripcion:
      "Permite administrar los productos e insumos utilizados en el negocio, controlar las existencias y consultar sus movimientos.",
    funciones: [
      {
        nombre: "Registrar productos e insumos",
        descripcion:
          "Permite incorporar nuevos productos y materias primas al inventario con sus respectivos datos.",
        icono: PlusCircle,
      },
      {
        nombre: "Editar información",
        descripcion:
          "Permite actualizar los datos de los productos, cantidades, unidades y demás información registrada.",
        icono: Pencil,
      },
      {
        nombre: "Controlar existencias",
        descripcion:
          "Permite consultar las cantidades disponibles y verificar el estado actual del inventario.",
        icono: Eye,
      },
      {
        nombre: "Alertas de inventario",
        descripcion:
          "Facilita la identificación de insumos que han alcanzado su nivel mínimo de existencia.",
        icono: CircleHelp,
      },
    ],
  },
  {
    id: "pedidos",
    nombre: "Pedidos Activos",
    icono: ClipboardList,
    descripcion:
      "Permite visualizar y administrar los pedidos que todavía se encuentran pendientes de atención o preparación.",
    funciones: [
      {
        nombre: "Consultar pedidos",
        descripcion:
          "Muestra los pedidos registrados y sus respectivos detalles.",
        icono: Eye,
      },
      {
        nombre: "Revisar detalles",
        descripcion:
          "Permite consultar los productos, cantidades, mesa y total de cada pedido.",
        icono: FileText,
      },
      {
        nombre: "Eliminar pedido",
        descripcion:
          "Permite eliminar un pedido cuando corresponde y según los permisos del usuario.",
        icono: Trash2,
      },
    ],
  },
  {
    id: "historial",
    nombre: "Historial de Pedidos",
    icono: History,
    descripcion:
      "Permite consultar los pedidos registrados anteriormente y revisar la información de las ventas realizadas.",
    funciones: [
      {
        nombre: "Consultar historial",
        descripcion:
          "Muestra los pedidos registrados anteriormente.",
        icono: Eye,
      },
      {
        nombre: "Ver información de ventas",
        descripcion:
          "Permite revisar los detalles de cada pedido, sus productos, cantidades y total.",
        icono: FileText,
      },
      {
        nombre: "Consultar pagos",
        descripcion:
          "Facilita la revisión de los pedidos pagados y sus métodos de pago registrados.",
        icono: CreditCard,
      },
    ],
  },
  {
    id: "usuarios",
    nombre: "Usuarios",
    icono: Users,
    descripcion:
      "Permite administrar las cuentas de las personas que tienen acceso al sistema y gestionar sus permisos.",
    funciones: [
      {
        nombre: "Consultar usuarios",
        descripcion:
          "Muestra las cuentas registradas en el sistema.",
        icono: Eye,
      },
      {
        nombre: "Administrar usuarios",
        descripcion:
          "Permite gestionar la información y los accesos de los usuarios según el rol asignado.",
        icono: Pencil,
      },
      {
        nombre: "Controlar accesos",
        descripcion:
          "Permite gestionar la aprobación de usuarios y sus respectivos permisos.",
        icono: ShieldCheck,
      },
    ],
  },
  {
    id: "auditoria",
    nombre: "Auditoría",
    icono: ShieldCheck,
    descripcion:
      "Permite supervisar y consultar las actividades realizadas dentro del sistema para mantener un registro de los cambios.",
    funciones: [
      {
        nombre: "Consultar registros",
        descripcion:
          "Permite revisar las operaciones y actividades almacenadas en los registros de auditoría.",
        icono: Eye,
      },
      {
        nombre: "Revisar modificaciones",
        descripcion:
          "Facilita la identificación de los cambios realizados, el usuario responsable y la información relacionada.",
        icono: FileText,
      },
    ],
  },
  {
    id: "copias",
    nombre: "Copia de Seguridad",
    icono: Database,
    descripcion:
      "Permite gestionar las copias de seguridad de la información del sistema para facilitar su respaldo y recuperación.",
    funciones: [
      {
        nombre: "Generar copia de seguridad",
        descripcion:
          "Permite crear un respaldo de la información disponible en el sistema.",
        icono: Save,
      },
      {
        nombre: "Consultar respaldos",
        descripcion:
          "Permite revisar las copias de seguridad generadas.",
        icono: Eye,
      },
    ],
  },
  {
    id: "autores",
    nombre: "Autores",
    icono: Code2,
    descripcion:
      "Permite consultar información relacionada con los integrantes y el desarrollo del proyecto.",
    funciones: [
      {
        nombre: "Información del proyecto",
        descripcion:
          "Presenta información relacionada con los autores y el desarrollo del sistema.",
        icono: BookOpen,
      },
    ],
  },
];

export function CentroAyuda() {
  const [seleccionado, setSeleccionado] = useState("pos");

  const modulo = modulos.find(
    (item) => item.id === seleccionado
  )!;

  const IconoModulo = modulo.icono;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 pb-8">

      {/* ENCABEZADO */}
      <section className="relative overflow-hidden rounded-2xl bg-[#103b30] px-5 py-8 text-white shadow-lg sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute right-10 top-10 h-40 w-40 rounded-full border border-white/10" />

        <div className="relative z-10 flex flex-col items-center gap-6 md:flex-row md:justify-between">

          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <BookOpen className="h-7 w-7 text-[#f5a623]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5b942]">
                La Cocina de Oriente
              </span>
            </div>

            <h1 className="text-3xl font-extrabold sm:text-4xl md:text-5xl">
              Centro de Ayuda
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
              Aprende a utilizar cada módulo de nuestro sistema
              de gestión gastronómica mediante esta guía de
              funciones y herramientas.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/90">
              <CircleHelp className="h-4 w-4 text-[#f5b942]" />
              Guía de uso del sistema
            </div>
          </div>

          {/* ILUSTRACIÓN */}
          <div className="flex w-full justify-center md:w-[38%]">
            <div className="relative flex h-44 w-52 items-center justify-center sm:h-52 sm:w-60">
              <div className="absolute h-40 w-40 rounded-full bg-[#f4bd60] sm:h-48 sm:w-48" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-2 rounded-full bg-white p-4 shadow-lg">
                  <ChefHat className="h-12 w-12 text-[#174b39] sm:h-14 sm:w-14" />
                </div>

                <div className="rounded-xl border-4 border-[#315c43] bg-white px-5 py-3 shadow-xl">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-[#315c43]" />
                    <div>
                      <p className="text-sm font-extrabold text-[#174b39]">
                        ¿Necesitas ayuda?
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Estamos para orientarte
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <span className="absolute right-0 top-1 text-3xl text-white">
                ✦
              </span>
              <span className="absolute left-0 top-8 text-2xl text-[#f5a623]">
                ✨
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[235px_minmax(0,1fr)]">

        {/* MENÚ DE MÓDULOS */}
        <aside className="rounded-2xl border bg-card p-3 shadow-sm">
          <div className="px-2 pb-3">
            <h2 className="font-bold text-foreground">
              Manuales del sistema
            </h2>
            <p className="text-xs text-muted-foreground">
              Selecciona un módulo
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
            {modulos.map((item) => {
              const Icono = item.icono;
              const activo = seleccionado === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSeleccionado(item.id)}
                  className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-3 text-left text-xs font-semibold transition-all sm:text-sm ${
                    activo
                      ? "bg-[#315c43] text-white shadow-md"
                      : "text-muted-foreground hover:bg-[#315c43]/10 hover:text-[#315c43]"
                  }`}
                >
                  <Icono className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 leading-tight">
                    {item.nombre}
                  </span>
                  {activo && (
                    <CheckCircle2 className="hidden h-4 w-4 shrink-0 sm:block" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* MANUAL DEL MÓDULO */}
        <section className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">

          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-[#315c43]/10 p-3">
              <IconoModulo className="h-7 w-7 text-[#315c43]" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#315c43]">
                Manual del módulo
              </p>
              <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">
                {modulo.nombre}
              </h2>
            </div>
          </div>

          {/* PARA QUÉ SIRVE */}
          <div className="mb-6 rounded-xl bg-[#315c43]/10 p-4">
            <div className="flex items-center gap-2">
              <CircleHelp className="h-5 w-5 shrink-0 text-[#315c43]" />
              <h3 className="font-bold text-foreground">
                ¿Para qué sirve?
              </h3>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {modulo.descripcion}
            </p>
          </div>

          {/* FUNCIONES */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#315c43]" />
              <h3 className="font-bold text-foreground">
                Funciones principales
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {modulo.funciones.map((funcion, index) => {
                const Icono = funcion.icono;

                return (
                  <article
                    key={index}
                    className="rounded-xl border border-[#315c43]/15 bg-background p-4 transition-all hover:border-[#315c43]/40 hover:shadow-md"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#315c43]/10">
                      <Icono className="h-5 w-5 text-[#315c43]" />
                    </div>

                    <h4 className="text-sm font-bold text-foreground">
                      {funcion.nombre}
                    </h4>

                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {funcion.descripcion}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          {/* CONSEJO */}
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#e7b44c]/40 bg-[#e7b44c]/10 p-4">
            <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-[#b78319]" />
            <div>
              <p className="text-sm font-bold text-foreground">
                Recomendación
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Utiliza las opciones disponibles según los permisos
                de tu cuenta. Si tienes dudas sobre alguna función,
                consulta este manual antes de realizar una operación.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* PIE */}
      <footer className="border-t py-5 text-center">
        <p className="text-sm font-semibold text-foreground">
          La Cocina de Oriente
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Centro de Ayuda · Sistema de Gestión Gastronómica
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Universidad Luterana Salvadoreña
        </p>
      </footer>
    </div>
  );
}
