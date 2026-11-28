import { Fragment, forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import type { FormEvent, HTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Callout } from "../Callout/Callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../Card/Card";
import { Checkbox } from "../Checkbox/Checkbox";
import { Progress } from "../Progress/Progress";
import { Select, SelectOption } from "../Select/Select";
import { Separator } from "../Separator/Separator";
import { Switch } from "../Switch/Switch";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../Table/Table";
import { TextField } from "../TextField/TextField";
import {
  sanitizeSchema,
  type SchemaAction,
  type SchemaChild,
  type SchemaIssue,
  type SchemaJsonValue,
  type SchemaNode,
  type SchemaPropsByType,
  type SchemaValues,
} from "./schema";
import styles from "./SchemaRenderer.module.css";

export interface SchemaRendererState {
  streaming: boolean;
}

export interface SchemaRendererProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "children" | "onChange"> {
  /** The model's output: a `SchemaDocument` (`{ version, root }`), a bare
   * node, or an array of nodes — usually straight from `JSON.parse`, or
   * from `parsePartialJson` while it streams. Anything unknown or unsafe
   * is dropped, never rendered and never thrown on. */
  value: unknown;
  /** The value is still arriving. Half-typed node types are skipped
   * quietly instead of reported, issues are held back until streaming
   * ends, and the root is marked `aria-busy`. */
  streaming?: boolean;
  /** A Button was pressed or a Form submitted. Nothing else happens: the
   * renderer never navigates, fetches or runs code on the model's behalf. */
  onAction?: (action: SchemaAction) => void;
  /** Every dropped node, prop or URL, once per settled value. Without a
   * handler they go to `console.warn` instead. */
  onIssue?: (issue: SchemaIssue) => void;
  /** A named form control changed. */
  onValuesChange?: (values: SchemaValues) => void;
  className?: ClassNameValue<SchemaRendererState>;
}

interface RenderContext {
  emit: (action: string, payload: SchemaJsonValue | undefined) => void;
  setValue: (name: string, value: string | boolean) => void;
  inForm: boolean;
}

function cellText(cell: unknown): string {
  return cell === null || cell === undefined ? "" : String(cell);
}

function keyOf(child: SchemaChild, index: number): string {
  return typeof child === "string" ? `t${index}` : child.id !== undefined ? `id:${child.id}` : `${child.type}:${index}`;
}

function renderChildren(children: SchemaChild[] | undefined, ctx: RenderContext): ReactNode {
  if (!children || children.length === 0) return null;
  return children.map((child, index) =>
    typeof child === "string" ? (
      <Fragment key={keyOf(child, index)}>{child}</Fragment>
    ) : (
      <SchemaNodeView key={keyOf(child, index)} node={child} ctx={ctx} />
    ),
  );
}

function SchemaNodeView({ node, ctx }: { node: SchemaNode; ctx: RenderContext }) {
  switch (node.type) {
    case "Stack": {
      const p: SchemaPropsByType["Stack"] = node.props ?? {};
      return (
        <div
          className={styles.stack}
          data-direction={p.direction ?? "vertical"}
          data-gap={p.gap ?? "md"}
          data-align={p.align}
          data-justify={p.justify}
          data-wrap={p.wrap ? "true" : undefined}
        >
          {renderChildren(node.children, ctx)}
        </div>
      );
    }
    case "Text": {
      const p: SchemaPropsByType["Text"] = node.props ?? {};
      return (
        <p className={styles.text} data-tone={p.tone ?? "default"} data-size={p.size ?? "md"} data-weight={p.weight ?? "regular"}>
          {p.text}
          {renderChildren(node.children, ctx)}
        </p>
      );
    }
    case "Heading": {
      const p: SchemaPropsByType["Heading"] = node.props ?? {};
      const Tag = `h${p.level ?? 3}` as "h3";
      return (
        <Tag className={styles.heading} data-level={p.level ?? 3}>
          {p.text}
          {renderChildren(node.children, ctx)}
        </Tag>
      );
    }
    case "Button": {
      const p: SchemaPropsByType["Button"] = node.props ?? {};
      const submits = p.submit === true && ctx.inForm;
      return (
        <Button
          type={submits ? "submit" : "button"}
          variant={p.variant ?? "secondary"}
          size={p.size ?? "md"}
          disabled={p.disabled}
          onClick={submits ? undefined : () => ctx.emit(p.action ?? "", p.payload)}
        >
          {p.label}
        </Button>
      );
    }
    case "Badge": {
      const p: SchemaPropsByType["Badge"] = node.props ?? {};
      return <Badge variant={p.variant ?? "neutral"}>{p.text}</Badge>;
    }
    case "Card": {
      const p: SchemaPropsByType["Card"] = node.props ?? {};
      return (
        <Card>
          {p.title || p.description ? (
            <CardHeader>
              {p.title ? <CardTitle>{p.title}</CardTitle> : null}
              {p.description ? <CardDescription>{p.description}</CardDescription> : null}
            </CardHeader>
          ) : null}
          {node.children?.length ? <CardContent>{renderChildren(node.children, ctx)}</CardContent> : null}
        </Card>
      );
    }
    case "Form": {
      const p: SchemaPropsByType["Form"] = node.props ?? {};
      return (
        <form
          className={styles.form}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            // The form is never sent anywhere: no `action` attribute, and
            // the submission is replaced by an `onAction` call. Native
            // constraint validation (`required`, `type="email"`) has
            // already run by the time `submit` fires.
            event.preventDefault();
            ctx.emit(p.action ?? "submit", p.payload);
          }}
        >
          {renderChildren(node.children, { ...ctx, inForm: true })}
        </form>
      );
    }
    case "TextField": {
      const p: SchemaPropsByType["TextField"] = node.props ?? {};
      return (
        <TextField
          label={p.label}
          name={p.name}
          type={p.type ?? "text"}
          placeholder={p.placeholder}
          description={p.description}
          defaultValue={p.defaultValue}
          required={p.required}
          disabled={p.disabled}
          hideLabel={p.hideLabel}
          onChange={(event) => {
            if (p.name) ctx.setValue(p.name, event.currentTarget.value);
          }}
        />
      );
    }
    case "Select": {
      const p: SchemaPropsByType["Select"] = node.props ?? {};
      return (
        <Select
          label={p.label}
          name={p.name}
          description={p.description}
          defaultValue={p.defaultValue}
          required={p.required}
          disabled={p.disabled}
          onChange={(event) => {
            if (p.name) ctx.setValue(p.name, event.currentTarget.value);
          }}
        >
          {(p.options ?? []).map((option) => (
            <SelectOption key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectOption>
          ))}
        </Select>
      );
    }
    case "Checkbox": {
      const p: SchemaPropsByType["Checkbox"] = node.props ?? {};
      return (
        <Checkbox
          name={p.name}
          defaultChecked={p.defaultChecked}
          required={p.required}
          disabled={p.disabled}
          onCheckedChange={(checked) => {
            if (p.name) ctx.setValue(p.name, checked);
          }}
        >
          {p.label}
        </Checkbox>
      );
    }
    case "Switch": {
      const p: SchemaPropsByType["Switch"] = node.props ?? {};
      return (
        <Switch
          defaultChecked={p.defaultChecked}
          disabled={p.disabled}
          onCheckedChange={(checked) => {
            if (p.name) ctx.setValue(p.name, checked);
          }}
        >
          {p.label}
        </Switch>
      );
    }
    case "Table": {
      const p: SchemaPropsByType["Table"] = node.props ?? {};
      const columns = p.columns ?? [];
      return (
        <Table>
          {p.caption ? <TableCaption>{p.caption}</TableCaption> : null}
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(p.rows ?? []).map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={column.key}>{cellText(row[column.key])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    case "Callout": {
      const p: SchemaPropsByType["Callout"] = node.props ?? {};
      const body =
        p.text || node.children?.length ? (
          <>
            {p.text}
            {renderChildren(node.children, ctx)}
          </>
        ) : null;
      return (
        <Callout variant={p.variant ?? "info"} title={p.title}>
          {body}
        </Callout>
      );
    }
    case "Separator": {
      const p: SchemaPropsByType["Separator"] = node.props ?? {};
      return <Separator orientation={p.orientation ?? "horizontal"} />;
    }
    case "Image": {
      const p: SchemaPropsByType["Image"] = node.props ?? {};
      return (
        <img
          className={styles.image}
          src={p.src}
          alt={p.alt ?? ""}
          width={p.width}
          height={p.height}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      );
    }
    case "Link": {
      const p: SchemaPropsByType["Link"] = node.props ?? {};
      return (
        <a
          className={styles.link}
          href={p.href}
          target={p.external ? "_blank" : undefined}
          rel={p.external ? "noopener noreferrer" : undefined}
        >
          {p.text ?? (node.children?.length ? null : p.href)}
          {renderChildren(node.children, ctx)}
        </a>
      );
    }
    case "Progress": {
      const p: SchemaPropsByType["Progress"] = node.props ?? {};
      return <Progress label={p.label} value={p.value} max={p.max ?? 100} />;
    }
  }
}

function warnIssue(issue: SchemaIssue) {
  // eslint-disable-next-line no-console
  console.warn(`[kernel] SchemaRenderer: ${issue.message} (${issue.path})`);
}

/**
 * Renders a model's JSON with real Kernel components. The input is
 * untrusted by definition, so it goes through `sanitizeSchema` first: an
 * allow-list of node types and, per type, of props and their values.
 * Unknown types and props are dropped and reported, URLs pass only as
 * http(s), mailto: (links) or relative, and there is no path to raw HTML —
 * every string lands in the DOM as a text node.
 *
 * Nothing the model writes can run. A Button or Form doesn't call
 * anything: it hands the host `{ action, payload, values }` through
 * `onAction`, and the host decides. A Form is a real `<form>`, so native
 * constraint validation (`required`, `type="email"`) runs before the
 * action fires and Enter submits it, but it has no `action` attribute and
 * the submission never leaves the page.
 *
 * Streaming works by re-rendering: parse the accumulated text with
 * `parsePartialJson` on every chunk and pass the result. Nodes are keyed
 * by their `id` (or type and position), so React keeps the DOM — and
 * anything typed into a field — as the tree grows.
 */
export const SchemaRenderer = forwardRef<HTMLDivElement, SchemaRendererProps>(function SchemaRenderer(
  { value, streaming = false, onAction, onIssue, onValuesChange, className, ...rest },
  ref,
) {
  const { nodes, issues, defaultValues } = useMemo(
    () => sanitizeSchema(value, { partial: streaming }),
    [value, streaming],
  );

  // Values the user has changed, layered over the tree's defaults. Kept in
  // a ref: a keystroke shouldn't re-render the whole generated tree, and the
  // controls are uncontrolled, so the DOM already shows the right thing.
  const touchedRef = useRef<SchemaValues>({});
  const defaultsRef = useRef(defaultValues);
  defaultsRef.current = defaultValues;

  const readValues = useCallback((): SchemaValues => {
    const out: SchemaValues = { ...defaultsRef.current };
    for (const [name, v] of Object.entries(touchedRef.current)) {
      if (name in out) out[name] = v;
    }
    return out;
  }, []);

  const callbacks = useRef({ onAction, onValuesChange });
  callbacks.current = { onAction, onValuesChange };

  const ctx = useMemo<RenderContext>(
    () => ({
      inForm: false,
      emit: (action, payload) => {
        const event: SchemaAction = { action, values: readValues() };
        if (payload !== undefined) event.payload = payload;
        callbacks.current.onAction?.(event);
      },
      setValue: (name, next) => {
        touchedRef.current = { ...touchedRef.current, [name]: next };
        callbacks.current.onValuesChange?.(readValues());
      },
    }),
    [readValues],
  );

  // Issues are reported once the value settles: mid-stream, a half-written
  // tree produces issues the next chunk resolves.
  const issueKey = streaming ? "" : JSON.stringify(issues);
  const onIssueRef = useRef(onIssue);
  onIssueRef.current = onIssue;
  useEffect(() => {
    if (!issueKey) return;
    for (const issue of JSON.parse(issueKey) as SchemaIssue[]) {
      (onIssueRef.current ?? warnIssue)(issue);
    }
  }, [issueKey]);

  const state: SchemaRendererState = { streaming };

  return (
    <div
      {...rest}
      ref={ref}
      data-slot="schema-renderer"
      data-streaming={streaming ? "true" : undefined}
      aria-busy={streaming || undefined}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      {renderChildren(nodes, ctx)}
    </div>
  );
});
