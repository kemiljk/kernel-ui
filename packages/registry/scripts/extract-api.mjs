/**
 * Extracts each component's real API from source, so docs, llms.txt, the CLI
 * and the MCP server describe the props an agent can actually pass instead of
 * a hand-written table that drifts.
 *
 * React: for every name in an entry's `reactExports`, finds `interface
 * <Name>Props` (or `type <Name>Props = …`) and records the props it declares
 * itself (type text, optional, JSDoc) plus what it extends (the native
 * attributes it passes through). Defaults come from the component's own
 * destructured parameters (`{ variant = "secondary" }`), the one place they're
 * guaranteed to be true.
 *
 * Elements: for every tag, finds the class passed to `customElements.define`,
 * its `observedAttributes`, the `CustomEvent`s it dispatches, and its JSDoc.
 *
 * Purely syntactic (no type checker), so it stays fast and never needs the
 * React or DOM type graph resolved.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

function walk(dir, ext) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, ext);
    return ext.some((e) => full.endsWith(e)) && !/\.test\.|\.d\.ts$/.test(full) ? [full] : [];
  });
}

function parse(file) {
  return ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
}

/** JSDoc text on a node, as plain markdown (tags dropped). */
function docOf(node) {
  const docs = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc);
  const text = docs
    .map((doc) => (typeof doc.comment === "string" ? doc.comment : ts.getTextOfJSDocComment(doc.comment) ?? ""))
    .join("\n")
    .trim();
  return text || undefined;
}

function clean(text) {
  return text.replace(/\s+/g, " ").trim();
}

function membersOf(typeNode) {
  if (!typeNode) return [];
  if (ts.isTypeLiteralNode(typeNode)) return typeNode.members;
  if (ts.isIntersectionTypeNode(typeNode)) return typeNode.types.flatMap(membersOf);
  return [];
}

function extendsOf(node) {
  if (ts.isInterfaceDeclaration(node)) {
    return (node.heritageClauses ?? []).flatMap((clause) => clause.types.map((t) => clean(t.getText())));
  }
  if (ts.isTypeAliasDeclaration(node) && ts.isIntersectionTypeNode(node.type)) {
    return node.type.types.filter((t) => !ts.isTypeLiteralNode(t)).map((t) => clean(t.getText()));
  }
  return [];
}

