import * as React from "react";

export function Markdown({ text }: { text: string }) {
  return <>{renderBlocks(text)}</>;
}

function renderBlocks(src: string): React.ReactNode[] {
  const lines = src.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1];
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push(<pre key={key++} className="md-code"><code data-lang={lang}>{buf.join("\n")}</code></pre>);
      continue;
    }

    // table: header | header  /  --- | ---  /  row | row
    if (looksLikeTableHeader(lines, i)) {
      const start = i;
      const headerCells = splitRow(lines[i]);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i])); i++;
      }
      out.push(
        <table key={key++} className="md-table">
          <thead><tr>{headerCells.map((c, j) => <th key={j}>{renderInline(c)}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{renderInline(c)}</td>)}</tr>)}</tbody>
        </table>
      );
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, "")); i++; }
      out.push(<ul key={key++} className="md-list">{items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>);
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, "")); i++; }
      out.push(<ol key={key++} className="md-list">{items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ol>);
      continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const Tag = (`h${Math.min(level + 2, 6)}`) as any;
      out.push(<Tag key={key++} className="md-h">{renderInline(h[2])}</Tag>);
      i++;
      continue;
    }

    // blank line
    if (line.trim() === "") { i++; continue; }

    // paragraph (collapse consecutive non-empty lines)
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines, i)) {
      buf.push(lines[i]); i++;
    }
    out.push(<p key={key++} className="md-p">{renderInline(buf.join(" "))}</p>);
  }
  return out;
}

function isBlockStart(lines: string[], i: number): boolean {
  const l = lines[i];
  return /^```/.test(l) || /^#{1,6}\s/.test(l) || /^[-*]\s/.test(l) || /^\d+\.\s/.test(l) || looksLikeTableHeader(lines, i);
}

function looksLikeTableHeader(lines: string[], i: number): boolean {
  if (i + 1 >= lines.length) return false;
  const a = lines[i], b = lines[i + 1];
  if (!a.includes("|")) return false;
  if (!/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(b)) return false;
  return true;
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let i = 0; let buf = ""; let key = 0;
  const flush = () => { if (buf) { out.push(buf); buf = ""; } };
  while (i < text.length) {
    const ch = text[i];
    // inline code
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i) {
        flush();
        out.push(<code key={key++} className="md-inline-code">{text.slice(i + 1, end)}</code>);
        i = end + 1; continue;
      }
    }
    // bold
    if (ch === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end > i) {
        flush();
        out.push(<strong key={key++}>{renderInline(text.slice(i + 2, end))}</strong>);
        i = end + 2; continue;
      }
    }
    // italic
    if (ch === "*") {
      const end = text.indexOf("*", i + 1);
      if (end > i) {
        flush();
        out.push(<em key={key++}>{renderInline(text.slice(i + 1, end))}</em>);
        i = end + 1; continue;
      }
    }
    buf += ch; i++;
  }
  flush();
  return out;
}
