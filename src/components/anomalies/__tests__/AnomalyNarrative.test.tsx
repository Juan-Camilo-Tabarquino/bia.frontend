import React from "react";
import { render, screen } from "@testing-library/react";
import { AnomalyNarrative } from "../AnomalyNarrative";

/**
 * Small markdown sample shaped like a real backend `llm_analysis`: a bold
 * lead line, a heading, a list and a GFM table.
 */
const sample = [
  "**Análisis de la anomalía eléctrica – M-109**",
  "",
  "## Hallazgos",
  "",
  "- Consumo muy por encima de la línea base",
  "- Voltaje estable",
  "",
  "| Parámetro | Valor |",
  "| --- | --- |",
  "| Consumo | +240% |",
].join("\n");

describe("AnomalyNarrative", () => {
  it("renders markdown headings, bold text and GFM tables", () => {
    render(<AnomalyNarrative analysis={sample} />);

    expect(
      screen.getByRole("heading", { name: "Hallazgos" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Análisis de la anomalía eléctrica – M-109"),
    ).toBeInTheDocument();
    expect(screen.getByText("Consumo muy por encima de la línea base")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Parámetro" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "+240%" })).toBeInTheDocument();
  });

  it("labels the narrative region with an accessible heading", () => {
    render(<AnomalyNarrative analysis={sample} />);

    expect(
      screen.getByRole("region", { name: "Narrativa del LLM" }),
    ).toBeInTheDocument();
  });

  it("does not render raw HTML from the narrative", () => {
    render(
      <AnomalyNarrative
        analysis={'<img src="x" onerror="alert(1)" /> **plain bold**'}
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("plain bold")).toBeInTheDocument();
  });

  it("invites the reader to run the analysis when llm_analysis is absent", () => {
    render(<AnomalyNarrative />);

    expect(
      screen.getByText(
        "La narrativa se genera bajo demanda: corré el análisis con IA desde la página del medidor para producirla.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/not available yet/i)).not.toBeInTheDocument();
  });

  it("invites the reader to run the analysis when llm_analysis is an empty string", () => {
    render(<AnomalyNarrative analysis="" />);

    expect(
      screen.getByText(
        "La narrativa se genera bajo demanda: corré el análisis con IA desde la página del medidor para producirla.",
      ),
    ).toBeInTheDocument();
  });

  it("invites the reader to run the analysis when llm_analysis is only whitespace", () => {
    render(<AnomalyNarrative analysis={"   \n  "} />);

    expect(
      screen.getByText(
        "La narrativa se genera bajo demanda: corré el análisis con IA desde la página del medidor para producirla.",
      ),
    ).toBeInTheDocument();
  });
});
