import type { Metadata } from "next";
import FormularioTurno from "@/components/FormularioTurno";

export const metadata: Metadata = {
  title: "Asignar turno · TurnoMonitores · Universidad de Caldas",
  description:
    "Formulario para que el coordinador de sede asigne turnos de monitoría en salones de la Universidad de Caldas.",
};

export default function FormularioTurnoPage() {
  return <FormularioTurno />;
}
