import { useState } from "react";
import { Pagination, PaginationItem, PaginationPrevious, PaginationNext } from "@kernelui-lib/react";

export default function PaginationDemo() {
  const [page, setPage] = useState(2);
  const pages = [1, 2, 3, 4, 5];

  return (
    <Pagination>
      <PaginationPrevious disabled={page === 1} onClick={() => setPage((p) => p - 1)} />
      {pages.map((p) => (
        <PaginationItem
          key={p}
          href="#"
          current={p === page}
          onClick={(event) => {
            event.preventDefault();
            setPage(p);
          }}
        >
          {p}
        </PaginationItem>
      ))}
      <PaginationNext disabled={page === pages.length} onClick={() => setPage((p) => p + 1)} />
    </Pagination>
  );
}
