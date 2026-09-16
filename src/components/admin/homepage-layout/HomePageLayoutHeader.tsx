"use client";

import { css } from "styled-system/css";

export function HomePageLayoutHeader() {
  return (
    <div>
      <h1
        className={css({
          fontFamily: "display",
          fontSize: "3xl",
          fontWeight: "bold",
          letterSpacing: "tight",
          color: "fg.default",
        })}
      >
        Homepage Layout
      </h1>
      <p className={css({ color: "fg.muted", marginTop: "2" })}>
        Control visibility and ordering of homepage sections
      </p>
    </div>
  );
}