/** `{ a = 1, b }` on a component's first parameter → { a: "1" }. */
function defaultsFor(sourceFile, componentName) {
  const defaults = {};
  const visit = (node) => {
    const isNamedFn =
      (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.name?.text === componentName;
    if (isNamedFn) {
      const param = node.parameters[0];
      if (param && ts.isObjectBindingPattern(param.name)) {
        for (const el of param.name.elements) {
          if (!el.initializer) continue;
          const key = el.propertyName ? el.propertyName.getText() : el.name.getText();
          defaults[key.replace(/^"|"$/g, "")] = clean(el.initializer.getText());
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return defaults;
}

export function extractApi(registryComponents, repoRoot) {
  const reactFiles = walk(path.join(repoRoot, "packages/react/src/components"), [".tsx", ".ts"]).map(parse);
  const elementFiles = walk(path.join(repoRoot, "packages/elements/src/components"), [".ts"]).map(parse);

  // Named types, so `ButtonState["variant"]` or `Variant` can be shown as the
  // literal union an agent actually needs ("primary" | "secondary" | …).
  const namedMembers = new Map(); // "ButtonState" → Map(member → type text)
  const aliases = new Map(); // "Variant" → type text
  for (const sf of reactFiles) {
    for (const stmt of sf.statements) {
      if (ts.isInterfaceDeclaration(stmt)) {
        const m = new Map();
        for (const member of stmt.members) if (ts.isPropertySignature(member) && member.type) m.set(member.name.getText(), clean(member.type.getText()));
        namedMembers.set(stmt.name.text, m);
      } else if (ts.isTypeAliasDeclaration(stmt)) {
        aliases.set(stmt.name.text, clean(stmt.type.getText()));
        if (ts.isTypeLiteralNode(stmt.type)) {
          const m = new Map();
          for (const member of stmt.type.members) if (ts.isPropertySignature(member) && member.type) m.set(member.name.getText(), clean(member.type.getText()));
          namedMembers.set(stmt.name.text, m);
        }
      }
    }
  }
  const resolveType = (text, depth = 0) => {
    if (depth > 3) return text;
    const indexed = text.match(/^(\w+)\["(\w+)"\]$/);
    if (indexed) {
      const target = namedMembers.get(indexed[1])?.get(indexed[2]);
      return target ? resolveType(target, depth + 1) : text;
    }
    const alias = aliases.get(text);
    // Only expand aliases of literal unions; object/generic aliases stay named.
    if (alias && /^("[^"]*"|\d+|true|false)(\s*\|\s*("[^"]*"|\d+|true|false))*$/.test(alias)) return alias;
    return text;
  };

  const propsDecls = new Map();
  for (const sf of reactFiles) {
    for (const stmt of sf.statements) {
      if ((ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) && stmt.name.text.endsWith("Props")) {
        propsDecls.set(stmt.name.text, { node: stmt, sourceFile: sf });
      }
    }
  }

  // Tag → { class declaration, source file }
  const classes = new Map();
  for (const sf of elementFiles) {
    const byName = new Map();
    const factories = new Map();
    for (const stmt of sf.statements) {
      if (ts.isClassDeclaration(stmt) && stmt.name) byName.set(stmt.name.text, stmt);
      if (ts.isFunctionDeclaration(stmt) && stmt.name) factories.set(stmt.name.text, stmt);
    }
    const firstClassExpression = (root) => {
      let found;
      const find = (n) => {
        if (found) return;
        if (ts.isClassExpression(n)) found = n;
        else ts.forEachChild(n, find);
      };
      find(root);
      return found;
    };
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText() === "customElements.define" &&
        ts.isStringLiteralLike(node.arguments[0]) &&
        node.arguments[1]
      ) {
        const arg = node.arguments[1];
        if (ts.isIdentifier(arg)) {
          const cls = byName.get(arg.text);
          if (cls) classes.set(node.arguments[0].text, { cls, sourceFile: sf });
        } else if (ts.isCallExpression(arg) && ts.isIdentifier(arg.expression)) {
          // Tags defined from a class factory (Card's and Table's
          // sections: `simpleSection("div", "header")`). Read the class the
          // factory returns, so the tag still appears with its attributes.
          const factory = factories.get(arg.expression.text);
          const cls = factory && firstClassExpression(factory);
          if (cls) classes.set(node.arguments[0].text, { cls, sourceFile: sf });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  const api = {};
  for (const entry of registryComponents) {
    if (entry.status !== "available") continue;
    const react = {};
    for (const name of entry.reactExports) {
      const decl = propsDecls.get(`${name}Props`);
      if (!decl) continue;
      const { node, sourceFile } = decl;
      const members = ts.isInterfaceDeclaration(node) ? node.members : membersOf(node.type);
      const defaults = defaultsFor(sourceFile, name);
      react[name] = {
        description: undefined,
        extends: extendsOf(node),
        props: members
          .filter((m) => ts.isPropertySignature(m) || ts.isMethodSignature(m))
          .map((m) => {
            const propName = m.name.getText().replace(/^"|"$/g, "");
            return {
              name: propName,
              type: m.type ? resolveType(clean(m.type.getText())) : "unknown",
              optional: Boolean(m.questionToken),
              ...(defaults[propName] !== undefined ? { default: defaults[propName] } : {}),
              ...(docOf(m) ? { description: docOf(m) } : {}),
            };
          }),
      };
      // The component's own JSDoc (the "why it's built this way" comment).
      const visit = (n) => {
        if (react[name].description) return;
        if (
          (ts.isVariableStatement(n) &&
            n.declarationList.declarations.some((d) => d.name.getText() === name)) ||
          (ts.isFunctionDeclaration(n) && n.name?.text === name)
        ) {
          react[name].description = docOf(n);
        }
      };
      sourceFile.statements.forEach(visit);
    }

    const elements = {};
    for (const tag of [entry.elementTag, ...(entry.elementSubTags ?? [])].filter(Boolean)) {
      const found = classes.get(tag);
      if (!found) continue;
      const { cls, sourceFile } = found;
      const attributes = [];
      for (const member of cls.members) {
        if (ts.isGetAccessorDeclaration(member) && member.name.getText() === "observedAttributes") {
          const visit = (n) => {
            if (ts.isArrayLiteralExpression(n)) {
              for (const el of n.elements) if (ts.isStringLiteralLike(el)) attributes.push(el.text);
            }
            ts.forEachChild(n, visit);
          };
          visit(member);
        }
      }
      const events = new Set();
      const visit = (n) => {
        if (ts.isNewExpression(n) && n.expression.getText() === "CustomEvent" && n.arguments?.[0] && ts.isStringLiteralLike(n.arguments[0])) {
          events.add(n.arguments[0].text);
        }
        ts.forEachChild(n, visit);
      };
      visit(cls);
      elements[tag] = {
        ...(docOf(cls) ? { description: docOf(cls) } : {}),
        attributes,
        events: [...events],
      };
      void sourceFile;
    }

    api[entry.slug] = { name: entry.name, react, elements };
  }
  return api;
}
