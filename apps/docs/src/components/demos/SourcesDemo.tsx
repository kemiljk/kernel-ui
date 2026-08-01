import { Citation, Source, Sources } from "@kernelui-lib/react";

export default function SourcesDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", inlineSize: "100%" }}>
      <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.55 }}>
        Transformers scale well with data and compute
        <Citation index={1} href="https://arxiv.org/abs/1706.03762" />
        , though attention is quadratic in sequence length
        <Citation index={2} href="https://arxiv.org/abs/2009.06732" />
        .
      </p>
      <Sources>
        <Source
          index={1}
          title="Attention Is All You Need"
          href="https://arxiv.org/abs/1706.03762"
        />
        <Source
          index={2}
          title="Efficient Transformers: A Survey"
          href="https://arxiv.org/abs/2009.06732"
        />
      </Sources>
    </div>
  );
}
