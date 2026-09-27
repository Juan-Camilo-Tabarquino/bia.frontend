import React from "react";
import { render, screen } from "@testing-library/react";
import { Pagination, Table } from "antd";
import dayjs from "dayjs";

import { Providers } from "../providers";

/**
 * Locale wiring, asserted at the provider boundary.
 *
 * antd's own strings (paginator titles, the `DatePicker` panel, the table's
 * "no data" text) come from antd's locale bundle, not from any literal in this
 * repository, so this suite renders real antd components THROUGH our provider
 * chain and checks the strings antd produces. `Table.emptyText` on an empty
 * table is the cheapest such surface; the paginator's `title` is the exact
 * string the phase-4 browser check observed as English.
 *
 * What cannot be asserted here: the `DatePicker` calendar panel's month and
 * weekday names come from the dayjs global when the panel OPENs, and jsdom
 * does not render that panel without a real interaction cycle. The dayjs
 * mutation is asserted directly below instead, and the panel itself stays on
 * the real-browser evidence.
 */
describe("Providers locale", () => {
  it("configures antd's es_ES locale for every descendant", () => {
    render(
      <Providers>
        <Table dataSource={[]} columns={[{ title: "x", dataIndex: "x" }]} />
        <Pagination total={50} />
      </Providers>,
    );

    // antd's own empty text, which is English ("No data") without the locale.
    // antd renders it in both the illustration and the description.
    expect(screen.getAllByText("No hay datos").length).toBeGreaterThan(0);
    // The paginator control names the phase-4 verification saw as
    // `title="Previous Page"` / `title="Next Page"`.
    expect(screen.getByTitle("Página anterior")).toBeInTheDocument();
    expect(screen.getByTitle("Página siguiente")).toBeInTheDocument();
  });

  it("selects the es dayjs locale so the date pickers render Spanish months", () => {
    // The import of `providers` runs `dayjs.locale("es")` at module scope; this
    // is the observable consequence of that mutation.
    expect(dayjs.locale()).toBe("es");
    expect(dayjs("2024-01-01").format("MMMM")).toBe("enero");
  });
});
