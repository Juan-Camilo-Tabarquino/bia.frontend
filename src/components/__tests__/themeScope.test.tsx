import { CSS_VAR_SCOPE_CLASS, darkTheme } from "../../theme/tokens";

/**
 * `body` is an ancestor of the application shell, so it can only read antd's
 * `--bia-*` variables if the variable scope is pinned to a class the layout
 * controls and that class is placed on `<html>`. This guards the link between
 * the theme config and the root layout.
 */
describe("theme CSS variable scope", () => {
  it("pins cssVar to the shared scope class", () => {
    expect(CSS_VAR_SCOPE_CLASS).toBe("bia-theme");

    const cssVar = darkTheme.cssVar;
    const key =
      typeof cssVar === "object" && cssVar !== null ? cssVar.key : undefined;

    expect(key).toBe(CSS_VAR_SCOPE_CLASS);
  });
});
