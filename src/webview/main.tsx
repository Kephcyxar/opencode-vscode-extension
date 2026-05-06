import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
// @ts-ignore — esbuild text loader
import css from "./ui/styles.css";

const style = document.createElement("style");
style.textContent = css as unknown as string;
document.head.appendChild(style);

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
